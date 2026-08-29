<?php

namespace Tests\Feature\Practitioner;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PractitionerAppointmentViewTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub).' Health Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}-health.com",
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '08:00', 'close' => '18:00']])->all(),
        ]);
    }

    private function staff(Tenant $tenant, string $role, string $name): array
    {
        $user = User::factory()->create(['email_verified_at' => now(), 'name' => $name]);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$user, $membership];
    }

    public function test_practitioner_sees_only_their_own_appointments(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner1, $mem1] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. Sarah Connor');
        [$practitioner2, $mem2] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. John Matrix');

        $clientA = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Smith']);
        $clientB = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Bob', 'last_name' => 'Jones']);

        // Appointment for Practitioner 1
        $appt1 = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $clientA->id,
            'staff_membership_id' => $mem1->id,
            'service_name' => 'Acupuncture Initial',
            'starts_at' => now()->startOfDay()->addHours(10),
            'ends_at' => now()->startOfDay()->addHours(11),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Appointment for Practitioner 2
        $appt2 = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $clientB->id,
            'staff_membership_id' => $mem2->id,
            'service_name' => 'Physiotherapy Assessment',
            'starts_at' => now()->startOfDay()->addHours(14),
            'ends_at' => now()->startOfDay()->addHours(15),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Acting as Practitioner 1
        $response = $this->actingAs($practitioner1)
            ->get('http://lotus.umahz.test/app/practitioner/appointments?view=today');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Practitioner/Appointments')
            ->has('appointments', 1)
            ->where('appointments.0.id', $appt1->id)
            ->where('appointments.0.client_name', 'Alice Smith')
            ->where('appointments.0.service_name', 'Acupuncture Initial')
        );
    }

    public function test_practitioner_visiting_general_calendar_is_redirected_to_own_schedule(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. Sarah Connor');

        $response = $this->actingAs($practitioner)
            ->get('http://lotus.umahz.test/app/calendar');

        $response->assertRedirect('http://lotus.umahz.test/app/practitioner/appointments');
    }

    public function test_owner_visiting_general_calendar_sees_full_calendar(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER, 'Clinic Owner');

        $response = $this->actingAs($owner)
            ->get('http://lotus.umahz.test/app/calendar');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Calendar/Index'));
    }

    public function test_practitioner_can_update_status_on_own_appointment(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. Sarah Connor');
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Smith']);

        $appt = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'service_name' => 'Acupuncture Initial',
            'starts_at' => now()->addHours(1),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        $response = $this->actingAs($practitioner)
            ->patch("http://lotus.umahz.test/app/practitioner/appointments/{$appt->id}/status", [
                'status' => Appointment::STATUS_CHECKED_IN,
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $this->assertSame(Appointment::STATUS_CHECKED_IN, $appt->fresh()->status);
    }

    public function test_practitioner_cannot_update_status_on_another_practitioners_appointment(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner1] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. Sarah Connor');
        [$practitioner2, $mem2] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. John Matrix');

        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Smith']);

        // Appointment belongs to Practitioner 2
        $appt = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $mem2->id,
            'service_name' => 'Physiotherapy',
            'starts_at' => now()->addHours(1),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Practitioner 1 attempts to update Practitioner 2's appointment
        $response = $this->actingAs($practitioner1)
            ->patch("http://lotus.umahz.test/app/practitioner/appointments/{$appt->id}/status", [
                'status' => Appointment::STATUS_COMPLETED,
            ]);

        // Must be forbidden (403)
        $response->assertForbidden();
        $this->assertSame(Appointment::STATUS_SCHEDULED, $appt->fresh()->status);
    }

    public function test_cross_tenant_practitioner_access_is_blocked(): void
    {
        $clinicA = $this->clinic('clinic-a');
        $clinicB = $this->clinic('clinic-b');

        [$practitionerA, $memA] = $this->staff($clinicA, StaffMembership::ROLE_PRACTITIONER, 'Dr. Clinic A');
        [$practitionerB] = $this->staff($clinicB, StaffMembership::ROLE_PRACTITIONER, 'Dr. Clinic B');

        $client = Client::create(['tenant_id' => $clinicA->id, 'first_name' => 'Alice', 'last_name' => 'Smith']);

        $appt = Appointment::create([
            'tenant_id' => $clinicA->id,
            'client_id' => $client->id,
            'staff_membership_id' => $memA->id,
            'service_name' => 'Consultation',
            'starts_at' => now()->addHours(1),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Practitioner B attempts to access Appointment from Clinic A on Clinic B's subdomain
        $response = $this->actingAs($practitionerB)
            ->patch("http://clinic-b.umahz.test/app/practitioner/appointments/{$appt->id}/status", [
                'status' => Appointment::STATUS_CHECKED_IN,
            ]);

        // BelongsToTenant global scope causes 404 or 403
        $this->assertTrue(in_array($response->getStatusCode(), [403, 404], true));
    }

    public function test_practitioner_can_update_appointment_notes(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. Sarah Connor');
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Smith']);

        $appt = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'service_name' => 'Session',
            'starts_at' => now()->addHours(1),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        $response = $this->actingAs($practitioner)
            ->patch("http://lotus.umahz.test/app/practitioner/appointments/{$appt->id}/notes", [
                'notes' => 'Patient reported 50% decrease in lower back pain. Prescribed stretching routine.',
            ]);

        $response->assertSessionHasNoErrors();
        $this->assertStringContainsString('50% decrease', $appt->fresh()->notes);
    }

    public function test_practitioner_cannot_update_core_booking_fields(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER, 'Dr. Sarah Connor');
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Smith']);

        $appt = Appointment::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'service_name' => 'Original Service',
            'starts_at' => now()->addHours(1),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        // Practitioner attempts to reschedule or change service via general appointment update route
        $response = $this->actingAs($practitioner)
            ->patch("http://lotus.umahz.test/app/appointments/{$appt->id}", [
                'client_id' => $client->id,
                'staff_membership_id' => $membership->id,
                'service_name' => 'Tampered Service',
                'date' => now()->addDays(2)->format('Y-m-d'),
                'start_time' => '10:00',
                'duration_minutes' => 60,
            ]);

        // Must be forbidden (403) via AppointmentPolicy
        $response->assertForbidden();
        $this->assertSame('Original Service', $appt->fresh()->service_name);
    }
}
