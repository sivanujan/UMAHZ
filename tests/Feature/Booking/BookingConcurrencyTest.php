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
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * The booking engine must never allow two appointments to occupy the same
 * practitioner or room simultaneously, even under a race between two requests
 * that both pass their in-application checks. The last line of defence is a
 * Postgres exclusion constraint; these tests prove it holds.
 */
class BookingConcurrencyTest extends TestCase
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

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Race-condition guard is enforced by a Postgres exclusion constraint.');
        }

        $this->tenant = Tenant::create([
            'name' => 'Lotus', 'slug' => 'lotus', 'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED, 'timezone' => 'America/Toronto',
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '09:00', 'close' => '17:00']])->all(),
        ]);
        app()->instance('current_tenant_id', $this->tenant->id);

        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->practitioner = StaffMembership::create([
            'tenant_id' => $this->tenant->id, 'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);
        $this->client = Client::create([
            'tenant_id' => $this->tenant->id, 'first_name' => 'Sophia', 'last_name' => 'Chen',
            'email' => 'sophia@example.com',
        ]);
        $this->location = Location::create([
            'tenant_id' => $this->tenant->id, 'name' => 'Downtown', 'timezone' => 'America/Toronto',
        ]);
        $this->room = Room::create([
            'tenant_id' => $this->tenant->id, 'location_id' => $this->location->id, 'name' => 'Suite A',
        ]);
    }

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
     * Insert a row straight into the table, bypassing every application-level
     * check, to prove the database is the final arbiter of overlaps.
     */
    private function rawInsertOverlapping(): void
    {
        DB::table('appointments')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitioner->id,
            'location_id' => $this->location->id,
            'room_id' => $this->room->id,
            'service_name' => 'Sneaky overlap',
            'starts_at' => '2026-09-07 14:30:00+00', // overlaps 14:00–15:00 UTC
            'ends_at' => '2026-09-07 15:30:00+00',
            'status' => Appointment::STATUS_SCHEDULED,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_database_rejects_an_overlapping_practitioner_appointment(): void
    {
        app(BookingService::class)->book($this->payload()); // 14:00–15:00 UTC

        $this->expectException(QueryException::class);
        $this->rawInsertOverlapping();
    }

    /**
     * Simulate the race: a competing writer inserts an overlapping appointment
     * AFTER this booking passed its in-application overlap check but BEFORE its
     * own insert. The exclusion constraint must catch it and the service must
     * surface a clean validation error — not a raw database exception — and the
     * losing booking must persist nothing (its transaction rolls back whole).
     * Together with test_database_rejects_an_overlapping_practitioner_appointment
     * this establishes that two simultaneous bookings can never both win.
     */
    public function test_a_racing_booking_is_rejected_with_a_validation_error(): void
    {
        $racy = new class extends BookingService {
            public $tenant;
            public $client;
            public $practitioner;
            public $location;
            public $room;

            protected function persist(array $attributes): Appointment
            {
                // A rival request slips in and books the same slot first.
                \Illuminate\Support\Facades\DB::table('appointments')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'tenant_id' => $this->tenant->id,
                    'client_id' => $this->client->id,
                    'staff_membership_id' => $this->practitioner->id,
                    'location_id' => $this->location->id,
                    'room_id' => $this->room->id,
                    'service_name' => 'Rival booking',
                    'starts_at' => $attributes['starts_at'],
                    'ends_at' => $attributes['ends_at'],
                    'status' => Appointment::STATUS_SCHEDULED,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return parent::persist($attributes);
            }
        };
        $racy->tenant = $this->tenant;
        $racy->client = $this->client;
        $racy->practitioner = $this->practitioner;
        $racy->location = $this->location;
        $racy->room = $this->room;

        try {
            $racy->book($this->payload());
            $this->fail('Expected the racing booking to be rejected.');
        } catch (ValidationException $e) {
            $this->assertNotEmpty($e->errors());
        }

        // The losing booking rolled back cleanly — it wrote nothing.
        $this->assertSame(0, Appointment::where('staff_membership_id', $this->practitioner->id)->count());
    }
}
