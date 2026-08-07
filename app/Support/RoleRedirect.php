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

            return route('app.dashboard', absolute: false);
        }

        if ($user->clients()->exists()) {
            return route('portal.dashboard', absolute: false);
        }

        $request->session()->flash('error', 'Your account is not yet linked to a clinic workspace. Please contact your administrator.');

        return route('home', absolute: false);
    }
}
