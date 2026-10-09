<?php

namespace App\Http\Middleware;

use App\Models\StaffMembership;
use App\Models\Tenant;
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

        // Explicit platform admin manual suspension for abuse: FULLY BLOCK ALL ACCESS
        if ($membership->tenant->is_manually_suspended && !$request->routeIs('clinic.status*')) {
            return redirect('/clinic/status');
        }

        // Clinic application pending initial review or rejected
        $isPendingOrRejected = in_array($membership->tenant->status, [
            Tenant::STATUS_PENDING_REVIEW,
            Tenant::STATUS_NEEDS_MORE_INFO,
            Tenant::STATUS_REJECTED,
            Tenant::STATUS_PERMANENTLY_REJECTED,
        ], true);

        if ($isPendingOrRejected && !$request->routeIs('clinic.status*') && !$request->routeIs('clinic.reapply*')) {
            return redirect('/clinic/status');
        }

        // A clinic_owner whose APPROVED tenant hasn't finished the setup wizard
        // is sent there first — except for the wizard's own routes, or every
        // request would loop. Gated on approval so a pending owner rests on the
        // status page instead of bouncing between it and onboarding.
        if (
            $membership->tenant->isApproved()
            && $membership->role === StaffMembership::ROLE_CLINIC_OWNER
            && !$request->routeIs('app.onboarding.*')
            && !$membership->tenant->hasCompletedOnboarding()
        ) {
            return redirect('/app/onboarding');
        }

        return $next($request);
    }
}
