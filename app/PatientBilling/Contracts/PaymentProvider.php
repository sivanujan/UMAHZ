<?php

namespace App\PatientBilling\Contracts;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\PatientBilling\ChargeResult;
use App\PatientBilling\ConnectedAccountStatus;
use App\PatientBilling\RefundResult;
use App\PatientBilling\WebhookEvent;
use App\PatientBilling\WebhookVerificationException;

/**
 * The PATIENT -> CLINIC payment provider contract. ALL billing logic talks to
 * this interface, never to a specific processor's SDK, so UMAHZ can later
 * negotiate custom Stripe pricing, switch to Stripe revenue-sharing, or add /
 * swap processors without rebuilding the billing system. Combined with the
 * configurable platform fee (0 at launch), this is the flexibility layer.
 *
 * The one implementation today is StripePaymentProvider. It is completely
 * separate from the clinic -> UMAHZ platform subscription (Cashier).
 */
interface PaymentProvider
{
    /**
     * Create a connected (sub-)account for the clinic and return its provider id
     * (e.g. Stripe "acct_..."). The clinic's patients' funds settle here.
     */
    public function createConnectedAccount(Tenant $tenant): string;

    /**
     * Return a hosted onboarding URL for the connected account. The clinic owner
     * is redirected there to finish provider onboarding (KYC, bank details).
     */
    public function createOnboardingLink(string $accountId, string $returnUrl, string $refreshUrl): string;

    /**
     * Fetch the connected account's current capability flags from the provider
     * (the source of truth for onboarding status).
     */
    public function getConnectedAccountStatus(string $accountId): ConnectedAccountStatus;

    /**
     * Charge an invoice so the funds settle DIRECTLY to the clinic's connected
     * account. The application (platform) fee is passed through in minor units
     * (0 at launch => 100% to the clinic); the provider decides how to apply it.
     */
    public function chargeInvoice(Invoice $invoice, int $amount, int $applicationFeeAmount): ChargeResult;

    /**
     * Refund a captured payment (full amount when $amount is null). Later-phase
     * feature; present on the contract so enabling it is not a rewrite.
     */
    public function refund(Payment $payment, ?int $amount = null): RefundResult;

    /**
     * Verify and parse a raw provider webhook into a neutral WebhookEvent. The
     * provider owns signature verification (its own secret + scheme) and payload
     * shape; the billing layer only ever sees the neutral event.
     *
     * @throws WebhookVerificationException on a bad signature.
     */
    public function parseWebhook(string $payload, string $signature): WebhookEvent;
}
