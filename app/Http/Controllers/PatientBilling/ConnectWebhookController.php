<?php

namespace App\Http\Controllers\PatientBilling;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Payment;
use App\Models\StripeConnectWebhookEvent;
use App\Models\Tenant;
use App\PatientBilling\ConnectService;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\PaymentService;
use App\PatientBilling\WebhookEvent;
use App\PatientBilling\WebhookVerificationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Webhooks for PATIENT -> CLINIC payments. Provider-agnostic: the bound
 * PaymentProvider verifies the signature and normalizes the payload into a
 * neutral WebhookEvent, so this controller contains NO processor-specific code.
 * Separate endpoint + secret from the Cashier/platform-subscription webhook.
 *
 * De-duplicated via the stripe_connect_webhook_events ledger, so re-delivery is
 * a no-op (idempotent). The provider is the source of truth.
 */
class ConnectWebhookController extends Controller
{
    public function __construct(
        private readonly PaymentProvider $provider,
        private readonly ConnectService $connect,
        private readonly PaymentService $payments,
    ) {}

    public function handle(Request $request): Response
    {
        try {
            $event = $this->provider->parseWebhook(
                $request->getContent(),
                (string) $request->header('Stripe-Signature', ''),
            );
        } catch (WebhookVerificationException $e) {
            return response('Invalid signature.', Response::HTTP_BAD_REQUEST);
        }

        if ($event->id === '') {
            return response('Missing event id.', Response::HTTP_BAD_REQUEST);
        }

        // Idempotency: record-once. If we've seen this event, ignore it.
        $ledger = StripeConnectWebhookEvent::firstOrCreate(
            ['event_id' => $event->id],
            ['type' => $event->type],
        );

        if ($ledger->processed_at !== null) {
            return response('Already processed.', Response::HTTP_OK);
        }

        match ($event->type) {
            WebhookEvent::TYPE_ACCOUNT_UPDATED => $this->handleAccountUpdated($event),
            WebhookEvent::TYPE_PAYMENT_SUCCEEDED => $this->handlePaymentSucceeded($event),
            WebhookEvent::TYPE_PAYMENT_FAILED => $this->handlePaymentFailed($event),
            default => null, // refunds & others are a later phase
        };

        $ledger->forceFill(['processed_at' => now()])->save();

        return response('ok', Response::HTTP_OK);
    }

    private function handleAccountUpdated(WebhookEvent $event): void
    {
        if (! $event->accountId || ! $event->accountStatus) {
            return;
        }

        $tenant = Tenant::where('stripe_connect_account_id', $event->accountId)->first();
        if (! $tenant) {
            return;
        }

        if ($this->connect->applyStatus($tenant, $event->accountStatus)) {
            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'action' => 'patient_billing.connect.connected',
                'resource_type' => Tenant::class,
                'resource_id' => $tenant->id,
                'metadata' => ['stripe_connect_account_id' => $event->accountId],
            ]);
        }
    }

    private function handlePaymentSucceeded(WebhookEvent $event): void
    {
        if (! $event->paymentReference) {
            return;
        }

        $payment = $this->payments->confirmCardPayment($event->paymentReference, $event->chargeReference);

        if ($payment && $payment->wasChanged() && $payment->status === Payment::STATUS_SUCCEEDED) {
            AuditEvent::create([
                'tenant_id' => $payment->tenant_id,
                'action' => 'patient_billing.payment.captured',
                'resource_type' => Payment::class,
                'resource_id' => $payment->id,
                'metadata' => [
                    'invoice_id' => $payment->invoice_id,
                    'amount' => $payment->amount,
                    'application_fee_amount' => $payment->application_fee_amount,
                    'method' => 'card',
                ],
            ]);
        }
    }

    private function handlePaymentFailed(WebhookEvent $event): void
    {
        if ($event->paymentReference) {
            $this->payments->markCardFailed($event->paymentReference);
        }
    }
}
