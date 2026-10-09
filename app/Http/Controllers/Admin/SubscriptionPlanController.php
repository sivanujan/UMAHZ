<?php

namespace App\Http\Controllers\Admin;

use App\Billing\PlatformBilling;
use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Feature;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use App\Services\StripeSubscriptionSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionPlanController extends Controller
{
    public function __construct(
        private readonly StripeSubscriptionSyncService $syncService,
        private readonly PlatformBilling $billingGateway
    ) {
    }

    /**
     * Display a listing of dynamic subscription plans & pricing.
     */
    public function index(Request $request): Response
    {
        $plans = Plan::with(['prices', 'features'])
            ->orderBy('display_order')
            ->get()
            ->map(function (Plan $plan) {
                $monthly = $plan->prices->firstWhere('interval', 'month');
                $annual = $plan->prices->firstWhere('interval', 'year');

                $hasStripeSync = ! empty($plan->stripe_product_id)
                    && (! empty($monthly?->stripe_base_price_id) || (float) ($monthly?->base_price ?? 0) <= 0)
                    && (! empty($annual?->stripe_base_price_id) || (float) ($annual?->base_price ?? 0) <= 0);

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'tagline' => $plan->tagline,
                    'description' => $plan->description,
                    'badge' => $plan->badge,
                    'display_order' => $plan->display_order,
                    'is_active' => (bool) $plan->is_active,
                    'trial_days' => $plan->trial_days,
                    'included_practitioners' => $plan->included_practitioners,
                    'max_practitioners' => $plan->max_practitioners,
                    'allows_extra_practitioners' => (bool) $plan->allows_extra_practitioners,
                    'appointment_limit_monthly' => $plan->appointment_limit_monthly,
                    'appointment_limit_behavior' => $plan->appointment_limit_behavior ?: 'warn',
                    'location_limit' => $plan->location_limit,
                    'scribe_allowance_unit' => $plan->scribe_allowance_unit ?: 'minutes',
                    'scribe_allowance_amount' => $plan->scribe_allowance_amount,
                    'scribe_limit_behavior' => $plan->scribe_limit_behavior ?: 'warn',
                    'needs_review' => (bool) $plan->needs_review,
                    'needs_review_fields' => (array) ($plan->needs_review_fields ?? []),
                    'stripe_product_id' => $plan->stripe_product_id,
                    'has_stripe_sync' => $hasStripeSync,
                    'subscriber_count' => $plan->tenants()->count(),
                    'active_subscriber_count' => $plan->tenants()->where('subscription_status', Tenant::SUBSCRIPTION_ACTIVE)->count(),
                    'subscribers' => $plan->tenants()->where('subscription_status', Tenant::SUBSCRIPTION_ACTIVE)->with('planPrice')->get()->map(function (Tenant $tenant) use ($monthly, $annual) {
                        $targetPrice = $tenant->billing_interval === 'year' ? $annual : $monthly;
                        $oldPrice = $tenant->planPrice ? (float) $tenant->planPrice->base_price : ($targetPrice ? (float) $targetPrice->base_price : 0);
                        $newPrice = $targetPrice ? (float) $targetPrice->base_price : 0;
                        return [
                            'id' => $tenant->id,
                            'name' => $tenant->name,
                            'subdomain' => $tenant->subdomain,
                            'interval' => $tenant->billing_interval ?? 'month',
                            'old_price' => $oldPrice,
                            'new_price' => $newPrice,
                            'is_grandfathered' => (bool) ($tenant->planPrice?->is_grandfathered ?? false),
                        ];
                    }),
                    'monthly_price' => $monthly ? [
                        'id' => $monthly->id,
                        'base_price' => (float) $monthly->base_price,
                        'extra_practitioner_price' => (float) $monthly->extra_practitioner_price,
                        'stripe_base_price_id' => $monthly->stripe_base_price_id,
                        'stripe_extra_seat_price_id' => $monthly->stripe_extra_seat_price_id,
                        'is_grandfathered' => (bool) $monthly->is_grandfathered,
                    ] : null,
                    'annual_price' => $annual ? [
                        'id' => $annual->id,
                        'base_price' => (float) $annual->base_price,
                        'extra_practitioner_price' => (float) $annual->extra_practitioner_price,
                        'stripe_base_price_id' => $annual->stripe_base_price_id,
                        'stripe_extra_seat_price_id' => $annual->stripe_extra_seat_price_id,
                        'is_grandfathered' => (bool) $annual->is_grandfathered,
                    ] : null,
                    'features' => $plan->features->map(fn ($f) => [
                        'id' => $f->id,
                        'key' => $f->key,
                        'name' => $f->name,
                        'category' => $f->category,
                        'is_enabled' => (bool) $f->pivot->is_enabled,
                    ]),
                ];
            });

        $allFeatures = Feature::orderBy('category')->orderBy('name')->get();

        return Inertia::render('Admin/Plans/Index', [
            'plans' => $plans,
            'features' => $allFeatures,
            'stripeConfigured' => (bool) config('cashier.secret'),
        ]);
    }

    /**
     * Create a new subscription plan with monthly/annual prices and features.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:50', 'unique:plans,slug'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'badge' => ['nullable', 'string', 'max:50'],
            'display_order' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'included_practitioners' => ['required', 'integer', 'min:1', 'max:100'],
            'max_practitioners' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'allows_extra_practitioners' => ['required', 'boolean'],
            'appointment_limit_monthly' => ['nullable', 'integer', 'min:1'],
            'appointment_limit_behavior' => ['required', 'string', 'in:warn,block'],
            'location_limit' => ['nullable', 'integer', 'min:1'],
            'scribe_allowance_unit' => ['required', 'string', 'in:minutes,sessions'],
            'scribe_allowance_amount' => ['nullable', 'integer', 'min:0'],
            'scribe_limit_behavior' => ['required', 'string', 'in:warn,block'],

            // Pricing
            'monthly_base_price' => ['required', 'numeric', 'min:0'],
            'monthly_extra_seat_price' => ['required', 'numeric', 'min:0'],
            'annual_base_price' => ['required', 'numeric', 'min:0'],
            'annual_extra_seat_price' => ['required', 'numeric', 'min:0'],

            // Features
            'feature_ids' => ['nullable', 'array'],
            'feature_ids.*' => ['string', 'exists:features,id'],
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $plan = DB::transaction(function () use ($validated, $slug, $request) {
            $plan = Plan::create([
                'name' => $validated['name'],
                'slug' => $slug,
                'tagline' => $validated['tagline'] ?? null,
                'description' => $validated['description'] ?? null,
                'badge' => $validated['badge'] ?? null,
                'display_order' => $validated['display_order'],
                'is_active' => $validated['is_active'],
                'trial_days' => $validated['trial_days'],
                'included_practitioners' => $validated['included_practitioners'],
                'max_practitioners' => $validated['max_practitioners'] ?? null,
                'allows_extra_practitioners' => $validated['allows_extra_practitioners'],
                'appointment_limit_monthly' => $validated['appointment_limit_monthly'] ?? null,
                'appointment_limit_behavior' => $validated['appointment_limit_behavior'],
                'location_limit' => $validated['location_limit'] ?? null,
                'scribe_allowance_unit' => $validated['scribe_allowance_unit'],
                'scribe_allowance_amount' => $validated['scribe_allowance_amount'] ?? 0,
                'scribe_limit_behavior' => $validated['scribe_limit_behavior'],
                'needs_review' => false,
                'needs_review_fields' => [],
            ]);

            // Monthly Price
            $plan->prices()->create([
                'interval' => 'month',
                'currency' => 'CAD',
                'base_price' => $validated['monthly_base_price'],
                'extra_practitioner_price' => $validated['monthly_extra_seat_price'],
                'is_active' => true,
                'is_grandfathered' => false,
                'needs_review' => false,
            ]);

            // Annual Price
            $plan->prices()->create([
                'interval' => 'year',
                'currency' => 'CAD',
                'base_price' => $validated['annual_base_price'],
                'extra_practitioner_price' => $validated['annual_extra_seat_price'],
                'is_active' => true,
                'is_grandfathered' => false,
                'needs_review' => false,
            ]);

            // Attach features
            $featureIds = $validated['feature_ids'] ?? [];
            if (! empty($featureIds)) {
                $attachData = [];
                foreach ($featureIds as $fId) {
                    $attachData[$fId] = ['is_enabled' => true];
                }
                $plan->features()->sync($attachData);
            }

            // Sync to Stripe if configured
            try {
                $this->syncService->syncPlan($plan);
            } catch (\Throwable $e) {
                report($e);
            }

            AuditEvent::create([
                'user_id' => $request->user()?->id,
                'action' => 'plan.created',
                'resource_type' => Plan::class,
                'resource_id' => $plan->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'monthly_base' => $validated['monthly_base_price'],
                    'annual_base' => $validated['annual_base_price'],
                ],
            ]);

            return $plan;
        });

        return back()->with('success', "Plan {$plan->name} created successfully.");
    }

    /**
     * Update an existing subscription plan.
     * Clears needs_review on saved fields and creates new Stripe prices if price changed (grandfathering).
     */
    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'badge' => ['nullable', 'string', 'max:50'],
            'display_order' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'included_practitioners' => ['required', 'integer', 'min:1', 'max:100'],
            'max_practitioners' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'allows_extra_practitioners' => ['required', 'boolean'],
            'appointment_limit_monthly' => ['nullable', 'integer', 'min:1'],
            'appointment_limit_behavior' => ['required', 'string', 'in:warn,block'],
            'location_limit' => ['nullable', 'integer', 'min:1'],
            'scribe_allowance_unit' => ['required', 'string', 'in:minutes,sessions'],
            'scribe_allowance_amount' => ['nullable', 'integer', 'min:0'],
            'scribe_limit_behavior' => ['required', 'string', 'in:warn,block'],

            // Pricing
            'monthly_base_price' => ['required', 'numeric', 'min:0'],
            'monthly_extra_seat_price' => ['required', 'numeric', 'min:0'],
            'annual_base_price' => ['required', 'numeric', 'min:0'],
            'annual_extra_seat_price' => ['required', 'numeric', 'min:0'],

            // Features
            'feature_ids' => ['nullable', 'array'],
            'feature_ids.*' => ['string', 'exists:features,id'],
            'clear_review' => ['nullable', 'boolean'],
        ]);

        $oldValues = [
            'name' => $plan->name,
            'is_active' => $plan->is_active,
            'needs_review' => $plan->needs_review,
            'needs_review_fields' => $plan->needs_review_fields,
            'monthly_base' => $plan->monthlyPrice?->base_price,
            'annual_base' => $plan->annualPrice?->base_price,
        ];

        DB::transaction(function () use ($plan, $validated, $request, $oldValues) {
            // Check review fields to clear upon admin saving
            $currentReviewFields = (array) ($plan->needs_review_fields ?? []);
            $fieldsBeingSaved = [
                'location_limit',
                'scribe_allowance_amount',
                'appointment_limit_monthly',
                'extra_practitioner_price',
            ];
            $remainingReviewFields = array_values(array_diff($currentReviewFields, $fieldsBeingSaved));

            if (! empty($validated['clear_review'])) {
                $remainingReviewFields = [];
            }

            $plan->update([
                'name' => $validated['name'],
                'tagline' => $validated['tagline'] ?? null,
                'description' => $validated['description'] ?? null,
                'badge' => $validated['badge'] ?? null,
                'display_order' => $validated['display_order'],
                'is_active' => $validated['is_active'],
                'trial_days' => $validated['trial_days'],
                'included_practitioners' => $validated['included_practitioners'],
                'max_practitioners' => $validated['max_practitioners'] ?? null,
                'allows_extra_practitioners' => $validated['allows_extra_practitioners'],
                'appointment_limit_monthly' => $validated['appointment_limit_monthly'] ?? null,
                'appointment_limit_behavior' => $validated['appointment_limit_behavior'],
                'location_limit' => $validated['location_limit'] ?? null,
                'scribe_allowance_unit' => $validated['scribe_allowance_unit'],
                'scribe_allowance_amount' => $validated['scribe_allowance_amount'] ?? 0,
                'scribe_limit_behavior' => $validated['scribe_limit_behavior'],
                'needs_review' => count($remainingReviewFields) > 0,
                'needs_review_fields' => $remainingReviewFields,
            ]);

            // Price change with Grandfathering Rule (Correction 1 & Phase 5A):
            // Monthly Price
            $monthly = $plan->monthlyPrice;
            if ($monthly) {
                $newMonthlyBase = (float) $validated['monthly_base_price'];
                $newMonthlySeat = (float) $validated['monthly_extra_seat_price'];

                if ((float) $monthly->base_price !== $newMonthlyBase || (float) $monthly->extra_practitioner_price !== $newMonthlySeat) {
                    $this->syncService->updatePlanPrice($monthly, $newMonthlyBase, $newMonthlySeat);
                }
            }

            // Annual Price
            $annual = $plan->annualPrice;
            if ($annual) {
                $newAnnualBase = (float) $validated['annual_base_price'];
                $newAnnualSeat = (float) $validated['annual_extra_seat_price'];

                if ((float) $annual->base_price !== $newAnnualBase || (float) $annual->extra_practitioner_price !== $newAnnualSeat) {
                    $this->syncService->updatePlanPrice($annual, $newAnnualBase, $newAnnualSeat);
                }
            }

            // Sync features
            $featureIds = $validated['feature_ids'] ?? [];
            $attachData = [];
            foreach ($featureIds as $fId) {
                $attachData[$fId] = ['is_enabled' => true];
            }
            $plan->features()->sync($attachData);

            // Re-sync plan attributes to Stripe
            try {
                $this->syncService->syncPlan($plan);
            } catch (\Throwable $e) {
                report($e);
            }

            AuditEvent::create([
                'user_id' => $request->user()?->id,
                'action' => 'plan.updated',
                'resource_type' => Plan::class,
                'resource_id' => $plan->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'old' => $oldValues,
                    'new' => [
                        'name' => $plan->name,
                        'is_active' => $plan->is_active,
                        'needs_review' => $plan->needs_review,
                        'needs_review_fields' => $plan->needs_review_fields,
                        'monthly_base' => $validated['monthly_base_price'],
                        'annual_base' => $validated['annual_base_price'],
                    ],
                ],
            ]);
        });

        return back()->with('success', "Plan {$plan->name} updated successfully.");
    }

    /**
     * Delete or deactivate a plan.
     * Plans with subscribers CANNOT be deleted, only deactivated.
     */
    public function destroy(Plan $plan): RedirectResponse
    {
        $subscriberCount = $plan->tenants()->count();

        if ($subscriberCount > 0) {
            return back()->withErrors([
                'plan' => "Cannot delete {$plan->name}: it currently has {$subscriberCount} clinic subscriber(s). You can deactivate the plan instead to hide it from new registrations while preserving access for existing clinics.",
            ]);
        }

        DB::transaction(function () use ($plan) {
            $planName = $plan->name;
            $planId = $plan->id;

            $plan->features()->detach();
            $plan->prices()->delete();
            $plan->delete();

            AuditEvent::create([
                'user_id' => auth()->id(),
                'action' => 'plan.deleted',
                'resource_type' => Plan::class,
                'resource_id' => $planId,
                'ip_address' => request()->ip(),
                'metadata' => [
                    'deleted_plan_name' => $planName,
                ],
            ]);
        });

        return redirect()->route('admin.plans.index')->with('success', "Plan {$plan->name} deleted.");
    }

    /**
     * Move existing subscribers to the latest active price (migrate from grandfathered price).
     */
    public function migrateSubscribers(Request $request, Plan $plan): RedirectResponse
    {
        $activeMonthly = $plan->monthlyPrice;
        $activeAnnual = $plan->annualPrice;

        $tenants = $plan->tenants()
            ->where('subscription_status', Tenant::SUBSCRIPTION_ACTIVE)
            ->get();

        $migratedCount = 0;

        DB::transaction(function () use ($tenants, $activeMonthly, $activeAnnual, $plan, &$migratedCount, $request) {
            foreach ($tenants as $tenant) {
                $targetPrice = $tenant->billing_interval === 'year' ? $activeAnnual : $activeMonthly;

                if (! $targetPrice) {
                    continue;
                }

                $oldPriceId = $tenant->plan_price_id;

                if ($tenant->plan_price_id !== $targetPrice->id) {
                    $tenant->update(['plan_price_id' => $targetPrice->id]);

                    try {
                        $this->billingGateway->syncSubscriptionQuantities($tenant);
                    } catch (\Throwable $e) {
                        report($e);
                    }

                    AuditEvent::create([
                        'tenant_id' => $tenant->id,
                        'user_id' => $request->user()?->id,
                        'action' => 'subscriber.price_migrated',
                        'resource_type' => Tenant::class,
                        'resource_id' => $tenant->id,
                        'ip_address' => $request->ip(),
                        'metadata' => [
                            'plan_id' => $plan->id,
                            'old_price_id' => $oldPriceId,
                            'new_price_id' => $targetPrice->id,
                            'interval' => $tenant->billing_interval,
                        ],
                    ]);

                    $migratedCount++;
                }
            }
        });

        return back()->with('success', "Successfully migrated {$migratedCount} subscriber(s) on {$plan->name} to the current price.");
    }

    /**
     * Manually trigger Stripe sync for a specific plan.
     */
    public function syncStripe(Plan $plan): RedirectResponse
    {
        try {
            $this->syncService->syncPlan($plan);

            AuditEvent::create([
                'user_id' => auth()->id(),
                'action' => 'plan.stripe_synced',
                'resource_type' => Plan::class,
                'resource_id' => $plan->id,
                'ip_address' => request()->ip(),
                'metadata' => [
                    'plan_name' => $plan->name,
                    'stripe_product_id' => $plan->stripe_product_id,
                ],
            ]);

            return back()->with('success', "Stripe product and prices synced for {$plan->name}.");
        } catch (\Throwable $e) {
            report($e);
            return back()->withErrors(['stripe_sync' => "Stripe sync failed: {$e->getMessage()}"]);
        }
    }

    /**
     * Re-sync all active plans with Stripe.
     */
    public function syncAllStripe(): RedirectResponse
    {
        $plans = Plan::where('is_active', true)->get();
        $errors = [];

        foreach ($plans as $plan) {
            try {
                $this->syncService->syncPlan($plan);
            } catch (\Throwable $e) {
                $errors[] = "{$plan->name}: {$e->getMessage()}";
            }
        }

        if (! empty($errors)) {
            return back()->withErrors(['stripe_sync' => 'Some plans failed to sync: ' . implode('; ', $errors)]);
        }

        return back()->with('success', "All active plans synced with Stripe successfully.");
    }
}
