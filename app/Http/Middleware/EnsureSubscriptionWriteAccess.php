<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Services\PlanEntitlements;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionWriteAccess
{
    public function __construct(private readonly PlanEntitlements $entitlements)
    {
    }

    /**
     * Handle an incoming request.
     * Restricts mutate/write actions for non-active subscription states
     * while preserving read/export access.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = TenantScope::getTenantId();

        if (! $tenantId) {
            return $next($request);
        }

        $tenant = Tenant::find($tenantId);

        if (! $tenant) {
            return $next($request);
        }

        $check = $this->entitlements->canWrite($tenant);

        if (! $check['allowed']) {
            $user = $request->user();
            $isStaff = $user && \App\Models\StaffMembership::where('tenant_id', $tenant->id)
                ->where('user_id', $user->id)
                ->exists();

            $isPatient = ! $isStaff || $request->is('portal/*');
            $reason = $isPatient
                ? 'Online booking is temporarily unavailable. Please contact the clinic directly to schedule your appointment.'
                : ($check['reason'] ?? 'Write access restricted');

            $this->entitlements->recordBlockedAction(
                $tenant,
                $user,
                'write_access',
                $reason,
                ['path' => $request->path(), 'method' => $request->method(), 'is_patient' => $isPatient]
            );

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $reason,
                    'code' => $check['code'],
                    'requires_payment_update' => ! $isPatient,
                    'action_url' => $isPatient ? null : '/app/billing',
                ], 403);
            }

            return back()
                ->withErrors(['subscription' => $reason])
                ->with('error', $reason);
        }

        return $next($request);
    }
}
