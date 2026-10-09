<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Location;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\PromoCode;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicBillingInspectorController extends Controller
{
    /**
     * Show the detailed billing inspector for a specific clinic.
     */
    public function show(Tenant $tenant): Response
    {
        $tenant->load(['plan', 'planPrice', 'promoCode']);

        // 1. Calculate usage counts
        $appointmentsCount = Appointment::where('tenant_id', $tenant->id)
            ->whereBetween('starts_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        $locationsCount = Location::where('tenant_id', $tenant->id)->count();

        $scribeUsageCount = (int) app(\App\Services\PlanEntitlements::class)->calculateScribeUsageMinutes($tenant);

        // 2. Scribe+ allocations
        $scribeAddOn = \App\Models\AddOn::where('slug', 'scribe-plus')->first();
        $tenantAddOn = $scribeAddOn
            ? \App\Models\TenantAddOn::where('tenant_id', $tenant->id)->where('add_on_id', $scribeAddOn->id)->where('status', 'active')->first()
            : null;

        // 3. Blocked entitlement events
        $blockedEvents = AuditEvent::query()
            ->where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->where('action', 'entitlement.blocked')
                    ->orWhere('action', 'like', 'entitlement.blocked%');
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (AuditEvent $e) => [
                'id' => $e->id,
                'action' => $e->action,
                'metadata' => $e->metadata,
                'created_at' => $e->created_at->format('Y-m-d H:i:s'),
                'time_ago' => $e->created_at->diffForHumans(),
            ]);

        // 4. Admin billing override history
        $overrideEvents = AuditEvent::query()
            ->where('tenant_id', $tenant->id)
            ->where('action', 'like', 'clinic_billing.%')
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn (AuditEvent $e) => [
                'id' => $e->id,
                'action' => $e->action,
                'user_name' => $e->user?->name ?? 'System',
                'metadata' => $e->metadata,
                'created_at' => $e->created_at->format('Y-m-d H:i:s'),
                'time_ago' => $e->created_at->diffForHumans(),
            ]);

        // 5. Grandfathered status
        $currentPlanPrice = $tenant->planPrice;
        $isGrandfathered = false;
        if ($currentPlanPrice) {
            $isGrandfathered = (bool) $currentPlanPrice->is_grandfathered;
        } elseif ($tenant->plan) {
            // Check if latest active price differs
            $latestPrice = $tenant->plan->activePriceForInterval($tenant->billing_interval ?? 'month');
            if ($latestPrice && $currentPlanPrice && $latestPrice->id !== $currentPlanPrice->id) {
                $isGrandfathered = true;
            }
        }

        // Available plans and active promo codes for action dialogs
        $availablePlans = Plan::with(['monthlyPrice', 'annualPrice'])
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get()
            ->map(fn (Plan $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'monthly_price' => $p->monthlyPrice ? (float) $p->monthlyPrice->base_price : null,
                'annual_price' => $p->annualPrice ? (float) $p->annualPrice->base_price : null,
            ]);

        $activePromos = PromoCode::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->get()
            ->map(fn (PromoCode $c) => [
                'id' => $c->id,
                'code' => $c->code,
                'discount_type' => $c->discount_type,
                'discount_value' => (float) $c->discount_value,
                'duration' => $c->duration,
            ]);

        return Inertia::render('Admin/Clinics/BillingInspector', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'subdomain' => $tenant->subdomain,
                'email' => $tenant->email,
                'status' => $tenant->status,
                'subscription_status' => $tenant->subscription_status,
                'payment_failed_at' => $tenant->payment_failed_at?->format('Y-m-d H:i:s'),
                'grace_period_ends_at' => $tenant->grace_period_ends_at?->format('Y-m-d H:i:s'),
                'is_in_grace_period' => $tenant->grace_period_ends_at ? $tenant->grace_period_ends_at->isFuture() : false,
                'stripe_id' => $tenant->stripe_id,
                'stripe_pm_id' => $tenant->stripe_pm_id,
                'stripe_subscription_id' => $tenant->stripe_subscription_id,
                'stripe_customer_url' => $tenant->stripe_id
                    ? "https://dashboard.stripe.com/test/customers/{$tenant->stripe_id}"
                    : null,
                'stripe_subscription_url' => $tenant->stripe_subscription_id
                    ? "https://dashboard.stripe.com/test/subscriptions/{$tenant->stripe_subscription_id}"
                    : null,
                'plan' => $tenant->plan ? [
                    'id' => $tenant->plan->id,
                    'name' => $tenant->plan->name,
                    'slug' => $tenant->plan->slug,
                    'badge' => $tenant->plan->badge,
                    'included_practitioners' => $tenant->plan->included_practitioners,
                    'max_practitioners' => $tenant->plan->max_practitioners,
                    'appointment_limit_monthly' => $tenant->plan->appointment_limit_monthly,
                    'location_limit' => $tenant->plan->location_limit,
                    'scribe_allowance_amount' => $tenant->plan->scribe_allowance_amount,
                ] : [
                    'id' => null,
                    'name' => ucfirst($tenant->plan_tier ?? 'Practice'),
                    'slug' => $tenant->plan_tier ?? 'practice',
                    'included_practitioners' => 1,
                ],
                'billing_interval' => $tenant->billing_interval ?? 'month',
                'plan_price' => $currentPlanPrice ? [
                    'id' => $currentPlanPrice->id,
                    'base_price' => (float) $currentPlanPrice->base_price,
                    'extra_practitioner_price' => (float) $currentPlanPrice->extra_practitioner_price,
                    'currency' => $currentPlanPrice->currency,
                    'is_grandfathered' => (bool) $currentPlanPrice->is_grandfathered,
                ] : null,
                'is_grandfathered' => $isGrandfathered,
                'seats' => [
                    'included' => $tenant->plan?->included_practitioners ?? 1,
                    'extra' => $tenant->extra_practitioner_seats ?? 0,
                    'total' => $tenant->totalPractitionersCount(),
                ],
                'scribe_plus' => [
                    'active' => (bool) $tenant->has_scribe_plus,
                    'quantity' => $tenantAddOn?->quantity ?? 0,
                ],
                'promo' => [
                    'code' => $tenant->applied_promo_code,
                    'details' => $tenant->promoCode ? [
                        'discount_type' => $tenant->promoCode->discount_type,
                        'discount_value' => (float) $tenant->promoCode->discount_value,
                        'duration' => $tenant->promoCode->duration,
                    ] : null,
                ],
                'usage' => [
                    'appointments_this_month' => $appointmentsCount,
                    'locations_count' => $locationsCount,
                    'scribe_usage_count' => (int) $scribeUsageCount,
                ],
                'blocked_events' => $blockedEvents,
                'override_events' => $overrideEvents,
            ],
            'available_plans' => $availablePlans,
            'active_promos' => $activePromos,
        ]);
    }

    /**
     * Override clinic plan and interval.
     */
    public function changePlan(Request $request, Tenant $tenant, \App\Billing\PlatformBilling $billingGateway): RedirectResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'uuid', 'exists:plans,id'],
            'billing_interval' => ['required', 'string', 'in:month,year'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $oldPlanSlug = $tenant->plan?->slug ?? $tenant->plan_tier;
        $oldInterval = $tenant->billing_interval;

        $newPlan = Plan::findOrFail($validated['plan_id']);
        $newPrice = $newPlan->activePriceForInterval($validated['billing_interval']);

        $tenant->update([
            'plan_id' => $newPlan->id,
            'plan_tier' => $newPlan->slug,
            'billing_interval' => $validated['billing_interval'],
            'plan_price_id' => $newPrice?->id,
        ]);

        // Sync real Stripe subscription (with proration rules) if tenant has an active subscription
        try {
            $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);
            if ($subscription && $subscription->active()) {
                $billingGateway->syncSubscriptionQuantities($tenant);
            }
        } catch (\Throwable $e) {
            report($e);
        }

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'tenant_id' => $tenant->id,
            'action' => 'clinic_billing.plan_changed',
            'resource_type' => Tenant::class,
            'resource_id' => $tenant->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'old_plan' => $oldPlanSlug,
                'new_plan' => $newPlan->slug,
                'old_interval' => $oldInterval,
                'new_interval' => $validated['billing_interval'],
                'plan_price_id' => $newPrice?->id,
                'reason' => $validated['reason'],
            ],
        ]);

        return back()->with('success', "Plan updated to {$newPlan->name} ({$validated['billing_interval']}ly).");
    }

    /**
     * Apply or change promo code on clinic subscription.
     */
    public function applyPromo(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'promo_code' => ['required', 'string', 'max:50'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $promo = PromoCode::where('code', strtoupper(trim($validated['promo_code'])))
            ->where('is_active', true)
            ->first();

        if (! $promo) {
            return back()->withErrors(['promo_code' => 'The provided promo code is invalid or inactive.']);
        }

        if ($promo->expires_at && $promo->expires_at->isPast()) {
            return back()->withErrors(['promo_code' => 'This promo code has expired.']);
        }

        if ($promo->max_redemptions && $promo->times_redeemed >= $promo->max_redemptions) {
            return back()->withErrors(['promo_code' => 'This promo code has reached its maximum redemptions.']);
        }

        $oldPromo = $tenant->applied_promo_code;

        $tenant->update([
            'promo_code_id' => $promo->id,
            'applied_promo_code' => $promo->code,
        ]);

        $promo->increment('times_redeemed');

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'tenant_id' => $tenant->id,
            'action' => 'clinic_billing.promo_applied',
            'resource_type' => Tenant::class,
            'resource_id' => $tenant->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'old_promo' => $oldPromo,
                'new_promo' => $promo->code,
                'discount_type' => $promo->discount_type,
                'discount_value' => (float) $promo->discount_value,
                'reason' => $validated['reason'],
            ],
        ]);

        return back()->with('success', "Promo code {$promo->code} applied successfully.");
    }

    /**
     * Extend grace period for a clinic facing payment failure / overdue subscription.
     */
    public function extendGracePeriod(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:90'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $days = (int) $validated['days'];
        $baseDate = ($tenant->grace_period_ends_at && $tenant->grace_period_ends_at->isFuture())
            ? $tenant->grace_period_ends_at
            : now();

        $newGraceDate = $baseDate->copy()->addDays($days);

        $tenant->update([
            'grace_period_ends_at' => $newGraceDate,
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'tenant_id' => $tenant->id,
            'action' => 'clinic_billing.grace_period_extended',
            'resource_type' => Tenant::class,
            'resource_id' => $tenant->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'days_extended' => $days,
                'new_grace_period_ends_at' => $newGraceDate->toIso8601String(),
                'reason' => $validated['reason'],
            ],
        ]);

        return back()->with('success', "Grace period extended by {$days} days (valid through {$newGraceDate->format('M d, Y')}).");
    }
}
