<?php

namespace App\Http\Middleware;

use App\Models\StaffMembership;
use App\Scopes\TenantScope;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffRole
{
    /**
     * Restrict access to /app/* routes to users with an active staff_membership
     * for the CURRENT tenant, optionally limited to a given set of roles.
     *
     * Usage: ->middleware('staff.role') or ->middleware('staff.role:clinic_owner,practitioner')
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        $memberships = $user->activeWorkspaceMemberships()->get();

        if ($memberships->isEmpty()) {
            abort(403, 'You do not have staff access to any clinic workspace.');
        }

        $tenantId = TenantScope::getTenantId();
        $membership = $tenantId ? $memberships->firstWhere('tenant_id', $tenantId) : null;

        // No tenant chosen yet (or the chosen tenant no longer applies to this user).
        if (!$membership) {
            if ($memberships->count() > 1) {
                return redirect()->route('workspace.select');
            }

            $membership = $memberships->first();
            app()->instance('current_tenant_id', $membership->tenant_id);
            $request->session()->put('current_tenant_id', $membership->tenant_id);
        }

        if (!empty($roles) && !in_array($membership->role, $roles, true)) {
            abort(403, 'Your role does not have access to this area.');
        }

        $request->attributes->set('staffMembership', $membership);

        return $next($request);
    }
}
