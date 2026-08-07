<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $tenantId = $request->header('X-Tenant-ID')
                ?? session('current_tenant_id');

            if (!$tenantId) {
                $activeMembership = $user->staffMemberships()
                    ->where('status', 'active')
                    ->latest('joined_at')
                    ->first();

                $tenantId = $activeMembership?->tenant_id;
            }

            if ($tenantId) {
                app()->instance('current_tenant_id', $tenantId);
                session(['current_tenant_id' => $tenantId]);
            }
        }

        return $next($request);
    }
}
