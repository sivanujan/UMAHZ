<?php

namespace Tests\Feature\Billing;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\Tenant;
use App\Services\ClinicSubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicSubscriptionServiceTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);
    }

    private function service(): ClinicSubscriptionService
    {
        return $this->app->make(ClinicSubscriptionService::class);
    }

    private function tenantWithCard(): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Lotus', 'slug' => 'lotus', 'subdomain' => 'lotus',
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ]);

        // stripe_id is guarded (Cashier-managed); set it the way the real
        // finalize flow does.
        $tenant->forceFill(['stripe_id' => 'cus_test_123', 'stripe_pm_id' => 'pm_test_123'])->save();

        return $tenant;
    }

    public function test_activate_starts_the_subscription_and_marks_active(): void
    {
        $tenant = $this->tenantWithCard();

        $this->service()->activate($tenant);

        $this->assertTrue($this->billing->charged($tenant), 'The first charge should have been triggered on approval.');
        $this->assertSame('pm_test_123', $this->billing->startedSubscriptions[0]['payment_method']);
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $tenant->fresh()->subscription_status);
    }

    public function test_activate_is_idempotent_and_does_not_double_charge(): void
    {
        $tenant = $this->tenantWithCard();
        $tenant->update(['subscription_status' => Tenant::SUBSCRIPTION_ACTIVE]);

        $this->service()->activate($tenant);

        $this->assertCount(0, $this->billing->startedSubscriptions, 'An already-active tenant must not be charged again.');
    }

    public function test_activate_refuses_when_no_card_is_saved(): void
    {
        $tenant = Tenant::create([
            'name' => 'NoCard', 'slug' => 'nocard', 'subdomain' => 'nocard',
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->service()->activate($tenant);
    }

    public function test_discard_never_charges_and_clears_the_saved_card(): void
    {
        $tenant = $this->tenantWithCard();

        $this->service()->discard($tenant);

        $this->assertFalse($this->billing->charged($tenant), 'A rejected clinic must NEVER be charged.');
        $this->assertCount(1, $this->billing->discarded);
        $this->assertSame('pm_test_123', $this->billing->discarded[0]['payment_method']);

        $tenant->refresh();
        $this->assertNull($tenant->stripe_pm_id);
        $this->assertSame(Tenant::SUBSCRIPTION_NONE, $tenant->subscription_status);
    }
}
