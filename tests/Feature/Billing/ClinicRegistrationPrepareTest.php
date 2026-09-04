<?php

namespace Tests\Feature\Billing;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\Tenant;
use App\Support\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The card-capture (prepare) step: validates the application, reserves the
 * subdomain, and returns a SetupIntent client secret — WITHOUT creating a tenant
 * or charging. Uploads a license file, so it needs ext-fileinfo.
 */
class ClinicRegistrationPrepareTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;

    protected function setUp(): void
    {
        parent::setUp();

        if (! extension_loaded('fileinfo')) {
            $this->markTestSkipped('ext-fileinfo is required for the license upload path.');
        }

        Storage::fake('local');
        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);
    }

    private function payload(array $overrides = []): array
    {
        $email = $overrides['email'] ?? 'ada@example.com';
        EmailVerificationCode::verify($email, EmailVerificationCode::generate($email));

        return array_merge([
            'name' => 'Ada Owner',
            'email' => $email,
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
            'clinic_name' => 'Lotus Wellness',
            'subdomain' => 'lotus-wellness',
            'primary_contact_name' => 'Ada Owner',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '+1 555 0100',
            'requested_disciplines' => ['massage_therapy'],
            'estimated_practitioner_count' => 3,
            'license_number' => 'LIC-123',
            'licensing_body' => 'CMTO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 20, 'application/pdf'),
        ], $overrides);
    }

    public function test_prepare_reserves_the_subdomain_and_returns_a_client_secret_without_creating_a_tenant(): void
    {
        $response = $this->postJson('http://umahz.test/clinics/register/prepare', $this->payload());

        $response->assertOk()
            ->assertJsonStructure(['pending_id', 'client_secret']);

        // No tenant yet — nothing is submitted until the card is confirmed.
        $this->assertDatabaseCount('tenants', 0);
        // The pending row holds the reservation and a Stripe customer.
        $this->assertDatabaseHas('pending_registrations', ['subdomain' => 'lotus-wellness', 'email' => 'ada@example.com']);
        $this->assertCount(1, $this->billing->customers);
        $this->assertCount(1, $this->billing->setupIntents);

        // The reserved subdomain now reads as unavailable to others.
        $this->getJson('http://umahz.test/clinics/register/subdomain?subdomain=lotus-wellness')
            ->assertJson(['available' => false]);
    }

    public function test_prepare_rejects_an_unverified_email_before_touching_stripe(): void
    {
        // Email NOT verified.
        $payload = $this->payload(['email' => 'unverified@example.com']);
        EmailVerificationCode::clear('unverified@example.com');

        $this->postJson('http://umahz.test/clinics/register/prepare', $payload)
            ->assertStatus(422);

        $this->assertCount(0, $this->billing->customers, 'Stripe must not be called when validation fails.');
        $this->assertDatabaseCount('pending_registrations', 0);
    }
}
