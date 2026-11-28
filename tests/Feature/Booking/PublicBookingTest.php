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
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicBookingTest extends TestCase
{
    use RefreshDatabase;

    private function setupClinic(array $bookingOverrides = [], string $subdomain = 'lotus'): array
    {
        $tenant = Tenant::create([
            'name' => ucfirst($subdomain).' Wellness',
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'timezone' => 'America/Toronto',
            'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'business_hours' => [
                'monday' => ['open' => '09:00', 'close' => '22:00', 'closed' => false],
                'tuesday' => ['open' => '09:00', 'close' => '22:00', 'closed' => false],
                'wednesday' => ['open' => '09:00', 'close' => '22:00', 'closed' => false],
                'thursday' => ['open' => '09:00', 'close' => '22:00', 'closed' => false],
                'friday' => ['open' => '09:00', 'close' => '22:00', 'closed' => false],
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

        $ownerUser = User::factory()->create(['email' => "owner@{$subdomain}.test"]);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $pracUser = User::factory()->create(['name' => 'Dr. Sarah Lee', 'email' => "sarah@{$subdomain}.test"]);
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
                'monday' => ['open' => '10:00', 'close' => '22:00', 'closed' => false],
                'tuesday' => ['open' => '10:00', 'close' => '22:00', 'closed' => false],
                'wednesday' => ['open' => '10:00', 'close' => '22:00', 'closed' => false],
                'thursday' => ['open' => '10:00', 'close' => '22:00', 'closed' => false],
                'friday' => ['open' => '10:00', 'close' => '22:00', 'closed' => false],
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

    public function test_closed_date_has_no_slots_and_time_off_removes_only_overlapping_slots(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 13, 0, 0, 'UTC')); // Mon 08:00 Toronto
        [$tenant, , , $prac, $location, , $service] = $this->setupClinic();

        ClinicClosedDate::create([
            'tenant_id' => $tenant->id,
            'date' => '2026-12-08',
            'reason' => 'Clinic Holiday',
        ]);

        $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&date=2026-12-08")
            ->assertOk()
            ->assertJsonPath('closed_reason', 'Clinic Holiday')
            ->assertJsonCount(0, 'slots');

        PractitionerTimeOff::create([
            'tenant_id' => $tenant->id,
            'staff_membership_id' => $prac->id,
            'starts_at' => Carbon::create(2026, 12, 7, 12, 0, 0, 'America/Toronto')->utc(),
            'ends_at' => Carbon::create(2026, 12, 7, 13, 0, 0, 'America/Toronto')->utc(),
            'reason' => 'Lunch',
        ]);

        $res = $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&date=2026-12-07");
        $times = collect($res->json('slots'))->pluck('time')->all();

        $this->assertNotContains('12:00', $times);
        $this->assertContains('10:00', $times);
        $this->assertContains('13:00', $times);
    }

    public function test_buffer_min_notice_2h_and_max_60_days_are_enforced(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 13, 30, 0, 'UTC')); // Mon 08:30 Toronto
        [$tenant, , , $prac, $location, $room, $service] = $this->setupClinic();

        $client = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'A', 'last_name' => 'B']);
        Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $prac->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Existing',
            'starts_at' => Carbon::create(2026, 12, 7, 14, 0, 0, 'America/Toronto')->utc(),
            'ends_at' => Carbon::create(2026, 12, 7, 15, 0, 0, 'America/Toronto')->utc(),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $todayTimes = collect(
            $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&date=2026-12-07")->json('slots')
        )->pluck('time')->all();

        // 08:30 + 2h notice = 10:30 earliest
        $this->assertNotContains('10:00', $todayTimes);
        $this->assertContains('10:30', $todayTimes);
        // 15m buffer around 14:00-15:00 blocks 13:00 (ends 14:00) and 15:00 (starts 15:00), allows 15:15
        $this->assertNotContains('13:00', $todayTimes);
        $this->assertNotContains('15:00', $todayTimes);
        $this->assertContains('15:15', $todayTimes);

        // 61 days ahead returns no slots
        $tooFar = Carbon::create(2026, 12, 7, 8, 30, 0, 'America/Toronto')->addDays(61)->toDateString();
        $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&date={$tooFar}")
            ->assertOk()
            ->assertJsonCount(0, 'slots');
    }

    public function test_non_bookable_practitioner_excluded_and_any_available_picks_free_practitioner(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [$tenant, , , $prac1, $location, $room, $service] = $this->setupClinic(['mode' => 'auto_confirm']);
        // Add a second room so rooms don't block prac2
        Room::create(['tenant_id' => $tenant->id, 'location_id' => $location->id, 'name' => 'Room 102', 'is_active' => true]);

        // Prac2 accepts online booking
        $u2 = User::factory()->create(['name' => 'Dr. Free Prac']);
        $prac2 = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $u2->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
        PractitionerProfile::create([
            'staff_membership_id' => $prac2->id,
            'profession' => PractitionerProfile::PROFESSION_PHYSIOTHERAPY,
            'accepts_online_booking' => true,
        ]);

        // Prac3 does NOT accept online booking
        $u3 = User::factory()->create(['name' => 'Dr. Hidden Prac']);
        $prac3 = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $u3->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
        PractitionerProfile::create([
            'staff_membership_id' => $prac3->id,
            'profession' => PractitionerProfile::PROFESSION_PHYSIOTHERAPY,
            'accepts_online_booking' => false,
        ]);

        $this->get('http://lotus.umahz.test/book')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('practitioners', 2)
                ->where('practitioners', fn ($list) => ! collect($list)->pluck('name')->contains('Dr. Hidden Prac'))
            );

        // Book prac1 at 2026-12-09 11:00 -> "Any available" should auto-pick prac2
        $client = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'C1', 'last_name' => 'Test']);
        Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $prac1->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Busy',
            'starts_at' => Carbon::create(2026, 12, 9, 11, 0, 0, 'America/Toronto')->utc(),
            'ends_at' => Carbon::create(2026, 12, 9, 12, 0, 0, 'America/Toronto')->utc(),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Any',
            'last_name' => 'Patient',
            'email' => 'any@example.com',
            'phone' => '416-555-0101',
        ])->assertRedirect();

        $created = Appointment::where('staff_membership_id', $prac2->id)->first();
        $this->assertNotNull($created);
    }

    public function test_room_auto_assignment_and_no_slot_when_all_rooms_booked(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [$tenant, , , $prac1, $location, $room, $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        // Second practitioner available, but only ONE room exists at $location
        $u2 = User::factory()->create(['name' => 'Dr. Two']);
        $prac2 = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $u2->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
        PractitionerProfile::create([
            'staff_membership_id' => $prac2->id,
            'profession' => PractitionerProfile::PROFESSION_PHYSIOTHERAPY,
            'accepts_online_booking' => true,
        ]);

        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'staff_membership_id' => $prac1->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'R1',
            'last_name' => 'User',
            'email' => 'r1@example.com',
            'phone' => '416-555-0102',
        ])->assertRedirect();

        $this->assertSame($room->id, Appointment::first()->room_id);

        // Now even prac2 has no 11:00 slot because the only room is occupied
        $times = collect(
            $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&location_id={$location->id}&staff_membership_id={$prac2->id}&date=2026-12-09")->json('slots')
        )->pluck('time')->all();

        $this->assertNotContains('11:00', $times);
    }

    public function test_evening_slot_in_toronto_stored_correctly_in_utc_for_dst_and_winter(): void
    {
        [$tenant, , , , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        // Summer DST (EDT = UTC-4): 2026-07-15 21:00 Toronto -> 2026-07-16 01:00 UTC
        $this->travelTo(Carbon::create(2026, 7, 14, 12, 0, 0, 'UTC'));
        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-07-15 21:00',
            'first_name' => 'Summer',
            'last_name' => 'Evening',
            'email' => 'summer@example.com',
            'phone' => '416-555-0103',
        ])->assertRedirect();

        $summer = Appointment::latest('created_at')->first();
        $this->assertSame('2026-07-16 01:00:00', $summer->starts_at->utc()->format('Y-m-d H:i:s'));

        // Winter EST (UTC-5): 2026-12-09 21:00 Toronto -> 2026-12-10 02:00 UTC
        $this->travelTo(Carbon::create(2026, 12, 8, 12, 0, 0, 'UTC'));
        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 21:00',
            'first_name' => 'Winter',
            'last_name' => 'Evening',
            'email' => 'winter@example.com',
            'phone' => '416-555-0104',
        ])->assertRedirect();

        $winter = Appointment::whereHas('client', fn ($q) => $q->where('email', 'winter@example.com'))->first();
        $this->assertSame('2026-12-10 02:00:00', $winter->starts_at->utc()->format('Y-m-d H:i:s'));
    }

    public function test_double_booking_same_slot_allows_only_one_and_returns_error(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [, , , , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

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
        $this->post('http://lotus.umahz.test/book', array_merge($payload, ['email' => 'other@example.com']))
            ->assertSessionHasErrors('starts_at');

        $this->assertSame(1, Appointment::count());
    }

    public function test_auto_confirm_and_request_mode_approve_and_decline_with_reason_and_email(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [$tenant, $ownerUser, $pracUser, , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        // Auto-confirm
        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 10:00',
            'first_name' => 'Auto',
            'last_name' => 'User',
            'email' => 'auto@example.com',
            'phone' => '416-555-0105',
        ])->assertRedirect();
        $this->assertSame(Appointment::STATUS_CONFIRMED, Appointment::first()->status);

        // Request mode -> approve & decline
        $tenant->update(['booking_settings' => array_merge($tenant->bookingSettings(), ['mode' => 'request'])]);

        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 13:00',
            'first_name' => 'Req',
            'last_name' => 'Approve',
            'email' => 'req1@example.com',
            'phone' => '416-555-0106',
        ])->assertRedirect();

        $reqAppt = Appointment::whereHas('client', fn ($q) => $q->where('email', 'req1@example.com'))->firstOrFail();
        $this->assertSame(Appointment::STATUS_REQUESTED, $reqAppt->status);
        Notification::assertSentTo($pracUser, StaffBookingAlertNotification::class);

        $this->actingAs($ownerUser)->post("http://lotus.umahz.test/app/appointments/{$reqAppt->id}/approve")->assertRedirect();
        $this->assertSame(Appointment::STATUS_CONFIRMED, $reqAppt->fresh()->status);

        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 15:00',
            'first_name' => 'Req',
            'last_name' => 'Decline',
            'email' => 'req2@example.com',
            'phone' => '416-555-0107',
        ])->assertRedirect();

        $declineAppt = Appointment::whereHas('client', fn ($q) => $q->where('email', 'req2@example.com'))->firstOrFail();
        $this->actingAs($ownerUser)->post("http://lotus.umahz.test/app/appointments/{$declineAppt->id}/decline", [
            'reason' => 'Practitioner unavailable',
        ])->assertRedirect();

        $declineAppt->refresh();
        $this->assertSame(Appointment::STATUS_DECLINED, $declineAppt->status);
        $this->assertSame('Practitioner unavailable', $declineAppt->declined_reason);
        Notification::assertSentOnDemand(PublicBookingNotification::class, fn ($n) => $n->kind === 'declined' && $n->reason === 'Practitioner unavailable');
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

    public function test_patient_cancellation_window_and_disabled_setting_and_wrong_cross_tenant_token(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::create(2026, 12, 8, 16, 0, 0, 'UTC'));
        [$tenant, , , , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm', 'cancellation_notice_hours' => 24]);
        $this->setupClinic([], 'otherclinic');

        $res = $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Sam',
            'last_name' => 'Patel',
            'email' => 'sam@example.com',
            'phone' => '416-555-0123',
        ]);
        $token = basename((string) parse_url($res->headers->get('Location'), PHP_URL_PATH));

        // Wrong token and cross-tenant token return 404
        $this->get('http://lotus.umahz.test/book/manage/nonexistent-token')->assertNotFound();
        $this->get("http://otherclinic.umahz.test/book/manage/{$token}")->assertNotFound();

        // Inside 24h window -> refused
        $this->travelTo(Carbon::create(2026, 12, 9, 4, 0, 0, 'UTC'));
        $this->post("http://lotus.umahz.test/book/manage/{$token}/cancel")->assertSessionHasErrors('appointment');

        // Outside 24h window but cancellation disabled -> refused
        $this->travelTo(Carbon::create(2026, 12, 8, 10, 0, 0, 'UTC'));
        $tenant->update(['booking_settings' => array_merge($tenant->bookingSettings(), ['allow_patient_cancellation' => false])]);
        $this->post("http://lotus.umahz.test/book/manage/{$token}/cancel")->assertSessionHasErrors('appointment');

        // Re-enable cancellation outside 24h -> succeeds
        $tenant->update(['booking_settings' => array_merge($tenant->bookingSettings(), ['allow_patient_cancellation' => true])]);
        $this->post("http://lotus.umahz.test/book/manage/{$token}/cancel")->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(Appointment::STATUS_CANCELLED, Appointment::first()->status);
    }

    public function test_24h_reminder_is_idempotent_and_skips_cancelled_and_declined(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::create(2026, 12, 8, 16, 0, 0, 'UTC'));
        [$tenant, , , $prac, $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        $c1 = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'Conf', 'last_name' => 'One', 'email' => 'c1@example.com']);
        $c2 = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'Canc', 'last_name' => 'Two', 'email' => 'c2@example.com']);
        $c3 = Client::create(['tenant_id' => $tenant->id, 'first_name' => 'Decl', 'last_name' => 'Three', 'email' => 'c3@example.com']);

        $start = Carbon::create(2026, 12, 9, 16, 0, 0, 'UTC');
        Appointment::create(['tenant_id' => $tenant->id, 'client_id' => $c1->id, 'staff_membership_id' => $prac->id, 'location_id' => $location->id, 'service_name' => $service->name, 'starts_at' => $start, 'ends_at' => $start->copy()->addHour(), 'status' => Appointment::STATUS_CONFIRMED]);
        Appointment::create(['tenant_id' => $tenant->id, 'client_id' => $c2->id, 'staff_membership_id' => $prac->id, 'location_id' => $location->id, 'service_name' => $service->name, 'starts_at' => $start, 'ends_at' => $start->copy()->addHour(), 'status' => Appointment::STATUS_CANCELLED]);
        Appointment::create(['tenant_id' => $tenant->id, 'client_id' => $c3->id, 'staff_membership_id' => $prac->id, 'location_id' => $location->id, 'service_name' => $service->name, 'starts_at' => $start, 'ends_at' => $start->copy()->addHour(), 'status' => Appointment::STATUS_DECLINED]);

        $this->artisan('appointments:send-reminders')->assertSuccessful();
        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertSentOnDemandTimes(PublicBookingNotification::class, 1);
    }

    public function test_booking_off_and_non_bookable_service_and_find_a_clinic_privacy(): void
    {
        [$offTenant, , , , $offLoc, , $offService] = $this->setupClinic(['enabled' => false], 'offclinic');
        [$onTenant, , , , $onLoc, , $onService] = $this->setupClinic(['enabled' => true], 'onclinic');

        $this->get('http://offclinic.umahz.test/book')->assertNotFound();
        $this->post('http://offclinic.umahz.test/book', [
            'service_id' => $offService->id,
            'location_id' => $offLoc->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'A',
            'last_name' => 'B',
            'email' => 'a@b.com',
            'phone' => '123456',
        ])->assertNotFound();

        $privateService = ClinicService::create([
            'tenant_id' => $onTenant->id,
            'name' => 'Staff Only Service',
            'duration_minutes' => 60,
            'price_cents' => 5000,
            'bookable_online' => false,
            'is_active' => true,
        ]);

        $this->post('http://onclinic.umahz.test/book', [
            'service_id' => $privateService->id,
            'location_id' => $onLoc->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'A',
            'last_name' => 'B',
            'email' => 'a@b.com',
            'phone' => '123456',
        ])->assertNotFound();

        // Central "Find a clinic" lists only Onclinic, never Offclinic, and no private contact fields
        $this->get('http://umahz.test/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->has('bookableClinics', 1)
                ->where('bookableClinics.0.subdomain', 'onclinic')
                ->missing('bookableClinics.0.email')
                ->missing('bookableClinics.0.phone')
            );
    }

    public function test_honeypot_and_rate_limits_and_migration_rerun_safety(): void
    {
        $this->travelTo(Carbon::create(2026, 12, 7, 12, 0, 0, 'UTC'));
        [, , , , $location, , $service] = $this->setupClinic(['mode' => 'auto_confirm']);

        // Honeypot filled -> 422
        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 11:00',
            'first_name' => 'Bot',
            'last_name' => 'User',
            'email' => 'bot@example.com',
            'phone' => '416-555-0000',
            'website' => 'https://spam.example.com',
        ])->assertStatus(422);

        // Slots rate limit (10/min) -> 11th returns 429
        for ($i = 0; $i < 10; $i++) {
            $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&date=2026-12-09")->assertOk();
        }
        $this->getJson("http://lotus.umahz.test/book/slots?service_id={$service->id}&date=2026-12-09")->assertStatus(429);

        // Booking submit rate limit (5/min) -> 6th returns 429
        for ($i = 0; $i < 5; $i++) {
            $this->post('http://lotus.umahz.test/book', [
                'service_id' => $service->id,
                'location_id' => $location->id,
                'starts_at' => '2026-12-09 11:00',
                'first_name' => 'A',
                'last_name' => 'B',
                'email' => "rl{$i}@example.com",
                'phone' => '416-555-0100',
            ]);
        }
        $this->post('http://lotus.umahz.test/book', [
            'service_id' => $service->id,
            'location_id' => $location->id,
            'starts_at' => '2026-12-09 12:00',
            'first_name' => 'A',
            'last_name' => 'B',
            'email' => 'rl5@example.com',
            'phone' => '416-555-0100',
        ])->assertStatus(429);

        // Migration rollback + re-run safety with existing appointment data
        $migration = require database_path('migrations/2026_11_28_000001_add_public_booking_schema.php');
        $migration->down();
        $migration->up();
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('clinic_services'));
    }

    public function test_owner_can_view_online_booking_settings_page(): void
    {
        [, $owner] = $this->setupClinic();

        $this->actingAs($owner)
            ->get('http://lotus.umahz.test/app/settings/booking')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Settings/OnlineBooking'));
    }
}
