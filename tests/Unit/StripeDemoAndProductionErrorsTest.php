<?php

namespace Tests\Unit;

use App\Billing\StripePlatformBilling;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Subscription;
use Stripe\Exception\InvalidRequestException;
use Tests\TestCase;

class StripeDemoAndProductionErrorsTest extends TestCase
{
    use RefreshDatabase;

    private StripePlatformBilling $billing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->billing = new StripePlatformBilling();
    }

    public function test_is_demo_subscription_only_matches_demo_mock_fake_prefixes(): void
    {
        $mockSub = function (?string $subStripeId, ?string $cusStripeId = null) {
            $sub = new Subscription();
            $sub->stripe_id = $subStripeId;
            return $sub;
        };

        // Demo / Mock / Fake prefixes must match
        $this->assertTrue($this->billing->isDemoSubscription($mockSub('sub_demo_12345')));
        $this->assertTrue($this->billing->isDemoSubscription($mockSub('sub_demo_astrogenapp')));
        $this->assertTrue($this->billing->isDemoSubscription($mockSub('sub_mock_12345')));
        $this->assertTrue($this->billing->isDemoSubscription($mockSub('sub_fake_12345')));

        // Customer demo prefixes must match
        $demoTenant = new Tenant();
        $demoTenant->stripe_id = 'cus_demo_12345';
        $this->assertTrue($this->billing->isDemoSubscription($mockSub('sub_unknown_prefix'), $demoTenant));

        $mockTenant = new Tenant();
        $mockTenant->stripe_id = 'cus_mock_99999';
        $this->assertTrue($this->billing->isDemoSubscription($mockSub('sub_unknown_prefix'), $mockTenant));

        // Real / Production Stripe IDs must NOT match
        $realTenant = new Tenant();
        $realTenant->stripe_id = 'cus_1Nv8d92eZvKYlo2C';
        $this->assertFalse($this->billing->isDemoSubscription($mockSub('sub_1Nv8d92eZvKYlo2C'), $realTenant));
        $this->assertFalse($this->billing->isDemoSubscription($mockSub('sub_live_real_id')));
        $this->assertFalse($this->billing->isDemoSubscription($mockSub('sub_production_123')));
        $this->assertFalse($this->billing->isDemoSubscription($mockSub('sub_something_else')));
        $this->assertFalse($this->billing->isDemoSubscription($mockSub('')));
        $this->assertFalse($this->billing->isDemoSubscription(null));
    }

    public function test_production_environment_throws_and_logs_real_stripe_errors(): void
    {
        // Mock production environment
        $this->app->detectEnvironment(fn () => 'production');
        $this->assertEquals('production', app()->environment());
        config(['billing.tiers.practice.stripe_price_id' => 'price_practice_monthly']);

        $tenant = new Tenant();
        $tenant->forceFill([
            'name' => 'Real Clinic Production',
            'slug' => 'realclinicprod',
            'subdomain' => 'realclinicprod',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'practice',
            'full_time_practitioners_count' => 3,
            'part_time_practitioners_count' => 1,
            'stripe_id' => 'cus_real_production_123',
        ]);
        $tenant->save();

        $subscription = $tenant->subscriptions()->create([
            'type' => Tenant::PLATFORM_SUBSCRIPTION,
            'stripe_id' => 'sub_1Nv8d92eZvKYlo2C',
            'stripe_status' => 'active',
            'stripe_price' => 'price_practice_monthly',
            'quantity' => 1,
        ]);

        Log::shouldReceive('error')
            ->once()
            ->withArgs(function ($message, $context) use ($tenant, $subscription) {
                return str_contains($message, 'Stripe subscription sync failed in production')
                    && ($context['tenant_id'] ?? null) === $tenant->id
                    && ($context['stripe_subscription_id'] ?? null) === $subscription->stripe_id;
            });

        // In production, when Stripe fails for a real subscription, it must NOT swallow the error
        $billingMock = $this->getMockBuilder(StripePlatformBilling::class)
            ->onlyMethods(['isDemoSubscription'])
            ->getMock();

        $billingMock->method('isDemoSubscription')->willReturn(false);

        // Setting a mock subscription that throws InvalidRequestException on swap
        $stripeException = InvalidRequestException::factory('No such subscription: sub_1Nv8d92eZvKYlo2C', 404);

        $subscriptionMock = $this->getMockBuilder(Subscription::class)
            ->onlyMethods(['swap', 'active'])
            ->getMock();
        $subscriptionMock->stripe_id = 'sub_1Nv8d92eZvKYlo2C';
        $subscriptionMock->method('active')->willReturn(true);
        $subscriptionMock->method('swap')->willThrowException($stripeException);

        $tenantMock = $this->getMockBuilder(Tenant::class)
            ->onlyMethods(['subscription', 'totalPractitionersCount'])
            ->getMock();
        $tenantMock->id = $tenant->id;
        $tenantMock->stripe_id = 'cus_real_production_123';
        $tenantMock->method('subscription')->willReturn($subscriptionMock);
        $tenantMock->method('totalPractitionersCount')->willReturn(4);

        $this->expectException(InvalidRequestException::class);
        $this->expectExceptionMessage('No such subscription: sub_1Nv8d92eZvKYlo2C');

        $billingMock->syncSubscriptionQuantities($tenantMock);
    }

    public function test_demo_subscription_skips_stripe_call_and_updates_local_quantity(): void
    {
        $tenant = new Tenant();
        $tenant->forceFill([
            'name' => 'Demo Clinic',
            'slug' => 'democlinic',
            'subdomain' => 'democlinic',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'practice',
            'full_time_practitioners_count' => 2,
            'part_time_practitioners_count' => 1,
            'stripe_id' => 'cus_demo_clinic',
        ]);
        $tenant->save();

        $subscription = $tenant->subscriptions()->create([
            'type' => Tenant::PLATFORM_SUBSCRIPTION,
            'stripe_id' => 'sub_demo_clinic',
            'stripe_status' => 'active',
            'stripe_price' => 'price_practice_monthly',
            'quantity' => 1,
        ]);

        // Must update local quantity to total practitioners count without error
        $this->billing->syncSubscriptionQuantities($tenant);

        $subscription->refresh();
        $this->assertEquals(3, $subscription->quantity);
    }
}
