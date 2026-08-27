<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubdomainTenantResolutionTest extends TestCase
{
    use RefreshDatabase;

    private function tenant(string $subdomain, string $name): Tenant
    {
        return Tenant::create([
            'name' => $name,
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
        ]);
    }

    private function staffMember(Tenant $tenant, string $role = StaffMembership::ROLE_PRACTITIONER): User
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return $user;
    }

    /**
     * THE core isolation guarantee: a staff user of Clinic A must NOT be able
     * to view Clinic B's workspace by visiting Clinic B's subdomain, even
     * though the session cookie is shared across *.umahz.test.
     */
    public function test_staff_user_from_clinic_a_gets_403_on_clinic_b_subdomain(): void
    {
        $clinicA = $this->tenant('clinic-a', 'Clinic A');
        $clinicB = $this->tenant('clinic-b', 'Clinic B');
        $userA = $this->staffMember($clinicA);

        $response = $this->actingAs($userA)
            ->get('http://clinic-b.umahz.test/app/dashboard');

        $response->assertStatus(403);
        // Apostrophe is HTML-escaped in the rendered error page.
        $response->assertSee('have access to this clinic', false);
    }

    public function test_staff_user_reaches_their_own_clinic_subdomain(): void
    {
        $clinicA = $this->tenant('clinic-a', 'Clinic A');
        $userA = $this->staffMember($clinicA);

        $this->actingAs($userA)
            ->get('http://clinic-a.umahz.test/app/dashboard')
            ->assertOk();
    }

    public function test_subdomain_root_redirects_into_the_workspace(): void
    {
        $clinic = $this->tenant('clinic-a', 'Clinic A');
        $user = $this->staffMember($clinic);

        $this->actingAs($user)
            ->get('http://clinic-a.umahz.test/')
            ->assertRedirect('/app/dashboard');
    }

    public function test_pending_owner_sees_the_status_page_on_their_subdomain(): void
    {
        // Reproduces the post-registration landing: a brand-new, unapproved
        // clinic owner must reach /clinic/status without a 500 (route()
        // missing the {tenant} param) or a redirect loop with onboarding.
        $clinic = Tenant::create([
            'name' => 'Pending Clinic',
            'slug' => 'pending-clinic',
            'subdomain' => 'pending-clinic',
            'status' => Tenant::STATUS_PENDING_REVIEW,
        ]);
        $owner = $this->staffMember($clinic, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner)
            ->get('http://pending-clinic.umahz.test/clinic/status')
            ->assertOk();

        // Any /app route bounces an unapproved clinic to the status page.
        $this->actingAs($owner)
            ->get('http://pending-clinic.umahz.test/app/dashboard')
            ->assertRedirect('/clinic/status');
    }

    public function test_unknown_subdomain_returns_404(): void
    {
        $user = $this->staffMember($this->tenant('clinic-a', 'Clinic A'));

        $this->actingAs($user)
            ->get('http://nope.umahz.test/app/dashboard')
            ->assertStatus(404);
    }

    public function test_guest_on_valid_subdomain_is_redirected_to_login(): void
    {
        $this->tenant('clinic-a', 'Clinic A');

        $this->get('http://clinic-a.umahz.test/app/dashboard')
            ->assertRedirect('/login');
    }

    public function test_app_routes_do_not_resolve_on_the_central_domain(): void
    {
        $user = $this->staffMember($this->tenant('clinic-a', 'Clinic A'));

        // /app exists only under the subdomain group — on the central domain
        // there is no such route.
        $this->actingAs($user)
            ->get('http://umahz.test/app/dashboard')
            ->assertStatus(404);
    }

    public function test_platform_admin_without_membership_is_blocked_on_a_subdomain(): void
    {
        $clinic = $this->tenant('clinic-a', 'Clinic A');
        $admin = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $admin->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        // platform_admin is not a workspace role — no workspace access here.
        $this->actingAs($admin)
            ->get('http://clinic-a.umahz.test/app/dashboard')
            ->assertStatus(403);
    }
}
