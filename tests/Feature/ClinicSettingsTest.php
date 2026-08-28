<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function tenant(array $overrides = []): Tenant
    {
        return Tenant::create(array_merge([
            'name' => 'Acme Clinic', 'slug' => 'acme', 'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED,
            'requested_disciplines' => ['massage_therapy'],
            // Settings is only reachable once the owner has finished onboarding.
            'onboarding_completed_at' => now(),
        ], $overrides));
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

    private function url(string $path): string
    {
        return 'http://acme.umahz.test'.$path;
    }

    public function test_owner_can_open_clinic_settings(): void
    {
        $owner = $this->member($this->tenant(), StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner)->get($this->url('/app/settings'))->assertOk();
    }

    public function test_non_owner_cannot_open_clinic_settings(): void
    {
        $tenant = $this->tenant();
        $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $receptionist = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST);

        $this->actingAs($receptionist)->get($this->url('/app/settings'))->assertStatus(403);
    }

    public function test_owner_can_update_the_clinics_disciplines(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner)
            ->patch($this->url('/app/settings/disciplines'), [
                'disciplines' => ['massage_therapy', 'acupuncture_tcm'],
            ])
            ->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertEqualsCanonicalizing(['massage_therapy', 'acupuncture_tcm'], $tenant->requested_disciplines);
    }

    public function test_disciplines_cannot_be_emptied(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner)
            ->from($this->url('/app/settings'))
            ->patch($this->url('/app/settings/disciplines'), ['disciplines' => []])
            ->assertSessionHasErrors('disciplines');
    }

    public function test_owner_can_update_profile_with_a_canadian_address(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner)
            ->patch($this->url('/app/settings/profile'), [
                'name' => 'Acme Wellness',
                'email' => 'hello@acme.example',
                'phone' => '+1 416 555 0100',
                'address_line1' => '1 King St',
                'address_city' => 'Toronto',
                'address_region' => 'Ontario',
                'address_country' => 'Canada',
                'timezone' => 'America/Toronto',
                'currency' => 'CAD',
            ])
            ->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertSame('Acme Wellness', $tenant->name);
        $this->assertSame('Ontario', $tenant->address['region']);
    }
}
