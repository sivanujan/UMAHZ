<?php

namespace Tests\Feature\PatientBilling;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\FakePaymentProvider;
use App\PatientBilling\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * HTTP-level guarantees for patient billing: role gating (owner + receptionist
 * can bill; practitioners cannot; only the owner connects Stripe), strict
 * cross-tenant isolation on invoice routes, and the connected-account
 * requirement for card payments — all over real requests through the middleware.
 */
class PatientBillingHttpTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentProvider $gateway;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gateway = new FakePaymentProvider;
        $this->app->instance(PaymentProvider::class, $this->gateway);
        config(['patient_billing.platform_fee_bps' => 0]);
    }

    private function tenant(string $slug, bool $connected = false): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($slug), 'slug' => $slug, 'subdomain' => $slug,
            'currency' => 'cad', 'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'stripe_connect_account_id' => $connected ? "acct_{$slug}" : null,
            'stripe_connect_status' => $connected ? Tenant::CONNECT_CONNECTED : Tenant::CONNECT_NONE,
            'stripe_connect_charges_enabled' => $connected,
            'stripe_connect_details_submitted' => $connected,
        ]);
    }

    private function member(Tenant $tenant, string $role): User
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $user->id, 'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        return $user;
    }

    private function client(Tenant $tenant): Client
    {
        return Client::create([
            'tenant_id' => $tenant->id, 'first_name' => 'Pat', 'last_name' => 'Ient',
            'email' => 'pat@example.test',
        ]);
    }

    private function url(Tenant $t, string $path): string
    {
        return "http://{$t->subdomain}.umahz.test".$path;
    }

    private function makeInvoice(Tenant $tenant, Client $client): Invoice
    {
        // Build directly with tenant context so numbering/scope apply.
        $this->app->instance('current_tenant_id', $tenant->id);
        $invoice = app(InvoiceService::class)->create($tenant, [
            'client_id' => $client->id,
            'line_items' => [['description' => 'Visit', 'quantity' => 1, 'unit_amount' => 10_000]],
        ]);
        $this->app->forgetInstance('current_tenant_id');

        return $invoice;
    }

    public function test_receptionist_can_create_an_invoice(): void
    {
        $tenant = $this->tenant('lotus');
        $reception = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST);
        $client = $this->client($tenant);

        $this->actingAs($reception)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'line_items' => [['description' => 'Massage', 'quantity' => 1, 'unit_amount' => 9_000]],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Invoice::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count());
    }

    public function test_practitioner_cannot_create_an_invoice(): void
    {
        $tenant = $this->tenant('lotus');
        $practitioner = $this->member($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);

        $this->actingAs($practitioner)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'line_items' => [['description' => 'Massage', 'quantity' => 1, 'unit_amount' => 9_000]],
            ])
            ->assertStatus(403);
    }

    public function test_only_the_owner_can_open_connect_settings(): void
    {
        $tenant = $this->tenant('lotus');
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $reception = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST);

        $this->actingAs($owner)->get($this->url($tenant, '/app/settings/payments'))->assertOk();
        $this->actingAs($reception)->get($this->url($tenant, '/app/settings/payments'))->assertStatus(403);
    }

    public function test_owner_can_start_connect_onboarding(): void
    {
        $tenant = $this->tenant('lotus', connected: false);
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        // Full stack: controller -> ConnectService -> provider. Redirects the
        // owner out to the hosted onboarding link.
        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/settings/payments/connect'))
            ->assertRedirect();

        $tenant->refresh();
        $this->assertSame(Tenant::CONNECT_PENDING, $tenant->stripe_connect_status);
        $this->assertNotNull($tenant->stripe_connect_account_id);
    }

    public function test_a_clinic_cannot_access_another_clinics_invoice(): void
    {
        $a = $this->tenant('clinic-a');
        $b = $this->tenant('clinic-b');
        $ownerA = $this->member($a, StaffMembership::ROLE_CLINIC_OWNER);
        $invoiceB = $this->makeInvoice($b, $this->client($b));

        // Owner of A, on A's subdomain, must not resolve B's invoice.
        $this->actingAs($ownerA)
            ->get($this->url($a, '/app/invoices/'.$invoiceB->id))
            ->assertNotFound();
    }

    public function test_manual_payment_via_http_marks_invoice_paid(): void
    {
        $tenant = $this->tenant('lotus');
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $invoice = $this->makeInvoice($tenant, $this->client($tenant));

        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/invoices/'.$invoice->id.'/pay/manual'), [
                'method' => 'cash', 'amount' => 10_000,
            ])
            ->assertSessionHasNoErrors();

        $invoice->refresh();
        $this->assertSame(Invoice::STATUS_PAID, $invoice->status);
        $this->assertSame(Payment::METHOD_CASH, $invoice->payments()->first()->method);
    }

    public function test_card_payment_requires_a_connected_account_via_http(): void
    {
        $tenant = $this->tenant('nostripe', connected: false);
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $invoice = $this->makeInvoice($tenant, $this->client($tenant));

        $this->actingAs($owner)
            ->postJson($this->url($tenant, '/app/invoices/'.$invoice->id.'/pay/card'))
            ->assertStatus(422);

        $this->assertSame(0, Payment::withoutGlobalScopes()->count());
    }
}
