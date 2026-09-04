<?php

namespace Tests\Feature\Billing;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The admin review decision drives the money: APPROVE starts the subscription
 * (first charge); REJECT never charges. Stripe is behind FakePlatformBilling so
 * these assertions are exact and offline.
 */
class ClinicApprovalBillingTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);
        config(['billing.price_monthly' => 'price_test_monthly']);
    }

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

    private function pendingClinic(bool $withCard = true): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Wellness', 'slug' => 'lotus', 'subdomain' => 'lotus',
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'requested_disciplines' => ['massage_therapy'],
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ]);

        // A clinic that saved a card at registration.
        if ($withCard) {
            $tenant->forceFill(['stripe_id' => 'cus_test_lotus', 'stripe_pm_id' => 'pm_test_lotus'])->save();
        }

        // An owner user so approval notifications have a recipient.
        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id, 'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE, 'joined_at' => now(),
        ]);

        return $tenant;
    }

    private function url(Tenant $t, string $path): string
    {
        return "http://umahz.test/admin/clinics/{$t->id}{$path}";
    }

    public function test_approving_starts_the_subscription_and_charges(): void
    {
        $admin = $this->admin();
        $clinic = $this->pendingClinic();

        $this->actingAs($admin)->post($this->url($clinic, '/approve'))->assertSessionHasNoErrors();

        $this->assertTrue($this->billing->charged($clinic), 'Approval must trigger the first charge.');
        $clinic->refresh();
        $this->assertSame(Tenant::STATUS_APPROVED, $clinic->status);
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $clinic->subscription_status);
    }

    public function test_rejecting_never_charges_and_discards_the_card(): void
    {
        $admin = $this->admin();
        $clinic = $this->pendingClinic();

        $this->actingAs($admin)
            ->post($this->url($clinic, '/reject'), ['note' => 'Incomplete license documentation.'])
            ->assertSessionHasNoErrors();

        $this->assertFalse($this->billing->charged($clinic), 'A rejected clinic must NEVER be charged.');
        $this->assertCount(1, $this->billing->discarded);

        $clinic->refresh();
        $this->assertSame(Tenant::STATUS_REJECTED, $clinic->status);
        $this->assertSame(Tenant::SUBSCRIPTION_NONE, $clinic->subscription_status);
        $this->assertNull($clinic->stripe_pm_id);
    }

    public function test_cannot_approve_a_clinic_with_no_saved_card(): void
    {
        $admin = $this->admin();
        $clinic = $this->pendingClinic(withCard: false);

        $this->actingAs($admin)
            ->from($this->url($clinic, ''))
            ->post($this->url($clinic, '/approve'))
            ->assertSessionHasErrors('approve');

        $this->assertFalse($this->billing->charged($clinic));
        $this->assertSame(Tenant::STATUS_PENDING_REVIEW, $clinic->refresh()->status);
    }
}
