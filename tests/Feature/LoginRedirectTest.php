<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_single_workspace_owner_is_sent_to_their_subdomain(): void
    {
        $tenant = Tenant::create([
            'name' => 'Acme Clinic',
            'slug' => 'acme',
            'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $user = User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('secret-password'),
            'email_verified_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $response = $this->post('http://umahz.test/login', [
            'email' => 'owner@example.com',
            'password' => 'secret-password',
        ]);

        // config('app.url') in tests is http://umahz.test -> no port.
        $response->assertredirect('http://acme.umahz.test/app/dashboard');
    }

    public function test_already_authenticated_owner_hitting_login_goes_to_their_subdomain(): void
    {
        // The bug: an already-signed-in staff user clicking "Login" was sent to
        // the marketing home by the default guest middleware. They should land
        // in their clinic instead.
        $tenant = Tenant::create([
            'name' => 'Acme Clinic', 'slug' => 'acme', 'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED,
        ]);
        $user = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        $this->actingAs($user)
            ->get('http://umahz.test/login')
            ->assertRedirect('http://acme.umahz.test/app/dashboard');
    }

    public function test_inertia_login_returns_a_location_visit_for_the_cross_host_target(): void
    {
        $tenant = Tenant::create([
            'name' => 'Acme Clinic', 'slug' => 'acme', 'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED,
        ]);
        $user = User::factory()->create([
            'email' => 'owner@example.com', 'password' => Hash::make('secret-password'),
            'email_verified_at' => now(),
        ]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        // A real Inertia XHR sends this header. A cross-origin 302 would be
        // unfollowable, so the server must answer 409 + X-Inertia-Location.
        $response = $this->withHeaders(['X-Inertia' => 'true'])
            ->post('http://umahz.test/login', [
                'email' => 'owner@example.com',
                'password' => 'secret-password',
            ]);

        $response->assertStatus(409);
        $response->assertHeader('X-Inertia-Location', 'http://acme.umahz.test/app/dashboard');
    }
}
