<?php

namespace Tests\Feature\Booking;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Location;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Exercises the calendar/booking routes through the full subdomain +
 * staff.role middleware stack, confirming tenant isolation and role access.
 */
class AppointmentBookingHttpTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub),
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'timezone' => 'America/Toronto',
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '09:00', 'close' => '17:00']])->all(),
        ]);
    }

    private function staff(Tenant $tenant, string $role = StaffMembership::ROLE_PRACTITIONER): array
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

    private function fixtures(Tenant $tenant): array
    {
        $client = Client::create([
            'tenant_id' => $tenant->id, 'first_name' => 'Sophia', 'last_name' => 'Chen',
            'email' => "sophia+{$tenant->subdomain}@example.com",
        ]);
        $location = Location::create([
            'tenant_id' => $tenant->id, 'name' => 'Downtown', 'timezone' => 'America/Toronto',
        ]);
        $room = Room::create([
            'tenant_id' => $tenant->id, 'location_id' => $location->id, 'name' => 'Suite A',
        ]);

        return [$client, $location, $room];
    }

    private function payload(array $refs, array $overrides = []): array
    {
        [$client, $location, $room, $practitioner] = $refs;

        return array_merge([
            'client_id' => $client->id,
            'staff_membership_id' => $practitioner->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Acupuncture Session',
            'date' => '2026-09-07',
            'start_time' => '10:00',
            'duration_minutes' => 60,
        ], $overrides);
    }

    public function test_staff_can_open_the_calendar(): void
    {
        $clinic = $this->clinic('lotus');
        [$user] = $this->staff($clinic);

        $this->actingAs($user)
            ->get('http://lotus.umahz.test/app/calendar')
            ->assertOk();
    }

    public function test_a_receptionist_can_book_an_appointment(): void
    {
        $clinic = $this->clinic('lotus');
        [$reception] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        [$practUser, $practitioner] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);
        [$client, $location, $room] = $this->fixtures($clinic);

        $this->actingAs($reception)
            ->post('http://lotus.umahz.test/app/appointments', $this->payload([$client, $location, $room, $practitioner]))
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Appointment::where('tenant_id', $clinic->id)->count());
    }

    public function test_overlapping_booking_is_rejected_with_a_validation_error(): void
    {
        $clinic = $this->clinic('lotus');
        [$user, $practitioner] = $this->staff($clinic);
        [$client, $location, $room] = $this->fixtures($clinic);
        $refs = [$client, $location, $room, $practitioner];

        $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/appointments', $this->payload($refs))
            ->assertSessionHasNoErrors();

        // Same practitioner, overlapping — rejected.
        $this->actingAs($user)
            ->post('http://lotus.umahz.test/app/appointments', $this->payload($refs, ['start_time' => '10:30', 'room_id' => null]))
            ->assertSessionHasErrors('staff_membership_id');

        $this->assertSame(1, Appointment::where('tenant_id', $clinic->id)->count());
    }

    public function test_a_clinic_cannot_cancel_another_clinics_appointment(): void
    {
        $clinicA = $this->clinic('clinic-a');
        [$userA] = $this->staff($clinicA);

        // An appointment that belongs to a DIFFERENT clinic.
        $clinicB = $this->clinic('clinic-b');
        [, $practitionerB] = $this->staff($clinicB);
        [$clientB, $locationB, $roomB] = $this->fixtures($clinicB);
        $appointmentB = Appointment::create([
            'tenant_id' => $clinicB->id,
            'client_id' => $clientB->id,
            'staff_membership_id' => $practitionerB->id,
            'location_id' => $locationB->id,
            'room_id' => $roomB->id,
            'service_name' => 'Private',
            'starts_at' => '2026-09-07 14:00:00',
            'ends_at' => '2026-09-07 15:00:00',
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Clinic A staff, on their own subdomain, cannot touch B's appointment:
        // the tenant-scoped route binding simply doesn't resolve it.
        $this->actingAs($userA)
            ->patch("http://clinic-a.umahz.test/app/appointments/{$appointmentB->id}/cancel")
            ->assertNotFound();

        $this->assertSame(Appointment::STATUS_SCHEDULED, $appointmentB->refresh()->status);
    }
}
