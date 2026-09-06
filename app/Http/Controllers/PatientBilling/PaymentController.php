<?php

namespace App\Http\Controllers\PatientBilling;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Invoice;
use App\Models\Payment;
use App\PatientBilling\PaymentService;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Takes payments against a patient-billing invoice: a CARD payment via Stripe
 * Connect (funds settle to the clinic's connected account) or a MANUAL payment
 * (cash / e-transfer / other) for walk-ins. Owner + receptionist (route group).
 */
class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /**
     * Begin a card payment. Returns the PaymentIntent client_secret + the
     * connected account id so Stripe.js can confirm the card ON that account.
     * The payment is only marked paid once Stripe confirms it (webhook).
     */
    public function card(Request $request, Invoice $invoice): JsonResponse
    {
        $this->guardTenant($invoice, $request);

        try {
            $result = $this->payments->startCardPayment($invoice, $request->user());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['card' => $e->getMessage()]);
        }

        AuditEvent::create([
            'tenant_id' => $invoice->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'patient_billing.payment.card_initiated',
            'resource_type' => Payment::class,
            'resource_id' => $result['payment']->id,
            'metadata' => [
                'invoice_id' => $invoice->id,
                'amount' => $result['payment']->amount,
                'application_fee_amount' => $result['payment']->application_fee_amount,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'client_secret' => $result['client_secret'],
            'payment_intent_id' => $result['payment_intent_id'],
            'connected_account_id' => $result['payment']->stripe_connect_account_id,
            'publishable_key' => config('cashier.key'),
        ]);
    }

    /** Record a manual (cash / e-transfer / other) payment for a walk-in. */
    public function manual(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->guardTenant($invoice, $request);

        $data = $request->validate([
            'method' => ['required', Rule::in(Payment::MANUAL_METHODS)],
            'amount' => ['required', 'integer', 'min:1', 'max:'.max(1, $invoice->amountDue())],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $payment = $this->payments->recordManual(
                $invoice,
                $data['method'],
                (int) $data['amount'],
                $request->user(),
                $data['notes'] ?? null,
            );
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        AuditEvent::create([
            'tenant_id' => $invoice->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'patient_billing.payment.manual_recorded',
            'resource_type' => Payment::class,
            'resource_id' => $payment->id,
            'metadata' => [
                'invoice_id' => $invoice->id,
                'amount' => $payment->amount,
                'method' => $payment->method,
            ],
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', 'Payment recorded.');
    }

    /**
     * Defence in depth: ensure the invoice belongs to the current tenant. A
     * clinic must never take a payment against another clinic's invoice.
     */
    protected function guardTenant(Invoice $invoice, Request $request): void
    {
        $membership = $request->attributes->get('staffMembership');
        $tenantId = $membership?->tenant_id ?? TenantScope::getTenantId();
        abort_unless($invoice->tenant_id === $tenantId, 404);
    }
}
