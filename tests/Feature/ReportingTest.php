<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Location;
use App\Models\Payment;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportingTest extends TestCase
{
    use RefreshDatabase;

    private function createTenant(string $subdomain = 'oasis'): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($subdomain) . ' Health',
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
            'currency' => 'cad',
            'timezone' => 'America/Toronto',
            'onboarding_completed_at' => now(),
            'business_hours' => [
                'monday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'tuesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'wednesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'thursday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'friday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'saturday' => ['closed' => true, 'open' => '09:00', 'close' => '17:00'],
                'sunday' => ['closed' => true, 'open' => '09:00', 'close' => '17:00'],
            ],
        ]);
    }

    private function createStaff(Tenant $tenant, string $role = StaffMembership::ROLE_CLINIC_OWNER): array
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

    private function url(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.umahz.test" . $path;
    }

    public function test_staff_can_view_appointments_report(): void
    {
        $tenant = $this->createTenant('lotus');
        [$owner] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$practitioner] = $this->createStaff($tenant, StaffMembership::ROLE_PRACTITIONER);
        [$receptionist] = $this->createStaff($tenant, StaffMembership::ROLE_RECEPTIONIST);

        // Owner can access
        $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/appointments'))
            ->assertOk();

        // Practitioner can access
        $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/reports/appointments'))
            ->assertOk();

        // Receptionist can access
        $this->actingAs($receptionist)
            ->get($this->url($tenant, '/app/reports/appointments'))
            ->assertOk();
    }

    public function test_owner_can_view_revenue_report_but_non_owner_is_forbidden(): void
    {
        $tenant = $this->createTenant('lotus');
        [$owner] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$practitioner] = $this->createStaff($tenant, StaffMembership::ROLE_PRACTITIONER);
        [$receptionist] = $this->createStaff($tenant, StaffMembership::ROLE_RECEPTIONIST);

        // Owner can access revenue dashboard
        $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/revenue'))
            ->assertOk();

        // Owner can export revenue CSV
        $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/revenue/export'))
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        // Practitioner is forbidden (403)
        $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/reports/revenue'))
            ->assertStatus(403);

        $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/reports/revenue/export'))
            ->assertStatus(403);

        // Receptionist is forbidden (403)
        $this->actingAs($receptionist)
            ->get($this->url($tenant, '/app/reports/revenue'))
            ->assertStatus(403);

        $this->actingAs($receptionist)
            ->get($this->url($tenant, '/app/reports/revenue/export'))
            ->assertStatus(403);
    }

    public function test_staff_can_view_retention_and_utilization_reports(): void
    {
        $tenant = $this->createTenant('wellness');
        [$practitioner] = $this->createStaff($tenant, StaffMembership::ROLE_PRACTITIONER);

        $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/reports/retention'))
            ->assertOk();

        $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/reports/utilization'))
            ->assertOk();
    }

    public function test_reports_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = $this->createTenant('clinic-a');
        $tenantB = $this->createTenant('clinic-b');

        [$ownerA, $membershipA] = $this->createStaff($tenantA, StaffMembership::ROLE_CLINIC_OWNER);
        [$ownerB] = $this->createStaff($tenantB, StaffMembership::ROLE_CLINIC_OWNER);

        $clientA = Client::create([
            'tenant_id' => $tenantA->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
        ]);

        $locationA = Location::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Main Office',
            'timezone' => 'America/Toronto',
        ]);

        // Create appointment in Clinic A
        Appointment::create([
            'tenant_id' => $tenantA->id,
            'client_id' => $clientA->id,
            'staff_membership_id' => $membershipA->id,
            'location_id' => $locationA->id,
            'service_name' => 'Physiotherapy Assessment',
            'starts_at' => Carbon::today()->setTime(10, 0),
            'ends_at' => Carbon::today()->setTime(11, 0),
            'status' => Appointment::STATUS_COMPLETED,
        ]);

        // Clinic A reports show 1 appointment
        $responseA = $this->actingAs($ownerA)
            ->get($this->url($tenantA, '/app/reports/appointments?preset=month'));
        $responseA->assertOk();
        $responseA->assertInertia(fn ($page) => $page
            ->component('Reports/Appointments')
            ->where('report.summary.total', 1)
            ->where('report.summary.completed', 1)
        );

        // Clinic B reports show 0 appointments
        $responseB = $this->actingAs($ownerB)
            ->get($this->url($tenantB, '/app/reports/appointments?preset=month'));
        $responseB->assertOk();
        $responseB->assertInertia(fn ($page) => $page
            ->component('Reports/Appointments')
            ->where('report.summary.total', 0)
            ->where('report.summary.completed', 0)
        );
    }

    public function test_revenue_calculations_handle_exact_minor_units_without_drift(): void
    {
        $tenant = $this->createTenant('finances');
        [$owner] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'email' => 'alice@example.com',
        ]);

        // Create Invoice: subtotal $100.00 (10000), discount $10.00 (1000), tax $13.00 (1300), total $103.00 (10300)
        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'invoice_number' => 'INV-0001',
            'status' => Invoice::STATUS_PAID,
            'currency' => 'cad',
            'due_date' => Carbon::today()->addDays(14),
            'subtotal_amount' => 10000,
            'discount_amount' => 1000,
            'tax_amount' => 1300,
            'total_amount' => 10300,
            'amount_paid' => 10300,
            'paid_at' => Carbon::today(),
        ]);

        // Create successful payment for the invoice: $103.00 (10300)
        Payment::create([
            'tenant_id' => $tenant->id,
            'invoice_id' => $invoice->id,
            'amount' => 10300,
            'currency' => 'cad',
            'status' => Payment::STATUS_SUCCEEDED,
            'method' => Payment::METHOD_CARD,
            'processed_at' => Carbon::today(),
        ]);

        // Create refund of $20.00 (2000)
        Payment::create([
            'tenant_id' => $tenant->id,
            'invoice_id' => $invoice->id,
            'amount' => 2000,
            'currency' => 'cad',
            'status' => Payment::STATUS_REFUNDED,
            'method' => Payment::METHOD_CARD,
            'processed_at' => Carbon::today(),
        ]);

        $response = $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/revenue?preset=month'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Revenue')
            ->where('report.summary.gross_billed_cents', 10000)
            ->where('report.summary.discounts_cents', 1000)
            ->where('report.summary.taxes_cents', 1300)
            ->where('report.summary.refunds_cents', 2000)
            ->where('report.summary.net_collected_cents', 8300) // 10300 - 2000 = 8300 ($83.00)
        );
    }

    public function test_csv_exports_stream_valid_rfc4180_content(): void
    {
        $tenant = $this->createTenant('exportclinic');
        [$owner, $membership] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Export',
            'last_name' => 'Tester',
            'email' => 'export@example.com',
        ]);

        Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'service_name' => 'Consultation Session',
            'starts_at' => Carbon::today()->setTime(14, 0),
            'ends_at' => Carbon::today()->setTime(15, 0),
            'status' => Appointment::STATUS_COMPLETED,
        ]);

        // Export appointments
        $aptCsv = $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/appointments/export?preset=month'));

        $aptCsv->assertOk();
        $aptCsv->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Consultation Session', $aptCsv->streamedContent());
        $this->assertStringContainsString('Export Tester', $aptCsv->streamedContent());

        // Export retention
        $retCsv = $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/retention/export?preset=month'));
        $retCsv->assertOk();
        $retCsv->assertHeader('content-type', 'text/csv; charset=UTF-8');

        // Export utilization
        $utilCsv = $this->actingAs($owner)
            ->get($this->url($tenant, '/app/reports/utilization/export?preset=month'));
        $utilCsv->assertOk();
        $utilCsv->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
