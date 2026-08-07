<?php

namespace App\Http\Middleware;

use App\Scopes\TenantScope;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        // SetTenantContext (which runs before this middleware) has already
        // resolved which tenant is "current" for this request, whether via
        // an explicit workspace choice or auto-selection.
        $tenantId = TenantScope::getTenantId();

        $membership = ($user && $tenantId)
            ? $user->activeStaffMemberships()->with('tenant')->where('tenant_id', $tenantId)->first()
            : null;

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_platform_admin' => $user->isPlatformAdmin(),
                    'roles' => $user->getRoleNames(),
                    'role' => $membership?->role,
                    'current_tenant_id' => $membership?->tenant_id,
                    'workspace_count' => $user->activeWorkspaceMemberships()->count(),
                ] : null,
                'tenant' => $membership?->tenant ? [
                    'id' => $membership->tenant->id,
                    'name' => $membership->tenant->name,
                    'slug' => $membership->tenant->slug,
                    'timezone' => $membership->tenant->timezone,
                    'currency' => $membership->tenant->currency,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ]);
    }
}
