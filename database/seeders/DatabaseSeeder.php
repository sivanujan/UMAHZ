<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClientForm;
use App\Models\ClinicalNote;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Message;
use App\Models\PractitionerProfile;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Roles & permissions
        $roles = ['Platform Admin', 'Clinic Owner', 'Practitioner', 'Receptionist', 'Client'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // Clinical actions are gated by permission on top of the tenant-role
        // check — receptionists never get this, regardless of tenant.
        $notesFinalize = Permission::firstOrCreate(['name' => 'notes.finalize', 'guard_name' => 'web']);
        Role::findByName('Clinic Owner')->givePermissionTo($notesFinalize);
        Role::findByName('Practitioner')->givePermissionTo($notesFinalize);

        // 2. Demo Clinic Tenant
        $tenant = Tenant::firstOrCreate(['slug' => 'lotus-wellness'], [
            'name' => 'Lotus Wellness Clinic',
            'timezone' => 'America/New_York',
            'currency' => 'USD',
            'address' => [
                'line1' => '100 Healing Way, Suite 200',
                'city' => 'Boston',
                'region' => 'MA',
                'country' => 'US',
            ],
            'phone' => '+1 (555) 234-5678',
            'email' => 'contact@umahz.com',
            // Seeded demo tenants skip the setup wizard — they're already "set up".
            'onboarding_completed_at' => now(),
        ]);

        app()->instance('current_tenant_id', $tenant->id);

        // A second tenant, used to demo multi-tenant workspace selection.
        $secondTenant = Tenant::firstOrCreate(['slug' => 'summit-performance'], [
            'name' => 'Summit Performance Studio',
            'timezone' => 'America/Denver',
            'currency' => 'USD',
            'address' => [
                'line1' => '88 Alpine Ridge Rd',
                'city' => 'Denver',
                'region' => 'CO',
                'country' => 'US',
            ],
            'phone' => '+1 (555) 900-1200',
            'email' => 'hello@summitperformance.com',
            'onboarding_completed_at' => now(),
        ]);

        // 3. Platform Administrator
        $adminUser = User::firstOrCreate(['email' => 'admin@umahz.com'], [
            'name' => 'Priya Nakamura',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        if (! $adminUser->hasRole('Platform Admin')) {
            $adminUser->assignRole('Platform Admin');
        }

        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
        ], [
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 4. Demo Clinic Owner
        $ownerUser = User::firstOrCreate(['email' => 'owner@umahz.com'], [
            'name' => 'Dr. Eleanor Vance',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        if (! $ownerUser->hasRole('Clinic Owner')) {
            $ownerUser->assignRole('Clinic Owner');
        }

        $ownerMembership = StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
        ], [
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 5. Demo Practitioner
        $practitionerUser = User::firstOrCreate(['email' => 'practitioner@umahz.com'], [
            'name' => 'Julian Hayes, LAc',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        if (! $practitionerUser->hasRole('Practitioner')) {
            $practitionerUser->assignRole('Practitioner');
        }

        $practitionerMembership = StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $practitionerUser->id,
        ], [
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        PractitionerProfile::firstOrCreate([
            'staff_membership_id' => $practitionerMembership->id,
        ], [
            'profession' => PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM,
            'credentials' => 'LAc, Dipl. OM',
            'biography' => 'Julian specialises in TCM pain management and herbal medicine.',
            'calendar_color' => '#5B2EFF',
        ]);

        // 6. Demo Receptionist
        $receptionistUser = User::firstOrCreate(['email' => 'receptionist@umahz.com'], [
            'name' => 'Maya Torres',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        if (! $receptionistUser->hasRole('Receptionist')) {
            $receptionistUser->assignRole('Receptionist');
        }

        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $receptionistUser->id,
        ], [
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 7. Multi-tenant staff member
        $multiTenantUser = User::firstOrCreate(['email' => 'dana@umahz.com'], [
            'name' => 'Dana Whitfield',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        if (! $multiTenantUser->hasRole('Practitioner')) {
            $multiTenantUser->assignRole('Practitioner');
        }

        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $multiTenantUser->id,
        ], [
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        StaffMembership::firstOrCreate([
            'tenant_id' => $secondTenant->id,
            'user_id' => $multiTenantUser->id,
        ], [
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 8. A pending invitation
        $invitedUser = User::firstOrCreate(['email' => 'newhire@lotuswellness.com'], [
            'name' => 'new.hire',
            'password' => Hash::make(str()->random(32)),
        ]);

        StaffMembership::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $invitedUser->id,
        ], [
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_INVITED,
            'invited_at' => now(),
        ]);

        // 9. Locations & Rooms
        $location = Location::firstOrCreate([
            'tenant_id' => $tenant->id,
            'name' => 'Downtown Sanctuary',
        ], [
            'address' => '100 Healing Way, Boston MA',
            'timezone' => 'America/New_York',
            'phone' => '+1 (555) 234-5678',
        ]);

        $roomA = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Acupuncture Suite A',
        ], [
            'description' => 'Equipped with heated treatment table and ambient sound machine',
        ]);

        $roomB = Room::firstOrCreate([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Mindfulness Room B',
        ], [
            'description' => 'Private meditation and biofeedback space',
        ]);

        // 10. Clients
        $sophia = Client::firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'sophia.chen@example.com',
        ], [
            'first_name' => 'Sophia',
            'last_name' => 'Chen',
            'phone' => '+1 (555) 987-6543',
            'date_of_birth' => '1990-04-12',
            'preferred_contact_method' => 'email',
            'emergency_contact' => [
                'name' => 'Wei Chen',
                'relationship' => 'Spouse',
                'phone' => '+1 (555) 987-1111',
            ],
        ]);

        $marcus = Client::firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'marcus@example.com',
        ], [
            'first_name' => 'Marcus',
            'last_name' => 'Aurelius',
            'phone' => '+1 (555) 876-5432',
            'date_of_birth' => '1985-08-23',
            'preferred_contact_method' => 'phone',
        ]);

        // A client who has already completed self-registration (has a login).
        $clientUser = User::firstOrCreate(['email' => 'ravi@example.com'], [
            'name' => 'Ravi Patel',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'tos_accepted_version' => '2026-01-01',
            'tos_accepted_at' => now(),
        ]);

        $ravi = Client::firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'ravi@example.com',
        ], [
            'user_id' => $clientUser->id,
            'first_name' => 'Ravi',
            'last_name' => 'Patel',
            'phone' => '+1 (555) 345-6789',
            'date_of_birth' => '1992-11-02',
            'preferred_contact_method' => 'sms',
        ]);

        // A few more clients purely to give the owner/admin stats and
        // this month's revenue realistic-looking volume.
        $extraClients = collect(['Nadia Farouk', 'Tomas Alvarez', 'Grace Kim', 'Ben Okafor', 'Lena Petrov'])
            ->map(function (string $name) use ($tenant) {
                [$first, $last] = explode(' ', $name, 2);

                return Client::create([
                    'tenant_id' => $tenant->id,
                    'first_name' => $first,
                    'last_name' => $last,
                    'email' => strtolower($first).'@example.com',
                    'phone' => '+1 (555) '.random_int(200, 999).'-'.random_int(1000, 9999),
                    'preferred_contact_method' => ['email', 'phone', 'sms'][random_int(0, 2)],
                ]);
            });

        // 11. Today's appointments — drive the owner/practitioner/receptionist
        // dashboards and the check-in queue.
        $today = now()->startOfDay();

        $sophiaAppt = Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $sophia->id,
            'staff_membership_id' => $practitionerMembership->id,
            'location_id' => $location->id,
            'room_id' => $roomA->id,
            'service_name' => 'Acupuncture Initial Assessment',
            'starts_at' => $today->copy()->setTime(10, 0),
            'ends_at' => $today->copy()->setTime(11, 0),
            'status' => Appointment::STATUS_CHECKED_IN,
        ]);

        Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $marcus->id,
            'staff_membership_id' => $ownerMembership->id,
            'location_id' => $location->id,
            'room_id' => $roomB->id,
            'service_name' => 'Herbal Consultation & Follow-up',
            'starts_at' => $today->copy()->setTime(14, 30),
            'ends_at' => $today->copy()->setTime(15, 15),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // Ravi's upcoming appointment, for the client portal dashboard.
        Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $ravi->id,
            'staff_membership_id' => $practitionerMembership->id,
            'location_id' => $location->id,
            'room_id' => $roomA->id,
            'service_name' => 'Acupuncture Follow-up',
            'starts_at' => $today->copy()->addDay()->setTime(10, 0),
            'ends_at' => $today->copy()->addDay()->setTime(10, 45),
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        // A batch of completed sessions earlier this month, so "Revenue
        // (MTD)" on the owner dashboard reflects real paid invoices.
        // Non-overlapping past sessions: each takes a distinct (practitioner,
        // day, whole-hour) and (room, day, hour) slot, so the appointment
        // exclusion constraint is never violated no matter which day we seed on.
        // Whole-hour starts with 45-min durations can never overlap each other,
        // and we stay strictly in the past so we never collide with today's
        // fixed appointments above.
        $allClients = $extraClients->push($sophia)->push($marcus)->push($ravi);
        $practitionerIds = [$practitionerMembership->id, $ownerMembership->id];
        $roomIds = [$roomA->id, $roomB->id];
        $maxDaysAgo = max(1, (int) now()->day - 1);
        $usedSlots = [];
        $made = 0;
        $attempts = 0;

        while ($made < 18 && $attempts < 500) {
            $attempts++;
            $staffId = $practitionerIds[random_int(0, 1)];
            $roomId = $roomIds[random_int(0, 1)];
            $daysAgo = random_int(1, $maxDaysAgo);
            $hour = random_int(9, 16);

            $practitionerKey = "p:{$staffId}:{$daysAgo}:{$hour}";
            $roomKey = "r:{$roomId}:{$daysAgo}:{$hour}";
            if (isset($usedSlots[$practitionerKey]) || isset($usedSlots[$roomKey])) {
                continue;
            }
            $usedSlots[$practitionerKey] = $usedSlots[$roomKey] = true;

            $startsAt = $today->copy()->subDays($daysAgo)->setTime($hour, 0);

            Appointment::create([
                'tenant_id' => $tenant->id,
                'client_id' => $allClients->random()->id,
                'staff_membership_id' => $staffId,
                'location_id' => $location->id,
                'room_id' => $roomId,
                'service_name' => ['Acupuncture Session', 'Herbal Consultation', 'Follow-up Treatment', 'Initial Assessment'][random_int(0, 3)],
                'starts_at' => $startsAt,
                'ends_at' => $startsAt->copy()->addMinutes(45),
                'status' => Appointment::STATUS_COMPLETED,
            ]);
            $made++;
        }

        // 12. Invoices — outstanding balances for the owner/receptionist/
        // client views, plus paid invoices behind this month's revenue.
        Invoice::create([
            'tenant_id' => $tenant->id,
            'client_id' => $sophia->id,
            'description' => 'Acupuncture Initial Assessment',
            'amount' => 120.00,
            'status' => Invoice::STATUS_DUE,
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        Invoice::create([
            'tenant_id' => $tenant->id,
            'client_id' => $marcus->id,
            'description' => 'Herbal Consultation & Follow-up',
            'amount' => 85.00,
            'status' => Invoice::STATUS_OVERDUE,
            'due_date' => now()->subDays(2)->toDateString(),
        ]);

        Invoice::create([
            'tenant_id' => $tenant->id,
            'client_id' => $ravi->id,
            'description' => 'Acupuncture Session',
            'amount' => 120.00,
            'status' => Invoice::STATUS_DUE,
            'due_date' => now()->addDays(5)->toDateString(),
        ]);

        foreach (Appointment::where('tenant_id', $tenant->id)->where('status', Appointment::STATUS_COMPLETED)->get() as $appointment) {
            Invoice::create([
                'tenant_id' => $tenant->id,
                'client_id' => $appointment->client_id,
                'appointment_id' => $appointment->id,
                'description' => $appointment->service_name,
                'amount' => [95.00, 120.00, 135.00, 150.00][random_int(0, 3)],
                'status' => Invoice::STATUS_PAID,
                'paid_at' => $appointment->ends_at,
            ]);
        }

        // 13. Clinical notes — one unsigned note waiting on Julian.
        ClinicalNote::create([
            'tenant_id' => $tenant->id,
            'client_id' => $sophia->id,
            'staff_membership_id' => $practitionerMembership->id,
            'appointment_id' => $sophiaAppt->id,
            'content' => 'Acupuncture Session',
            'status' => ClinicalNote::STATUS_DRAFT,
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);

        // 14. Client forms — one pending clinic-wide, one for Ravi's portal.
        ClientForm::create([
            'tenant_id' => $tenant->id,
            'client_id' => $marcus->id,
            'name' => 'Updated Consent Form',
            'status' => ClientForm::STATUS_PENDING,
            'sent_at' => now()->subDays(2),
        ]);

        ClientForm::create([
            'tenant_id' => $tenant->id,
            'client_id' => $ravi->id,
            'name' => 'Updated Intake & Consent Form',
            'status' => ClientForm::STATUS_PENDING,
            'sent_at' => now()->subDay(),
        ]);

        // 15. Messages — clinic confirming Ravi's upcoming appointment.
        Message::create([
            'tenant_id' => $tenant->id,
            'client_id' => $ravi->id,
            'sender' => Message::SENDER_CLINIC,
            'body' => 'Your appointment tomorrow has been confirmed.',
            'read_at' => now(),
        ]);
    }
}
