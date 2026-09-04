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

        if ($tenant && $status) {
            $this->syncStatus($tenant, $status);
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
}
