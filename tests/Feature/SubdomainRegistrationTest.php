<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubdomainRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function existingTenant(string $subdomain): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($subdomain),
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
        ]);
    }

    public function test_availability_endpoint_accepts_a_valid_free_subdomain(): void
    {
        $this->getJson('http://umahz.test/clinics/register/subdomain?subdomain=lotus-wellness')
            ->assertOk()
            ->assertJson(['available' => true]);
    }

    public function test_availability_endpoint_rejects_a_reserved_subdomain(): void
    {
        $this->getJson('http://umahz.test/clinics/register/subdomain?subdomain=admin')
            ->assertOk()
            ->assertJson(['available' => false]);
    }

    public function test_availability_endpoint_rejects_a_taken_subdomain(): void
    {
        $this->existingTenant('lotus');

        $this->getJson('http://umahz.test/clinics/register/subdomain?subdomain=lotus')
            ->assertOk()
            ->assertJson(['available' => false]);
    }

    public function test_availability_endpoint_rejects_a_malformed_subdomain(): void
    {
        $this->getJson('http://umahz.test/clinics/register/subdomain?subdomain=-bad-')
            ->assertOk()
            ->assertJson(['available' => false]);
    }

    public function test_registration_rejects_a_reserved_subdomain(): void
    {
        $this->from('http://umahz.test/clinics/register')
            ->post('http://umahz.test/clinics/register', $this->payload(['subdomain' => 'api']))
            ->assertSessionHasErrors('subdomain');

        $this->assertDatabaseCount('tenants', 0);
    }

    public function test_registration_persists_a_lowercased_subdomain(): void
    {
        // The clinic-registration upload path relies on ext-fileinfo (mime
        // detection). Skip cleanly where it isn't loaded rather than fail on
        // an environment gap unrelated to subdomains.
        if (! extension_loaded('fileinfo')) {
            $this->markTestSkipped('ext-fileinfo is required for the license upload path.');
        }

        \Illuminate\Support\Facades\Storage::fake('local');

        // Even if the client sends mixed case, the server normalises it.
        $this->post('http://umahz.test/clinics/register', $this->payload(['subdomain' => 'Lotus-Wellness']))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('tenants', ['subdomain' => 'lotus-wellness']);
    }

    /**
     * A complete, valid clinic-registration payload with the license document.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ada Owner',
            'email' => 'ada@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
            'clinic_name' => 'Lotus Wellness',
            'subdomain' => 'lotus-wellness',
            'primary_contact_name' => 'Ada Owner',
            'primary_contact_email' => 'ada@example.com',
            'primary_contact_phone' => '+1 555 0100',
            'requested_disciplines' => ['massage_therapy'],
            'estimated_practitioner_count' => 3,
            'license_number' => 'LIC-123',
            'licensing_body' => 'CMTO',
            'license_document' => \Illuminate\Http\UploadedFile::fake()->create('license.pdf', 20, 'application/pdf'),
        ], $overrides);
    }
}
