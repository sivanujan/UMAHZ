<?php

namespace Tests\Feature\Auth;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Services\LoginLockoutService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PasswordResetFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_returns_neutral_message_for_known_and_unknown_emails(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'known@clinic.test',
        ]);

        // Known email
        $knownRes = $this->post('/forgot-password', [
            'email' => $user->email,
        ]);
        $knownRes->assertRedirect();
        $knownRes->assertSessionHas('status', "If an account exists for this email, we've sent a password reset link.");
        Notification::assertSentToTimes($user, ResetPassword::class, 1);

        // Unknown email — exact same neutral message, no validation error
        $unknownRes = $this->post('/forgot-password', [
            'email' => 'nobody@unknown-clinic.test',
        ]);
        $unknownRes->assertRedirect();
        $unknownRes->assertSessionHasNoErrors();
        $unknownRes->assertSessionHas('status', "If an account exists for this email, we've sent a password reset link.");
    }

    public function test_reset_link_url_uses_https_and_correct_domain_for_clinic_user_and_platform_admin(): void
    {
        Notification::fake();
        config([
            'app.url' => 'https://umahz.test',
            'tenancy.central_domain' => 'umahz.test',
        ]);

        $tenant = Tenant::create([
            'name' => 'Lotus Wellness',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'onboarded_at' => now(),
        ]);

        $clinicUser = User::factory()->create(['email' => 'sarah@lotus.test']);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $clinicUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        Role::firstOrCreate(['name' => 'Platform Admin']);
        $admin = User::factory()->create([
            'email' => 'admin@umahz.test',
        ]);
        $admin->assignRole('Platform Admin');

        $this->post('/forgot-password', ['email' => $clinicUser->email]);
        Notification::assertSentTo($clinicUser, ResetPassword::class, function (ResetPassword $notification) use ($clinicUser) {
            $url = $notification->toMail($clinicUser)->actionUrl;
            $parts = parse_url($url);

            return ($parts['scheme'] ?? null) === 'https'
                && ($parts['host'] ?? null) === 'lotus.umahz.test'
                && str_starts_with($parts['path'] ?? '', '/reset-password/');
        });

        $this->post('/forgot-password', ['email' => $admin->email]);
        Notification::assertSentTo($admin, ResetPassword::class, function (ResetPassword $notification) use ($admin) {
            $url = $notification->toMail($admin)->actionUrl;
            $parts = parse_url($url);

            return ($parts['scheme'] ?? null) === 'https'
                && ($parts['host'] ?? null) === 'umahz.test'
                && str_starts_with($parts['path'] ?? '', '/reset-password/');
        });
    }

    public function test_expired_or_invalid_reset_token_shows_friendly_error(): void
    {
        $user = User::factory()->create(['email' => 'sarah@lotus.test']);

        $response = $this->post('/reset-password', [
            'token' => 'expired-or-invalid-token',
            'email' => $user->email,
            'password' => 'NewSecurePass123!',
            'password_confirmation' => 'NewSecurePass123!',
        ]);

        $response->assertSessionHasErrors('token');
        $this->assertStringContainsString(
            'invalid or has expired',
            session('errors')->first('token')
        );
    }

    public function test_successful_password_reset_clears_lockout_and_redirects_to_login(): void
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Wellness',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'onboarded_at' => now(),
        ]);

        $user = User::factory()->create([
            'email' => 'locked@lotus.test',
            'password' => Hash::make('OldSecurePass123!'),
        ]);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        // Lock the account with 5 failed attempts
        $lockout = app(LoginLockoutService::class);
        for ($i = 0; $i < 5; $i++) {
            $lockout->recordFailure($user->email, '127.0.0.1');
        }
        $this->assertNotNull($lockout->checkLockout($user->email, '127.0.0.1'));

        $token = Password::broker()->createToken($user);

        $response = $this->post('http://lotus.umahz.test/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'BrandNewSecure123!',
            'password_confirmation' => 'BrandNewSecure123!',
        ]);

        $response->assertRedirect(route('login'));
        $response->assertSessionHas('status');
        $this->assertTrue(Hash::check('BrandNewSecure123!', $user->fresh()->password));
        $this->assertNull($lockout->checkLockout($user->email, '127.0.0.1'));
    }

    public function test_forgot_and_reset_pages_render_clinic_branding_on_subdomain(): void
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Wellness',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
            'status' => Tenant::STATUS_APPROVED,
            'onboarded_at' => now(),
        ]);

        $this->get('http://lotus.umahz.test/forgot-password?email=prefill@lotus.test')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/ForgotPassword')
                ->where('clinic.name', 'Lotus Wellness')
                ->where('prefilledEmail', 'prefill@lotus.test')
            );

        $this->get('http://lotus.umahz.test/reset-password/sample-token?email=prefill@lotus.test')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/ResetPassword')
                ->where('clinic.name', 'Lotus Wellness')
                ->where('email', 'prefill@lotus.test')
                ->where('token', 'sample-token')
            );
    }
}
