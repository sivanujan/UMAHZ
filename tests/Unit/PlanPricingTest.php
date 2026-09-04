<?php

namespace Tests\Unit;

use App\Billing\PlanPricing;
use App\Models\Tenant;
use Tests\TestCase;

class PlanPricingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Mock config for unit test
        config([
            'billing.tiers' => [
                Tenant::TIER_BALANCE => [
                    'name' => 'Balance',
                    'base_price' => 54.00,
                    'included_full_time' => 1,
                    'max_practitioners' => 1,
                    'max_appointments_per_month' => 20,
                    'price_ids' => [
                        'base' => 'price_balance_base_test',
                    ],
                ],
                Tenant::TIER_PRACTICE => [
                    'name' => 'Practice',
                    'base_price' => 79.00,
                    'included_full_time' => 1,
                    'max_practitioners' => null,
                    'addon_price_ft' => 35.00,
                    'addon_price_pt' => 17.50,
                    'stripe_price_id' => 'price_practice_base_test',
                    'stripe_addon_price_ft_id' => 'price_practice_addon_ft_test',
                    'stripe_addon_price_pt_id' => 'price_practice_addon_pt_test',
                ],
                Tenant::TIER_THRIVE => [
                    'name' => 'Thrive',
                    'base_price' => 99.00,
                    'included_full_time' => 1,
                    'max_practitioners' => null,
                    'addon_price_ft' => 40.00,
                    'addon_price_pt' => 20.00,
                    'stripe_price_id' => 'price_thrive_base_test',
                    'stripe_addon_price_ft_id' => 'price_thrive_addon_ft_test',
                    'stripe_addon_price_pt_id' => 'price_thrive_addon_pt_test',
                ],
            ],
        ]);
    }

    public function test_balance_breakdown(): void
    {
        $breakdown = PlanPricing::calculateBreakdown(Tenant::TIER_BALANCE, 1, 0);

        $this->assertEquals(54.00, $breakdown['base_price']);
        $this->assertEquals(0.00, $breakdown['additional_ft_cost']);
        $this->assertEquals(0.00, $breakdown['additional_pt_cost']);
        $this->assertEquals(54.00, $breakdown['total_monthly']);
        $this->assertEquals(1, $breakdown['total_practitioners']);
        $this->assertTrue($breakdown['is_balance']);
    }

    public function test_practice_breakdown_with_addons(): void
    {
        // 3 FT (1 included + 2 extra @ $35) + 2 PT (@ $17.50) = $79 + $70 + $35 = $184
        $breakdown = PlanPricing::calculateBreakdown(Tenant::TIER_PRACTICE, 3, 2);

        $this->assertEquals(79.00, $breakdown['base_price']);
        $this->assertEquals(2, $breakdown['additional_ft_count']);
        $this->assertEquals(70.00, $breakdown['additional_ft_cost']);
        $this->assertEquals(2, $breakdown['additional_pt_count']);
        $this->assertEquals(35.00, $breakdown['additional_pt_cost']);
        $this->assertEquals(184.00, $breakdown['total_monthly']);
    }

    public function test_thrive_breakdown_with_addons(): void
    {
        // 2 FT (1 included + 1 extra @ $40) + 1 PT (@ $20) = $99 + $40 + $20 = $159
        $breakdown = PlanPricing::calculateBreakdown(Tenant::TIER_THRIVE, 2, 1);

        $this->assertEquals(99.00, $breakdown['base_price']);
        $this->assertEquals(1, $breakdown['additional_ft_count']);
        $this->assertEquals(40.00, $breakdown['additional_ft_cost']);
        $this->assertEquals(1, $breakdown['additional_pt_count']);
        $this->assertEquals(20.00, $breakdown['additional_pt_cost']);
        $this->assertEquals(159.00, $breakdown['total_monthly']);
    }

    public function test_build_subscription_items(): void
    {
        config([
            'billing.tiers.practice.stripe_price_id' => 'price_practice_base_test',
            'billing.tiers.practice.stripe_addon_price_ft_id' => 'price_practice_addon_ft_test',
            'billing.tiers.practice.stripe_addon_price_pt_id' => 'price_practice_addon_pt_test',
        ]);

        $items = PlanPricing::buildSubscriptionItems(Tenant::TIER_PRACTICE, 3, 2);

        $this->assertEquals([
            ['price' => 'price_practice_base_test', 'quantity' => 1],
            ['price' => 'price_practice_addon_ft_test', 'quantity' => 2],
            ['price' => 'price_practice_addon_pt_test', 'quantity' => 2],
        ], $items);
    }

    public function test_validate_practitioner_limit(): void
    {
        $tenantBalance = new Tenant(['plan_tier' => Tenant::TIER_BALANCE]);
        $this->assertTrue(PlanPricing::validatePractitionerLimit($tenantBalance, 1, 0));
        $this->assertFalse(PlanPricing::validatePractitionerLimit($tenantBalance, 2, 0));
        $this->assertFalse(PlanPricing::validatePractitionerLimit($tenantBalance, 1, 1));

        $tenantPractice = new Tenant(['plan_tier' => Tenant::TIER_PRACTICE]);
        $this->assertTrue(PlanPricing::validatePractitionerLimit($tenantPractice, 10, 5));
    }
}
