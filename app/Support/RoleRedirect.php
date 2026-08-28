<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

class RoleRedirect
{
    /**
     * Decide where an authenticated user should land, based on their role(s).
     * Users with staff access at more than one tenant are sent to the
     * workspace picker instead of straight into /app.
     */
    public static function path(Request $request, User $user): string
    {
        if ($user->isPlatformAdmin()) {
            return route('admin.dashboard', absolute: false);
        }

        $workspaceMemberships = $user->activeWorkspaceMemberships()->get();

        if ($workspaceMemberships->count() > 1) {
            return route('workspace.select', absolute: false);
        }

        if ($workspaceMemberships->count() === 1) {
            $membership = $workspaceMemberships->first();
            $request->session()->put('current_tenant_id', $membership->tenant_id);

            // Staff work on their clinic's subdomain — send them to the
            // absolute subdomain URL, not a central-domain relative path.
            return $membership->tenant->appUrl('/app/dashboard');
        }

        if ($user->clients()->exists()) {
            // Patients live on the common portal host, tenant resolved from
            // their client account (login-based), not a subdomain.
            return Tenancy::portalUrl('/portal/dashboard');
        }

        $request->session()->flash('error', 'Your account is not yet linked to a clinic workspace. Please contact your administrator.');

        return route('home', absolute: false);
    }
}
