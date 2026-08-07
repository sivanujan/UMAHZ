<?php

namespace App\Http\Middleware;

use App\Scopes\TenantScope;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClientAccess
{
    /**
     * Restrict access to /portal/* routes to users with a linked `clients`
     * record, scoped to their own record only. If the request resolves a
     * {client} route-model-binding, it must belong to the authenticated user.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        $routeClient = $request->route('client');

        if ($routeClient) {
            abort_unless($routeClient->user_id === $user->id, 403, 'You do not have access to this client record.');

            $client = $routeClient;
        } else {
            $tenantId = TenantScope::getTenantId();

            $client = $tenantId
                ? $user->clients()->where('tenant_id', $tenantId)->first()
                : null;

            $client ??= $user->clients()->latest()->first();
        }

        abort_unless($client, 403, 'No client profile is linked to your account.');

        app()->instance('current_tenant_id', $client->tenant_id);
        $request->session()->put('current_tenant_id', $client->tenant_id);
        $request->attributes->set('clientRecord', $client);

        return $next($request);
    }
}
