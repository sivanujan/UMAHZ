<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\ClinicSubscriptionService;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stripe webhooks for the CLINIC -> UMAHZ platform subscription. Extends
 * Cashier's controller, so signatures are verified against the webhook secret
 * (STRIPE_WEBHOOK_SECRET) and the local `subscriptions` table is kept in sync by
 * the parent handlers. On top of that we mirror the coarse state onto the tenant
 * and suspend a clinic whose subscription is fully canceled/unpaid.
 *
 * Idempotent: every handler maps to a fixed target state, so re-delivering the
 * same event produces the same result.
 */
class StripeWebhookController extends CashierWebhookController
{
    public function __construct(private readonly ClinicSubscriptionService $subscriptions)
    {
        parent::__construct();
    }

    public function handleCustomerSubscriptionUpdated(array $payload): Response
    {
        $response = parent::handleCustomerSubscriptionUpdated($payload);

        $tenant = $this->tenantFromPayload($payload);
        $status = $payload['data']['object']['status'] ?? null;

        if ($tenant) {
            if ($status) {
                $this->syncStatus($tenant, $status);
            }
            $this->syncSubscriptionDetails($tenant, $payload['data']['object'] ?? []);
        }

        return $response;
    }

    public function handleCustomerSubscriptionDeleted(array $payload): Response
    {
        $response = parent::handleCustomerSubscriptionDeleted($payload);

        if ($tenant = $this->tenantFromPayload($payload)) {
            $this->subscriptions->markCanceled($tenant);
        }

        return $response;
    }

    /**
     * A failed charge flags the clinic past_due promptly (grace period) even
     * before Stripe transitions the subscription object.
     */
    public function handleInvoicePaymentFailed(array $payload): Response
    {
        if ($tenant = $this->tenantFromPayload($payload)) {
            $this->subscriptions->markPastDue($tenant);
        }

        return $this->successMethod();
    }

    public function handleInvoicePaymentSucceeded(array $payload): Response
    {
        if ($tenant = $this->tenantFromPayload($payload)) {
            $this->subscriptions->markActive($tenant);

            if ($tenant->scheduled_plan_id) {
                app(\App\Http\Controllers\ClinicBillingController::class)->applyScheduledPlanIfDue($tenant, app(\App\Billing\PlatformBilling::class));
            }
        }

        return $this->successMethod();
    }

    private function syncStatus(Tenant $tenant, string $stripeStatus): void
    {
        match ($stripeStatus) {
            'active', 'trialing' => $this->subscriptions->markActive($tenant),
            'past_due' => $this->subscriptions->markPastDue($tenant),
            'canceled', 'unpaid' => $this->subscriptions->markCanceled($tenant),
            default => null,
        };
    }

    private function tenantFromPayload(array $payload): ?Tenant
    {
        $customerId = $payload['data']['object']['customer'] ?? null;

        return $customerId ? Tenant::where('stripe_id', $customerId)->first() : null;
    }

    private function syncSubscriptionDetails(Tenant $tenant, array $subscriptionData): void
    {
        $items = $subscriptionData['items']['data'] ?? [];
        if (empty($items)) {
            return;
        }

        $updates = [];

        foreach ($items as $item) {
            $priceId = $item['price']['id'] ?? null;
            if (! $priceId) {
                continue;
            }

            $planPrice = \App\Models\PlanPrice::where('stripe_base_price_id', $priceId)
                ->orWhere('stripe_extra_seat_price_id', $priceId)
                ->first();

            if ($planPrice) {
                if ($planPrice->stripe_extra_seat_price_id === $priceId) {
                    $updates['extra_practitioner_seats'] = (int) ($item['quantity'] ?? 0);
                } else {
                    $updates['plan_id'] = $planPrice->plan_id;
                    $updates['billing_interval'] = $planPrice->interval;
                }
            }
        }

        if (! empty($updates)) {
            $tenant->update($updates);
        }
    }
}
