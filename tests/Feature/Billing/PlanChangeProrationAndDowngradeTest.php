<?php

namespace Tests\Feature\Billing;

use App\Billing\DynamicPlanPricing;
use App\Models\Plan;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use App\Notifications\PlanUpgradeReceiptNotification;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PlanChangeProrationAndDowngradeTest extends TestCase
{
    use RefreshDatabase;

    private Plan $essential;
    private Plan $professional;
    private Plan $signature;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);

        $this->essential = Plan::where('slug', 'essential')->firstOrFail();
        $this->professional = Plan::where('slug', 'professional')->firstOrFail();
        $this->signature = Plan::where('slug', 'signature')->firstOrFail();
    }

    private function createTenantWithOwner(Plan $plan, string $interval = 'month', ?Carbon $startedAt = null): array
    {
        $tenant = Tenant::create([
            'name' => 'Acme Health',
            'slug' => 'acme-health',
            'subdomain' => 'acmehealth',
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $plan->id,
            'plan_tier' => $plan->slug,
            'billing_interval' => $interval,
            'plan_started_at' => $startedAt ?? now(),
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'onboarding_completed_at' => now(),
        ]);

        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$tenant, $owner];
    }

    public function test_monthly_upgrade_under_20_days_deducts_daily_unused_credit(): void
    {
        // 5 days ago on Essential ($39/mo)
        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'month', now()->subDays(5));

        $proration = DynamicPlanPricing::calculateUpgradeProration(
            $tenant,
            $this->professional,
            'month',
            69.00
        );

        $this->assertTrue($proration['is_upgrade']);
        $this->assertSame(5, $proration['units_used']);
        $this->assertSame('day', $proration['period_type']);
        $this->assertSame(20, $proration['threshold']);
        $this->assertFalse($proration['threshold_reached']);
        $this->assertEquals(1.30, $proration['unit_rate']); // 39 / 30 = 1.30
        $this->assertEquals(6.50, $proration['used_cost']); // 5 * 1.30
        $this->assertEquals(32.50, $proration['unused_credit']); // 39 - 6.50
        $this->assertEquals(36.50, $proration['net_amount_due']); // 69 - 32.50

        // Test API preview endpoint
        $response = $this->actingAs($owner)
            ->getJson('http://acmehealth.umahz.test/app/billing/preview-change?plan_id=' . $this->professional->id . '&billing_interval=month');

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'is_downgrade' => false,
                'proration' => [
                    'units_used' => 5,
                    'threshold' => 20,
                    'threshold_reached' => false,
                    'unused_credit' => 32.50,
                    'net_amount_due' => 36.50,
                ],
            ]);
    }

    public function test_monthly_upgrade_at_or_above_20_days_gives_zero_credit_and_charges_full_price(): void
    {
        // 22 days ago on Essential ($39/mo)
        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'month', now()->subDays(22));

        $proration = DynamicPlanPricing::calculateUpgradeProration(
            $tenant,
            $this->professional,
            'month',
            69.00
        );

        $this->assertTrue($proration['is_upgrade']);
        $this->assertSame(22, $proration['units_used']);
        $this->assertTrue($proration['threshold_reached']);
        $this->assertEquals(0.00, $proration['unused_credit']);
        $this->assertEquals(69.00, $proration['net_amount_due']); // Full $69 charged

        // Test API preview endpoint
        $response = $this->actingAs($owner)
            ->getJson('http://acmehealth.umahz.test/app/billing/preview-change?plan_id=' . $this->professional->id . '&billing_interval=month');

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'is_downgrade' => false,
                'proration' => [
                    'units_used' => 22,
                    'threshold' => 20,
                    'threshold_reached' => true,
                    'unused_credit' => 0.00,
                    'net_amount_due' => 69.00,
                ],
            ]);
    }

    public function test_annual_upgrade_under_7_months_deducts_monthly_unused_credit(): void
    {
        // 2 months ago on Essential ($390/yr)
        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'year', now()->subMonths(2));

        $proration = DynamicPlanPricing::calculateUpgradeProration(
            $tenant,
            $this->professional,
            'year',
            690.00
        );

        $this->assertTrue($proration['is_upgrade']);
        $this->assertSame(2, $proration['units_used']);
        $this->assertSame('month', $proration['period_type']);
        $this->assertSame(7, $proration['threshold']);
        $this->assertFalse($proration['threshold_reached']);
        $this->assertEquals(32.50, $proration['unit_rate']); // 390 / 12 = 32.50
        $this->assertEquals(65.00, $proration['used_cost']); // 2 * 32.50
        $this->assertEquals(325.00, $proration['unused_credit']); // 390 - 65.00
        $this->assertEquals(365.00, $proration['net_amount_due']); // 690 - 325.00

        // Test API preview endpoint
        $response = $this->actingAs($owner)
            ->getJson('http://acmehealth.umahz.test/app/billing/preview-change?plan_id=' . $this->professional->id . '&billing_interval=year');

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'is_downgrade' => false,
                'proration' => [
                    'units_used' => 2,
                    'threshold' => 7,
                    'threshold_reached' => false,
                    'unused_credit' => 325.00,
                    'net_amount_due' => 365.00,
                ],
            ]);
    }

    public function test_annual_upgrade_at_or_above_7_months_gives_zero_credit_and_charges_full_price(): void
    {
        // 8 months ago on Essential ($390/yr)
        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'year', now()->subMonths(8));

        $proration = DynamicPlanPricing::calculateUpgradeProration(
            $tenant,
            $this->professional,
            'year',
            690.00
        );

        $this->assertTrue($proration['is_upgrade']);
        $this->assertSame(8, $proration['units_used']);
        $this->assertTrue($proration['threshold_reached']);
        $this->assertEquals(0.00, $proration['unused_credit']);
        $this->assertEquals(690.00, $proration['net_amount_due']); // Full $690 charged

        // Test API preview endpoint
        $response = $this->actingAs($owner)
            ->getJson('http://acmehealth.umahz.test/app/billing/preview-change?plan_id=' . $this->professional->id . '&billing_interval=year');

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'is_downgrade' => false,
                'proration' => [
                    'units_used' => 8,
                    'threshold' => 7,
                    'threshold_reached' => true,
                    'unused_credit' => 0.00,
                    'net_amount_due' => 690.00,
                ],
            ]);
    }

    public function test_direct_downgrade_is_blocked_with_warning_and_guidance_to_cancel(): void
    {
        // Clinic is on Professional ($69/mo) and tries to downgrade to Essential ($39/mo)
        [$tenant, $owner] = $this->createTenantWithOwner($this->professional, 'month', now()->subDays(10));

        // 1. Preview endpoint returns 422 with is_downgrade and warning message
        $previewResponse = $this->actingAs($owner)
            ->getJson('http://acmehealth.umahz.test/app/billing/preview-change?plan_id=' . $this->essential->id . '&billing_interval=month');

        $previewResponse->assertStatus(422)
            ->assertJson([
                'allowed' => false,
                'is_downgrade' => true,
            ]);
        $this->assertStringContainsString('Direct downgrades', $previewResponse->json('reason'));
        $this->assertStringContainsString('cancel your current subscription', $previewResponse->json('reason'));

        // 2. Direct PUT /app/billing/plan fails with validation error
        $putResponse = $this->actingAs($owner)
            ->put('http://acmehealth.umahz.test/app/billing/plan', [
                'plan_id' => $this->essential->id,
                'billing_interval' => 'month',
            ]);

        $putResponse->assertSessionHasErrors(['plan_id']);

        // Verify tenant is still on Professional
        $tenant->refresh();
        $this->assertSame($this->professional->id, $tenant->plan_id);
    }

    public function test_upgrade_execution_succeeds_and_updates_plan_started_at(): void
    {
        // Essential clinic upgrades to Professional
        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'month', now()->subDays(3));

        $response = $this->actingAs($owner)
            ->put('http://acmehealth.umahz.test/app/billing/plan', [
                'plan_id' => $this->professional->id,
                'billing_interval' => 'month',
                'extra_practitioner_seats' => 0,
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $tenant->refresh();
        $this->assertSame($this->professional->id, $tenant->plan_id);
        $this->assertNotNull($tenant->plan_started_at);
        $this->assertTrue($tenant->plan_started_at->isToday());
    }

    public function test_upgrade_execution_sends_email_receipt_notification_to_user(): void
    {
        Notification::fake();

        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'month', now()->subDays(5));

        $response = $this->actingAs($owner)
            ->put('http://acmehealth.umahz.test/app/billing/plan', [
                'plan_id' => $this->professional->id,
                'billing_interval' => 'month',
                'extra_practitioner_seats' => 0,
            ]);

        $response->assertSessionHasNoErrors();

        Notification::assertSentTo(
            $owner,
            PlanUpgradeReceiptNotification::class,
            function (PlanUpgradeReceiptNotification $notification) use ($tenant) {
                $this->assertSame($tenant->id, $notification->tenant->id);
                $this->assertSame($this->professional->id, $notification->targetPlan->id);
                $this->assertEquals(32.50, $notification->proration['unused_credit']);
                $this->assertEquals(36.50, $notification->proration['net_amount_due']);

                $mail = $notification->toMail($notification->tenant);
                $this->assertStringContainsString('Subscription Upgraded to Professional', $mail->subject);
                $this->assertStringContainsString('$36.50 CAD', $mail->render());
                $this->assertStringContainsString('Proration Credit Applied', $mail->render());

                return true;
            }
        );
    }

    public function test_adding_additional_practitioners_dynamically_calculates_price_and_proration(): void
    {
        Notification::fake();

        [$tenant, $owner] = $this->createTenantWithOwner($this->essential, 'month', now()->subDays(5));

        // 1. Preview Professional plan change with 6 additional practitioners
        $response = $this->actingAs($owner)
            ->getJson('http://acmehealth.umahz.test/app/billing/preview-change?plan_id=' . $this->professional->id . '&billing_interval=month&extra_practitioner_seats=6');

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'extra_seats' => 6,
                'breakdown' => [
                    'base_price' => 69.00,
                    'extra_practitioners_count' => 6,
                    'extra_seat_unit_price' => 35.00,
                    'extra_practitioners_cost' => 210.00,
                    'extra_seat_price_under_review' => false,
                    'total' => 279.00,
                ],
                'proration' => [
                    'unused_credit' => 32.50,
                    'new_plan_total' => 279.00,
                    'net_amount_due' => 246.50,
                ],
            ]);

        // 2. Execute plan upgrade with 6 extra seats
        $putResponse = $this->actingAs($owner)
            ->put('http://acmehealth.umahz.test/app/billing/plan', [
                'plan_id' => $this->professional->id,
                'billing_interval' => 'month',
                'extra_practitioner_seats' => 6,
            ]);

        $putResponse->assertSessionHasNoErrors();
        $tenant->refresh();

        $this->assertSame($this->professional->id, $tenant->plan_id);
        $this->assertSame(6, $tenant->extra_practitioner_seats);

        Notification::assertSentTo(
            $owner,
            PlanUpgradeReceiptNotification::class,
            function (PlanUpgradeReceiptNotification $notification) use ($tenant) {
                $this->assertSame(6, $notification->extraSeats);
                $this->assertEquals(246.50, $notification->proration['net_amount_due']);
                $mail = $notification->toMail($tenant);
                $this->assertStringContainsString('$246.50 CAD', $mail->render());
                $this->assertStringContainsString('6 extra', $mail->render());
                return true;
            }
        );
    }

    public function test_subscription_cancellation_shows_lockout_warning_and_30_day_data_removal_policy(): void
    {
        [$tenant, $owner] = $this->createTenantWithOwner($this->professional, 'month', now()->subDays(5));

        // Create a platform subscription record on the tenant
        $subscription = $tenant->subscriptions()->create([
            'type' => Tenant::PLATFORM_SUBSCRIPTION,
            'stripe_id' => 'sub_fake_test_123',
            'stripe_status' => 'active',
            'stripe_price' => 'price_pro_month',
            'quantity' => 1,
            'trial_ends_at' => null,
            'ends_at' => null,
        ]);

        $response = $this->actingAs($owner)
            ->post('http://acmehealth.umahz.test/app/billing/cancel', [
                'reason' => 'Cost is too high: Testing the new cancellation flow',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');
        $this->assertStringContainsString('30 days', session('success'));
        $this->assertStringContainsString('access will be locked', session('success'));

        $subscription->refresh();
        $this->assertTrue($subscription->canceled());
        $this->assertNotNull($subscription->ends_at);
    }

    public function test_canceled_subscription_locks_clinic_workspace_write_access_with_30_day_removal_notice(): void
    {
        [$tenant, $owner] = $this->createTenantWithOwner($this->professional, 'month', now()->subDays(40));

        // Subscription canceled and ends_at is in the past (past grace period)
        $tenant->subscriptions()->create([
            'type' => Tenant::PLATFORM_SUBSCRIPTION,
            'stripe_id' => 'sub_fake_test_expired',
            'stripe_status' => 'canceled',
            'stripe_price' => 'price_pro_month',
            'quantity' => 1,
            'trial_ends_at' => null,
            'ends_at' => now()->subDay(),
        ]);

        $entitlements = app(\App\Services\PlanEntitlements::class);
        $check = $entitlements->canWrite($tenant);

        $this->assertFalse($check['allowed'], 'Write access must be locked when subscription is canceled.');
        $this->assertSame('subscription_canceled', $check['code']);
        $this->assertStringContainsString('30 days', $check['reason']);
        $this->assertStringContainsString('workspace access is locked', $check['reason']);
    }
}
