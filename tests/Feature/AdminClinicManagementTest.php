<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminClinicManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $hq = Tenant::create(['name' => 'HQ', 'slug' => 'hq', 'subdomain' => 'hq', 'status' => Tenant::STATUS_APPROVED]);
        $user = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $hq->id, 'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        return $user;
    }

    private function clinic(string $sub = 'lotus', string $status = Tenant::STATUS_APPROVED): Tenant
    {
        return Tenant::create([
            'name' => 'Lotus Wellness', 'slug' => $sub, 'subdomain' => $sub,
            'status' => $status, 'requested_disciplines' => ['massage_therapy'],
        ]);
    }

    private function url(Tenant $t, string $path = ''): string
    {
        return "http://umahz.test/admin/clinics/{$t->id}{$path}";
    }

    public function test_admin_can_suspend_and_reactivate_a_clinic(): void
    {
        $admin = $this->admin();
        $clinic = $this->clinic();

        $this->actingAs($admin)->patch($this->url($clinic, '/suspend'))->assertSessionHasNoErrors();
        $this->assertSame(Tenant::STATUS_SUSPENDED, $clinic->refresh()->status);

        $this->actingAs($admin)->patch($this->url($clinic, '/reactivate'))->assertSessionHasNoErrors();
        $this->assertSame(Tenant::STATUS_APPROVED, $clinic->refresh()->status);
    }

    public function test_admin_can_open_the_edit_page(): void
    {
        $admin = $this->admin();
        $clinic = $this->clinic();

        $this->actingAs($admin)->get($this->url($clinic, '/edit'))->assertOk();
    }

    public function test_admin_can_edit_clinic_details(): void
    {
        $admin = $this->admin();
        $clinic = $this->clinic();

        $this->actingAs($admin)->patch($this->url($clinic), [
            'name' => 'Lotus Renewed',
            'subdomain' => 'lotus-renewed',
            'email' => 'hi@lotus.example',
            'timezone' => 'America/Toronto',
            'currency' => 'CAD',
            'address_region' => 'Ontario',
            'address_country' => 'Canada',
            'requested_disciplines' => ['massage_therapy', 'acupuncture_tcm'],
        ])->assertSessionHasNoErrors();

        $clinic->refresh();
        $this->assertSame('Lotus Renewed', $clinic->name);
        $this->assertSame('lotus-renewed', $clinic->subdomain);
        $this->assertEqualsCanonicalizing(['massage_therapy', 'acupuncture_tcm'], $clinic->requested_disciplines);
    }

    public function test_edit_rejects_a_subdomain_taken_by_another_clinic(): void
    {
        $admin = $this->admin();
        $this->clinic('taken');
        $clinic = $this->clinic('lotus');

        $this->actingAs($admin)->from($this->url($clinic, '/edit'))->patch($this->url($clinic), [
            'name' => 'Lotus', 'subdomain' => 'taken',
            'timezone' => 'America/Toronto', 'currency' => 'CAD',
            'requested_disciplines' => ['massage_therapy'],
        ])->assertSessionHasErrors('subdomain');
    }

    public function test_permanent_delete_requires_the_matching_clinic_name(): void
    {
        $admin = $this->admin();
        $clinic = $this->clinic();

        $this->actingAs($admin)->from($this->url($clinic))
            ->delete($this->url($clinic), ['confirmation' => 'wrong name'])
            ->assertSessionHasErrors('confirmation');

        $this->assertDatabaseHas('tenants', ['id' => $clinic->id]);
    }

    public function test_permanent_delete_wipes_the_clinic_and_its_data(): void
    {
        $admin = $this->admin();
        $clinic = $this->clinic();
        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $clinic->id, 'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);
        $client = Client::create([
            'tenant_id' => $clinic->id, 'first_name' => 'Pat', 'last_name' => 'Ient',
        ]);

        $this->actingAs($admin)
            ->delete($this->url($clinic), ['confirmation' => 'Lotus Wellness'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('tenants', ['id' => $clinic->id]);
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);       // cascade
        $this->assertDatabaseMissing('users', ['id' => $owner->id]);          // orphaned owner removed
    }

    public function test_non_admin_cannot_manage_clinics(): void
    {
        $clinic = $this->clinic();
        $staff = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $clinic->id, 'user_id' => $staff->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        $this->actingAs($staff)->patch($this->url($clinic, '/suspend'))->assertStatus(403);
    }
}
