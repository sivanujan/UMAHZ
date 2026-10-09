<?php

namespace Tests\Feature\Settings;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Plan;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClinicAccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
        $this->plan = Plan::where('slug', 'professional')->firstOrFail();
    }

    private function createClinic(string $subdomain = 'delclinic', string $password = 'Secret123!'): array
    {
        $tenant = Tenant::create([
            'name' => 'Delete Me Clinic',
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $this->plan->id,
            'plan_tier' => $this->plan->slug,
            'billing_interval' => 'month',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'onboarding_completed_at' => now(),
        ]);

        $owner = User::factory()->create([
            'email' => "owner-{$subdomain}@test.com",
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$tenant, $owner];
    }

    public function test_non_owner_cannot_delete_clinic_account(): void
    {
        [$tenant, $owner] = $this->createClinic('secureclinic');

        $practitionerUser = User::factory()->create([
            'password' => Hash::make('Secret123!'),
            'email_verified_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $practitionerUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($practitionerUser)
            ->delete('http://secureclinic.umahz.test/app/settings/account', [
                'password' => 'Secret123!',
                'confirm_subdomain' => 'secureclinic',
            ]);

        $response->assertForbidden();
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
    }

    public function test_owner_must_provide_correct_confirmation_subdomain_and_password(): void
    {
        [$tenant, $owner] = $this->createClinic('testclinic', 'Password123!');

        // 1. Wrong password
        $responseWrongPw = $this->actingAs($owner)
            ->delete('http://testclinic.umahz.test/app/settings/account', [
                'password' => 'WrongPassword!',
                'confirm_subdomain' => 'testclinic',
            ]);

        $responseWrongPw->assertSessionHasErrors('password');
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);

        // 2. Wrong confirmation text
        $responseWrongSubdomain = $this->actingAs($owner)
            ->delete('http://testclinic.umahz.test/app/settings/account', [
                'password' => 'Password123!',
                'confirm_subdomain' => 'wrong-subdomain',
            ]);

        $responseWrongSubdomain->assertSessionHasErrors('confirm_subdomain');
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
    }

    public function test_owner_can_permanently_delete_clinic_account_and_erases_everything(): void
    {
        [$tenant, $owner] = $this->createClinic('erasedclinic', 'MyStrongPassword!');

        // Add a client and appointment to verify cascade deletion
        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'phone' => '1234567890',
        ]);

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
        $this->assertDatabaseHas('clients', ['id' => $client->id]);

        $response = $this->actingAs($owner)
            ->delete('http://erasedclinic.umahz.test/app/settings/account', [
                'password' => 'MyStrongPassword!',
                'confirm_subdomain' => 'erasedclinic',
            ]);

        // Assert redirect out of subdomain
        $this->assertTrue(in_array($response->getStatusCode(), [302, 409], true));
        $this->assertTrue(
            $response->headers->has('X-Inertia-Location') || $response->isRedirect()
        );

        // Assert tenant and related data are completely erased
        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
        $this->assertDatabaseMissing('staff_memberships', ['tenant_id' => $tenant->id]);

        // Owner is logged out
        $this->assertGuest();
    }
}
