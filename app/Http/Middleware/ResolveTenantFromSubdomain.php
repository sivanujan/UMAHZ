<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\Tenancy;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve the current tenant from the clinic subdomain and set it as the
 * active tenant for the existing TenantScope. Runs on the staff subdomain
 * route group, BEFORE `staff.role`.
 *
 * The subdomain IDENTIFIES the tenant; it is NOT authorization (spec §3, §20).
 * After resolving it we require the authenticated user to hold an active
 * workspace StaffMembership for exactly this tenant — otherwise 403. This is
 * what keeps a session cookie shared across *.umahz.com from ever exposing
 * one clinic's data on another clinic's subdomain. Row-level `tenant_id`
 * scoping is unchanged; this is an extra gate, not a replacement.
 */
class ResolveTenantFromSubdomain
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // The wildcard label captured by Route::domain('{tenant}.'.central).
        // Remove it from the route parameters so controllers are unaffected.
        $subdomain = Tenancy::normalize($request->route('tenant'));
        $request->route()?->forgetParameter('tenant');

        $tenant = Tenant::where('subdomain', $subdomain)->first();

        // Unknown subdomain: a clean 404 for everyone. We do not reveal whether
        // any given subdomain exists beyond found/not-found.
        abort_if($tenant === null, 404, 'Clinic not found.');

        // Make this tenant the current tenant for the whole request. The
        // container binding takes precedence in TenantScope::getTenantId(), so
        // it overrides anything SetTenantContext derived from the session.
        app()->instance('current_tenant_id', $tenant->id);

        $user = $request->user();

        if ($user) {
            $belongs = $user->activeWorkspaceMemberships()
                ->where('tenant_id', $tenant->id)
                ->exists();

            // Strict tenant match. No redirect — we must not leak that another
            // clinic's subdomain exists (spec §3).
            abort_unless($belongs, 403, "You don't have access to this clinic.");

            // Only persist to the (possibly cross-subdomain) session AFTER the
            // membership check passes, so we never store a tenant this user
            // can't access.
            $request->session()->put('current_tenant_id', $tenant->id);
        }

        return $next($request);
    }
}
