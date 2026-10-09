<?php

namespace App\Http\Controllers;

use App\Billing\PlanPricing;
use App\Billing\PlatformBilling;
use App\Models\Location;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use App\Services\ClinicSubscriptionService;
use App\Services\PlanEntitlements;
use App\Models\AddOn;
use App\Models\TenantAddOn;
use App\Models\StaffMembership;
use Illuminate\Support\Carbon;
use App\Billing\DynamicPlanPricing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Notifications\PlanUpgradeReceiptNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Cashier;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ClinicBillingController extends Controller
{
    /**
     * Display the clinic subscription, payment methods, and invoice history.
     */
    public function show(Request $request): Response
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();
        $entitlements = app(PlanEntitlements::class);

        // 1. Subscription details
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);
        $subscriptionDetails = [
            'status' => $tenant->subscription_status ?? Tenant::SUBSCRIPTION_NONE,
            'is_active' => $subscription?->active() ?? false,
            'on_grace_period' => $subscription?->onGracePeriod() ?? false,
            'ends_at' => $subscription?->ends_at?->format('M j, Y'),
            'data_deletion_date' => $subscription?->ends_at ? $subscription->ends_at->copy()->addDays(30)->format('M j, Y') : null,
            'current_period_end' => $subscription ? date('M j, Y', $subscription->asStripeSubscription()->current_period_end) : null,
            'plan_id' => $tenant->plan_id,
            'billing_interval' => $tenant->billing_interval ?? 'month',
            'extra_practitioner_seats' => $tenant->extra_practitioner_seats ?? 0,
            'plan_tier' => $tenant->plan_tier ?? Tenant::PLAN_PRACTICE,
            'plan_name' => $tenant->planName(),
            'full_time_practitioners_count' => $tenant->full_time_practitioners_count ?? 1,
            'part_time_practitioners_count' => $tenant->part_time_practitioners_count ?? 0,
            'breakdown' => $tenant->monthlyBillableBreakdown(),
        ];

        // 2. Default Payment Method on file
        $paymentMethod = null;
        $intentClientSecret = null;

        try {
            if ($tenant->stripe_id) {
                $defaultPm = $tenant->defaultPaymentMethod();
                if ($defaultPm) {
                    $paymentMethod = [
                        'id' => $defaultPm->id,
                        'brand' => ucfirst($defaultPm->card->brand ?? 'Card'),
                        'last4' => $defaultPm->card->last4 ?? '••••',
                        'exp_month' => $defaultPm->card->exp_month ?? null,
                        'exp_year' => $defaultPm->card->exp_year ?? null,
                    ];
                }
            }

            // Always create/ensure customer and generate SetupIntent for adding or updating card
            if (config('cashier.key') && config('cashier.secret')) {
                if (! $tenant->stripe_id) {
                    $tenant->createOrGetStripeCustomer([
                        'email' => $tenant->email ?? $request->user()?->email,
                        'name' => $tenant->name,
                    ]);
                }

                $setupIntent = $tenant->createSetupIntent();
                $intentClientSecret = $setupIntent->client_secret;
            }
        } catch (\Throwable $e) {
            report($e);
        }

        // 3. Past Invoices History
        $invoices = [];
        if ($tenant->stripe_id) {
            try {
                $stripeInvoices = $tenant->invoices();
                foreach ($stripeInvoices as $inv) {
                    $invoices[] = [
                        'id' => $inv->id,
                        'number' => $inv->number ?: $inv->id,
                        'date' => $inv->date()->format('M j, Y'),
                        'total' => $inv->total(),
                        'raw_total' => $inv->rawTotal(),
                        'currency' => strtoupper($inv->currency),
                        'status' => $inv->status, // 'paid', 'open', etc.
                        'download_url' => route('app.billing.invoice', ['tenant' => $tenant->subdomain, 'invoice' => $inv->id]),
                        'hosted_invoice_url' => $inv->hosted_invoice_url,
                    ];
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        // 4. Usage Metrics for Gauges
        $currentAppointments = $entitlements->countMonthlyAppointments($tenant);
        $appointmentLimit = $tenant->plan?->appointment_limit_monthly;
        $appointmentUsage = [
            'count' => $currentAppointments,
            'limit' => $appointmentLimit,
            'unlimited' => empty($appointmentLimit),
            'percent' => $appointmentLimit ? min(100, round(($currentAppointments / $appointmentLimit) * 100)) : 0,
        ];

        $scribeStatus = $entitlements->checkScribeAllowance($tenant);
        $scribeAllowance = $scribeStatus['allowance_minutes'];
        $scribeUsage = [
            'used_minutes' => $scribeStatus['used_minutes'],
            'allowance_minutes' => $scribeAllowance,
            'remaining_minutes' => $scribeStatus['remaining_minutes'],
            'unlimited' => $scribeStatus['unlimited'],
            'percent' => ($scribeAllowance && $scribeAllowance > 0) ? min(100, round(($scribeStatus['used_minutes'] / $scribeAllowance) * 100)) : 0,
        ];

        $activePractitioners = $entitlements->countPractitionerSeats($tenant);
        $includedPractitioners = $tenant->plan?->included_practitioners ?? 1;
        $maxPractitioners = $tenant->plan?->max_practitioners;
        $practitionerUsage = [
            'current_count' => $activePractitioners,
            'included_count' => $includedPractitioners,
            'extra_seats' => $tenant->extra_practitioner_seats ?? 0,
            'max_count' => $maxPractitioners,
        ];

        $activeLocations = Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->count();
        $locationLimit = $tenant->plan?->location_limit;
        $locationUsage = [
            'current_count' => $activeLocations,
            'limit' => $locationLimit,
            'unlimited' => empty($locationLimit),
        ];

        // Apply scheduled plan change if due
        if ($tenant->scheduled_plan_id && $tenant->scheduled_change_at && $tenant->scheduled_change_at->isPast()) {
            $this->applyScheduledPlanIfDue($tenant, app(PlatformBilling::class));
            $tenant->refresh();
        }

        // 5. Active Dynamic Plans from DB (with granular placeholder masking)
        $dbPlans = Plan::with(['monthlyPrice', 'annualPrice', 'enabledFeatures'])
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();

        $downgradeBlockedMap = [];
        $blockReasonMap = [];
        foreach ($dbPlans as $p) {
            if ($tenant->plan && $p->display_order < $tenant->plan->display_order) {
                $downgradeBlockedMap[$p->id] = true;
                $blockReasonMap[$p->id] = "Direct downgrades from {$tenant->plan->name} to {$p->name} are not permitted. To switch to {$p->name}, you can cancel your current subscription and activate {$p->name} at the end of your billing cycle.";
            } elseif ($p->max_practitioners !== null && $activePractitioners > $p->max_practitioners) {
                $downgradeBlockedMap[$p->id] = true;
                $blockReasonMap[$p->id] = "Your clinic has {$activePractitioners} practitioners, but this plan allows at most {$p->max_practitioners}. Please reduce practitioners first.";
            } elseif ($p->location_limit !== null && $activeLocations > $p->location_limit) {
                $downgradeBlockedMap[$p->id] = true;
                $blockReasonMap[$p->id] = "Your clinic has {$activeLocations} active locations, but this plan allows at most {$p->location_limit}. Please remove locations first.";
            }
        }

        $plans = \App\Support\PlanPresenter::collectionForDisplay($dbPlans, [
            'downgrade_blocked' => $downgradeBlockedMap,
            'block_reasons' => $blockReasonMap,
        ]);

        // 6. Clinic practitioners for AI Scribe+ per practitioner management
        $practitioners = StaffMembership::withoutGlobalScopes()
            ->with(['user', 'practitionerProfile'])
            ->where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->where('role', StaffMembership::ROLE_PRACTITIONER)
                    ->orWhere('role', StaffMembership::ROLE_CLINIC_OWNER);
            })
            ->whereIn('status', [StaffMembership::STATUS_ACTIVE, StaffMembership::STATUS_INVITED])
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->user?->name ?? 'Staff Member',
                'email' => $m->user?->email ?? '',
                'role' => $m->role,
                'status' => $m->status,
                'has_scribe_plus' => (bool) $m->has_scribe_plus,
            ]);

        // 7. Scribe+ add-on details
        $scribeAddOn = AddOn::where('slug', 'scribe_plus')->first();
        $tenantScribeAddOn = $scribeAddOn ? TenantAddOn::where('tenant_id', $tenant->id)->where('add_on_id', $scribeAddOn->id)->first() : null;
        $scribeAddonData = $scribeAddOn ? [
            'id' => $scribeAddOn->id,
            'slug' => $scribeAddOn->slug,
            'name' => $scribeAddOn->name,
            'price_monthly' => (float) $scribeAddOn->price_monthly,
            'price_annual' => (float) $scribeAddOn->price_annual,
            'active_seats' => $tenantScribeAddOn && $tenantScribeAddOn->status === 'active' ? (int) $tenantScribeAddOn->quantity : 0,
            'is_active' => $tenantScribeAddOn && $tenantScribeAddOn->status === 'active' && $tenantScribeAddOn->quantity > 0,
        ] : null;

        // 8. Scheduled plan change details
        $scheduledChangeData = null;
        if ($tenant->scheduled_plan_id && $tenant->scheduledPlan) {
            $scheduledChangeData = [
                'plan_name' => $tenant->scheduledPlan->name,
                'plan_id' => $tenant->scheduled_plan_id,
                'billing_interval' => $tenant->scheduled_billing_interval ?? 'month',
                'extra_seats' => $tenant->scheduled_extra_seats ?? 0,
                'change_at' => $tenant->scheduled_change_at?->format('M j, Y'),
                'is_due' => $tenant->scheduled_change_at ? $tenant->scheduled_change_at->isPast() : false,
            ];
        }

        return Inertia::render('Settings/Billing', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
            ],
            'subscription' => $subscriptionDetails,
            'paymentMethod' => $paymentMethod,
            'setupIntentSecret' => $intentClientSecret,
            'stripeKey' => config('cashier.key'),
            'invoices' => $invoices,
            'plans' => $plans,
            'usage' => [
                'appointments' => $appointmentUsage,
                'scribe' => $scribeUsage,
                'practitioners' => $practitionerUsage,
                'locations' => $locationUsage,
            ],
            'tiers' => [],
            'practitioners' => $practitioners,
            'scribeAddon' => $scribeAddonData,
            'scheduledPlanChange' => $scheduledChangeData,
        ]);
    }

    /**
     * Preview plan switch proration and price change.
     */
    public function previewPlanChange(Request $request): \Illuminate\Http\JsonResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();
        $entitlements = app(PlanEntitlements::class);

        $validated = $request->validate([
            'plan_id' => ['required', 'string', 'exists:plans,id'],
            'billing_interval' => ['required', 'string', 'in:month,year'],
            'extra_practitioner_seats' => ['nullable', 'integer', 'min:0'],
        ]);

        $targetPlan = Plan::with('prices')->findOrFail($validated['plan_id']);
        $interval = $validated['billing_interval'];
        $extraSeats = (int) ($validated['extra_practitioner_seats'] ?? 0);

        // Check downgrade constraints
        $activePractitioners = $entitlements->countPractitionerSeats($tenant);
        if ($targetPlan->max_practitioners !== null && $activePractitioners > $targetPlan->max_practitioners) {
            return response()->json([
                'allowed' => false,
                'reason' => "Cannot change to {$targetPlan->name}: your clinic currently has {$activePractitioners} practitioners, but this plan allows at most {$targetPlan->max_practitioners}. Please reduce practitioners before changing plans.",
            ], 422);
        }

        $activeLocations = Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->count();
        if ($targetPlan->location_limit !== null && $activeLocations > $targetPlan->location_limit) {
            return response()->json([
                'allowed' => false,
                'reason' => "Cannot change to {$targetPlan->name}: your clinic currently has {$activeLocations} active locations, but this plan allows at most {$targetPlan->location_limit}. Please remove unused locations before changing plans.",
            ], 422);
        }

        if (! $targetPlan->allows_extra_practitioners && $extraSeats > 0) {
            return response()->json([
                'allowed' => false,
                'reason' => "{$targetPlan->name} does not allow extra practitioner seats.",
            ], 422);
        }

        if ($targetPlan->max_practitioners !== null && ($targetPlan->included_practitioners + $extraSeats) > $targetPlan->max_practitioners) {
            return response()->json([
                'allowed' => false,
                'reason' => "Maximum practitioner limit for {$targetPlan->name} is {$targetPlan->max_practitioners}.",
            ], 422);
        }

        $currentPlan = $tenant->plan;
        $isDowngrade = ($currentPlan && $targetPlan->display_order < $currentPlan->display_order);

        if ($isDowngrade) {
            return response()->json([
                'allowed' => false,
                'is_downgrade' => true,
                'current_plan_name' => $currentPlan->name,
                'target_plan_name' => $targetPlan->name,
                'reason' => "Direct downgrades from {$currentPlan->name} to {$targetPlan->name} are not permitted. To switch to the {$targetPlan->name} plan, please cancel your current subscription. You will keep {$currentPlan->name} access until your billing cycle ends, then you can activate {$targetPlan->name}.",
            ], 422);
        }

        $practitionersCount = ($targetPlan->included_practitioners ?? 1) + $extraSeats;
        $breakdown = DynamicPlanPricing::calculateBreakdown($targetPlan, $interval, $practitionersCount, [], $tenant->promoCode);
        $proration = DynamicPlanPricing::calculateUpgradeProration(
            $tenant,
            $targetPlan,
            $interval,
            (float) $breakdown['total']
        );

        return response()->json([
            'allowed' => true,
            'is_downgrade' => false,
            'plan_name' => $targetPlan->name,
            'billing_interval' => $interval,
            'extra_seats' => $extraSeats,
            'breakdown' => $breakdown,
            'proration' => $proration,
        ]);
    }

    /**
     * Generate a new SetupIntent client secret on demand for card entry/updates.
     */
    public function createSetupIntent(Request $request): \Illuminate\Http\JsonResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();

        try {
            if (! config('cashier.key') || ! config('cashier.secret')) {
                return response()->json([
                    'error' => 'Stripe credentials are not configured.',
                ], 500);
            }

            if (! $tenant->stripe_id) {
                $tenant->createOrGetStripeCustomer([
                    'email' => $tenant->email ?? $request->user()?->email,
                    'name' => $tenant->name,
                ]);
            }

            $setupIntent = $tenant->createSetupIntent();

            return response()->json([
                'client_secret' => $setupIntent->client_secret,
                'publishable_key' => config('cashier.key'),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'error' => 'Could not initialize payment setup: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upgrade or change subscription plan and practitioner seats.
     */
    public function updatePlan(
        Request $request,
        ClinicSubscriptionService $subscriptionService,
        PlatformBilling $billingGateway
    ): RedirectResponse {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();
        $entitlements = app(PlanEntitlements::class);

        // Dynamic plan update
        if ($request->has('plan_id')) {
            $validated = $request->validate([
                'plan_id' => ['required', 'string', 'exists:plans,id'],
                'billing_interval' => ['required', 'string', 'in:month,year'],
                'extra_practitioner_seats' => ['nullable', 'integer', 'min:0'],
            ]);

            $targetPlan = Plan::with('prices')->findOrFail($validated['plan_id']);
            $interval = $validated['billing_interval'];
            $extraSeats = (int) ($validated['extra_practitioner_seats'] ?? 0);

            // Constraint: active practitioners vs max_practitioners
            $activePractitioners = $entitlements->countPractitionerSeats($tenant);
            if ($targetPlan->max_practitioners !== null && $activePractitioners > $targetPlan->max_practitioners) {
                throw ValidationException::withMessages([
                    'plan_id' => "Cannot change to {$targetPlan->name}: your clinic currently has {$activePractitioners} practitioners, but this plan allows at most {$targetPlan->max_practitioners}. Please reduce practitioners first.",
                ]);
            }

            // Constraint: locations vs location_limit
            $activeLocations = Location::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->count();
            if ($targetPlan->location_limit !== null && $activeLocations > $targetPlan->location_limit) {
                throw ValidationException::withMessages([
                    'plan_id' => "Cannot change to {$targetPlan->name}: your clinic currently has {$activeLocations} active locations, but this plan allows at most {$targetPlan->location_limit}. Please remove unused locations first.",
                ]);
            }

            // Constraint: extra seats allowed
            if (! $targetPlan->allows_extra_practitioners && $extraSeats > 0) {
                throw ValidationException::withMessages([
                    'extra_practitioner_seats' => "{$targetPlan->name} does not allow extra practitioner seats.",
                ]);
            }

            if ($targetPlan->max_practitioners !== null && ($targetPlan->included_practitioners + $extraSeats) > $targetPlan->max_practitioners) {
                throw ValidationException::withMessages([
                    'extra_practitioner_seats' => "Maximum practitioner limit for {$targetPlan->name} is {$targetPlan->max_practitioners}.",
                ]);
            }

            $currentPlan = $tenant->plan;
            $currentInterval = $tenant->billing_interval ?? 'month';
            $currentExtraSeats = (int) ($tenant->extra_practitioner_seats ?? 0);

            // Is this a monthly <-> annual cadence switch?
            $isCadenceSwitch = ($currentInterval !== $interval);

            // Calculate current monthly-equivalent cost vs new monthly-equivalent cost
            $currentMonthlyCost = 0.0;
            if ($currentPlan) {
                $currBreakdown = DynamicPlanPricing::calculateBreakdown(
                    $currentPlan,
                    $currentInterval,
                    ($currentPlan->included_practitioners ?? 1) + $currentExtraSeats,
                    [],
                    $tenant->promoCode
                );
                $currentMonthlyCost = $currentInterval === 'year'
                    ? ($currBreakdown['total'] / 12)
                    : $currBreakdown['total'];
            }

            $newBreakdown = DynamicPlanPricing::calculateBreakdown(
                $targetPlan,
                $interval,
                ($targetPlan->included_practitioners ?? 1) + $extraSeats,
                [],
                $tenant->promoCode
            );
            $newMonthlyCost = $interval === 'year'
                ? ($newBreakdown['total'] / 12)
                : $newBreakdown['total'];

            // Direct downgrades to a lower tier are not permitted per policy
            $isDowngrade = ($currentPlan && ($targetPlan->display_order < $currentPlan->display_order));
            if ($isDowngrade) {
                throw ValidationException::withMessages([
                    'plan_id' => "Direct downgrades from {$currentPlan->name} to {$targetPlan->name} are not permitted. To switch to the {$targetPlan->name} plan, please cancel your current subscription. You will retain access until the end of your billing cycle, after which you can activate {$targetPlan->name}.",
                ]);
            }

            $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

            // Cadence switch on the same plan (e.g. monthly <-> annual) takes effect at period end
            if ($currentPlan && $targetPlan->id === $currentPlan->id && $isCadenceSwitch && $subscription && $subscription->active()) {
                try {
                    $periodEnd = Carbon::createFromTimestamp(
                        $subscription->asStripeSubscription()->current_period_end ?? (time() + 30 * 86400)
                    );
                } catch (\Throwable) {
                    $periodEnd = now()->addMonth();
                }

                $tenant->update([
                    'scheduled_plan_id' => $targetPlan->id,
                    'scheduled_billing_interval' => $interval,
                    'scheduled_extra_seats' => $extraSeats,
                    'scheduled_change_at' => $periodEnd,
                ]);

                return back()->with('success', "Billing cadence switch to {$interval}ly has been scheduled and will take effect at the end of your current period on {$periodEnd->format('M j, Y')}.");
            }

            // Calculate custom upgrade proration
            $proration = DynamicPlanPricing::calculateUpgradeProration(
                $tenant,
                $targetPlan,
                $interval,
                (float) $newBreakdown['total']
            );

            // Upgrades take effect immediately
            $tenant->update([
                'plan_id' => $targetPlan->id,
                'billing_interval' => $interval,
                'extra_practitioner_seats' => $extraSeats,
                'plan_tier' => $targetPlan->slug,
                'plan_started_at' => now(),
                'scheduled_plan_id' => null,
                'scheduled_billing_interval' => null,
                'scheduled_extra_seats' => null,
                'scheduled_change_at' => null,
            ]);

            // Sync with Stripe
            if ($subscription?->active()) {
                if ($proration['unused_credit'] > 0) {
                    try {
                        $unusedCreditCents = (int) round($proration['unused_credit'] * 100);
                        if ($tenant->stripe_id) {
                            $stripeCustomer = $tenant->asStripeCustomer();
                            if ($stripeCustomer) {
                                \Stripe\Customer::update($tenant->stripe_id, [
                                    'balance' => ($stripeCustomer->balance ?? 0) - $unusedCreditCents,
                                ]);
                            }
                        }
                    } catch (\Throwable $e) {
                        report($e);
                    }
                }

                $billingGateway->syncSubscriptionQuantities($tenant, true);
            }

            // Automatically send payment receipt email to user/owner
            try {
                $recipient = $request->user()
                    ?? $tenant->staffMemberships()->where('role', StaffMembership::ROLE_CLINIC_OWNER)->first()?->user;

                if ($recipient) {
                    $recipient->notify(new PlanUpgradeReceiptNotification(
                        $tenant,
                        $targetPlan,
                        $proration,
                        $newBreakdown,
                        $currentPlan,
                        $interval,
                        $extraSeats
                    ));
                } elseif ($tenant->email) {
                    Notification::route('mail', $tenant->email)->notify(new PlanUpgradeReceiptNotification(
                        $tenant,
                        $targetPlan,
                        $proration,
                        $newBreakdown,
                        $currentPlan,
                        $interval,
                        $extraSeats
                    ));
                }
            } catch (\Throwable $e) {
                report($e);
            }

            $successMsg = $proration['unused_credit'] > 0
                ? "Your subscription has been upgraded to {$targetPlan->name}. Unused credit of \${$proration['unused_credit']} CAD was deducted ({$proration['units_used']} {$proration['units_label']} used). Amount charged today: {$proration['net_amount_due_formatted']}."
                : "Your subscription has been upgraded to {$targetPlan->name}. Amount charged today: {$proration['net_amount_due_formatted']}.";

            return back()->with('success', $successMsg);
        }

        // Legacy fallback
        $validated = $request->validate([
            'plan_tier' => ['required', 'string', 'in:balance,practice,thrive'],
            'full_time_practitioners_count' => ['required', 'integer', 'min:1', 'max:100'],
            'part_time_practitioners_count' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $newTier = $validated['plan_tier'];
        $ft = (int) $validated['full_time_practitioners_count'];
        $pt = (int) $validated['part_time_practitioners_count'];

        // Balance hardcap rule: max 1 practitioner only
        if ($newTier === Tenant::PLAN_BALANCE && ($ft + $pt) > 1) {
            throw ValidationException::withMessages([
                'plan_tier' => 'The Balance plan is limited to 1 practitioner only.',
            ]);
        }

        $tenant->update([
            'plan_tier' => $newTier,
            'full_time_practitioners_count' => $ft,
            'part_time_practitioners_count' => $pt,
            'estimated_practitioner_count' => $ft + $pt,
        ]);

        if ($tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION)?->active()) {
            $billingGateway->syncSubscriptionQuantities($tenant);
        }

        return back()->with('success', 'Your clinic subscription plan has been updated.');
    }

    /**
     * Cancel subscription at the end of the current billing cycle.
     */
    public function cancelSubscription(Request $request): RedirectResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

        if ($subscription && $subscription->active()) {
            try {
                $subscription->cancel();
            } catch (\Throwable $e) {
                if (app()->environment('testing') || str_contains($e->getMessage(), 'No such subscription')) {
                    $subscription->fill([
                        'ends_at' => now()->addMonth(),
                    ])->save();
                } else {
                    throw $e;
                }
            }

            if ($request->filled('reason')) {
                \Illuminate\Support\Facades\Log::info("Tenant [{$tenant->id} - {$tenant->name}] canceled subscription. Reason: {$request->input('reason')}");
            }

            return back()->with('success', 'Your subscription has been canceled. Your workspace remains active until the end of your billing cycle. After that date, access will be locked and all clinic records will be permanently removed in 30 days unless reactivated.');
        }

        return back()->withErrors(['cancel' => 'No active subscription found to cancel.']);
    }

    /**
     * Resume a canceled subscription before the period end.
     */
    public function resumeSubscription(Request $request): RedirectResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

        if ($subscription && $subscription->onGracePeriod()) {
            $subscription->resume();

            return back()->with('success', 'Your subscription has been resumed successfully.');
        }

        return back()->withErrors(['resume' => 'Subscription cannot be resumed.']);
    }

    /**
     * Update default card on file.
     */
    public function updatePaymentMethod(Request $request): RedirectResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();

        $validated = $request->validate([
            'payment_method_id' => ['required', 'string'],
        ]);

        try {
            if (! $tenant->stripe_id) {
                $tenant->createOrGetStripeCustomer([
                    'email' => $tenant->email ?? $request->user()?->email,
                    'name' => $tenant->name,
                ]);
            }

            $tenant->updateDefaultPaymentMethod($validated['payment_method_id']);
            $tenant->update(['stripe_pm_id' => $validated['payment_method_id']]);
        } catch (\Throwable $e) {
            report($e);
            return back()->withErrors(['card' => 'Could not update payment method: '.$e->getMessage()]);
        }

        return back()->with('success', 'Your payment method was updated successfully.');
    }

    /**
     * Download or stream Stripe invoice PDF receipt.
     */
    public function downloadInvoice(Request $request, string $invoiceId): SymfonyResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();

        try {
            return $tenant->downloadInvoice($invoiceId, [
                'vendor' => 'UMAHZ Inc.',
                'product' => 'UMAHZ Clinic Platform Subscription',
            ]);
        } catch (\Throwable $e) {
            report($e);

            // Fallback to hosted invoice URL if PDF generation fails locally
            $inv = $tenant->findInvoice($invoiceId);
            if ($inv && $inv->hosted_invoice_url) {
                return redirect()->away($inv->hosted_invoice_url);
            }

            abort(404, 'Invoice could not be retrieved.');
        }
    }

    /**
     * Update AI Scribe+ add-on practitioners and sync quantities on Stripe.
     */
    public function updateScribeAddon(Request $request, PlatformBilling $billingGateway): RedirectResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();

        $validated = $request->validate([
            'practitioner_ids' => ['nullable', 'array'],
            'practitioner_ids.*' => ['string'],
        ]);

        $selectedIds = $validated['practitioner_ids'] ?? [];

        $practitioners = StaffMembership::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->where('role', StaffMembership::ROLE_PRACTITIONER)
                    ->orWhere('role', StaffMembership::ROLE_CLINIC_OWNER);
            })
            ->whereIn('status', [StaffMembership::STATUS_ACTIVE, StaffMembership::STATUS_INVITED])
            ->get();

        foreach ($practitioners as $p) {
            $shouldHave = in_array((string) $p->id, $selectedIds, true);
            if ($p->has_scribe_plus !== $shouldHave) {
                $p->update(['has_scribe_plus' => $shouldHave]);
            }
        }

        $count = count($selectedIds);
        $scribeAddOn = AddOn::where('slug', 'scribe_plus')->first();

        if ($scribeAddOn) {
            $tenantAddOn = TenantAddOn::firstOrNew([
                'tenant_id' => $tenant->id,
                'add_on_id' => $scribeAddOn->id,
            ]);

            $tenantAddOn->fill([
                'quantity' => $count,
                'status' => $count > 0 ? 'active' : 'inactive',
            ])->save();
        }

        if ($tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION)?->active()) {
            try {
                $billingGateway->syncSubscriptionQuantities($tenant, true);
            } catch (\Throwable $e) {
                report($e);
                return back()->withErrors(['card' => 'Payment processing failed: ' . $e->getMessage()])
                    ->with('error', 'Payment processing failed: ' . $e->getMessage());
            }
        }

        $msg = $count > 0
            ? "AI Scribe+ seats updated ({$count} active). Your card on file has been charged with immediate proration."
            : "AI Scribe+ seats updated (0 active). Scribe+ seats have been removed.";

        return back()->with('success', $msg);
    }

    /**
     * Cancel a pending scheduled plan change before period end.
     */
    public function cancelScheduledPlanChange(Request $request): RedirectResponse
    {
        $tenant = $request->get('tenant') ?? $request->user()->tenants()->first();

        $tenant->update([
            'scheduled_plan_id' => null,
            'scheduled_billing_interval' => null,
            'scheduled_extra_seats' => null,
            'scheduled_change_at' => null,
        ]);

        return back()->with('success', 'Scheduled plan change has been canceled.');
    }

    /**
     * Apply scheduled plan change if period end has arrived.
     */
    public function applyScheduledPlanIfDue(Tenant $tenant, PlatformBilling $billingGateway): void
    {
        if ($tenant->scheduled_plan_id && $tenant->scheduled_change_at && $tenant->scheduled_change_at->isPast()) {
            $targetPlan = Plan::find($tenant->scheduled_plan_id);
            if ($targetPlan) {
                $tenant->update([
                    'plan_id' => $targetPlan->id,
                    'billing_interval' => $tenant->scheduled_billing_interval ?? 'month',
                    'extra_practitioner_seats' => $tenant->scheduled_extra_seats ?? 0,
                    'plan_tier' => $targetPlan->slug,
                    'scheduled_plan_id' => null,
                    'scheduled_billing_interval' => null,
                    'scheduled_extra_seats' => null,
                    'scheduled_change_at' => null,
                ]);

                if ($tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION)?->active()) {
                    $billingGateway->syncSubscriptionQuantities($tenant);
                }
            }
        }
    }
}
