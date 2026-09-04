<?php

namespace App\Http\Controllers;

use App\Billing\PlanPricing;
use App\Billing\PlatformBilling;
use App\Models\SubscriptionTierConfig;
use App\Models\Tenant;
use App\Services\ClinicSubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
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

        // 1. Subscription details
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);
        $subscriptionDetails = [
            'status' => $tenant->subscription_status ?? Tenant::SUBSCRIPTION_NONE,
            'is_active' => $subscription?->active() ?? false,
            'on_grace_period' => $subscription?->onGracePeriod() ?? false,
            'ends_at' => $subscription?->ends_at?->format('M j, Y'),
            'current_period_end' => $subscription ? date('M j, Y', $subscription->asStripeSubscription()->current_period_end) : null,
            'plan_tier' => $tenant->plan_tier ?? Tenant::PLAN_PRACTICE,
            'plan_name' => $tenant->planName(),
            'full_time_practitioners_count' => $tenant->full_time_practitioners_count ?? 1,
            'part_time_practitioners_count' => $tenant->part_time_practitioners_count ?? 0,
            'breakdown' => $tenant->monthlyBillableBreakdown(),
        ];

        // 2. Default Payment Method on file
        $paymentMethod = null;
        $intentClientSecret = null;

        if ($tenant->stripe_id) {
            try {
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

                // SetupIntent for updating card
                $setupIntent = $tenant->createSetupIntent();
                $intentClientSecret = $setupIntent->client_secret;
            } catch (\Throwable $e) {
                report($e);
            }
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
                        'download_url' => route('app.billing.invoice', ['invoice' => $inv->id]),
                        'hosted_invoice_url' => $inv->hosted_invoice_url,
                    ];
                }
            } catch (\Throwable $e) {
                report($e);
            }
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
            'tiers' => array_values(SubscriptionTierConfig::allTiers()),
        ]);
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

        // If clinic has an active subscription, sync Stripe line items immediately
        if ($tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION)?->active()) {
            $billingGateway->syncSubscriptionQuantities($tenant);
        }

        return back()->with('success', 'Your clinic subscription plan has been updated.');
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
}
