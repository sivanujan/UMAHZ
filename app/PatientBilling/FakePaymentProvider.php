<?php

namespace App\PatientBilling;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\PatientBilling\Contracts\PaymentProvider;
use Illuminate\Support\Str;

/**
 * Deterministic, in-memory PaymentProvider for tests: no live processor calls.
 * It records what it was asked to do so tests can assert money routed to the
 * correct connected account and the platform fee was applied (or 0).
 *
 * parseWebhook verifies a Stripe-style "t=...,v1=..." HMAC signature (so webhook
 * rejection is still exercised) and reads a NEUTRAL, already-normalized payload.
 * Real Stripe-shaped payload parsing is covered by StripePaymentProviderTest.
 */
class FakePaymentProvider implements PaymentProvider
{
    /** @var array<int, array<string, mixed>> */
    public array $charges = [];

    /** @var array<int, array<string, mixed>> */
    public array $refunds = [];

    public ConnectedAccountStatus $nextAccountStatus;

    public function __construct()
    {
        // By default, a freshly created account is fully onboarded.
        $this->nextAccountStatus = new ConnectedAccountStatus(true, true, true);
    }

    public function createConnectedAccount(Tenant $tenant): string
    {
        return 'acct_fake_'.Str::lower(Str::random(16));
    }

    public function createOnboardingLink(string $accountId, string $returnUrl, string $refreshUrl): string
    {
        return 'https://connect.test/onboarding/'.$accountId;
    }

    public function getConnectedAccountStatus(string $accountId): ConnectedAccountStatus
    {
        return $this->nextAccountStatus;
    }

    public function chargeInvoice(Invoice $invoice, int $amount, int $applicationFeeAmount): ChargeResult
    {
        $accountId = $invoice->tenant->stripe_connect_account_id;
        $reference = 'pi_fake_'.Str::lower(Str::random(20));

        $this->charges[] = [
            'reference' => $reference,
            'invoice_id' => $invoice->id,
            'connected_account_id' => $accountId,
            'amount' => $amount,
            'application_fee_amount' => $applicationFeeAmount,
            'currency' => $invoice->currency,
        ];

        return new ChargeResult(
            reference: $reference,
            clientToken: $reference.'_secret_'.Str::lower(Str::random(10)),
            status: 'requires_payment_method',
            connectedAccountId: $accountId,
            amount: $amount,
            applicationFeeAmount: $applicationFeeAmount,
            chargeReference: null,
        );
    }

    public function refund(Payment $payment, ?int $amount = null): RefundResult
    {
        $amount ??= (int) $payment->amount;
        $reference = 're_fake_'.Str::lower(Str::random(16));

        $this->refunds[] = [
            'reference' => $reference,
            'payment_id' => $payment->id,
            'connected_account_id' => $payment->stripe_connect_account_id,
            'amount' => $amount,
        ];

        return new RefundResult(reference: $reference, amount: $amount, status: 'succeeded');
    }

    public function parseWebhook(string $payload, string $signature): WebhookEvent
    {
        $secret = (string) config('patient_billing.connect_webhook_secret');

        if (! $this->signatureValid($payload, $signature, $secret)) {
            throw new WebhookVerificationException('Invalid webhook signature.');
        }

        $data = json_decode($payload, true) ?: [];
        $id = (string) ($data['id'] ?? '');

        return match ($data['type'] ?? null) {
            WebhookEvent::TYPE_ACCOUNT_UPDATED => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_ACCOUNT_UPDATED,
                accountId: $data['account_id'] ?? null,
                accountStatus: new ConnectedAccountStatus(
                    (bool) ($data['charges_enabled'] ?? false),
                    (bool) ($data['payouts_enabled'] ?? false),
                    (bool) ($data['details_submitted'] ?? false),
                ),
            ),
            WebhookEvent::TYPE_PAYMENT_SUCCEEDED => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_PAYMENT_SUCCEEDED,
                paymentReference: $data['payment_reference'] ?? null,
                chargeReference: $data['charge_reference'] ?? null,
            ),
            WebhookEvent::TYPE_PAYMENT_FAILED => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_PAYMENT_FAILED,
                paymentReference: $data['payment_reference'] ?? null,
            ),
            WebhookEvent::TYPE_REFUNDED => new WebhookEvent(
                id: $id,
                type: WebhookEvent::TYPE_REFUNDED,
                paymentReference: $data['payment_reference'] ?? null,
                chargeReference: $data['charge_reference'] ?? null,
            ),
            default => new WebhookEvent(id: $id, type: WebhookEvent::TYPE_UNKNOWN),
        };
    }

    /** Verify a Stripe-style "t=<ts>,v1=<hmac>" signature header. */
    private function signatureValid(string $payload, string $signature, string $secret): bool
    {
        if ($secret === '' || $signature === '') {
            return false;
        }

        parse_str(str_replace(',', '&', $signature), $parts);
        $timestamp = $parts['t'] ?? null;
        $provided = $parts['v1'] ?? null;
        if (! $timestamp || ! $provided) {
            return false;
        }

        $expected = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return hash_equals($expected, (string) $provided);
    }

    /** The most recent charge this fake created (test helper). */
    public function lastCharge(): ?array
    {
        return end($this->charges) ?: null;
    }
}
