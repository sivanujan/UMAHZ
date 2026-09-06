<?php

namespace App\PatientBilling;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\PatientBilling\Contracts\PaymentProvider;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Records payments against patient-billing invoices — card (via Stripe Connect,
 * settling to the clinic's connected account) and manual (cash / e-transfer /
 * other). All money is integer minor units. Stripe is the source of truth for
 * card payments, so a card Payment is only marked succeeded when Stripe
 * confirms it (via confirmCardPayment, driven by the webhook), and that
 * confirmation is idempotent.
 */
class PaymentService
{
    public function __construct(private readonly PaymentProvider $provider) {}

    /**
     * Record a manual (non-card) payment and apply it to the invoice. Used for
     * walk-ins paying cash / e-transfer. No Stripe involvement.
     */
    public function recordManual(Invoice $invoice, string $method, int $amount, ?User $actor = null, ?string $notes = null): Payment
    {
        if (! in_array($method, Payment::MANUAL_METHODS, true)) {
            throw new RuntimeException("Unsupported manual payment method [{$method}].");
        }

        if ($amount <= 0) {
            throw new RuntimeException('Payment amount must be positive.');
        }

        return DB::transaction(function () use ($invoice, $method, $amount, $actor, $notes) {
            $locked = Invoice::whereKey($invoice->getKey())->lockForUpdate()->firstOrFail();

            $payment = new Payment([
                'invoice_id' => $locked->id,
                'method' => $method,
                'status' => Payment::STATUS_SUCCEEDED,
                'amount' => $amount,
                'currency' => $locked->currency,
                'application_fee_amount' => 0,
                'notes' => $notes,
                'recorded_by' => $actor?->id,
                'processed_at' => now(),
            ]);
            $payment->tenant_id = $locked->tenant_id;
            $payment->save();

            $this->applySucceededPayment($locked, $amount);

            return $payment;
        });
    }

    /**
     * Begin a card payment for the invoice via Stripe Connect. Requires a
     * connected account that can take card payments. Creates a pending Payment
     * and a PaymentIntent on the CLINIC's connected account; the returned
     * client_secret is used by the patient to confirm the card. The platform
     * fee is read from PlatformFee (0 at launch => 100% to the clinic).
     *
     * @return array{payment: Payment, client_secret: string, payment_intent_id: string}
     */
    public function startCardPayment(Invoice $invoice, ?User $actor = null): array
    {
        $tenant = $invoice->tenant;

        if (! $tenant->canAcceptCardPayments()) {
            throw new RuntimeException('This clinic cannot take card payments until its Stripe account is connected.');
        }

        if (! $invoice->isPayable()) {
            throw new RuntimeException('This invoice is not open for payment.');
        }

        $amount = $invoice->amountDue();
        $fee = PlatformFee::forAmount($amount, $tenant);

        $result = $this->provider->chargeInvoice($invoice, $amount, $fee);

        $payment = new Payment([
            'invoice_id' => $invoice->id,
            'method' => Payment::METHOD_CARD,
            'status' => Payment::STATUS_PENDING,
            'amount' => $amount,
            'currency' => $invoice->currency,
            'application_fee_amount' => $fee,
            'stripe_connect_account_id' => $result->connectedAccountId,
            'stripe_payment_intent_id' => $result->reference,
            'recorded_by' => $actor?->id,
        ]);
        $payment->tenant_id = $invoice->tenant_id;
        $payment->save();

        return [
            'payment' => $payment,
            'client_secret' => $result->clientToken,
            'payment_intent_id' => $result->reference,
        ];
    }

    /**
     * Confirm a card payment succeeded (driven by the Stripe webhook, Stripe
     * being the source of truth). IDEMPOTENT: re-delivering the same event, or
     * confirming an already-succeeded payment, is a no-op.
     */
    public function confirmCardPayment(string $paymentIntentId, ?string $chargeId = null): ?Payment
    {
        return DB::transaction(function () use ($paymentIntentId, $chargeId) {
            $payment = Payment::withoutGlobalScopes()
                ->where('stripe_payment_intent_id', $paymentIntentId)
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                return null;
            }

            if ($payment->status === Payment::STATUS_SUCCEEDED) {
                return $payment; // already applied — idempotent no-op
            }

            $payment->forceFill([
                'status' => Payment::STATUS_SUCCEEDED,
                'stripe_charge_id' => $chargeId ?? $payment->stripe_charge_id,
                'processed_at' => now(),
            ])->save();

            $invoice = Invoice::withoutGlobalScopes()
                ->whereKey($payment->invoice_id)
                ->lockForUpdate()
                ->first();

            if ($invoice) {
                $this->applySucceededPayment($invoice, (int) $payment->amount);
            }

            return $payment;
        });
    }

    /** Mark a card payment failed (webhook payment_intent.payment_failed). */
    public function markCardFailed(string $paymentIntentId): ?Payment
    {
        $payment = Payment::withoutGlobalScopes()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();

        if (! $payment || $payment->status === Payment::STATUS_SUCCEEDED) {
            return $payment; // never downgrade a succeeded payment
        }

        $payment->forceFill(['status' => Payment::STATUS_FAILED])->save();

        return $payment;
    }

    /**
     * Apply a succeeded payment amount to an invoice and mark it paid once the
     * balance reaches zero. The invoice row is expected to be locked already.
     */
    private function applySucceededPayment(Invoice $invoice, int $amount): void
    {
        $invoice->amount_paid = (int) $invoice->amount_paid + $amount;

        if ($invoice->amount_paid >= (int) $invoice->total_amount && ! $invoice->isVoid()) {
            $invoice->status = Invoice::STATUS_PAID;
            $invoice->paid_at = now();
        }

        $invoice->save();
    }
}
