<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Location;
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
        $tenant = Tenant::create([
            'name' => 'Lotus Wellness Clinic',
            'slug' => 'lotus-wellness',
            'timezone' => 'America/New_York',
            'currency' => 'USD',
            'address' => [
                'line1' => '100 Healing Way, Suite 200',
                'city' => 'Boston',
                'region' => 'MA',
                'country' => 'US',
            ],
            'phone' => '+1 (555) 234-5678',
            'email' => 'contact@lotuswellness.com',
        ]);

        app()->instance('current_tenant_id', $tenant->id);

        // A second tenant, used to demo multi-tenant workspace selection.
        $secondTenant = Tenant::create([
            'name' => 'Summit Performance Studio',
            'slug' => 'summit-performance',
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
        ]);

        // 3. Platform Administrator
        // (platform_admin still requires a tenant_id column value per schema,
        // but isPlatformAdmin() checks the role across all tenants — the
        // specific tenant here is not meaningful.)
        $adminUser = User::create([
            'name' => 'Priya Nakamura',
            'email' => 'admin@umahz.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $adminUser->assignRole('Platform Admin');

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 4. Demo Clinic Owner
        $ownerUser = User::create([
            'name' => 'Dr. Eleanor Vance',
            'email' => 'owner@lotuswellness.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $ownerUser->assignRole('Clinic Owner');

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 5. Demo Practitioner
        $practitionerUser = User::create([
            'name' => 'Julian Hayes, LAc',
            'email' => 'julian@lotuswellness.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $practitionerUser->assignRole('Practitioner');

        $practitionerMembership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $practitionerUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        PractitionerProfile::create([
            'staff_membership_id' => $practitionerMembership->id,
            'profession' => PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM,
            'credentials' => 'LAc, Dipl. OM',
            'biography' => 'Julian specialises in TCM pain management and herbal medicine.',
            'calendar_color' => '#5B2EFF',
        ]);

        // 6. Demo Receptionist
        $receptionistUser = User::create([
            'name' => 'Maya Torres',
            'email' => 'maya@lotuswellness.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $receptionistUser->assignRole('Receptionist');

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $receptionistUser->id,
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 7. Multi-tenant staff member — has active staff access at BOTH
        // clinics, so logging in should show the "select a workspace" screen.
        $multiTenantUser = User::create([
            'name' => 'Dana Whitfield',
            'email' => 'dana@multitenant.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $multiTenantUser->assignRole('Practitioner');

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $multiTenantUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $secondTenant->id,
            'user_id' => $multiTenantUser->id,
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // 8. A pending invitation — never logged in, no password set yet.
        // Used to exercise the AcceptInvite flow end-to-end.
        $invitedUser = User::create([
            'name' => 'new.hire',
            'email' => 'newhire@lotuswellness.com',
            'password' => Hash::make(str()->random(32)),
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $invitedUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_INVITED,
            'invited_at' => now(),
        ]);

        // 9. Locations & Rooms
        $location = Location::create([
            'tenant_id' => $tenant->id,
            'name' => 'Downtown Sanctuary',
            'address' => '100 Healing Way, Boston MA',
            'timezone' => 'America/New_York',
            'phone' => '+1 (555) 234-5678',
        ]);

        Room::create([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Acupuncture Suite A',
            'description' => 'Equipped with heated treatment table and ambient sound machine',
        ]);

        Room::create([
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Mindfulness Room B',
            'description' => 'Private meditation and biofeedback space',
        ]);

        // 10. Clients — Sophia is a walk-in with no login yet, used to
        // exercise the register-dedup-by-email flow.
        Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Sophia',
            'last_name' => 'Chen',
            'email' => 'sophia.chen@example.com',
            'phone' => '+1 (555) 987-6543',
            'date_of_birth' => '1990-04-12',
            'preferred_contact_method' => 'email',
            'emergency_contact' => [
                'name' => 'Wei Chen',
                'relationship' => 'Spouse',
                'phone' => '+1 (555) 987-1111',
            ],
        ]);

        Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Marcus',
            'last_name' => 'Aurelius',
            'email' => 'marcus@example.com',
            'phone' => '+1 (555) 876-5432',
            'date_of_birth' => '1985-08-23',
            'preferred_contact_method' => 'phone',
        ]);

        // A client who has already completed self-registration (has a login).
        $clientUser = User::create([
            'name' => 'Ravi Patel',
            'email' => 'ravi@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'tos_accepted_version' => '2026-01-01',
            'tos_accepted_at' => now(),
        ]);

        Client::create([
            'tenant_id' => $tenant->id,
            'user_id' => $clientUser->id,
            'first_name' => 'Ravi',
            'last_name' => 'Patel',
            'email' => 'ravi@example.com',
            'phone' => '+1 (555) 345-6789',
            'date_of_birth' => '1992-11-02',
            'preferred_contact_method' => 'sms',
        ]);
    }
}
