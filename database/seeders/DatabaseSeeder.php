<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Location;
use App\Models\Room;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Roles
        $roles = ['Platform Admin', 'Clinic Owner', 'Practitioner', 'Receptionist', 'Client'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // 2. Demo Clinic Tenant
        $tenant = Tenant::create([
            'name' => 'Lotus Wellness Clinic',
            'slug' => 'lotus-wellness',
            'timezone' => 'America/New_York',
            'currency' => 'USD',
            'address' => '100 Healing Way, Suite 200, Boston MA',
            'phone' => '+1 (555) 234-5678',
            'email' => 'contact@lotuswellness.com',
            'is_active' => true,
        ]);

        app()->instance('current_tenant_id', $tenant->id);

        // 3. Demo Admin / Clinic Owner User
        $ownerUser = User::create([
            'name' => 'Dr. Eleanor Vance',
            'email' => 'owner@lotuswellness.com',
            'password' => Hash::make('password'),
            'current_tenant_id' => $tenant->id,
            'is_platform_admin' => false,
        ]);
        $ownerUser->assignRole('Clinic Owner');

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $ownerUser->id,
            'role' => 'Clinic Owner',
            'status' => 'active',
        ]);

        // 4. Demo Practitioner User
        $practitioner = User::create([
            'name' => 'Julian Hayes, LAc',
            'email' => 'julian@lotuswellness.com',
            'password' => Hash::make('password'),
            'current_tenant_id' => $tenant->id,
            'is_platform_admin' => false,
        ]);
        $practitioner->assignRole('Practitioner');

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $practitioner->id,
            'role' => 'Practitioner',
            'status' => 'active',
        ]);

        // 5. Locations & Rooms
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

        // 6. Clients
        Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Sophia',
            'last_name' => 'Chen',
            'email' => 'sophia.chen@example.com',
            'phone' => '+1 (555) 987-6543',
            'dob' => '1990-04-12',
            'gender' => 'Female',
            'address' => '42 Beacon St, Boston MA',
            'medical_history_notes' => 'Chronic lower back tension, prefers gentle needle technique.',
            'status' => 'active',
        ]);

        Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Marcus',
            'last_name' => 'Aurelius',
            'email' => 'marcus@example.com',
            'phone' => '+1 (555) 876-5432',
            'dob' => '1985-08-23',
            'gender' => 'Male',
            'address' => '18 Commonwealth Ave, Boston MA',
            'medical_history_notes' => 'Stress management, herbal formulation routine.',
            'status' => 'active',
        ]);
    }
}
