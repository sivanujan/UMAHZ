<?php

namespace Tests\Unit;

use App\Billing\DynamicPlanPricing;
use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\AddOn;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\PromoCode;
use App\Services\StripeSubscriptionSyncService;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StripeSyncAndPricingTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;
    private StripeSubscriptionSyncService $syncService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);

        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);
        $this->syncService = new StripeSubscriptionSyncService($this->billing);
    }

    public function test_plan_sync_creates_stripe_product_and_prices_with_shared_interval(): void
    {
        $plan = Plan::where('slug', 'essential')->firstOrFail();
        $this->assertNull($plan->stripe_product_id);

        $this->syncService->syncPlan($plan);
        $plan->refresh();

        $this->assertNotNull($plan->stripe_product_id);
        $this->assertArrayHasKey($plan->stripe_product_id, $this->billing->products);

        // Check Monthly PlanPrice (Confirmed seed: $39/mo)
        $monthly = $plan->monthlyPrice;
        $this->assertNotNull($monthly->stripe_base_price_id);
        $this->assertNull($monthly->stripe_extra_seat_price_id); // Essential allows no extra seats

        $baseMonthPrice = $this->billing->prices[$monthly->stripe_base_price_id];
        $this->assertSame('month', $baseMonthPrice['interval']);
        $this->assertEquals(39.00, $baseMonthPrice['amount']);
        $this->assertSame('plan_essential_month', $baseMonthPrice['lookup_key']);

        // Check Annual PlanPrice (Confirmed seed: $390/yr)
        $annual = $plan->annualPrice;
        $this->assertNotNull($annual->stripe_base_price_id);
        $baseAnnualPrice = $this->billing->prices[$annual->stripe_base_price_id];
        $this->assertSame('year', $baseAnnualPrice['interval']);
        $this->assertEquals(390.00, $baseAnnualPrice['amount']);
        $this->assertSame('plan_essential_year', $baseAnnualPrice['lookup_key']);
    }

    public function test_placeholder_prices_are_not_synced_until_admin_reviews_and_saves(): void
    {
        $pro = Plan::where('slug', 'professional')->firstOrFail();

        // 1. Initial state: seeded with needs_review = true for prices
        $this->syncService->syncPlan($pro);
        $pro->refresh();

        // Product is created, but placeholder prices are NOT synced to Stripe
        $this->assertNotNull($pro->stripe_product_id);
        $this->assertNull($pro->monthlyPrice->stripe_base_price_id);
        $this->assertNull($pro->monthlyPrice->stripe_extra_seat_price_id);
        $this->assertNull($pro->annualPrice->stripe_base_price_id);
        $this->assertNull($pro->annualPrice->stripe_extra_seat_price_id);

        // 2. Admin reviews and confirms prices ($69/mo, $35/seat, $690/yr, $350/seat)
        foreach ($pro->activePrices as $price) {
            $price->update(['needs_review' => false, 'needs_review_fields' => null]);
        }

        // 3. Re-sync after admin confirmation
        $this->syncService->syncPlan($pro);
        $pro->refresh();

        $this->assertNotNull($pro->monthlyPrice->stripe_base_price_id);
        $this->assertNotNull($pro->monthlyPrice->stripe_extra_seat_price_id);
        $this->assertNotNull($pro->annualPrice->stripe_base_price_id);
        $this->assertNotNull($pro->annualPrice->stripe_extra_seat_price_id);
        $this->assertSame('plan_professional_month', $this->billing->prices[$pro->monthlyPrice->stripe_base_price_id]['lookup_key']);
        $this->assertSame('plan_professional_seat_month', $this->billing->prices[$pro->monthlyPrice->stripe_extra_seat_price_id]['lookup_key']);
    }

    public function test_stripe_sync_is_idempotent_and_never_creates_duplicate_products_or_prices(): void
    {
        $plan = Plan::where('slug', 'essential')->firstOrFail();

        // Sync first time
        $this->syncService->syncPlan($plan);
        $plan->refresh();
        $prodCount1 = count($this->billing->products);
        $priceCount1 = count($this->billing->prices);

        // Sync second time (simulates re-running command or saving without changes)
        $this->syncService->syncPlan($plan);
        $plan->refresh();
        $prodCount2 = count($this->billing->products);
        $priceCount2 = count($this->billing->prices);

        // Zero duplicate products or prices created
        $this->assertSame($prodCount1, $prodCount2);
        $this->assertSame($priceCount1, $priceCount2);
    }

    public function test_price_update_archives_old_stripe_price_and_creates_new_active_price(): void
    {
        $plan = Plan::where('slug', 'essential')->firstOrFail();
        $this->syncService->syncPlan($plan);
        $oldPrice = $plan->monthlyPrice;

        $oldBaseId = $oldPrice->stripe_base_price_id;

        // Perform Price Update (Correction 1: Immutability & Archiving)
        $newPrice = $this->syncService->updatePlanPrice($oldPrice, 45.00, 0.00);

        // Verify old price is grandfathered and inactive
        $oldPrice->refresh();
        $this->assertFalse($oldPrice->is_active);
        $this->assertTrue($oldPrice->is_grandfathered);
        $this->assertContains($oldBaseId, $this->billing->archivedPrices);

        // Verify new price is active with newly generated Stripe IDs
        $this->assertTrue($newPrice->is_active);
        $this->assertFalse($newPrice->is_grandfathered);
        $this->assertEquals(45.00, (float) $newPrice->base_price);
        $this->assertNotSame($oldBaseId, $newPrice->stripe_base_price_id);

        // Only ONE active monthly price exists for this plan
        $this->assertSame(1, PlanPrice::where('plan_id', $plan->id)->where('interval', 'month')->where('is_active', true)->count());
    }

    public function test_addon_sync_creates_confirmed_monthly_and_skips_placeholder_annual_until_reviewed(): void
    {
        $addOn = AddOn::where('slug', 'scribe_plus')->firstOrFail();
        $this->syncService->syncAddOn($addOn);
        $addOn->refresh();

        $this->assertNotNull($addOn->stripe_product_id);
        // Monthly ($15/mo) is confirmed and synced
        $this->assertNotNull($addOn->stripe_price_monthly_id);
        // Annual is a placeholder (needs_review = true) and is SKIPPED
        $this->assertNull($addOn->stripe_price_annual_id);

        $monthStripePrice = $this->billing->prices[$addOn->stripe_price_monthly_id];
        $this->assertSame('month', $monthStripePrice['interval']);
        $this->assertEquals(15.00, $monthStripePrice['amount']);
        $this->assertSame('addon_scribe_plus_month', $monthStripePrice['lookup_key']);

        // Admin reviews and confirms annual price ($150/yr)
        $addOn->update(['needs_review' => false, 'needs_review_fields' => null]);
        $this->syncService->syncAddOn($addOn);
        $addOn->refresh();

        $this->assertNotNull($addOn->stripe_price_annual_id);
        $yearStripePrice = $this->billing->prices[$addOn->stripe_price_annual_id];
        $this->assertSame('year', $yearStripePrice['interval']);
        $this->assertEquals(150.00, $yearStripePrice['amount']);
        $this->assertSame('addon_scribe_plus_year', $yearStripePrice['lookup_key']);
    }

    public function test_promo_code_sync_creates_coupon_and_promotion_code(): void
    {
        $promo = PromoCode::create([
            'code' => 'FOUNDING20',
            'discount_type' => 'percent',
            'discount_value' => 20.00,
            'duration' => 'repeating',
            'duration_in_months' => 12,
            'max_redemptions' => 100,
            'is_active' => true,
        ]);

        $this->syncService->syncPromoCode($promo);
        $promo->refresh();

        $this->assertNotNull($promo->stripe_coupon_id);
        $this->assertNotNull($promo->stripe_promo_code_id);

        $coupon = $this->billing->coupons[$promo->stripe_coupon_id];
        $this->assertSame('repeating', $coupon['duration']);
        $this->assertSame(12, $coupon['duration_in_months']);
        $this->assertEquals(20.0, $coupon['percent_off']);

        $stripePromo = $this->billing->promotionCodes[$promo->stripe_promo_code_id];
        $this->assertSame('FOUNDING20', $stripePromo['code']);
        $this->assertTrue($stripePromo['active']);

        // Deactivating promo code deactivates on Stripe
        $promo->update(['is_active' => false]);
        $this->syncService->syncPromoCode($promo);
        $this->assertFalse($this->billing->promotionCodes[$promo->stripe_promo_code_id]['active']);
    }

    public function test_dynamic_plan_pricing_breakdown_and_subscription_items(): void
    {
        $essential = Plan::where('slug', 'essential')->firstOrFail();
        $pro = Plan::where('slug', 'professional')->firstOrFail();
        $sig = Plan::where('slug', 'signature')->firstOrFail();
        $scribePlus = AddOn::where('slug', 'scribe_plus')->firstOrFail();

        // 1. Essential monthly breakdown (1 seat included, extra seats not allowed)
        $essentialBreakdown = DynamicPlanPricing::calculateBreakdown($essential, 'month', 1);
        $this->assertEquals(39.00, $essentialBreakdown['total']);
        $this->assertSame('$39.00 CAD/mo', $essentialBreakdown['total_formatted']);

        // 2. Professional monthly with 3 practitioners
        // When extra seat price is under review: extra seats cost $0
        $proBreakdownReview = DynamicPlanPricing::calculateBreakdown($pro, 'month', 3);
        $this->assertEquals(69.00, $proBreakdownReview['base_price']);
        $this->assertSame(2, $proBreakdownReview['extra_practitioners_count']);
        $this->assertEquals(0.00, $proBreakdownReview['extra_practitioners_cost']);
        $this->assertEquals(69.00, $proBreakdownReview['total']);
        $this->assertTrue($proBreakdownReview['extra_seat_price_under_review']);

        // When confirmed by admin: extra seats are charged @ $35.00
        $pro->monthlyPrice->update(['needs_review' => false, 'needs_review_fields' => null]);
        $proBreakdown = DynamicPlanPricing::calculateBreakdown($pro->fresh(), 'month', 3);
        $this->assertEquals(69.00, $proBreakdown['base_price']);
        $this->assertSame(2, $proBreakdown['extra_practitioners_count']);
        $this->assertEquals(70.00, $proBreakdown['extra_practitioners_cost']);
        $this->assertEquals(139.00, $proBreakdown['total']);
        $this->assertSame('$139.00 CAD/mo', $proBreakdown['total_formatted']);

        // 3. Signature annual with 5 practitioners + Scribe+ for 5 practitioners + Promo code 20%
        // Confirm Signature prices so extra seat pricing is active
        foreach ($sig->activePrices as $price) {
            $price->update(['needs_review' => false, 'needs_review_fields' => null]);
        }

        $promo = PromoCode::create([
            'code' => 'FOUNDING20',
            'discount_type' => 'percent',
            'discount_value' => 20.00,
            'duration' => 'repeating',
            'duration_in_months' => 12,
            'is_active' => true,
        ]);

        $sigBreakdown = DynamicPlanPricing::calculateBreakdown(
            $sig->fresh(),
            'year',
            5, // 3 included + 2 extra @ $300/yr = $600/yr
            [['addon' => $scribePlus, 'quantity' => 5]], // 5 * $150/yr = $750/yr
            $promo
        );

        // Subtotal = $900 base + $600 extra seats + $750 Scribe+ = $2,250
        $this->assertEquals(2250.00, $sigBreakdown['subtotal']);
        // 20% discount = $450
        $this->assertEquals(450.00, $sigBreakdown['discount_amount']);
        // Total = $1,800/yr
        $this->assertEquals(1800.00, $sigBreakdown['total']);
        $this->assertSame('$1,800.00 CAD/yr', $sigBreakdown['total_formatted']);

        // 4. Test buildSubscriptionItems ensures ALL items share the exact same interval (Correction 4)
        $scribePlus->update(['needs_review' => false, 'needs_review_fields' => null]);

        $this->syncService->syncPlan($sig);
        $this->syncService->syncAddOn($scribePlus);
        $sig->refresh();
        $scribePlus->refresh();

        $lineItems = DynamicPlanPricing::buildSubscriptionItems($sig, 'year', 5, [['addon' => $scribePlus, 'quantity' => 5]]);
        $this->assertCount(3, $lineItems);

        // Item 1: Base plan annual
        $this->assertSame($sig->annualPrice->stripe_base_price_id, $lineItems[0]['price']);
        $this->assertSame(1, $lineItems[0]['quantity']);

        // Item 2: Extra practitioner seats annual
        $this->assertSame($sig->annualPrice->stripe_extra_seat_price_id, $lineItems[1]['price']);
        $this->assertSame(2, $lineItems[1]['quantity']);

        // Item 3: Scribe+ annual price (NOT monthly!)
        $this->assertSame($scribePlus->stripe_price_annual_id, $lineItems[2]['price']);
        $this->assertSame(5, $lineItems[2]['quantity']);

        // Verify each line item's price in billing shares interval = 'year'
        foreach ($lineItems as $item) {
            $this->assertSame('year', $this->billing->prices[$item['price']]['interval']);
        }
    }

    public function test_artisan_sync_command_dry_run_and_execution(): void
    {
        // Dry-run should make zero calls to create products
        $this->artisan('billing:sync-stripe', ['--dry-run' => true])
            ->expectsOutputToContain('=== [DRY-RUN] Stripe Plans & Billing Synchronization ===')
            ->expectsOutputToContain('[SKIPPED] Base Price (month): Marked as needs_review')
            ->expectsOutputToContain('[DRY-RUN COMPLETE] No changes were made to Stripe or the database.')
            ->assertSuccessful();

        $this->assertEmpty($this->billing->products);

        // Execution syncs confirmed resources (Essential and Scribe+ monthly)
        $this->artisan('billing:sync-stripe')
            ->expectsOutputToContain('=== Starting Stripe Plans & Billing Synchronization ===')
            ->expectsOutputToContain('[SYNC COMPLETE]')
            ->assertSuccessful();

        $essential = Plan::where('slug', 'essential')->first();
        $this->assertNotNull($essential->stripe_product_id);
        $this->assertNotNull($essential->monthlyPrice->stripe_base_price_id);
    }

    public function test_seeder_is_idempotent_and_never_overwrites_admin_edits(): void
    {
        $essential = Plan::where('slug', 'essential')->firstOrFail();
        $essential->update([
            'name' => 'Essential Custom Solo',
            'appointment_limit_monthly' => 75,
        ]);
        $essential->monthlyPrice->update([
            'base_price' => 45.00,
        ]);

        // Re-run seeder
        $this->seed(SubscriptionPlansSeeder::class);

        // Verify admin edits are completely preserved
        $essential->refresh();
        $this->assertSame('Essential Custom Solo', $essential->name);
        $this->assertSame(75, $essential->appointment_limit_monthly);
        $this->assertEquals(45.00, (float) $essential->monthlyPrice->base_price);
    }
}
