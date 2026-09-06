<?php

namespace Tests\Feature\PatientBilling;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StripeConnectWebhookEvent;
use App\Models\Tenant;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\FakePaymentProvider;
use App\PatientBilling\InvoiceService;
use App\PatientBilling\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * The webhook endpoint is provider-agnostic: the bound PaymentProvider verifies
 * the signature and normalizes the payload; the controller only handles neutral
 * WebhookEvents. It must reject forged payloads and be idempotent. Here the
 * FakePaymentProvider is bound and consumes a neutral payload shape (real
 * Stripe-shaped parsing is covered by StripePaymentProviderTest).
 */
class ConnectWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $secret = 'whsec_connect_test_secret';

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance(PaymentProvider::class, new FakePaymentProvider);
        config(['patient_billing.connect_webhook_secret' => $this->secret]);
        config(['patient_billing.platform_fee_bps' => 0]);
    }

    private function tenant(): Tenant
    {
        return Tenant::create([
            'name' => 'Lotus', 'slug' => 'lotus', 'subdomain' => 'lotus', 'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'stripe_connect_account_id' => 'acct_lotus',
            'stripe_connect_status' => Tenant::CONNECT_PENDING,
        ]);
    }

    private function postWebhook(array $event, ?string $signature = null): TestResponse
    {
        $payload = json_encode($event);
        $timestamp = time();
        $signature ??= 't='.$timestamp.',v1='.hash_hmac('sha256', "{$timestamp}.{$payload}", $this->secret);

        return $this->call(
            'POST',
            'http://umahz.test/stripe/connect/webhook',
            [], [], [],
            ['HTTP_STRIPE_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload,
        );
    }

    public function test_forged_signature_is_rejected(): void
    {
        $this->postWebhook(
            ['id' => 'evt_1', 'type' => 'account.updated'],
            signature: 't=1,v1=deadbeef',
        )->assertStatus(400);
    }

    public function test_account_updated_marks_the_tenant_connected(): void
    {
        $tenant = $this->tenant();

        $this->postWebhook([
            'id' => 'evt_acct_1',
            'type' => 'account.updated',
            'account_id' => 'acct_lotus',
            'charges_enabled' => true,
            'payouts_enabled' => true,
            'details_submitted' => true,
        ])->assertOk();

        $tenant->refresh();
        $this->assertSame(Tenant::CONNECT_CONNECTED, $tenant->stripe_connect_status);
        $this->assertTrue((bool) $tenant->stripe_connect_charges_enabled);
    }

    public function test_payment_succeeded_is_applied_and_idempotent(): void
    {
        $tenant = $this->tenant();
        $tenant->forceFill([
            'stripe_connect_status' => Tenant::CONNECT_CONNECTED,
            'stripe_connect_charges_enabled' => true,
            'stripe_connect_details_submitted' => true,
        ])->save();

        $client = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'Pat', 'last_name' => 'I', 'email' => 'p@e.test']);
        $this->app->instance('current_tenant_id', $tenant->id);
        $invoice = app(InvoiceService::class)->create($tenant, [
            'client_id' => $client->id,
            'line_items' => [['description' => 'Visit', 'quantity' => 1, 'unit_amount' => 12_000]],
        ]);
        $start = app(PaymentService::class)->startCardPayment($invoice);
        $piRef = $start['payment_intent_id'];
        $this->app->forgetInstance('current_tenant_id');

        $event = [
            'id' => 'evt_pi_1',
            'type' => 'payment.succeeded',
            'payment_reference' => $piRef,
            'charge_reference' => 'ch_1',
        ];

        $this->postWebhook($event)->assertOk();
        $invoice->refresh();
        $this->assertSame(Invoice::STATUS_PAID, $invoice->status);
        $this->assertSame(12_000, $invoice->amount_paid);

        // Re-deliver the SAME event id: idempotent, no double apply.
        $this->postWebhook($event)->assertOk();
        $invoice->refresh();
        $this->assertSame(12_000, $invoice->amount_paid);
        $this->assertSame(1, StripeConnectWebhookEvent::where('event_id', 'evt_pi_1')->count());
        $this->assertSame(1, Payment::withoutGlobalScopes()->where('invoice_id', $invoice->id)->count());
    }
}
