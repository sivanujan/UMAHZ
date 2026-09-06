<?php

namespace Tests\Feature\PatientBilling;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\FakePaymentProvider;
use App\PatientBilling\InvoiceService;
use App\PatientBilling\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * Money-critical patient-billing logic, exercised through the services with a
 * deterministic PaymentProvider fake (no live Stripe). Covers: fund routing to
 * the correct connected account, the configurable-and-zero platform fee,
 * per-tenant sequential numbering, cross-tenant isolation, manual payments, and
 * the connected-account requirement for card payments.
 */
class PatientBillingServiceTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentProvider $gateway;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gateway = new FakePaymentProvider;
        $this->app->instance(PaymentProvider::class, $this->gateway);
        config(['patient_billing.platform_fee_bps' => 0]); // launch default
    }

    private function tenant(string $slug, bool $connected = true): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($slug),
            'slug' => $slug,
            'subdomain' => $slug,
            'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'stripe_connect_account_id' => $connected ? "acct_{$slug}" : null,
            'stripe_connect_status' => $connected ? Tenant::CONNECT_CONNECTED : Tenant::CONNECT_NONE,
            'stripe_connect_charges_enabled' => $connected,
            'stripe_connect_details_submitted' => $connected,
        ]);
    }

    private function client(Tenant $tenant, string $first = 'Sophia'): Client
    {
        return Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => $first,
            'last_name' => 'Tester',
            'email' => strtolower($first).'@example.test',
        ]);
    }

    private function invoiceFor(Tenant $tenant, Client $client, int $unit = 12_000): Invoice
    {
        return app(InvoiceService::class)->create($tenant, [
            'client_id' => $client->id,
            'line_items' => [
                ['description' => 'Acupuncture Initial Assessment', 'quantity' => 1, 'unit_amount' => $unit],
            ],
        ]);
    }

    public function test_totals_are_computed_in_minor_units(): void
    {
        $t = $this->tenant('lotus');
        $c = $this->client($t);

        $invoice = app(InvoiceService::class)->create($t, [
            'client_id' => $c->id,
            'discount_amount' => 500,
            'line_items' => [
                ['description' => 'Assessment', 'quantity' => 2, 'unit_amount' => 6_000, 'tax_amount' => 200],
                ['description' => 'Herbs', 'quantity' => 1, 'unit_amount' => 3_000],
            ],
        ]);

        $this->assertSame(15_000, $invoice->subtotal_amount); // 2*6000 + 3000
        $this->assertSame(200, $invoice->tax_amount);
        $this->assertSame(500, $invoice->discount_amount);
        $this->assertSame(14_700, $invoice->total_amount);    // 15000 + 200 - 500
        $this->assertSame(Invoice::STATUS_OPEN, $invoice->status);
    }

    public function test_invoice_numbering_is_sequential_per_tenant_and_isolated(): void
    {
        $a = $this->tenant('clinic-a');
        $b = $this->tenant('clinic-b');
        $ca = $this->client($a);
        $cb = $this->client($b);

        $a1 = $this->invoiceFor($a, $ca);
        $a2 = $this->invoiceFor($a, $ca);
        $b1 = $this->invoiceFor($b, $cb);
        $a3 = $this->invoiceFor($a, $ca);
        $b2 = $this->invoiceFor($b, $cb);

        // Each tenant has its own gap-free 1,2,3 sequence.
        $this->assertSame([1, 2, 3], [$a1->invoice_number, $a2->invoice_number, $a3->invoice_number]);
        $this->assertSame([1, 2], [$b1->invoice_number, $b2->invoice_number]);
    }

    public function test_manual_payment_marks_invoice_paid(): void
    {
        $t = $this->tenant('lotus');
        $c = $this->client($t);
        $invoice = $this->invoiceFor($t, $c, 8_500);

        $payment = app(PaymentService::class)->recordManual($invoice, Payment::METHOD_CASH, 8_500);

        $this->assertSame(Payment::STATUS_SUCCEEDED, $payment->status);
        $this->assertSame(0, $payment->application_fee_amount);
        $invoice->refresh();
        $this->assertSame(Invoice::STATUS_PAID, $invoice->status);
        $this->assertSame(8_500, $invoice->amount_paid);
        $this->assertNotNull($invoice->paid_at);
    }

    public function test_card_payment_routes_to_the_correct_connected_account_with_zero_fee_at_launch(): void
    {
        $t = $this->tenant('lotus'); // acct_lotus
        $c = $this->client($t);
        $invoice = $this->invoiceFor($t, $c, 12_000);

        $result = app(PaymentService::class)->startCardPayment($invoice);

        // Money is routed to THIS clinic's connected account...
        $intent = $this->gateway->lastCharge();
        $this->assertSame('acct_lotus', $intent['connected_account_id']);
        $this->assertSame(12_000, $intent['amount']);
        // ...and at launch the platform takes nothing (100% to the clinic).
        $this->assertSame(0, $intent['application_fee_amount']);

        $this->assertSame(Payment::STATUS_PENDING, $result['payment']->status);
        $this->assertSame('acct_lotus', $result['payment']->stripe_connect_account_id);
    }

    public function test_platform_fee_is_applied_when_configured(): void
    {
        config(['patient_billing.platform_fee_bps' => 250]); // 2.5%
        $t = $this->tenant('lotus');
        $c = $this->client($t);
        $invoice = $this->invoiceFor($t, $c, 12_000);

        app(PaymentService::class)->startCardPayment($invoice);

        $this->assertSame(300, $this->gateway->lastCharge()['application_fee_amount']);
    }

    public function test_card_payment_requires_a_connected_account(): void
    {
        $t = $this->tenant('nostripe', connected: false);
        $c = $this->client($t);
        $invoice = $this->invoiceFor($t, $c);

        $this->expectException(RuntimeException::class);
        app(PaymentService::class)->startCardPayment($invoice);
    }

    public function test_card_confirmation_is_idempotent(): void
    {
        $t = $this->tenant('lotus');
        $c = $this->client($t);
        $invoice = $this->invoiceFor($t, $c, 12_000);
        $start = app(PaymentService::class)->startCardPayment($invoice);
        $piId = $start['payment_intent_id'];

        // First confirmation applies the payment.
        app(PaymentService::class)->confirmCardPayment($piId, 'ch_test_1');
        $invoice->refresh();
        $this->assertSame(Invoice::STATUS_PAID, $invoice->status);
        $this->assertSame(12_000, $invoice->amount_paid);

        // Re-delivered event: no double-apply.
        app(PaymentService::class)->confirmCardPayment($piId, 'ch_test_1');
        $invoice->refresh();
        $this->assertSame(12_000, $invoice->amount_paid);
        $this->assertSame(1, Payment::withoutGlobalScopes()->where('invoice_id', $invoice->id)->count());
    }

    public function test_tenant_scope_isolates_invoices_between_clinics(): void
    {
        $a = $this->tenant('clinic-a');
        $b = $this->tenant('clinic-b');
        $this->invoiceFor($a, $this->client($a));
        $this->invoiceFor($b, $this->client($b));

        // Bind clinic A as the active tenant: it must only see its own invoice.
        $this->app->instance('current_tenant_id', $a->id);
        $this->assertSame(1, Invoice::count());
        $this->assertTrue(Invoice::get()->every(fn ($i) => $i->tenant_id === $a->id));
    }

    public function test_refund_routes_through_the_provider_to_the_connected_account(): void
    {
        // The refund path exists on the provider contract (flexibility layer),
        // and routes to the clinic's own connected account. No refund UI yet.
        $t = $this->tenant('lotus'); // acct_lotus
        $c = $this->client($t);
        $invoice = $this->invoiceFor($t, $c, 12_000);
        $start = app(PaymentService::class)->startCardPayment($invoice);

        $result = app(PaymentProvider::class)->refund($start['payment'], 5_000);

        $this->assertSame(5_000, $result->amount);
        $refund = end($this->gateway->refunds);
        $this->assertSame('acct_lotus', $refund['connected_account_id']);
        $this->assertSame(5_000, $refund['amount']);
    }
}
