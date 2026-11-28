<?php

namespace Tests\Feature\Booking;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClinicClosedDate;
use App\Models\ClinicService;
use App\Models\Location;
use App\Models\PractitionerProfile;
use App\Models\PractitionerTimeOff;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\PublicBookingNotification;
use App\Notifications\StaffBookingAlertNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PublicBookingTest extends TestCase
{
    use RefreshDatabase;

    private function setupClinic(array $bookingOverrides = []): array
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Wellness',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'timezone' => 'America/Toronto',
            'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'business_hours' => [
                'monday' => ['open' => '09:00', 'close' => '17:00', 'closed' => false],
                'tuesday' => ['open' => '09:00', 'close' => '17:00', 'closed' => false],
                'wednesday' => ['open' => '09:00', 'close' => '17:00', 'closed' => false],
                'thursday' => ['open' => '09:00', 'close' => '17:00', 'closed' => false],
                'friday' => ['open' => '09:00', 'close' => '17:00', 'closed' => false],
                'saturday' => ['closed' => true],
                'sunday' => ['closed' => true],
            ],
            'booking_settings' => array_merge([
                'enabled' => true,
                'mode' => 'request',
                'min_notice_hours' => 2,
                'max_days_ahead' => 60,
                'buffer_minutes' => 15,
                'allow_patient_cancellation' => true,
                'cancellation_notice_hours' => 24,
                'require_intake' => false,
                'require_consent' => false,
                'send_24h_reminder' => true,
            ], $bookingOverrides),
        ]);

        $ownerUser = User::factory()->create(['email' => 'owner@lotus.test']);
        $owner = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $pracUser = User::factory()->create(['name' => 'Dr. Sarah Lee', 'email' => 'sarah@lotus.test']);
        $prac = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $pracUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
        PractitionerProfile::create([
            'staff_membership_id' => $prac->id,
            'profession' => PractitionerProfile::PROFESSION_PHYSIOTHERAPY,
            'accepts_online_booking' => true,
            'working_hours' => [
                'monday' => ['open' => '10:00', 'close' => '16:00', 'closed' => false],
                'tuesday' => ['open' => '10:00', 'close' => '16:00', 'closed' => false],
                'wednesday' => ['open' => '10:00', 'close' => '16:00', 'closed' => false],
                'thursday' => ['open' => '10:00', 'close' => '16:00', 'closed' => false],
                'friday' => ['open' => '10:00', 'close' => '16:00', 'closed' => false],
                'saturday' => ['closed' => true],
                'sunday' => ['closed' => true],
            ],
        ]);

        $location = Location::create([
            'tenant_id' => $tenant->id,
            'name' => 'Main Clinic',
            'timezone' => 'America/Toronto',
            'is_active' => true,
        ]);
        $room = Room::create([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Room 101',
            'is_active' => true,
        ]);

        $service = ClinicService::create([
            'tenant_id' => $tenant->id,
            'name' => 'Initial Physiotherapy',
            'discipline' => 'physiotherapy',
            'duration_minutes' => 60,
            'price_cents' => 12000,
            'bookable_online' => true,
            'is_active' => true,
        ]);

        return [$tenant, $ownerUser, $pracUser, $prac, $location, $room, $service];
    }

    public function test_public_booking_off_returns_404(): void
    {
        [$tenant, , , , , , $service] = $this->setupClinic(['enabled' => false]);

        $this->get('http://lotus.umahz.test/book')->assertNotFound();
        $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&date=2026-12-07")
            ->assertNotFound();
    }

    public function test_availability_respects_hours_holidays_time_off_buffer_notice_and_rooms(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 13, 30, 0, 'UTC')); // Mon 08:30 Toronto
        [$tenant, , , $prac, $location, $room, $service] = $this->setupClinic();

        // Holiday blocks all slots
        ClinicClosedDate::create([
            'tenant_id' => $tenant->id,
            'date' => '2026-12-08',
            'reason' => 'Clinic Holiday',
        ]);
        $holidayRes = $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&date=2026-12-08");
        $holidayRes->assertOk()->assertJsonPath('closed_reason', 'Clinic Holiday')->assertJsonCount(0, 'slots');

        // On Mon 2026-12-07 (08:30 Toronto now, 2h notice -> earliest 10:30 Toronto; practitioner hours 10:00-16:00)
        // Add time off 12:00-13:00 Toronto and an appointment 14:00-15:00 Toronto (+15m buffer blocks 13:00..15:15 starts)
        PractitionerTimeOff::create([
            'tenant_id' => $tenant->id,
            'staff_membership_id' => $prac->id,
            'starts_at' => Carbon::create(2026, 12, 7, 12, 0, 0, 'America/Toronto')->utc(),
            'ends_at' => Carbon::create(2026, 12, 7, 13, 0, 0, 'America/Toronto')->utc(),
            'reason' => 'Lunch',
        ]);

        $client = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'Existing', 'last_name' => 'Patient']);
        Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $prac->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Follow-up',
            'starts_at' => Carbon::create(2026, 12, 7, 14, 0, 0, 'America/Toronto')->utc(),
            'ends_at' => Carbon::create(2026, 12, 7, 15, 0, 0, 'America/Toronto')->utc(),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $slotsRes = $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&date=2026-12-07");
        $slotsRes->assertOk();
        $times = collect($slotsRes->json('slots'))->pluck('time')->all();

        $this->assertContains('10:30', $times); // 08:30 + 2h notice = 10:30
        $this->assertNotContains('10:00', $times); // Blocked by 2h min notice
        $this->assertNotContains('12:00', $times); // Blocked by time off
        $this->assertNotContains('13:00', $times); // 13:00-14:00 clashes with 15m buffer before 14:00
        $this->assertNotContains('14:00', $times); // Blocked by existing appt
        $this->assertNotContains('15:00', $times); // Blocked by 15m buffer after 15:00
    }

    public function test_double_booking_race_returns_validation_error(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [$tenant, , , , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        $payload = [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'phone' => '416-555-0100',
        ];

        $this->post('http://lotus.umahz.test/book', $payload)->assertRedirect();

        $second = $this->post('http://lotus.umahz.test/book', array_merge($payload, ['email' => 'other@example.com']));
        $second->assertSessionHasErrors('starts_at');
        $this->assertStringContainsString('just booked', session('errors')->first('starts_at'));
    }

    public function test_request_mode_notifies_staff_and_approve_confirms_appointment(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [$tenant, $ownerUser, $pracUser, , $location, $room, $service] = $this->setupClinic(['mode' => 'request']);

        $res = $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Alex',
            'last_name' => 'Mercer',
            'email' => 'alex@example.com',
            'phone' => '416-555-0199',
        ]);

        $res->assertRedirect();
        $appt = Appointment::where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame(Appointment::STATUS_REQUESTED, $appt->status);
        $this->assertSame('public', $appt->booking_source);
        $this->assertSame($room->id, $appt->room_id);

        Notification::assertSentTo($pracUser, StaffBookingAlertNotification::class);
        Notification::assertSentTo($ownerUser, StaffBookingAlertNotification::class);

        $this->actingAs($ownerUser)
            ->post("http://lotus.umahz.test/app/appointments/{$appt->id}/approve")
            ->assertRedirect();

        $this->assertSame(Appointment::STATUS_CONFIRMED, $appt->fresh()->status);
    }

    public function test_existing_client_matched_by_email_without_overwriting_saved_details(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [$tenant, , , , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Jordan',
            'last_name' => 'Taylor',
            'email' => 'jordan@example.com',
            'phone' => '416-555-1111',
        ]);

        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Jordy',
            'last_name' => 'Taylor',
            'email' => 'JORDAN@example.com',
            'phone' => '416-555-9999',
        ])->assertRedirect();

        $client->refresh();
        $this->assertSame('Jordan', $client->first_name);
        $this->assertSame('416-555-1111', $client->phone);

        $appt = Appointment::where('client_id', $client->id)->firstOrFail();
        $this->assertSame('Jordy', $appt->client_contact_diff['first_name']['submitted']);
        $this->assertSame('416-555-9999', $appt->client_contact_diff['phone']['submitted']);
    }

    public function test_patient_cancellation_enforces_notice_window_and_24h_reminder_is_idempotent(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::create(2026, 12, 8, 16, 0, 0, 'UTC')); // 11:00 Toronto
        [$tenant, , , , $location, , $service] = $this->setupClinic([
            'mode' => 'auto_confirm',
            'cancellation_notice_hours' => 24,
        ]);

        // Book for tomorrow 11:00 Toronto (exactly 24h away -> reminder window 23-25h)
        $res = $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Sam',
            'last_name' => 'Patel',
            'email' => 'sam@example.com',
            'phone' => '416-555-0123',
        ]);
        $res->assertSessionHasNoErrors();
        $redirectPath = parse_url($res->headers->get('Location'), PHP_URL_PATH);
        $token = basename((string) $redirectPath);

        // ICS download works
        $this->get("http://lotus.umahz.test/book/manage/{$token}/ics")
            ->assertOk()
            ->assertHeader('Content-Type', 'text/calendar; charset=utf-8');

        // Reminder command sends once, second run is idempotent
        $this->artisan('appointments:send-reminders')->assertSuccessful();
        $this->artisan('appointments:send-reminders')->assertSuccessful();
        Notification::assertSentOnDemandTimes(PublicBookingNotification::class, 2); // 1 confirmation + 1 reminder

        // Travel inside 24h window (12h before) -> cancel rejected
        $this->travelTo(Carbon::create(2026, 12, 9, 4, 0, 0, 'UTC'));
        $this->post("http://lotus.umahz.test/book/manage/{$token}/cancel")
            ->assertSessionHasErrors('appointment');

        // Travel outside 24h window (30h before) -> cancel succeeds
        $this->travelTo(Carbon::create(2026, 12, 8, 10, 0, 0, 'UTC'));
        $this->post("http://lotus.umahz.test/book/manage/{$token}/cancel")
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(Appointment::STATUS_CANCELLED, Appointment::first()->status);
    }
}
