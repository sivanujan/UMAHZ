<?php

namespace Tests\Feature\Booking;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Location;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\AppointmentConfirmationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AppointmentConfirmationEmailTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub).' Wellness Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}-wellness.com",
            'phone' => '+1 (555) 234-5678',
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '09:00', 'close' => '17:00']])->all(),
        ]);
    }

    private function staff(Tenant $tenant, string $role = StaffMembership::ROLE_RECEPTIONIST): array
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'name' => 'Receptionist Staff']);
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
        $practUser = User::factory()->create(['email_verified_at' => now(), 'name' => 'Dr. Alex Mercer']);
        $practitioner = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $practUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $location = Location::create([
            'tenant_id' => $tenant->id,
            'name' => 'Downtown Clinic',
            'address' => '100 Healing Way, Suite 200, Toronto, ON',
            'timezone' => 'America/Toronto',
        ]);

        $room = Room::create([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Therapy Room 3',
        ]);

        return [$location, $room, $practitioner];
    }

    public function test_booking_client_with_email_dispatches_queued_confirmation_notification(): void
    {
        Notification::fake();

        $clinic = $this->clinic('lotus');
        [$receptionist] = $this->staff($clinic);
        [$location, $room, $practitioner] = $this->fixtures($clinic);

        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Sarah',
            'last_name' => 'Connor',
            'email' => 'sarah.connor@example.com',
        ]);

        $payload = [
            'client_id' => $client->id,
            'staff_membership_id' => $practitioner->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Physiotherapy Consultation',
            'date' => '2026-09-14',
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'notes' => 'First visit assessment',
        ];

        $response = $this->actingAs($receptionist)
            ->post('http://lotus.umahz.test/app/appointments', $payload);

        $response->assertSessionHasNoErrors();

        // Check appointment was created
        $appointment = Appointment::where('client_id', $client->id)->first();
        $this->assertNotNull($appointment);

        // Check notification was dispatched to the client
        Notification::assertSentTo(
            $client,
            AppointmentConfirmationNotification::class,
            function (AppointmentConfirmationNotification $notification) use ($client) {
                $mail = $notification->toMail($client);

                // Verify From display name and address
                $this->assertSame('appointments@umahz.com', $mail->from[0]);
                $this->assertSame('Lotus Wellness Clinic', $mail->from[1]);

                // Verify Reply-To
                $this->assertSame('contact@lotus-wellness.com', $mail->replyTo[0][0]);
                $this->assertSame('Lotus Wellness Clinic', $mail->replyTo[0][1]);

                // Verify Subject
                $this->assertSame('Your appointment at Lotus Wellness Clinic is confirmed', $mail->subject);

                // Verify rendered view data
                $viewData = $mail->viewData;
                $this->assertSame('Lotus Wellness Clinic', $viewData['clinicName']);
                $this->assertSame('Sarah Connor', $viewData['clientName']);
                $this->assertSame('Physiotherapy Consultation', $viewData['serviceName']);
                $this->assertSame('Dr. Alex Mercer', $viewData['practitionerName']);
                $this->assertSame('Monday, September 14, 2026', $viewData['appointmentDate']);
                $this->assertSame('10:00 AM', $viewData['appointmentTime']);
                $this->assertSame('America/Toronto', $viewData['clinicTimezone']);
                $this->assertSame('Downtown Clinic', $viewData['locationName']);
                $this->assertSame('Therapy Room 3', $viewData['roomName']);

                return true;
            }
        );
    }

    public function test_booking_client_without_email_succeeds_without_sending_email(): void
    {
        Notification::fake();

        $clinic = $this->clinic('lotus');
        [$receptionist] = $this->staff($clinic);
        [$location, $room, $practitioner] = $this->fixtures($clinic);

        // Client has no email address
        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => null,
            'phone' => '+1 (555) 000-1111',
        ]);

        $payload = [
            'client_id' => $client->id,
            'staff_membership_id' => $practitioner->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Massage Therapy',
            'date' => '2026-09-15',
            'start_time' => '14:00',
            'duration_minutes' => 45,
        ];

        $response = $this->actingAs($receptionist)
            ->post('http://lotus.umahz.test/app/appointments', $payload);

        $response->assertSessionHasNoErrors();

        // Appointment created successfully
        $this->assertDatabaseHas('appointments', [
            'client_id' => $client->id,
            'service_name' => 'Massage Therapy',
        ]);

        // No notification sent
        Notification::assertNothingSent();
    }

    public function test_confirmation_email_renders_valid_accessible_html(): void
    {
        $clinic = $this->clinic('lotus');
        [$location, $room, $practitioner] = $this->fixtures($clinic);

        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Elena',
            'last_name' => 'Rostova',
            'email' => 'elena@example.com',
        ]);

        $appointment = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $practitioner->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Chiropractic Adjustment',
            'starts_at' => '2026-09-16 13:00:00',
            'ends_at' => '2026-09-16 13:30:00',
            'duration_minutes' => 30,
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        $notification = new AppointmentConfirmationNotification($appointment);
        $mail = $notification->toMail($client);

        // Render blade view to HTML string
        $html = view($mail->view, $mail->viewData)->render();

        $this->assertStringContainsString('Lotus Wellness Clinic', $html);
        $this->assertStringContainsString('Elena Rostova', $html);
        $this->assertStringContainsString('Chiropractic Adjustment', $html);
        $this->assertStringContainsString('Dr. Alex Mercer', $html);
        $this->assertStringContainsString('Downtown Clinic', $html);
        $this->assertStringContainsString('Therapy Room 3', $html);
        $this->assertStringContainsString('Need to reschedule or cancel?', $html);
        $this->assertStringContainsString('+1 (555) 234-5678', $html);
        $this->assertStringContainsString('contact@lotus-wellness.com', $html);
    }

    public function test_booking_succeeds_even_if_notification_dispatch_fails(): void
    {
        $clinic = $this->clinic('lotus');
        [$receptionist] = $this->staff($clinic);
        [$location, $room, $practitioner] = $this->fixtures($clinic);

        $client = Client::create([
            'tenant_id' => $clinic->id,
            'first_name' => 'Michael',
            'last_name' => 'Scott',
            'email' => 'michael@example.com',
        ]);

        // Mock Notification facade to throw an exception
        Notification::shouldReceive('send')
            ->andThrow(new \RuntimeException('Mail transport offline'));

        $payload = [
            'client_id' => $client->id,
            'staff_membership_id' => $practitioner->id,
            'location_id' => $location->id,
            'room_id' => $room->id,
            'service_name' => 'Consultation',
            'date' => '2026-09-17',
            'start_time' => '11:00',
            'duration_minutes' => 30,
        ];

        // The request must still succeed and not throw 500
        $response = $this->actingAs($receptionist)
            ->post('http://lotus.umahz.test/app/appointments', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success', 'Appointment booked.');

        $this->assertDatabaseHas('appointments', [
            'client_id' => $client->id,
            'service_name' => 'Consultation',
        ]);
    }
}
