<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocationCoordinatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_a_location_with_map_coordinates(): void
    {
        $tenant = Tenant::create([
            'name' => 'Acme', 'slug' => 'acme', 'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED, 'onboarding_completed_at' => now(),
        ]);
        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('http://acme.umahz.test/app/locations', [
                'name' => 'Downtown',
                'address' => '1 King St, Toronto, Ontario, Canada',
                'latitude' => 43.6532,
                'longitude' => -79.3832,
                'timezone' => 'America/Toronto',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('locations', [
            'tenant_id' => $tenant->id,
            'name' => 'Downtown',
            'latitude' => 43.6532,
            'longitude' => -79.3832,
        ]);
    }
}
