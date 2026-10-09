<?php

namespace Tests\Feature;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\AddOn;
use App\Models\AuditEvent;
use App\Models\Feature;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\PlatformSetting;
use App\Models\PromoCode;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\TenantAddOn;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPlatformManagementTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billingFake;

    protected function setUp(): void
    {
        parent::setUp();

        $this->billingFake = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billingFake);
    }

    private function createAdmin(): User
    {
        $hq = Tenant::create([
            'name' => 'HQ Platform',
            'slug' => 'hq',
            'subdomain' => 'hq',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $user = User::factory()->create([
            'email_verified_at' => now(),
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

    private function createClinicStaff(string $role = StaffMembership::ROLE_CLINIC_OWNER, string $subdomain = 'downtown'): array
    {
        $clinic = Tenant::create([
            'name' => 'Downtown Wellness',
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'practice',
        ]);

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$user, $clinic];
    }

    public function test_clinic_staff_and_unauthorized_users_get_403_on_admin_routes(): void
    {
        [$clinicOwner, $clinic] = $this->createClinicStaff(StaffMembership::ROLE_CLINIC_OWNER, 'downtown-owner');
        [$practitioner] = $this->createClinicStaff(StaffMembership::ROLE_PRACTITIONER, 'downtown-practitioner');

        $adminRoutes = [
            ['GET', 'http://umahz.test/admin/plans'],
            ['GET', 'http://umahz.test/admin/features'],
            ['GET', 'http://umahz.test/admin/addons'],
            ['GET', 'http://umahz.test/admin/promo-codes'],
            ['GET', 'http://umahz.test/admin/audit-logs'],
            ['GET', "http://umahz.test/admin/clinics/{$clinic->id}/billing"],
        ];

        foreach ($adminRoutes as [$method, $url]) {
            // Clinic Owner must receive 403
            $this->actingAs($clinicOwner)->json($method, $url)->assertStatus(403);

            // Practitioner must receive 403
            $this->actingAs($practitioner)->json($method, $url)->assertStatus(403);
        }

        // Platform Admin receives 200
        $admin = $this->createAdmin();
        $this->actingAs($admin)->get('http://umahz.test/admin/plans')->assertOk();
        $this->actingAs($admin)->get('http://umahz.test/admin/features')->assertOk();
        $this->actingAs($admin)->get('http://umahz.test/admin/addons')->assertOk();
        $this->actingAs($admin)->get('http://umahz.test/admin/promo-codes')->assertOk();
        $this->actingAs($admin)->get('http://umahz.test/admin/audit-logs')->assertOk();
        $this->actingAs($admin)->get("http://umahz.test/admin/clinics/{$clinic->id}/billing")->assertOk();
    }

    public function test_admin_can_create_plan_and_sync_stripe(): void
    {
        $admin = $this->createAdmin();

        $feature = Feature::create([
            'key' => 'telehealth_video',
            'name' => 'Telehealth Video Calls',
            'category' => 'communication',
            'is_implemented' => true,
        ]);

        $payload = [
            'name' => 'Elite Growth',
            'tagline' => 'For fast-growing clinics',
            'description' => 'Comprehensive multi-disciplinary clinic plan.',
            'badge' => 'Recommended',
            'display_order' => 10,
            'is_active' => true,
            'trial_days' => 14,
            'monthly_base_price' => 199.00,
            'annual_base_price' => 1990.00,
            'included_practitioners' => 2,
            'max_practitioners' => 10,
            'allows_extra_practitioners' => true,
            'monthly_extra_seat_price' => 59.00,
            'annual_extra_seat_price' => 590.00,
            'appointment_limit_monthly' => 500,
            'appointment_limit_behavior' => 'warn',
            'location_limit' => 3,
            'scribe_allowance_unit' => 'minutes',
            'scribe_allowance_amount' => 600,
            'scribe_limit_behavior' => 'warn',
            'feature_ids' => [$feature->id],
        ];

        $response = $this->actingAs($admin)->post('http://umahz.test/admin/plans', $payload);
        $response->assertSessionHasNoErrors();

        $plan = Plan::where('slug', 'elite-growth')->firstOrFail();
        $this->assertSame('Elite Growth', $plan->name);
        $this->assertSame(2, $plan->included_practitioners);
        $this->assertSame(10, $plan->max_practitioners);
        $this->assertSame(500, $plan->appointment_limit_monthly);

        // Verify active prices
        $monthlyPrice = $plan->monthlyPrice;
        $this->assertNotNull($monthlyPrice);
        $this->assertEquals(199.00, (float) $monthlyPrice->base_price);
        $this->assertEquals(59.00, (float) $monthlyPrice->extra_practitioner_price);
        $this->assertNotNull($monthlyPrice->stripe_base_price_id);

        $annualPrice = $plan->annualPrice;
        $this->assertNotNull($annualPrice);
        $this->assertEquals(1990.00, (float) $annualPrice->base_price);

        // Verify AuditEvent
        $this->assertDatabaseHas('audit_events', [
            'action' => 'plan.created',
            'resource_id' => $plan->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_saving_plan_clears_needs_review_fields(): void
    {
        $admin = $this->createAdmin();

        $plan = Plan::create([
            'name' => 'Reviewed Plan',
            'slug' => 'reviewed-plan',
            'tagline' => 'Needs review',
            'included_practitioners' => 1,
            'is_active' => true,
            'needs_review' => true,
            'needs_review_fields' => ['appointment_limit_monthly', 'location_limit', 'scribe_allowance_amount'],
        ]);

        $monthlyPrice = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'base_price' => 99.00,
            'extra_practitioner_price' => 39.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => true,
            'needs_review_fields' => ['extra_practitioner_price'],
        ]);

        $annualPrice = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'year',
            'base_price' => 990.00,
            'extra_practitioner_price' => 390.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => false,
        ]);

        $payload = [
            'name' => 'Reviewed Plan',
            'tagline' => 'Reviewed and confirmed',
            'description' => 'Now confirmed',
            'badge' => '',
            'display_order' => 1,
            'is_active' => true,
            'trial_days' => 14,
            'monthly_base_price' => 99.00,
            'annual_base_price' => 990.00,
            'included_practitioners' => 1,
            'max_practitioners' => null,
            'allows_extra_practitioners' => true,
            'monthly_extra_seat_price' => 45.00,
            'annual_extra_seat_price' => 450.00,
            'appointment_limit_monthly' => 300,
            'appointment_limit_behavior' => 'block',
            'location_limit' => 2,
            'scribe_allowance_unit' => 'minutes',
            'scribe_allowance_amount' => 400,
            'scribe_limit_behavior' => 'block',
            'feature_ids' => [],
        ];

        $response = $this->actingAs($admin)->put("http://umahz.test/admin/plans/{$plan->id}", $payload);
        $response->assertSessionHasNoErrors();

        $plan->refresh();
        $this->assertFalse($plan->needs_review);
        $this->assertEmpty($plan->needs_review_fields);

        // Verify AuditEvent
        $this->assertDatabaseHas('audit_events', [
            'action' => 'plan.updated',
            'resource_id' => $plan->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_price_change_creates_new_stripe_price_and_grandfathers_existing_subscribers(): void
    {
        $admin = $this->createAdmin();

        $plan = Plan::create([
            'name' => 'Standard Clinic',
            'slug' => 'standard-clinic',
            'included_practitioners' => 1,
            'is_active' => true,
        ]);

        $oldMonthly = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'base_price' => 99.00,
            'extra_practitioner_price' => 49.00,
            'currency' => 'CAD',
            'is_active' => true,
            'is_grandfathered' => false,
            'stripe_base_price_id' => 'price_old_monthly_123',
        ]);

        $oldAnnual = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'year',
            'base_price' => 990.00,
            'extra_practitioner_price' => 490.00,
            'currency' => 'CAD',
            'is_active' => true,
            'is_grandfathered' => false,
            'stripe_base_price_id' => 'price_old_annual_123',
        ]);

        // Tenant subscribed to old price
        $tenant = Tenant::create([
            'name' => 'Evergreen Health',
            'slug' => 'evergreen',
            'subdomain' => 'evergreen',
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $plan->id,
            'plan_tier' => $plan->slug,
            'plan_price_id' => $oldMonthly->id,
            'billing_interval' => 'month',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'stripe_id' => 'cus_evergreen_123',
            'stripe_subscription_id' => 'sub_evergreen_123',
        ]);

        // Admin updates price to 129/mo and 1290/yr
        $payload = [
            'name' => 'Standard Clinic',
            'tagline' => 'Price updated',
            'description' => 'Updated price plan',
            'badge' => '',
            'display_order' => 1,
            'is_active' => true,
            'trial_days' => 14,
            'monthly_base_price' => 129.00,
            'annual_base_price' => 1290.00,
            'included_practitioners' => 1,
            'max_practitioners' => null,
            'allows_extra_practitioners' => true,
            'monthly_extra_seat_price' => 59.00,
            'annual_extra_seat_price' => 590.00,
            'appointment_limit_monthly' => null,
            'appointment_limit_behavior' => 'warn',
            'location_limit' => null,
            'scribe_allowance_unit' => 'minutes',
            'scribe_allowance_amount' => null,
            'scribe_limit_behavior' => 'warn',
            'feature_ids' => [],
        ];

        $this->actingAs($admin)->put("http://umahz.test/admin/plans/{$plan->id}", $payload)->assertSessionHasNoErrors();

        // 1. Old monthly price is archived / grandfathered
        $oldMonthly->refresh();
        $this->assertTrue((bool) $oldMonthly->is_grandfathered);
        $this->assertFalse((bool) $oldMonthly->is_active);

        // 2. New active price created
        $plan->refresh();
        $newMonthly = $plan->monthlyPrice;
        $this->assertNotSame($oldMonthly->id, $newMonthly->id);
        $this->assertEquals(129.00, (float) $newMonthly->base_price);
        $this->assertTrue((bool) $newMonthly->is_active);
        $this->assertFalse((bool) $newMonthly->is_grandfathered);

        // 3. Existing tenant keeps old grandfathered price
        $tenant->refresh();
        $this->assertSame($oldMonthly->id, $tenant->plan_price_id);
    }

    public function test_migrate_subscribers_moves_subscribers_to_new_price(): void
    {
        $admin = $this->createAdmin();

        $plan = Plan::create([
            'name' => 'Standard Clinic',
            'slug' => 'standard-clinic',
            'included_practitioners' => 1,
            'is_active' => true,
        ]);

        $oldMonthly = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'base_price' => 99.00,
            'extra_practitioner_price' => 49.00,
            'currency' => 'CAD',
            'is_active' => false,
            'is_grandfathered' => true,
        ]);

        $newMonthly = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'base_price' => 129.00,
            'extra_practitioner_price' => 59.00,
            'currency' => 'CAD',
            'is_active' => true,
            'is_grandfathered' => false,
        ]);

        $tenant = Tenant::create([
            'name' => 'Evergreen Health',
            'slug' => 'evergreen',
            'subdomain' => 'evergreen',
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $plan->id,
            'plan_tier' => $plan->slug,
            'plan_price_id' => $oldMonthly->id,
            'billing_interval' => 'month',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
        ]);

        // Move subscribers to new price
        $response = $this->actingAs($admin)->post("http://umahz.test/admin/plans/{$plan->id}/migrate-subscribers");
        $response->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertSame($newMonthly->id, $tenant->plan_price_id);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'subscriber.price_migrated',
            'tenant_id' => $tenant->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_cannot_delete_plan_with_subscribers_must_deactivate(): void
    {
        $admin = $this->createAdmin();

        $plan = Plan::create([
            'name' => 'Active Plan with Subscribers',
            'slug' => 'active-sub-plan',
            'included_practitioners' => 1,
            'is_active' => true,
        ]);

        Tenant::create([
            'name' => 'Subscriber Clinic',
            'slug' => 'sub-clinic',
            'subdomain' => 'sub-clinic',
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $plan->id,
            'plan_tier' => $plan->slug,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
        ]);

        // Attempting to delete must fail with validation error
        $response = $this->actingAs($admin)->delete("http://umahz.test/admin/plans/{$plan->id}");
        $response->assertSessionHasErrors(['plan']);

        $this->assertNotNull(Plan::find($plan->id));

        // Admin deactivates it instead
        $plan->update(['is_active' => false]);
        $this->assertFalse($plan->fresh()->is_active);
    }

    public function test_features_management_crud_and_implementation_flag(): void
    {
        $admin = $this->createAdmin();

        // 1. Create feature
        $createPayload = [
            'key' => 'advanced_ai_insights',
            'name' => 'Advanced AI Insights',
            'description' => 'Predictive health trends',
            'category' => 'advanced',
            'is_implemented' => false,
        ];

        $this->actingAs($admin)->post('http://umahz.test/admin/features', $createPayload)->assertSessionHasNoErrors();

        $feature = Feature::where('key', 'advanced_ai_insights')->firstOrFail();
        $this->assertFalse((bool) $feature->is_implemented);

        // 2. Update feature to implemented
        $updatePayload = [
            'name' => 'Advanced AI Insights V2',
            'description' => 'Now live and ready',
            'category' => 'advanced',
            'is_implemented' => true,
        ];

        $this->actingAs($admin)->put("http://umahz.test/admin/features/{$feature->id}", $updatePayload)->assertSessionHasNoErrors();

        $feature->refresh();
        $this->assertSame('Advanced AI Insights V2', $feature->name);
        $this->assertTrue((bool) $feature->is_implemented);

        // 3. Delete feature
        $this->actingAs($admin)->delete("http://umahz.test/admin/features/{$feature->id}")->assertSessionHasNoErrors();
        $this->assertNull(Feature::find($feature->id));
    }

    public function test_addons_management_crud_and_pricing_updates(): void
    {
        $admin = $this->createAdmin();

        $createPayload = [
            'name' => 'Voice Reminders',
            'slug' => 'voice-reminders',
            'pricing_type' => 'flat_monthly',
            'price_monthly' => 19.00,
            'price_annual' => 190.00,
            'description' => 'Automated phone calls for appointments',
            'is_active' => true,
        ];

        $this->actingAs($admin)->post('http://umahz.test/admin/addons', $createPayload)->assertSessionHasNoErrors();

        $addon = AddOn::where('slug', 'voice-reminders')->firstOrFail();
        $this->assertEquals(19.00, (float) $addon->price_monthly);

        // Sync Stripe
        $this->actingAs($admin)->post("http://umahz.test/admin/addons/{$addon->id}/sync-stripe")->assertSessionHasNoErrors();
        $addon->refresh();
        $this->assertNotNull($addon->stripe_product_id);
    }

    public function test_promo_code_create_deactivate_and_redemptions_view(): void
    {
        $admin = $this->createAdmin();

        $plan = Plan::create([
            'name' => 'Standard Plan',
            'slug' => 'standard',
            'included_practitioners' => 1,
            'is_active' => true,
        ]);

        $payload = [
            'code' => 'SAVE30',
            'discount_type' => 'percent',
            'discount_value' => 30.00,
            'duration' => 'repeating',
            'duration_in_months' => 6,
            'max_redemptions' => 50,
            'plan_ids' => [$plan->id],
        ];

        $this->actingAs($admin)->post('http://umahz.test/admin/promo-codes', $payload)->assertSessionHasNoErrors();

        $promo = PromoCode::where('code', 'SAVE30')->firstOrFail();
        $this->assertEquals(30.00, (float) $promo->discount_value);
        $this->assertTrue($promo->is_active);

        // Deactivate promo code (Stripe immutability requirement)
        $this->actingAs($admin)->post("http://umahz.test/admin/promo-codes/{$promo->id}/deactivate")->assertSessionHasNoErrors();
        $this->assertFalse($promo->fresh()->is_active);

        // View redemptions page
        $this->actingAs($admin)->get("http://umahz.test/admin/promo-codes/{$promo->id}/redemptions")->assertOk();
    }

    public function test_clinic_billing_inspector_overrides_plan_promo_and_grace_period(): void
    {
        $admin = $this->createAdmin();

        $planA = Plan::create(['name' => 'Plan A', 'slug' => 'plan-a', 'included_practitioners' => 1, 'is_active' => true]);
        PlanPrice::create(['plan_id' => $planA->id, 'interval' => 'month', 'base_price' => 50, 'is_active' => true]);

        $planB = Plan::create(['name' => 'Plan B', 'slug' => 'plan-b', 'included_practitioners' => 2, 'is_active' => true]);
        $planBPrice = PlanPrice::create(['plan_id' => $planB->id, 'interval' => 'month', 'base_price' => 100, 'is_active' => true]);

        $promo = PromoCode::create([
            'code' => 'DISCOUNT50',
            'discount_type' => 'percent',
            'discount_value' => 50.00,
            'duration' => 'once',
            'is_active' => true,
        ]);

        $tenant = Tenant::create([
            'name' => 'Override Clinic',
            'slug' => 'override-clinic',
            'subdomain' => 'override-clinic',
            'status' => Tenant::STATUS_APPROVED,
            'plan_id' => $planA->id,
            'plan_tier' => $planA->slug,
            'billing_interval' => 'month',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
        ]);

        // 1. Change Plan Override with Reason
        $changePlanPayload = [
            'plan_id' => $planB->id,
            'billing_interval' => 'month',
            'reason' => 'Customer requested upgrade during account manager call',
        ];

        $this->actingAs($admin)->post("http://umahz.test/admin/clinics/{$tenant->id}/billing/change-plan", $changePlanPayload)
            ->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertSame($planB->id, $tenant->plan_id);
        $this->assertSame($planBPrice->id, $tenant->plan_price_id);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'clinic_billing.plan_changed',
            'tenant_id' => $tenant->id,
            'user_id' => $admin->id,
        ]);

        // 2. Apply Promo Override with Reason
        $applyPromoPayload = [
            'promo_code' => 'DISCOUNT50',
            'reason' => 'Granted promotional rebate as compensation for outage',
        ];

        $this->actingAs($admin)->post("http://umahz.test/admin/clinics/{$tenant->id}/billing/apply-promo", $applyPromoPayload)
            ->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertSame('DISCOUNT50', $tenant->applied_promo_code);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'clinic_billing.promo_applied',
            'tenant_id' => $tenant->id,
            'user_id' => $admin->id,
        ]);

        // 3. Extend Grace Period with Reason
        $extendGracePayload = [
            'days' => 14,
            'reason' => 'Clinic card replaced, waiting for new physical card delivery',
        ];

        $this->actingAs($admin)->post("http://umahz.test/admin/clinics/{$tenant->id}/billing/extend-grace", $extendGracePayload)
            ->assertSessionHasNoErrors();

        $tenant->refresh();
        $this->assertNotNull($tenant->grace_period_ends_at);
        $this->assertTrue($tenant->grace_period_ends_at->isFuture());

        $this->assertDatabaseHas('audit_events', [
            'action' => 'clinic_billing.grace_period_extended',
            'tenant_id' => $tenant->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_platform_billing_settings_update(): void
    {
        $admin = $this->createAdmin();

        $payload = [
            'platform_name' => 'UMAHZ Central',
            'support_email' => 'billing@umahz.com',
            'contact_phone' => '+1 (555) 999-8888',
            'default_currency' => 'CAD',
            'default_timezone' => 'America/Toronto',
            'require_admin_approval' => true,
            'allow_self_registration' => true,
            'require_license_document' => true,
            'trial_period_days' => 30,
            'enforce_2fa_staff' => true,
            'session_timeout_minutes' => 60,
            'max_failed_login_attempts' => 5,
            'system_announcement' => 'Welcome to Phase 5',
            'show_announcement' => true,

            // Billing settings
            'grace_period_days' => 10,
            'stripe_automatic_tax' => true,
            'default_appointment_limit_behavior' => 'block',
            'default_scribe_limit_behavior' => 'warn',
            'default_location_limit_behavior' => 'block',
        ];

        $response = $this->actingAs($admin)->post('http://umahz.test/admin/settings', $payload);
        $response->assertSessionHasNoErrors();

        $this->assertEquals(10, PlatformSetting::get('grace_period_days'));
        $this->assertTrue((bool) PlatformSetting::get('stripe_automatic_tax'));
        $this->assertSame('block', PlatformSetting::get('default_appointment_limit_behavior'));

        $this->assertDatabaseHas('audit_events', [
            'action' => 'platform_settings.updated',
            'user_id' => $admin->id,
        ]);
    }
}
