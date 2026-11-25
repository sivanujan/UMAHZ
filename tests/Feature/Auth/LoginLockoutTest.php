<?php

namespace Tests\Feature\Auth;

use App\Models\AuditEvent;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\AccountLockedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class LoginLockoutTest extends TestCase
{
    use RefreshDatabase;

    private function makeClinicWithStaff(): array
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Physio',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
        ]);

        $owner = User::factory()->create([
            'email' => 'owner@lotus.test',
            'password' => Hash::make('CorrectPass123!'),
            'email_verified_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $staff = User::factory()->create([
            'email' => 'sarah@lotus.test',
            'password' => Hash::make('CorrectPass123!'),
            'email_verified_at' => now(),
        ]);

        $staffMembership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $staff->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$tenant, $owner, $staff, $staffMembership];
    }

    public function test_progressive_lockout_15_min_then_1_hour_and_notification_sent_once(): void
    {
        Notification::fake();
        [, , $staff] = $this->makeClinicWithStaff();

        // First 4 failures -> standard invalid credentials message
        for ($i = 0; $i < 4; $i++) {
            $res = $this->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'wrong-password',
            ]);
            $res->assertSessionHasErrors('email');
            $this->assertStringContainsString('credentials do not match', session('errors')->first('email'));
        }

        // 5th failure -> locked for 15 minutes + 1 notification + audit logs
        $fifth = $this->post('http://lotus.umahz.test/login', [
            'email' => $staff->email,
            'password' => 'wrong-password',
        ]);
        $fifth->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many attempts. Try again in 15 minutes', session('errors')->first('email'));

        Notification::assertSentToTimes($staff, AccountLockedNotification::class, 1);
        $this->assertDatabaseHas('audit_events', [
            'action' => 'auth.account_locked',
            'user_id' => $staff->id,
        ]);

        // Even with the right password during lockout, login is blocked & no duplicate email sent
        $blocked = $this->post('http://lotus.umahz.test/login', [
            'email' => $staff->email,
            'password' => 'CorrectPass123!',
        ]);
        $blocked->assertSessionHasErrors('email');
        $this->assertGuest();
        Notification::assertSentToTimes($staff, AccountLockedNotification::class, 1);

        // Travel past 15-minute lock -> next 5 failures trigger 1-hour (60 min) lock
        $this->travel(16)->minutes();

        for ($i = 0; $i < 4; $i++) {
            $this->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'wrong-password',
            ])->assertSessionHasErrors('email');
        }

        $tenth = $this->post('http://lotus.umahz.test/login', [
            'email' => $staff->email,
            'password' => 'wrong-password',
        ]);
        $tenth->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many attempts. Try again in 60 minutes', session('errors')->first('email'));
        Notification::assertSentToTimes($staff, AccountLockedNotification::class, 2);
    }

    public function test_successful_login_resets_failure_counter(): void
    {
        Notification::fake();
        [, , $staff] = $this->makeClinicWithStaff();

        for ($i = 0; $i < 3; $i++) {
            $this->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'wrong-password',
            ]);
        }

        // Successful login clears counter
        $this->post('http://lotus.umahz.test/login', [
            'email' => $staff->email,
            'password' => 'CorrectPass123!',
        ])->assertRedirect();

        $this->post('http://lotus.umahz.test/logout');

        // 4 more failures should NOT lock yet (counter was reset)
        for ($i = 0; $i < 4; $i++) {
            $res = $this->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'wrong-password',
            ]);
            $res->assertSessionHasErrors(['email' => 'The provided credentials do not match our records.']);
        }
    }

    public function test_password_reset_unlocks_locked_account(): void
    {
        Notification::fake();
        [, , $staff] = $this->makeClinicWithStaff();

        for ($i = 0; $i < 5; $i++) {
            $this->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'wrong-password',
            ]);
        }

        $token = Password::createToken($staff);

        $this->post('http://umahz.test/reset-password', [
            'token' => $token,
            'email' => $staff->email,
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ])->assertRedirect(route('login'));

        $this->post('http://lotus.umahz.test/login', [
            'email' => $staff->email,
            'password' => 'NewSecurePassword123!',
        ])->assertRedirect();

        $this->assertAuthenticatedAs($staff);
    }

    public function test_clinic_owner_can_unlock_staff_member(): void
    {
        Notification::fake();
        [, $owner, $staff, $staffMembership] = $this->makeClinicWithStaff();

        for ($i = 0; $i < 5; $i++) {
            $this->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'wrong-password',
            ]);
        }

        $this->actingAs($owner)
            ->post("http://lotus.umahz.test/app/staff/{$staffMembership->id}/unlock")
            ->assertRedirect();

        $this->assertDatabaseHas('audit_events', [
            'action' => 'auth.account_unlocked',
            'user_id' => $owner->id,
        ]);

        // Reset auth session to guest and verify staff can log in immediately
        $this->post('http://lotus.umahz.test/logout');

        $this->post('http://lotus.umahz.test/login', [
            'email' => $staff->email,
            'password' => 'CorrectPass123!',
        ])->assertRedirect();

        $this->assertAuthenticatedAs($staff);
    }

    public function test_distributed_attack_20_failures_from_different_ips_locks_account_globally(): void
    {
        Notification::fake();
        [, , $staff] = $this->makeClinicWithStaff();

        for ($i = 1; $i <= 20; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"])
                ->post('http://lotus.umahz.test/login', [
                    'email' => $staff->email,
                    'password' => 'wrong-password',
                ]);
        }

        // A 21st brand-new IP is blocked for 60 minutes even with the right password
        $res = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.99'])
            ->post('http://lotus.umahz.test/login', [
                'email' => $staff->email,
                'password' => 'CorrectPass123!',
            ]);

        $res->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many attempts. Try again in 60 minutes', session('errors')->first('email'));
        $this->assertGuest();
        Notification::assertSentToTimes($staff, AccountLockedNotification::class, 1);
    }

    public function test_locked_message_does_not_reveal_whether_unknown_email_exists(): void
    {
        $this->makeClinicWithStaff();

        for ($i = 0; $i < 5; $i++) {
            $this->post('http://lotus.umahz.test/login', [
                'email' => 'nonexistent@unknown.test',
                'password' => 'wrong-password',
            ]);
        }

        $res = $this->post('http://lotus.umahz.test/login', [
            'email' => 'nonexistent@unknown.test',
            'password' => 'wrong-password',
        ]);

        $res->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many attempts. Try again in 15 minutes', session('errors')->first('email'));
    }

    public function test_forgot_password_endpoint_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('http://umahz.test/forgot-password', [
                'email' => 'nobody@example.test',
            ])->assertStatus(302);
        }

        $this->post('http://umahz.test/forgot-password', [
            'email' => 'nobody@example.test',
        ])->assertStatus(429);
    }
}
