<?php

namespace Tests\Feature\Auth;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmailFirstLoginTest extends TestCase
{
    use RefreshDatabase;

    private function makeClinic(string $name, string $subdomain, string $status = Tenant::STATUS_APPROVED): Tenant
    {
        return Tenant::create([
            'name' => $name,
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => $status,
        ]);
    }

    private function attachStaff(User $user, Tenant $tenant, string $role = StaffMembership::ROLE_CLINIC_OWNER): StaffMembership
    {
        return StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);
    }

    public function test_main_login_renders_email_first_step(): void
    {
        $this->get('http://umahz.test/login')
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('isCentral', true)
                ->where('step', 'email')
            );
    }

    public function test_email_linked_to_one_clinic_redirects_to_subdomain_with_encrypted_token_and_prefills_email(): void
    {
        $clinic = $this->makeClinic('Lotus Physio', 'lotus');
        $user = User::factory()->create([
            'email' => 'sarah@lotus.test',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => now(),
        ]);
        $this->attachStaff($user, $clinic, StaffMembership::ROLE_PRACTITIONER);

        $response = $this->post('http://umahz.test/login/lookup', [
            'email' => 'sarah@lotus.test',
        ]);

        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertNotNull($location);
        $this->assertStringStartsWith('http://lotus.umahz.test/login?lt=', $location);
        // Plain email must never appear in the redirect URL.
        $this->assertStringNotContainsString('sarah@lotus.test', $location);

        // Visiting the subdomain URL with the signed/encrypted token pre-fills the email.
        $this->get($location)
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'password')
                ->where('prefilledEmail', 'sarah@lotus.test')
            );
    }

    public function test_email_linked_to_two_clinics_shows_chooser_and_redirects_on_selection(): void
    {
        $clinicA = $this->makeClinic('Alpha Clinic', 'alpha');
        $clinicB = $this->makeClinic('Beta Clinic', 'beta');
        $user = User::factory()->create([
            'email' => 'multi@clinic.test',
            'email_verified_at' => now(),
        ]);
        $this->attachStaff($user, $clinicA, StaffMembership::ROLE_PRACTITIONER);
        $this->attachStaff($user, $clinicB, StaffMembership::ROLE_RECEPTIONIST);

        $this->post('http://umahz.test/login/lookup', [
            'email' => 'multi@clinic.test',
        ])
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'choose_clinic')
                ->where('lookupEmail', 'multi@clinic.test')
                ->has('clinics', 2)
            );

        $chooseResponse = $this->post('http://umahz.test/login/choose-clinic', [
            'email' => 'multi@clinic.test',
            'tenant_id' => $clinicB->id,
        ]);

        $chooseResponse->assertRedirect();
        $location = $chooseResponse->headers->get('Location');
        $this->assertStringStartsWith('http://beta.umahz.test/login?lt=', $location);
        $this->assertStringNotContainsString('multi@clinic.test', $location);
    }

    public function test_unknown_email_shows_neutral_message_with_identical_response_shape(): void
    {
        $this->post('http://umahz.test/login/lookup', [
            'email' => 'nobody@unknown.test',
        ])
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'not_found')
                ->where('neutralMessage', "If this email has a UMAHZ account, continue to your clinic's login page.")
            );
    }

    public function test_platform_admin_stays_on_central_domain_and_is_not_sent_to_subdomain(): void
    {
        $hq = $this->makeClinic('UMAHZ HQ', 'hq');
        $admin = User::factory()->create([
            'email' => 'admin@umahz.test',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => now(),
        ]);
        $this->attachStaff($admin, $hq, StaffMembership::ROLE_PLATFORM_ADMIN);

        $this->post('http://umahz.test/login/lookup', [
            'email' => 'admin@umahz.test',
        ])
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('isCentral', true)
                ->where('step', 'password')
                ->where('prefilledEmail', 'admin@umahz.test')
            );
    }

    public function test_pending_clinic_owner_goes_to_clinic_status_flow_not_403(): void
    {
        $pendingClinic = $this->makeClinic('Pending Clinic', 'pending-clinic', Tenant::STATUS_PENDING_REVIEW);
        $owner = User::factory()->create([
            'email' => 'pending@clinic.test',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => now(),
        ]);
        $this->attachStaff($owner, $pendingClinic, StaffMembership::ROLE_CLINIC_OWNER);

        $this->post('http://umahz.test/login/lookup', [
            'email' => 'pending@clinic.test',
        ])
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'password')
                ->where('prefilledEmail', 'pending@clinic.test')
            );

        $this->post('http://umahz.test/login', [
            'email' => 'pending@clinic.test',
            'password' => 'Password123!',
        ])->assertRedirect('/clinic/status');
    }

    public function test_expired_or_invalid_token_falls_back_to_normal_subdomain_login(): void
    {
        $clinic = $this->makeClinic('Lotus Physio', 'lotus');

        $expiredToken = Crypt::encryptString(json_encode([
            'email' => 'sarah@lotus.test',
            'tenant_id' => $clinic->id,
            'exp' => now()->subMinute()->timestamp,
        ]));

        $this->get('http://lotus.umahz.test/login?lt='.urlencode($expiredToken))
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'password')
                ->where('prefilledEmail', null)
            );

        $this->get('http://lotus.umahz.test/login?lt=not-a-valid-token')
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'password')
                ->where('prefilledEmail', null)
            );
    }

    public function test_lookup_rate_limit_returns_429_after_10_requests_per_minute(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->post('http://umahz.test/login/lookup', [
                'email' => "user{$i}@example.test",
            ])->assertStatus(200);
        }

        $this->post('http://umahz.test/login/lookup', [
            'email' => 'user11@example.test',
        ])->assertStatus(429);
    }

    public function test_user_cannot_log_in_to_a_clinic_they_do_not_belong_to(): void
    {
        $clinicA = $this->makeClinic('Clinic A', 'clinic-a');
        $clinicB = $this->makeClinic('Clinic B', 'clinic-b');

        $user = User::factory()->create([
            'email' => 'staff@clinic-a.test',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => now(),
        ]);
        $this->attachStaff($user, $clinicA, StaffMembership::ROLE_PRACTITIONER);

        $response = $this->post('http://clinic-b.umahz.test/login', [
            'email' => 'staff@clinic-a.test',
            'password' => 'Password123!',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_last_clinic_cookie_shows_shortcut_without_auto_redirecting(): void
    {
        $clinic = $this->makeClinic('Astrogen Wellness', 'astrogen');

        $this->withCookie('umahz_last_clinic', json_encode([
            'name' => $clinic->name,
            'subdomain' => $clinic->subdomain,
        ]))
            ->get('http://umahz.test/login')
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'email')
                ->where('lastClinic.name', 'Astrogen Wellness')
                ->where('lastClinic.login_url', 'http://astrogen.umahz.test/login')
            );
    }
}
