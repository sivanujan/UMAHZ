<?php

namespace Tests\Feature\Billing;

use App\Models\AuditEvent;
use App\Models\Plan;
use App\Models\PlatformSetting;
use App\Models\Referral;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class LaunchPricingAndReferralsTest extends TestCase
{
    use RefreshDatabase;

    private function createAdminUser(): User
    {
        $hq = Tenant::firstOrCreate(
            ['slug' => 'hq'],
            ['name' => 'HQ Platform', 'subdomain' => 'hq']
        );
        $user = User::factory()->create([
            'email' => 'admin@umahz.com',
        ]);
        StaffMembership::create([
            'tenant_id' => $hq->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return $user;
    }

    private function createClinicOwner(string $name = 'Alpha Clinic', string $subdomain = 'alpha'): array
    {
        $user = User::factory()->create([
            'name' => "Dr. {$name}",
            'email' => "{$subdomain}@example.com",
            'email_verified_at' => now(),
        ]);
        $user->assignRole('clinic_owner');

        $tenant = Tenant::create([
            'name' => $name,
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'onboarding_completed_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        return [$user, $tenant];
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['cashier.webhook.secret' => 'whsec_test_secret_for_phpunit_12345']);

        foreach (['clinic_owner', 'clinic_admin', 'practitioner', 'receptionist'] as $role) {
            \Spatie\Permission\Models\Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function sendStripeWebhook(string $type, array $object)
    {
        $payload = [
            'id' => 'evt_' . uniqid(),
            'type' => $type,
            'data' => ['object' => $object],
        ];

        $secret = config('cashier.webhook.secret');
        $json = json_encode($payload);
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$json}", $secret);
        $header = "t={$timestamp},v1={$signature}";

        return $this->call(
            'POST',
            'http://umahz.test/stripe/webhook',
            [],
            [],
            [],
            ['HTTP_STRIPE_SIGNATURE' => $header, 'CONTENT_TYPE' => 'application/json'],
            $json
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PART A: LAUNCH PRICING TESTS
    |--------------------------------------------------------------------------
    */

    public function test_basic_plan_launch_pricing_and_badge(): void
    {
        $plan = Plan::create([
            'name' => 'Essential',
            'slug' => 'basic',
            'is_active' => true,
            'show_launch_price' => true,
            'launch_badge_text' => 'Launch price',
            'original_price_monthly' => 39.00,
        ]);

        $plan->prices()->create([
            'interval' => 'month',
            'base_price' => 35.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => false,
        ]);

        $this->assertSame(35.00, (float) $plan->monthlyPrice->base_price);
        $this->assertTrue($plan->show_launch_price);
        $this->assertSame('Launch price', $plan->launch_badge_text);
        $this->assertSame(39.00, (float) $plan->original_price_monthly);

        // Check pricing page response
        $response = $this->get('http://umahz.test/pricing');
        $response->assertOk();
    }

    public function test_admin_can_update_launch_price_attributes(): void
    {
        $admin = $this->createAdminUser();

        $plan = Plan::create([
            'name' => 'Essential',
            'slug' => 'basic',
            'is_active' => true,
            'show_launch_price' => true,
            'launch_badge_text' => 'Launch price',
            'original_price_monthly' => 39.00,
        ]);

        $response = $this->actingAs($admin)->put("http://umahz.test/admin/plans/{$plan->id}", [
            'name' => 'Essential Updated',
            'slug' => 'basic',
            'is_active' => true,
            'display_order' => 1,
            'trial_days' => 14,
            'included_practitioners' => 1,
            'allows_extra_practitioners' => false,
            'appointment_limit_behavior' => 'warn',
            'scribe_allowance_unit' => 'minutes',
            'scribe_limit_behavior' => 'warn',
            'monthly_base_price' => 35.00,
            'monthly_extra_seat_price' => 0.00,
            'annual_base_price' => 390.00,
            'annual_extra_seat_price' => 0.00,
            'show_launch_price' => false,
            'launch_badge_text' => 'Special promo',
            'original_price_monthly' => 45.00,
            'original_price_annual' => 450.00,
        ]);

        $response->assertRedirect();
        $plan->refresh();
        $this->assertFalse($plan->show_launch_price);
        $this->assertSame('Special promo', $plan->launch_badge_text);
        $this->assertSame(45.00, (float) $plan->original_price_monthly);
    }

    /*
    |--------------------------------------------------------------------------
    | PART B: REFERRAL PROGRAM TESTS
    |--------------------------------------------------------------------------
    */

    public function test_tenant_auto_generates_referral_code_and_link(): void
    {
        $tenant = Tenant::create([
            'name' => 'Evergreen Wellness',
            'slug' => 'evergreen',
            'subdomain' => 'evergreen',
        ]);

        $this->assertNotNull($tenant->referral_code);
        $this->assertMatchesRegularExpression('/^[A-Z0-9]{6,10}$/', $tenant->referral_code);
        $this->assertStringContainsString('/r/' . $tenant->referral_code, $tenant->referralLink());
    }

    public function test_referral_route_sets_cookie_and_redirects_to_signup(): void
    {
        $tenant = Tenant::create([
            'name' => 'Lotus Health',
            'slug' => 'lotus',
            'subdomain' => 'lotus',
        ]);

        $code = $tenant->referral_code;

        $response = $this->get("http://umahz.test/r/{$code}");

        $response->assertRedirect('http://umahz.test/clinics/register');
        $response->assertSessionHas('umahz_ref', $code);
        $response->assertCookie('umahz_ref', $code);
    }

    public function test_referral_discount_coupon_calculation(): void
    {
        $service = app(ReferralService::class);

        $plan = Plan::create([
            'name' => 'Essential',
            'slug' => 'basic',
            'is_active' => true,
        ]);
        $plan->prices()->create([
            'interval' => 'month',
            'base_price' => 35.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => false,
        ]);
        $plan->prices()->create([
            'interval' => 'year',
            'base_price' => 390.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => false,
        ]);

        $monthlyCoupon = $service->createReferralDiscountCoupon($plan, 'month');
        $annualCoupon = $service->createReferralDiscountCoupon($plan, 'year');

        $this->assertNotNull($monthlyCoupon);
        $this->assertNotNull($annualCoupon);
    }

    public function test_record_signup_referral_creates_pending_referral_and_audit(): void
    {
        $service = app(ReferralService::class);

        $referrer = Tenant::create([
            'name' => 'Referrer Clinic',
            'slug' => 'referrer',
            'subdomain' => 'referrer',
        ]);

        $newClinic = Tenant::create([
            'name' => 'Referred Clinic',
            'slug' => 'referred',
            'subdomain' => 'referred',
        ]);

        $referral = $service->recordSignupReferral($newClinic, $referrer->referral_code);

        $this->assertNotNull($referral);
        $this->assertSame(Referral::STATUS_PENDING, $referral->status);
        $this->assertSame($referrer->id, $referral->referrer_tenant_id);
        $this->assertSame($newClinic->id, $referral->referred_tenant_id);
        $this->assertSame($referrer->id, $newClinic->refresh()->referred_by_tenant_id);

        // Check audit event
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $newClinic->id,
            'action' => 'referral.created',
            'resource_id' => $referral->id,
        ]);
    }

    public function test_self_referral_is_prevented(): void
    {
        $service = app(ReferralService::class);

        $clinic = Tenant::create([
            'name' => 'Solo Clinic',
            'slug' => 'solo',
            'subdomain' => 'solo',
        ]);

        $referral = $service->recordSignupReferral($clinic, $clinic->referral_code);

        $this->assertNull($referral);
        $this->assertNull($clinic->refresh()->referred_by_tenant_id);
    }

    public function test_invoice_paid_webhook_qualifies_and_rewards_referral_idempotently(): void
    {
        $service = app(ReferralService::class);

        $referrer = Tenant::create([
            'name' => 'Host Clinic',
            'slug' => 'host',
            'subdomain' => 'host',
        ]);
        $referrer->forceFill(['stripe_id' => 'cus_demo_host_clinic'])->save();

        $referred = Tenant::create([
            'name' => 'Invited Clinic',
            'slug' => 'invited',
            'subdomain' => 'invited',
            'referred_by_tenant_id' => $referrer->id,
        ]);
        $referred->forceFill(['stripe_id' => 'cus_invited_test_123'])->save();

        $referral = Referral::create([
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $referred->id,
            'referral_code' => $referrer->referral_code,
            'status' => Referral::STATUS_PENDING,
            'reward_mode' => 'fixed',
        ]);

        // Trigger invoice.payment_succeeded webhook for invited clinic
        $this->sendStripeWebhook('invoice.payment_succeeded', [
            'id' => 'in_first_invoice_paid_123',
            'customer' => 'cus_invited_test_123',
            'amount_paid' => 3500,
        ])->assertOk();

        $referral->refresh();
        $this->assertSame(Referral::STATUS_REWARDED, $referral->status);
        $this->assertSame(35.00, (float) $referral->reward_amount);
        $this->assertNotNull($referral->rewarded_at);
        $this->assertNotNull($referral->stripe_balance_txn_id);

        $firstRewardedAt = $referral->rewarded_at;

        // Idempotency check: trigger again
        $this->sendStripeWebhook('invoice.payment_succeeded', [
            'id' => 'in_first_invoice_paid_123',
            'customer' => 'cus_invited_test_123',
            'amount_paid' => 3500,
        ])->assertOk();

        $referral->refresh();
        $this->assertSame($firstRewardedAt->toDateTimeString(), $referral->rewarded_at->toDateTimeString());
    }

    public function test_admin_can_view_referrals_and_change_settings(): void
    {
        $admin = $this->createAdminUser();

        $referrer = Tenant::create([
            'name' => 'Clinic One',
            'slug' => 'clinic-one',
            'subdomain' => 'clinic-one',
        ]);
        $referred = Tenant::create([
            'name' => 'Clinic Two',
            'slug' => 'clinic-two',
            'subdomain' => 'clinic-two',
        ]);

        Referral::create([
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $referred->id,
            'referral_code' => $referrer->referral_code,
            'status' => Referral::STATUS_PENDING,
        ]);

        // Admin index
        $res = $this->actingAs($admin)->get('http://umahz.test/admin/referrals');
        $res->assertOk();

        // Update settings
        $settingsRes = $this->actingAs($admin)->post('http://umahz.test/admin/referrals/settings', [
            'enabled' => true,
            'new_clinic_discount_percent' => 50,
            'referrer_reward_mode' => 'plan_price',
            'referrer_fixed_amount' => 40.00,
        ]);

        $settingsRes->assertRedirect();
        $this->assertSame('plan_price', PlatformSetting::get('referrals.referrer_reward_mode'));
        $this->assertSame(40.0, (float) PlatformSetting::get('referrals.referrer_fixed_amount'));
    }

    public function test_admin_can_manually_reward_and_cancel_referral(): void
    {
        $admin = $this->createAdminUser();

        $referrer = Tenant::create([
            'name' => 'Clinic A',
            'slug' => 'clinic-a',
            'subdomain' => 'clinic-a',
        ]);
        $referrer->forceFill(['stripe_id' => 'cus_demo_clinic_a'])->save();

        $referred = Tenant::create([
            'name' => 'Clinic B',
            'slug' => 'clinic-b',
            'subdomain' => 'clinic-b',
        ]);
        $referred->forceFill(['stripe_id' => 'cus_demo_clinic_b'])->save();

        $referral = Referral::create([
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $referred->id,
            'referral_code' => $referrer->referral_code,
            'status' => Referral::STATUS_PENDING,
            'reward_mode' => 'fixed',
        ]);

        // Manual reward
        $rewardRes = $this->actingAs($admin)->post("http://umahz.test/admin/referrals/{$referral->id}/reward");
        $rewardRes->assertRedirect();

        $referral->refresh();
        $this->assertSame(Referral::STATUS_REWARDED, $referral->status);

        // Cancel test on another referral
        $referred2 = Tenant::create([
            'name' => 'Clinic C',
            'slug' => 'clinic-c',
            'subdomain' => 'clinic-c',
        ]);
        $referral2 = Referral::create([
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $referred2->id,
            'referral_code' => $referrer->referral_code,
            'status' => Referral::STATUS_PENDING,
        ]);

        $cancelRes = $this->actingAs($admin)->post("http://umahz.test/admin/referrals/{$referral2->id}/cancel", [
            'reason' => 'Duplicate clinic application',
        ]);
        $cancelRes->assertRedirect();

        $referral2->refresh();
        $this->assertSame(Referral::STATUS_CANCELLED, $referral2->status);
        $this->assertSame('Duplicate clinic application', $referral2->cancellation_reason);
    }

    public function test_program_disabled_ignores_referral_codes(): void
    {
        PlatformSetting::set('referrals.enabled', false, 'billing');
        PlatformSetting::clearCache();

        $service = app(ReferralService::class);
        $this->assertFalse($service->isEnabled());

        $referrer = Tenant::create([
            'name' => 'Host 2',
            'slug' => 'host-2',
            'subdomain' => 'host-2',
        ]);
        $newClinic = Tenant::create([
            'name' => 'New 2',
            'slug' => 'new-2',
            'subdomain' => 'new-2',
        ]);

        $referral = $service->recordSignupReferral($newClinic, $referrer->referral_code);
        $this->assertNull($referral);
    }

    public function test_clinic_owner_sees_referrals_on_billing_page(): void
    {
        [$owner, $tenant] = $this->createClinicOwner('Apex Health', 'apex');

        $referred = Tenant::create([
            'name' => 'Beacon Health',
            'slug' => 'beacon',
            'subdomain' => 'beacon',
        ]);

        Referral::create([
            'referrer_tenant_id' => $tenant->id,
            'referred_tenant_id' => $referred->id,
            'referral_code' => $tenant->referral_code,
            'status' => Referral::STATUS_REWARDED,
            'reward_amount' => 35.00,
            'rewarded_at' => now(),
        ]);

        $response = $this->actingAs($owner)->get("http://{$tenant->subdomain}.umahz.test/app/billing");
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/Billing')
            ->has('referrals', fn ($ref) => $ref
                ->where('enabled', true)
                ->where('code', $tenant->referral_code)
                ->where('total_referred', 1)
                ->where('qualified_count', 1)
                ->where('rewards_earned_total', 35)
                ->has('list', 1)
                ->etc()
            )
        );
    }
}

