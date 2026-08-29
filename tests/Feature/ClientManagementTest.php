<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Location;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientManagementTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub).' Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'timezone' => 'America/Toronto',
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '09:00', 'close' => '17:00']])->all(),
        ]);
    }

    private function staff(Tenant $tenant, string $role = StaffMembership::ROLE_RECEPTIONIST): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$user, $membership];
    }

    public function test_staff_can_view_clients_list_and_search(): void
    {
        $clinic = $this->clinic('lotus');
        [$user] = $this->staff($clinic);

        Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Michael',
            'last_name' => 'Scott',
            'email' => 'michael@dundermifflin.com',
            'phone' => '+1 555 0101',
        ]);

        Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Pam',
            'last_name' => 'Beesly',
            'email' => 'pam@dundermifflin.com',
            'phone' => '+1 555 0102',
        ]);

        $response = $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/clients')
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Clients/Index')
            ->has('clients', 2)
        );

        // Search by name
        $searchResponse = $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/clients?search=Pam')
            ->assertOk();

        $searchResponse->assertInertia(fn ($page) => $page
            ->component('Clients/Index')
            ->has('clients', 1)
            ->where('clients.0.first_name', 'Pam')
        );
    }

    public function test_staff_can_create_a_client_and_it_scopes_to_tenant(): void
    {
        $clinic = $this->clinic('lotus');
        [$user] = $this->staff($clinic);

        $payload = [
            'first_name' => 'Dwight',
            'last_name' => 'Schrute',
            'email' => 'dwight@schrute-farms.com',
            'phone' => '+1 555 0199',
            'date_of_birth' => '1985-01-20',
            'preferred_contact_method' => 'phone',
            'emergency_contact_name' => 'Mose Schrute',
            'emergency_contact_phone' => '+1 555 0198',
            'emergency_contact_relationship' => 'Cousin',
        ];

        $response = $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/clients', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $client = Client::where('email', 'dwight@schrute-farms.com')->first();
        $this->assertNotNull($client);
        $this->assertSame($clinic->id, $client->tenant_id);
        $this->assertSame('Dwight', $client->first_name);
        $this->assertSame('Schrute', $client->last_name);
        $this->assertTrue($client->is_active);
        $this->assertSame('Mose Schrute', $client->emergency_contact['name']);

        // Assert Audit event was created
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $clinic->id,
            'user_id' => $user->id,
            'action' => 'client.created',
            'resource_id' => $client->id,
        ]);
    }

    public function test_newly_created_client_appears_in_calendar_booking_dropdown(): void
    {
        $clinic = $this->clinic('lotus');
        [$user] = $this->staff($clinic);

        // Initially no clients
        $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/calendar')
            ->assertInertia(fn ($page) => $page->has('clients', 0));

        // Create a client
        $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/clients', [
                'first_name' => 'Angela',
                'last_name' => 'Martin',
                'email' => 'angela@example.com',
            ])
            ->assertSessionHasNoErrors();

        // Check calendar page now loads the new client
        $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/calendar')
            ->assertInertia(fn ($page) => $page
                ->has('clients', 1)
                ->where('clients.0.name', 'Angela Martin')
            );
    }

    public function test_cross_tenant_isolation_clinic_b_cannot_see_or_modify_clinic_a_client(): void
    {
        $clinicA = $this->clinic('lotus');
        $clinicB = $this->clinic('beacon');

        [$userA] = $this->staff($clinicA);
        [$userB] = $this->staff($clinicB);

        $clientA = Client::create([
            'tenant_id' => $clinicA->id,
            'first_name' => 'Jim',
            'last_name' => 'Halpert',
            'email' => 'jim@lotus-patient.com',
        ]);

        // Clinic B staff cannot view Clinic A's client
        $this->actingAs($userB)
            ->get("http://beacon.umahz.test/app/clients/{$clientA->id}")
            ->assertNotFound();

        // Clinic B staff cannot update Clinic A's client
        $this->actingAs($userB)
            ->patch("http://beacon.umahz.test/app/clients/{$clientA->id}", [
                'first_name' => 'Hacked',
                'last_name' => 'Name',
            ])
            ->assertNotFound();

        // Clinic B staff cannot toggle Clinic A's client
        $this->actingAs($userB)
            ->patch("http://beacon.umahz.test/app/clients/{$clientA->id}/toggle")
            ->assertNotFound();

        // Clinic B staff cannot delete Clinic A's client
        $this->actingAs($userB)
            ->delete("http://beacon.umahz.test/app/clients/{$clientA->id}")
            ->assertNotFound();

        // Clinic B's client list does not contain Clinic A's client
        $this->actingAs($userB)
            ->get('http://beacon.umahz.test/app/clients')
            ->assertInertia(fn ($page) => $page->has('clients', 0));

        // Clinic B's calendar does not contain Clinic A's client
        $this->actingAs($userB)
            ->get('http://beacon.umahz.test/app/calendar')
            ->assertInertia(fn ($page) => $page->has('clients', 0));
    }

    public function test_validation_rejects_missing_name_and_disposable_email(): void
    {
        $clinic = $this->clinic('lotus');
        [$user] = $this->staff($clinic);

        // Missing names
        $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/clients', [
                'first_name' => '',
                'last_name' => '',
            ])
            ->assertSessionHasErrors(['first_name', 'last_name']);

        // Invalid email format
        $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/clients', [
                'first_name' => 'Stanley',
                'last_name' => 'Hudson',
                'email' => 'not-an-email',
            ])
            ->assertSessionHasErrors(['email']);

        // Temporary/disposable email domain
        $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/clients', [
                'first_name' => 'Stanley',
                'last_name' => 'Hudson',
                'email' => 'stanley@mailinator.com',
            ])
            ->assertSessionHasErrors(['email']);

        $this->assertDatabaseMissing('clients', [
            'email' => 'stanley@mailinator.com',
        ]);
    }

    public function test_staff_can_edit_and_toggle_active_status(): void
    {
        $clinic = $this->clinic('lotus');
        [$user] = $this->staff($clinic);

        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Kevin',
            'last_name' => 'Malone',
            'email' => 'kevin@chili.com',
            'phone' => '+1 555 1111',
            'is_active' => true,
        ]);

        // Edit details
        $this->actingAs($user)
            ->patch("http://lotus.umahz.test/app/clients/{$client->id}", [
                'first_name' => 'Kevin',
                'last_name' => 'Malone Updated',
                'email' => 'kevin.updated@chili.com',
                'phone' => '+1 555 2222',
            ])
            ->assertSessionHasNoErrors();

        $client->refresh();
        $this->assertSame('Malone Updated', $client->last_name);
        $this->assertSame('kevin.updated@chili.com', $client->email);

        // Toggle active -> inactive
        $this->actingAs($user)
            ->patch("http://lotus.umahz.test/app/clients/{$client->id}/toggle")
            ->assertSessionHasNoErrors();

        $client->refresh();
        $this->assertFalse($client->is_active);

        // Inactive client does NOT show up in calendar booking dropdown
        $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/calendar')
            ->assertInertia(fn ($page) => $page->has('clients', 0));

        // Toggle back to active
        $this->actingAs($user)
            ->patch("http://lotus.umahz.test/app/clients/{$client->id}/toggle")
            ->assertSessionHasNoErrors();

        $client->refresh();
        $this->assertTrue($client->is_active);

        // Now appears again in calendar
        $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/calendar')
            ->assertInertia(fn ($page) => $page->has('clients', 1));
    }

    public function test_deactivate_guard_blocks_deleting_client_with_appointment_history(): void
    {
        $clinic = $this->clinic('lotus');
        [$user, $practitioner] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);

        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Toby',
            'last_name' => 'Flenderson',
            'email' => 'toby@hr.com',
        ]);

        $location = Location::create([
            'tenant_id' => $clinic->id,
            'name' => 'Annex',
            'timezone' => 'America/Toronto',
        ]);

        $room = Room::create([
            'tenant_id' => $clinic->id,
            'location_id' => $location->id,
            'name' => 'HR Office',
        ]);

        // Attach an appointment
        Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $practitioner->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Wellness Consultation',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
            'duration_minutes' => 60,
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Attempting to delete client with appointment is blocked
        $this->actingAs($user)
            ->delete("http://lotus.umahz.test/app/clients/{$client->id}")
            ->assertSessionHasErrors('client');

        $this->assertDatabaseHas('clients', ['id' => $client->id]);

        // A client WITHOUT appointment history can be deleted
        $cleanClient = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Ryan',
            'last_name' => 'Howard',
            'email' => 'ryan@temp.org',
        ]);

        $this->actingAs($user)
            ->delete("http://lotus.umahz.test/app/clients/{$cleanClient->id}")
            ->assertSessionHasNoErrors();

        // Client is soft-deleted
        $this->assertSoftDeleted('clients', ['id' => $cleanClient->id]);
    }
}
