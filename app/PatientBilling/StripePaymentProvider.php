<?php

namespace App\PatientBilling;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\PatientBilling\Contracts\PaymentProvider;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

/**
 * Stripe implementation of the PaymentProvider contract (Stripe Connect). Uses a
 * StripeClient built from the secret key (config/env, never hardcoded). Card
 * charges are DIRECT charges on the clinic's connected account, so funds settle
 * directly to the clinic; the optional application fee (0 at launch) is the
 * platform's cut. This is the only place Stripe's SDK is referenced.
 */
class StripePaymentProvider implements PaymentProvider
{
    private StripeClient $stripe;

    public function __construct(?StripeClient $stripe = null)
    {
        // Reuse the platform secret key (Cashier's config resolves STRIPE_SECRET).
        $this->stripe = $stripe ?? new StripeClient((string) config('cashier.secret'));
    }

    public function createConnectedAccount(Tenant $tenant): string
    {
        $account = $this->stripe->accounts->create([
            'type' => config('patient_billing.connect_account_type', 'express'),
            'email' => $tenant->email ?: $tenant->primary_contact_email,
            'business_type' => 'company',
            'metadata' => [
                'tenant_id' => $tenant->id,
                'tenant_slug' => $tenant->slug,
            ],
            'capabilities' => [
                'card_payments' => ['requested' => true],
                'transfers' => ['requested' => true],
            ],
        ]);

        return $account->id;
    }

    public function createOnboardingLink(string $accountId, string $returnUrl, string $refreshUrl): string
    {
        $link = $this->stripe->accountLinks->create([
            'account' => $accountId,
            'refresh_url' => $refreshUrl,
            'return_url' => $returnUrl,
            'type' => 'account_onboarding',
        ]);

        return $link->url;
    }

    public function getConnectedAccountStatus(string $accountId): ConnectedAccountStatus
    {
        $account = $this->stripe->accounts->retrieve($accountId, []);

        return new ConnectedAccountStatus(
            chargesEnabled: (bool) ($account->charges_enabled ?? false),
            payoutsEnabled: (bool) ($account->payouts_enabled ?? false),
            detailsSubmitted: (bool) ($account->details_submitted ?? false),
        );
    }

    public function chargeInvoice(Invoice $invoice, int $amount, int $applicationFeeAmount): ChargeResult
    {
        $accountId = $invoice->tenant->stripe_connect_account_id;

        $params = [
            'amount' => $amount,
            'currency' => strtolower($invoice->currency),
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => [
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'invoice_number' => (string) $invoice->invoice_number,
            ],
        ];

        // Only attach a fee when one is configured (> 0). At launch this branch
        // is never taken, so 100% of the charge settles to the clinic.
        if ($applicationFeeAmount > 0) {
            $params['application_fee_amount'] = $applicationFeeAmount;
        }

        // Direct charge ON the connected account (Stripe-Account header).
        $intent = $this->stripe->paymentIntents->create($params, [
            'stripe_account' => $accountId,
        ]);

        return new ChargeResult(
            reference: $intent->id,
            clientToken: (string) $intent->client_secret,
            status: (string) $intent->status,
            connectedAccountId: $accountId,
            amount: $amount,
            applicationFeeAmount: $applicationFeeAmount,
            chargeReference: $intent->latest_charge ?? null,
        );
    }

    public function refund(Payment $payment, ?int $amount = null): RefundResult
    {
        $params = ['payment_intent' => $payment->stripe_payment_intent_id];
        if ($amount !== null) {
            $params['amount'] = $amount;
        }

        // The refund is issued on the connected account the charge settled into.
        $refund = $this->stripe->refunds->create($params, [
            'stripe_account' => $payment->stripe_connect_account_id,
        ]);

        return new RefundResult(
            reference: $refund->id,
            amount: (int) ($refund->amount ?? $amount ?? $payment->amount),
            status: (string) ($refund->status ?? 'pending'),
        );
    }

    public function parseWebhook(string $payload, string $signature): WebhookEvent
    {
        $secret = (string) config('patient_billing.connect_webhook_secret');

        if ($secret === '' || $signature === '') {
            throw new WebhookVerificationException('Missing webhook secret or signature.');
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (\UnexpectedValueException|SignatureVerificationException $e) {
            throw new WebhookVerificationException('Invalid webhook signature.', previous: $e);
        }

        $event = (array) json_decode(json_encode($event), true);
        $id = (string) ($event['id'] ?? '');
        $object = $event['data']['object'] ?? [];

        return match ($event['type'] ?? null) {
            'account.updated' => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_ACCOUNT_UPDATED,
                accountId: $object['id'] ?? null,
                accountStatus: new ConnectedAccountStatus(
                    (bool) ($object['charges_enabled'] ?? false),
                    (bool) ($object['payouts_enabled'] ?? false),
                    (bool) ($object['details_submitted'] ?? false),
                ),
            ),
            'payment_intent.succeeded' => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_PAYMENT_SUCCEEDED,
                paymentReference: $object['id'] ?? null,
                chargeReference: $object['latest_charge'] ?? null,
            ),
            'payment_intent.payment_failed' => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_PAYMENT_FAILED,
                paymentReference: $object['id'] ?? null,
            ),
            'charge.refunded' => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_REFUNDED,
                paymentReference: $object['payment_intent'] ?? null,
                chargeReference: $object['id'] ?? null,
            ),
            default => new WebhookEvent(id: $id, type: WebhookEvent::TYPE_UNKNOWN),
        };
    }
}
