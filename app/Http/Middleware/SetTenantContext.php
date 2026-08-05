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
                ?? session('current_tenant_id') 
                ?? $user->current_tenant_id;

            if (!$tenantId && $user->tenants()->exists()) {
                $tenantId = $user->tenants()->first()->id;
            }

            if ($tenantId) {
                app()->instance('current_tenant_id', (int) $tenantId);
                session(['current_tenant_id' => (int) $tenantId]);

                if ($user->current_tenant_id !== (int) $tenantId) {
                    $user->forceFill(['current_tenant_id' => (int) $tenantId])->save();
                }
            }
        }

        return $next($request);
    }
}
