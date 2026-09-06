<?php

namespace Tests\Feature\PatientBilling;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Notifications\PatientPayOtpNotification;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\FakePaymentProvider;
use App\PatientBilling\InvoiceService;
use App\Support\PatientPayOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Feature tests for the patient-facing branded pay portal with email OTP
 * and Stripe Connect direct payments.
 */
class PatientPayOtpTest extends TestCase
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

    private function tenant(string $slug, bool $connected = true): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($slug).' Wellness',
            'slug' => $slug,
            'subdomain' => $slug,
            'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'stripe_connect_account_id' => $connected ? "acct_{$slug}" : null,
            'stripe_connect_status' => $connected ? Tenant::CONNECT_CONNECTED : Tenant::CONNECT_NONE,
            'stripe_connect_charges_enabled' => $connected,
            'stripe_connect_details_submitted' => $connected,
        ]);
    }

    private function client(Tenant $tenant, string $email = 'pat@example.test'): Client
    {
        return Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Pat',
            'last_name' => 'Patient',
            'email' => $email,
        ]);
    }

    private function invoice(Tenant $tenant, Client $client, int $amount = 10_000, string $status = Invoice::STATUS_OPEN): Invoice
    {
        $this->app->instance('current_tenant_id', $tenant->id);
        $invoice = app(InvoiceService::class)->create($tenant, [
            'client_id' => $client->id,
            'status' => $status,
            'line_items' => [['description' => 'Acupuncture Session', 'quantity' => 1, 'unit_amount' => $amount]],
        ]);
        $this->app->forgetInstance('current_tenant_id');

        return $invoice;
    }

    private function url(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.umahz.test".$path;
    }

    public function test_patient_can_view_public_pay_page_on_clinic_subdomain(): void
    {
        $tenant = $this->tenant('lotus');

        $response = $this->get($this->url($tenant, '/pay'));
        $response->assertOk();
    }

    public function test_send_otp_sends_notification_for_existing_client(): void
    {
        Notification::fake();
        $tenant = $this->tenant('lotus');
        $this->client($tenant, 'patient@example.com');

        $response = $this->postJson($this->url($tenant, '/pay/send-otp'), [
            'email' => 'patient@example.com',
        ]);

        $response->assertOk()
            ->assertJson(['sent' => true]);

        Notification::assertSentOnDemand(PatientPayOtpNotification::class);
    }

    public function test_send_otp_does_not_reveal_unknown_email_and_sends_nothing(): void
    {
        Notification::fake();
        $tenant = $this->tenant('lotus');

        $response = $this->postJson($this->url($tenant, '/pay/send-otp'), [
            'email' => 'unknown@example.com',
        ]);

        // Returns identical 200 success response (no user enumeration)
        $response->assertOk()
            ->assertJson(['sent' => true]);

        Notification::assertNothingSent();
    }

    public function test_send_otp_enforces_resend_cooldown(): void
    {
        Notification::fake();
        $tenant = $this->tenant('lotus');
        $this->client($tenant, 'patient@example.com');

        $this->postJson($this->url($tenant, '/pay/send-otp'), ['email' => 'patient@example.com'])
            ->assertOk();

        $response = $this->postJson($this->url($tenant, '/pay/send-otp'), ['email' => 'patient@example.com']);
        $response->assertStatus(429)
            ->assertJson(['sent' => false]);
    }

    public function test_verify_otp_accepts_valid_code_and_returns_invoices(): void
    {
        $tenant = $this->tenant('lotus');
        $client = $this->client($tenant, 'patient@example.com');
        $invoice = $this->invoice($tenant, $client, 12_500);

        $code = PatientPayOtp::generate($tenant->id, 'patient@example.com');

        $response = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'patient@example.com',
            'code' => $code,
        ]);

        $response->assertOk()
            ->assertJson(['verified' => true])
            ->assertJsonStructure(['token', 'invoices']);

        $token = $response->json('token');
        $this->assertNotEmpty($token);
        $this->assertSame('patient@example.com', PatientPayOtp::validateSessionToken($tenant->id, $token));

        $invoices = $response->json('invoices');
        $this->assertCount(1, $invoices);
        $this->assertSame($invoice->id, $invoices[0]['id']);
        $this->assertSame(12_500, $invoices[0]['total_amount']);
    }

    public function test_verify_otp_rejects_wrong_code(): void
    {
        $tenant = $this->tenant('lotus');
        $this->client($tenant, 'patient@example.com');
        PatientPayOtp::generate($tenant->id, 'patient@example.com');

        $response = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'patient@example.com',
            'code' => '000000',
        ]);

        $response->assertStatus(422)
            ->assertJson(['verified' => false]);
    }

    public function test_verify_otp_locks_out_after_max_attempts(): void
    {
        $tenant = $this->tenant('lotus');
        $this->client($tenant, 'patient@example.com');
        $code = PatientPayOtp::generate($tenant->id, 'patient@example.com');

        for ($i = 0; $i < PatientPayOtp::MAX_ATTEMPTS; $i++) {
            $this->postJson($this->url($tenant, '/pay/verify-otp'), [
                'email' => 'patient@example.com',
                'code' => '000000',
            ]);
        }

        // Now even the correct code is locked out
        $response = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'patient@example.com',
            'code' => $code,
        ]);

        $response->assertStatus(422)
            ->assertJson(['verified' => false]);
    }

    public function test_cross_tenant_isolation_cannot_access_other_clinics_invoices(): void
    {
        $a = $this->tenant('clinic-a');
        $b = $this->tenant('clinic-b');

        $clientA = $this->client($a, 'patient@example.com');
        $clientB = $this->client($b, 'patient@example.com');

        $invoiceA = $this->invoice($a, $clientA, 10_000);
        $invoiceB = $this->invoice($b, $clientB, 15_000);

        // Verify patient on Clinic A
        $code = PatientPayOtp::generate($a->id, 'patient@example.com');
        $resA = $this->postJson($this->url($a, '/pay/verify-otp'), [
            'email' => 'patient@example.com',
            'code' => $code,
        ]);
        $tokenA = $resA->json('token');

        // On Clinic A's page, only invoiceA appears
        $invoices = $resA->json('invoices');
        $this->assertCount(1, $invoices);
        $this->assertSame($invoiceA->id, $invoices[0]['id']);

        // Attempt to start card payment on Clinic B's invoice from Clinic A
        $this->postJson($this->url($a, '/pay/invoices/'.$invoiceB->id.'/card'), [], [
            'X-Patient-Pay-Token' => $tokenA,
        ])->assertNotFound();

        // Attempt to use Token A on Clinic B directly
        $this->postJson($this->url($b, '/pay/invoices/'.$invoiceB->id.'/card'), [], [
            'X-Patient-Pay-Token' => $tokenA,
        ])->assertStatus(401);
    }

    public function test_client_isolation_cannot_pay_another_patients_invoice_at_same_clinic(): void
    {
        $tenant = $this->tenant('lotus');
        $client1 = $this->client($tenant, 'patient1@example.com');
        $client2 = $this->client($tenant, 'patient2@example.com');

        $invoice1 = $this->invoice($tenant, $client1, 8_000);
        $invoice2 = $this->invoice($tenant, $client2, 9_500);

        // Verify patient 1
        $code = PatientPayOtp::generate($tenant->id, 'patient1@example.com');
        $res = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'patient1@example.com',
            'code' => $code,
        ]);
        $token1 = $res->json('token');

        // Patient 1 cannot pay Patient 2's invoice
        $this->postJson($this->url($tenant, '/pay/invoices/'.$invoice2->id.'/card'), [], [
            'X-Patient-Pay-Token' => $token1,
        ])->assertNotFound();

        // Patient 1 can start payment on their own invoice
        $this->postJson($this->url($tenant, '/pay/invoices/'.$invoice1->id.'/card'), [], [
            'X-Patient-Pay-Token' => $token1,
        ])->assertOk();
    }

    public function test_start_card_payment_initiates_direct_charge_via_payment_provider(): void
    {
        $tenant = $this->tenant('lotus', connected: true);
        $client = $this->client($tenant, 'pat@example.com');
        $invoice = $this->invoice($tenant, $client, 15_000);

        $code = PatientPayOtp::generate($tenant->id, 'pat@example.com');
        $res = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'pat@example.com',
            'code' => $code,
        ]);
        $token = $res->json('token');

        $payRes = $this->postJson($this->url($tenant, '/pay/invoices/'.$invoice->id.'/card'), [], [
            'X-Patient-Pay-Token' => $token,
        ]);

        $payRes->assertOk()
            ->assertJsonStructure([
                'client_secret',
                'payment_intent_id',
                'connected_account_id',
                'publishable_key',
            ]);

        $this->assertSame('acct_lotus', $payRes->json('connected_account_id'));
        $this->assertSame(1, Payment::withoutGlobalScopes()->where('invoice_id', $invoice->id)->count());

        $payment = Payment::withoutGlobalScopes()->where('invoice_id', $invoice->id)->first();
        $this->assertSame(15_000, $payment->amount);
        $this->assertSame(0, $payment->application_fee_amount);
        $this->assertSame(Payment::STATUS_PENDING, $payment->status);
    }

    public function test_start_card_payment_fails_if_clinic_cannot_accept_cards(): void
    {
        $tenant = $this->tenant('nostripe', connected: false);
        $client = $this->client($tenant, 'pat@example.com');
        $invoice = $this->invoice($tenant, $client, 10_000);

        $code = PatientPayOtp::generate($tenant->id, 'pat@example.com');
        $res = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'pat@example.com',
            'code' => $code,
        ]);
        $token = $res->json('token');

        $this->postJson($this->url($tenant, '/pay/invoices/'.$invoice->id.'/card'), [], [
            'X-Patient-Pay-Token' => $token,
        ])->assertStatus(422);
    }

    public function test_patient_can_view_receipt_for_paid_invoice(): void
    {
        $tenant = $this->tenant('lotus');
        $client = $this->client($tenant, 'pat@example.com');
        $invoice = $this->invoice($tenant, $client, 10_000);

        // Mark invoice paid
        $invoice->status = Invoice::STATUS_PAID;
        $invoice->amount_paid = 10_000;
        $invoice->paid_at = now();
        $invoice->save();

        $code = PatientPayOtp::generate($tenant->id, 'pat@example.com');
        $res = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'pat@example.com',
            'code' => $code,
        ]);
        $token = $res->json('token');

        $this->withSession(['patient_pay_token_'.$tenant->id => $token])
            ->get($this->url($tenant, '/pay/invoices/'.$invoice->id.'/receipt'))
            ->assertOk();
    }

    public function test_patient_logout_clears_session(): void
    {
        $tenant = $this->tenant('lotus');
        $this->client($tenant, 'pat@example.com');

        $code = PatientPayOtp::generate($tenant->id, 'pat@example.com');
        $res = $this->postJson($this->url($tenant, '/pay/verify-otp'), [
            'email' => 'pat@example.com',
            'code' => $code,
        ]);
        $token = $res->json('token');

        $this->withSession(['patient_pay_token_'.$tenant->id => $token])
            ->post($this->url($tenant, '/pay/logout'))
            ->assertRedirect($this->url($tenant, '/pay'));

        $this->assertNull(PatientPayOtp::validateSessionToken($tenant->id, $token));
    }
}
