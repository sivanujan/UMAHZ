<?php

namespace Tests\Feature\Billing;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\PendingRegistration;
use App\Models\Tenant;
use App\Models\User;
use App\Support\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The finalize (submit) step and abandoned-registration cleanup. These build the
 * PendingRegistration directly so they exercise the payment/submission logic
 * without an HTTP file upload (which needs ext-fileinfo). The full HTTP prepare
 * path is covered by ClinicRegistrationPrepareTest.
 */
class ClinicRegistrationPaymentTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);
        Storage::fake('local');
    }

    private function pending(array $overrides = []): PendingRegistration
    {
        $email = $overrides['email'] ?? 'ada@example.com';
        // The email was proven at step 1 of the wizard.
        EmailVerificationCode::verify($email, EmailVerificationCode::generate($email));

        Storage::disk('local')->put('pending-licenses/lic.pdf', 'fake-pdf');

        return PendingRegistration::create(array_merge([
            'email' => $email,
            'subdomain' => 'lotus-wellness',
            'ip_address' => '127.0.0.1',
            'payload' => [
                'name' => 'Ada Owner',
                'email' => $email,
                'password' => Hash::make('password1234'),
                'clinic_name' => 'Lotus Wellness',
                'subdomain' => 'lotus-wellness',
                'primary_contact_name' => 'Ada Owner',
                'primary_contact_email' => $email,
                'primary_contact_phone' => '+1 555 0100',
                'requested_disciplines' => ['massage_therapy'],
                'custom_disciplines' => [],
                'primary_discipline' => 'massage_therapy',
                'estimated_practitioner_count' => 3,
                'license_number' => 'LIC-123',
                'licensing_body' => 'CMTO',
            ],
            'license_document_path' => 'pending-licenses/lic.pdf',
            'license_document_original_name' => 'license.pdf',
            'license_document_mime' => 'application/pdf',
            'stripe_customer_id' => 'cus_test_ada',
            'stripe_setup_intent_id' => 'seti_test_ada',
            'expires_at' => now()->addMinutes(30),
        ], $overrides));
    }

    private function finalize(string $pendingId)
    {
        return $this->post('http://umahz.test/clinics/register', ['pending_id' => $pendingId]);
    }

    public function test_no_application_is_submitted_without_a_saved_card(): void
    {
        $this->billing->cardWasSaved = false; // SetupIntent never succeeded
        $pending = $this->pending();

        $this->finalize($pending->id)->assertSessionHasErrors('card');

        $this->assertDatabaseCount('tenants', 0);
        $this->assertDatabaseHas('pending_registrations', ['id' => $pending->id]);
    }

    public function test_finalize_creates_a_pending_review_tenant_with_the_saved_card(): void
    {
        $this->billing->paymentMethodToReturn = 'pm_confirmed_ada';
        $pending = $this->pending();

        $this->finalize($pending->id)->assertSessionHasNoErrors();

        $tenant = Tenant::where('subdomain', 'lotus-wellness')->first();
        $this->assertNotNull($tenant);
        $this->assertSame(Tenant::STATUS_PENDING_REVIEW, $tenant->status);
        $this->assertSame('cus_test_ada', $tenant->stripe_id);
        $this->assertSame('pm_confirmed_ada', $tenant->stripe_pm_id);
        $this->assertSame(Tenant::SUBSCRIPTION_NONE, $tenant->subscription_status);
        // No charge at submission — that only happens on approval.
        $this->assertFalse($this->billing->charged($tenant));
        // Pending row consumed.
        $this->assertDatabaseMissing('pending_registrations', ['id' => $pending->id]);
    }

    public function test_finalize_blocks_a_duplicate_email(): void
    {
        User::factory()->create(['email' => 'ada@example.com', 'email_verified_at' => now()]);
        $pending = $this->pending();

        $this->finalize($pending->id)->assertSessionHasErrors('email');
        $this->assertDatabaseCount('tenants', 0);
    }

    public function test_expired_pending_registration_is_pruned_and_releases_the_subdomain(): void
    {
        $pending = $this->pending(['expires_at' => now()->subMinute()]);

        $this->artisan('registrations:prune-expired')->assertSuccessful();

        $this->assertDatabaseMissing('pending_registrations', ['id' => $pending->id]);
        // The reserved subdomain is now free again.
        $this->getJson('http://umahz.test/clinics/register/subdomain?subdomain=lotus-wellness')
            ->assertJson(['available' => true]);
        // The orphan card was discarded (never charged).
        $this->assertCount(1, $this->billing->discarded);
    }
}
