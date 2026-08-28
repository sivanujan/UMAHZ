<?php

namespace Tests\Feature\Booking;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Location;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookingServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private StaffMembership $practitioner;
    private Client $client;
    private Location $location;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Lotus Wellness',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'timezone' => 'America/Toronto',
            // Mon–Fri 09:00–17:00, weekend closed.
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '09:00', 'close' => '17:00']])
                ->merge([
                    'saturday' => ['closed' => true, 'open' => null, 'close' => null],
                    'sunday' => ['closed' => true, 'open' => null, 'close' => null],
                ])->all(),
        ]);

        $this->makeCurrent($this->tenant);

        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->practitioner = StaffMembership::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $this->client = Client::create([
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Sophia',
            'last_name' => 'Chen',
            'email' => 'sophia@example.com',
        ]);

        $this->location = Location::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Downtown',
            'timezone' => 'America/Toronto',
        ]);

        $this->room = Room::create([
            'tenant_id' => $this->tenant->id,
            'location_id' => $this->location->id,
            'name' => 'Suite A',
        ]);
    }

    private function makeCurrent(Tenant $tenant): void
    {
        app()->instance('current_tenant_id', $tenant->id);
    }

    private function service(): BookingService
    {
        return app(BookingService::class);
    }

    /**
     * Base booking payload for a Monday (2026-09-07) at 10:00 clinic-local, 60 min.
     * Individual tests override what they need.
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitioner->id,
            'location_id' => $this->location->id,
            'room_id' => $this->room->id,
            'service_name' => 'Acupuncture Session',
            'starts_at' => '2026-09-07 10:00',
            'duration_minutes' => 60,
            'notes' => null,
        ], $overrides);
    }

    /**
     * Assert that a closure throws a ValidationException carrying the given key.
     */
    private function assertRejectedWith(string $key, callable $fn): void
    {
        try {
            $fn();
            $this->fail("Expected booking to be rejected with error on '{$key}', but it succeeded.");
        } catch (ValidationException $e) {
            $this->assertArrayHasKey($key, $e->errors(), "Expected a validation error on '{$key}'. Got: ".json_encode($e->errors()));
        }
    }

    public function test_it_books_an_appointment_and_stores_times_in_utc(): void
    {
        $appointment = $this->service()->book($this->payload());

        $this->assertInstanceOf(Appointment::class, $appointment);
        $this->assertSame($this->tenant->id, $appointment->tenant_id);
        $this->assertSame(Appointment::STATUS_SCHEDULED, $appointment->status);
        // 10:00 America/Toronto on 2026-09-07 (EDT, UTC-4) => 14:00 UTC.
        $this->assertSame('2026-09-07 14:00:00', $appointment->starts_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('2026-09-07 15:00:00', $appointment->ends_at->utc()->format('Y-m-d H:i:s'));
    }

    public function test_it_rejects_a_booking_overlapping_the_same_practitioner(): void
    {
        $this->service()->book($this->payload()); // 10:00–11:00

        // Same practitioner, overlapping 10:30–11:30, different (no) room so the
        // only possible conflict is the practitioner's own double-booking.
        $this->assertRejectedWith('staff_membership_id', function () {
            $this->service()->book($this->payload([
                'room_id' => null,
                'starts_at' => '2026-09-07 10:30',
            ]));
        });

        $this->assertSame(1, Appointment::count());
    }

    public function test_it_rejects_a_booking_overlapping_the_same_room(): void
    {
        $this->service()->book($this->payload()); // practitioner 1, room A, 10:00–11:00

        // A DIFFERENT practitioner, same room, overlapping — only the room clashes.
        $otherUser = User::factory()->create(['email_verified_at' => now()]);
        $otherPractitioner = StaffMembership::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $otherUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $this->assertRejectedWith('room_id', function () use ($otherPractitioner) {
            $this->service()->book($this->payload([
                'staff_membership_id' => $otherPractitioner->id,
                'starts_at' => '2026-09-07 10:30',
            ]));
        });

        $this->assertSame(1, Appointment::count());
    }

    public function test_it_rejects_a_booking_that_starts_before_the_clinic_opens(): void
    {
        // Clinic opens 09:00; 08:30 start is outside available hours.
        $this->assertRejectedWith('starts_at', function () {
            $this->service()->book($this->payload(['starts_at' => '2026-09-07 08:30']));
        });

        $this->assertSame(0, Appointment::count());
    }

    public function test_it_rejects_a_booking_that_ends_after_the_clinic_closes(): void
    {
        // Clinic closes 17:00; a 16:30 start for 60 min ends at 17:30 — too late.
        $this->assertRejectedWith('starts_at', function () {
            $this->service()->book($this->payload(['starts_at' => '2026-09-07 16:30']));
        });

        $this->assertSame(0, Appointment::count());
    }

    public function test_it_rejects_a_booking_on_a_day_the_clinic_is_closed(): void
    {
        // 2026-09-12 is a Saturday — closed.
        $this->assertRejectedWith('starts_at', function () {
            $this->service()->book($this->payload(['starts_at' => '2026-09-12 10:00']));
        });

        $this->assertSame(0, Appointment::count());
    }

    public function test_it_rejects_a_booking_that_references_another_clinics_practitioner(): void
    {
        // A second clinic with its own practitioner.
        $otherTenant = Tenant::create([
            'name' => 'Summit', 'slug' => 'summit', 'subdomain' => 'summit',
            'status' => Tenant::STATUS_APPROVED, 'timezone' => 'America/Toronto',
        ]);
        $otherUser = User::factory()->create(['email_verified_at' => now()]);
        $foreignPractitioner = StaffMembership::create([
            'tenant_id' => $otherTenant->id, 'user_id' => $otherUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        // Current tenant is still $this->tenant. Trying to book its calendar
        // with the other clinic's practitioner must be refused.
        $this->assertRejectedWith('staff_membership_id', function () use ($foreignPractitioner) {
            $this->service()->book($this->payload(['staff_membership_id' => $foreignPractitioner->id]));
        });

        $this->assertSame(0, Appointment::count());
    }

    public function test_reschedule_moves_an_appointment_and_recomputes_utc_times(): void
    {
        $appointment = $this->service()->book($this->payload()); // 10:00–11:00

        $moved = $this->service()->reschedule($appointment, [
            'starts_at' => '2026-09-07 13:00',
            'duration_minutes' => 45,
        ]);

        $this->assertSame('2026-09-07 17:00:00', $moved->starts_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('2026-09-07 17:45:00', $moved->ends_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame(1, Appointment::count());
    }

    public function test_reschedule_reruns_conflict_checks(): void
    {
        $first = $this->service()->book($this->payload()); // 10:00–11:00
        $second = $this->service()->book($this->payload([
            'room_id' => null,
            'starts_at' => '2026-09-07 12:00', // 12:00–13:00
        ]));

        // Moving the second onto the first's slot must be rejected...
        $this->assertRejectedWith('staff_membership_id', function () use ($second) {
            $this->service()->reschedule($second, [
                'starts_at' => '2026-09-07 10:30',
                'duration_minutes' => 60,
            ]);
        });

        // ...and the second appointment is left untouched.
        $this->assertSame('2026-09-07 16:00:00', $second->refresh()->starts_at->utc()->format('Y-m-d H:i:s'));
    }

    public function test_reschedule_does_not_conflict_with_the_appointment_itself(): void
    {
        $appointment = $this->service()->book($this->payload()); // 10:00–11:00

        // Nudge it 15 min later — the new range overlaps its OWN old range, which
        // must not count as a conflict.
        $moved = $this->service()->reschedule($appointment, [
            'starts_at' => '2026-09-07 10:15',
            'duration_minutes' => 60,
        ]);

        $this->assertSame('2026-09-07 14:15:00', $moved->starts_at->utc()->format('Y-m-d H:i:s'));
    }

    public function test_cancel_keeps_the_record_and_frees_the_slot(): void
    {
        $appointment = $this->service()->book($this->payload()); // 10:00–11:00

        $cancelled = $this->service()->cancel($appointment, 'Client requested');

        $this->assertSame(Appointment::STATUS_CANCELLED, $cancelled->status);
        $this->assertNotNull($cancelled->cancelled_at);
        $this->assertSame('Client requested', $cancelled->cancellation_reason);
        // Record is kept, not deleted.
        $this->assertSame(1, Appointment::count());

        // The slot is now free — a new booking at the same time succeeds.
        $replacement = $this->service()->book($this->payload());
        $this->assertSame(Appointment::STATUS_SCHEDULED, $replacement->status);
        $this->assertSame(2, Appointment::count());
    }
}
