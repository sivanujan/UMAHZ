<?php

namespace Tests\Feature\Auth;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * "Remember me" must actually persist the login. Laravel only sets a user's
 * remember_token (and issues the long-lived remember cookie) when the login is
 * attempted with the remember flag, so asserting the token proves the flag is
 * honored end-to-end from the form.
 */
class RememberMeTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Acme Clinic', 'slug' => 'acme', 'subdomain' => 'acme',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $user = User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('secret-password'),
            'email_verified_at' => now(),
            'remember_token' => null,
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        return $user;
    }

    public function test_checking_remember_me_persists_the_login(): void
    {
        $user = $this->owner();

        $this->post('http://umahz.test/login', [
            'email' => 'owner@example.com',
            'password' => 'secret-password',
            'remember' => true,
        ]);

        $this->assertAuthenticatedAs($user);

        // A remember_token is only issued when the remember flag is honored.
        $this->assertNotNull($user->fresh()->remember_token);
    }

    public function test_not_checking_remember_me_does_not_persist(): void
    {
        $user = $this->owner();

        $this->post('http://umahz.test/login', [
            'email' => 'owner@example.com',
            'password' => 'secret-password',
            'remember' => false,
        ]);

        $this->assertAuthenticatedAs($user);
        $this->assertNull($user->fresh()->remember_token);
    }
}
