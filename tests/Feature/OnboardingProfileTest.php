<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingProfileTest extends TestCase
{
    use RefreshDatabase;

    private function ownerOf(Tenant $tenant): User
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        return $user;
    }

    private function tenant(): Tenant
    {
        return Tenant::create([
            'name' => 'Acme Clinic', 'slug' => 'acme', 'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED,
        ]);
    }

    private function url(string $path = '/app/onboarding/profile'): string
    {
        return 'http://acme.umahz.test'.$path;
    }

    public function test_profile_requires_phone_and_full_address(): void
    {
        $owner = $this->ownerOf($this->tenant());

        $this->actingAs($owner)
            ->from($this->url('/app/onboarding'))
            ->post($this->url(), [
                'name' => 'Acme Clinic',
                'email' => 'clinic@example.com',
                'timezone' => 'America/Toronto',
                'currency' => 'CAD',
            ])
            ->assertSessionHasErrors(['phone', 'address_line1', 'address_city', 'address_region', 'address_country']);
    }

    public function test_profile_rejects_a_non_canadian_province(): void
    {
        $owner = $this->ownerOf($this->tenant());

        $this->actingAs($owner)
            ->from($this->url('/app/onboarding'))
            ->post($this->url(), $this->validPayload(['address_region' => 'California']))
            ->assertSessionHasErrors('address_region');
    }

    public function test_profile_saves_a_valid_canadian_address(): void
    {
        $tenant = $this->tenant();
        $owner = $this->ownerOf($tenant);

        $this->actingAs($owner)
            ->post($this->url(), $this->validPayload())
            ->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertSame('Ontario', $tenant->address['region']);
        $this->assertSame('Toronto', $tenant->address['city']);
        $this->assertSame('clinic@example.com', $tenant->email);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Acme Clinic',
            'email' => 'clinic@example.com',
            'phone' => '+1 416 555 0100',
            'address_line1' => '123 Queen St W',
            'address_city' => 'Toronto',
            'address_region' => 'Ontario',
            'address_country' => 'Canada',
            'timezone' => 'America/Toronto',
            'currency' => 'CAD',
        ], $overrides);
    }
}
