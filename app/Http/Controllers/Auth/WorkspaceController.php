<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class WorkspaceController extends Controller
{
    /**
     * Show the "select a workspace" screen for users with active staff
     * memberships at more than one tenant.
     */
    public function index(Request $request): Response|HttpResponse|RedirectResponse
    {
        $user = $request->user();
        $memberships = $user->activeWorkspaceMemberships()->with('tenant')->get();

        // Nothing to choose between: go straight into the single workspace's
        // subdomain (or home if, somehow, there are none).
        if ($memberships->count() < 2) {
            $tenant = $memberships->first()?->tenant;

            return $tenant
                ? Tenancy::redirectTo($request, $tenant->appUrl('/app/dashboard'))
                : redirect()->route('home');
        }

        return Inertia::render('Auth/SelectWorkspace', [
            'workspaces' => $memberships->map(fn ($membership) => [
                'tenant_id' => $membership->tenant_id,
                'tenant_name' => $membership->tenant->name,
                'tenant_slug' => $membership->tenant->slug,
                'role' => $membership->role,
            ]),
        ]);
    }

    /**
     * Persist the chosen tenant as the user's current workspace.
     */
    public function store(Request $request): HttpResponse|RedirectResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
        ]);

        $user = $request->user();
        $membership = $user->activeWorkspaceMemberships()
            ->where('tenant_id', $data['tenant_id'])
            ->first();

        abort_unless($membership, 403, 'You do not have staff access to that workspace.');

        $request->session()->put('current_tenant_id', $membership->tenant_id);

        // Enter the chosen clinic on its own subdomain (cross-host: Inertia
        // location visit).
        return Tenancy::redirectTo($request, $membership->tenant->appUrl('/app/dashboard'));
    }
}
