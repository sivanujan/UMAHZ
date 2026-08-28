<?php

namespace Tests\Feature;

use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicStaffManagementTest extends TestCase
{
    use RefreshDatabase;

    private function tenant(string $subdomain = 'acme'): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($subdomain), 'slug' => $subdomain, 'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED, 'onboarding_completed_at' => now(),
        ]);
    }

    private function member(Tenant $tenant, string $role, string $status = StaffMembership::STATUS_ACTIVE): StaffMembership
    {
        return StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => User::factory()->create(['email_verified_at' => now()])->id,
            'role' => $role, 'status' => $status, 'joined_at' => now(),
        ]);
    }

    private function url(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.umahz.test{$path}";
    }

    public function test_owner_can_suspend_and_reactivate_a_member(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $prac = $this->member($tenant, StaffMembership::ROLE_PRACTITIONER);

        $this->actingAs($owner->user)
            ->patch($this->url($tenant, "/app/staff/{$prac->id}"), ['status' => 'suspended'])
            ->assertSessionHasNoErrors();
        $this->assertSame('suspended', $prac->refresh()->status);

        $this->actingAs($owner->user)
            ->patch($this->url($tenant, "/app/staff/{$prac->id}"), ['status' => 'active'])
            ->assertSessionHasNoErrors();
        $this->assertSame('active', $prac->refresh()->status);
    }

    public function test_removing_an_active_member_deactivates_but_keeps_the_record(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $prac = $this->member($tenant, StaffMembership::ROLE_PRACTITIONER);

        $this->actingAs($owner->user)
            ->delete($this->url($tenant, "/app/staff/{$prac->id}"))
            ->assertSessionHasNoErrors();

        // Record still exists (for its appointments/notes) but access is revoked.
        $this->assertDatabaseHas('staff_memberships', [
            'id' => $prac->id, 'status' => StaffMembership::STATUS_DEACTIVATED,
        ]);
    }

    public function test_removing_a_pending_invite_deletes_it(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $invited = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST, StaffMembership::STATUS_INVITED);

        $this->actingAs($owner->user)
            ->delete($this->url($tenant, "/app/staff/{$invited->id}"))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('staff_memberships', ['id' => $invited->id]);
    }

    public function test_owner_cannot_remove_their_own_membership(): void
    {
        $tenant = $this->tenant();
        $owner = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($owner->user)
            ->delete($this->url($tenant, "/app/staff/{$owner->id}"))
            ->assertStatus(403);

        $this->assertSame('active', $owner->refresh()->status);
    }

    public function test_owner_cannot_manage_a_member_from_another_clinic(): void
    {
        $clinicA = $this->tenant('clinic-a');
        $ownerA = $this->member($clinicA, StaffMembership::ROLE_CLINIC_OWNER);

        $clinicB = $this->tenant('clinic-b');
        $pracB = $this->member($clinicB, StaffMembership::ROLE_PRACTITIONER);

        // Owner of A tries to remove a member of B via A's subdomain → 404.
        $this->actingAs($ownerA->user)
            ->delete($this->url($clinicA, "/app/staff/{$pracB->id}"))
            ->assertStatus(404);

        $this->assertSame('active', $pracB->refresh()->status);
    }
}
