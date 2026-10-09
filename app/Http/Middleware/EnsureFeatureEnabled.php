<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Services\PlanEntitlements;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFeatureEnabled
{
    public function __construct(private readonly PlanEntitlements $entitlements)
    {
    }

    /**
     * Restrict access to a route based on plan feature matrix.
     * Features marked is_implemented = false are never gated.
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
    {
        $tenantId = TenantScope::getTenantId();

        if (! $tenantId) {
            return $next($request);
        }

        $tenant = Tenant::find($tenantId);

        if (! $tenant) {
            return $next($request);
        }

        if (! $this->entitlements->isFeatureEnabled($tenant, $featureKey)) {
            $this->entitlements->recordBlockedAction(
                $tenant,
                $request->user(),
                'feature_gate',
                "Feature [{$featureKey}] is not enabled for plan [{$tenant->plan?->name}]",
                ['feature' => $featureKey, 'path' => $request->path()]
            );

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => "This feature requires a plan upgrade.",
                    'feature' => $featureKey,
                    'requires_upgrade' => true,
                    'action_url' => '/app/billing',
                ], 403);
            }

            abort(403, "This feature is not available on your current plan. Please upgrade your plan in Subscription & Billing.");
        }

        return $next($request);
    }
}
