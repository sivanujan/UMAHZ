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

        // The clinic must be approved by a super admin before ANY /app or
        // /portal route is reachable — checked here so every request that
        // resolves a membership passes through this one gate. Exempt the
        // status page itself, or an unapproved tenant could never reach it.
        if (!$membership->tenant->isApproved() && !$request->routeIs('clinic.status*')) {
            return redirect()->route('clinic.status');
        }

        // A clinic_owner whose tenant hasn't finished the setup wizard is
        // sent there first — except for the wizard's own routes, or every
        // request would loop.
        if (
            $membership->role === StaffMembership::ROLE_CLINIC_OWNER
            && !$request->routeIs('app.onboarding.*')
            && !$membership->tenant->hasCompletedOnboarding()
        ) {
            return redirect()->route('app.onboarding.show');
        }

        return $next($request);
    }
}
