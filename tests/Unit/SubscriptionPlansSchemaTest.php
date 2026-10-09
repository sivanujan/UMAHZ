<?php

namespace Tests\Unit;

use App\Models\AddOn;
use App\Models\Feature;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\PromoCode;
use App\Models\Tenant;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubscriptionPlansSchemaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
    }

    public function test_seed_plans_exist_with_correct_cadence_and_prices(): void
    {
        $essential = Plan::where('slug', 'essential')->firstOrFail();
        $this->assertSame('Essential', $essential->name);
        $this->assertSame(1, $essential->included_practitioners);
        $this->assertSame(1, $essential->max_practitioners);
        $this->assertFalse($essential->allows_extra_practitioners);
        $this->assertSame(50, $essential->appointment_limit_monthly);
        $this->assertSame('warn', $essential->appointment_limit_behavior);
        $this->assertSame(1, $essential->location_limit);
        $this->assertSame('minutes', $essential->scribe_allowance_unit);

        $essentialMonth = $essential->monthlyPrice;
        $this->assertNotNull($essentialMonth);
        $this->assertEquals('39.00', $essentialMonth->base_price);
        $this->assertEquals('0.00', $essentialMonth->extra_practitioner_price);

        $essentialYear = $essential->annualPrice;
        $this->assertNotNull($essentialYear);
        $this->assertEquals('390.00', $essentialYear->base_price);
        $this->assertEquals('0.00', $essentialYear->extra_practitioner_price);

        $pro = Plan::where('slug', 'professional')->firstOrFail();
        $this->assertSame('Professional', $pro->name);
        $this->assertSame(1, $pro->included_practitioners);
        $this->assertNull($pro->max_practitioners);
        $this->assertTrue($pro->allows_extra_practitioners);
        $this->assertNull($pro->appointment_limit_monthly);
        $this->assertSame(3, $pro->location_limit); // Placeholder 3 per requirement

        $proMonth = $pro->monthlyPrice;
        $this->assertEquals('69.00', $proMonth->base_price);
        $this->assertEquals('35.00', $proMonth->extra_practitioner_price);

        $proYear = $pro->annualPrice;
        $this->assertEquals('690.00', $proYear->base_price);
        $this->assertEquals('350.00', $proYear->extra_practitioner_price);

        $sig = Plan::where('slug', 'signature')->firstOrFail();
        $this->assertSame('Signature', $sig->name);
        $this->assertSame(3, $sig->included_practitioners);
        $this->assertNull($sig->max_practitioners);
        $this->assertTrue($sig->allows_extra_practitioners);
        $this->assertNull($sig->appointment_limit_monthly);
        $this->assertNull($sig->location_limit); // Unlimited locations

        $sigMonth = $sig->monthlyPrice;
        $this->assertEquals('90.00', $sigMonth->base_price);
        $this->assertEquals('30.00', $sigMonth->extra_practitioner_price);

        $sigYear = $sig->annualPrice;
        $this->assertEquals('900.00', $sigYear->base_price);
        $this->assertEquals('300.00', $sigYear->extra_practitioner_price);
    }

    public function test_needs_review_flags_and_placeholders_are_present(): void
    {
        $essential = Plan::where('slug', 'essential')->firstOrFail();
        $this->assertTrue($essential->needs_review);
        $this->assertSame(['scribe_allowance_amount'], $essential->needs_review_fields);
        $this->assertFalse($essential->monthlyPrice->needs_review);
        $this->assertNull($essential->monthlyPrice->needs_review_fields);
        $this->assertFalse($essential->annualPrice->needs_review);
        $this->assertNull($essential->annualPrice->needs_review_fields);

        $pro = Plan::where('slug', 'professional')->firstOrFail();
        $this->assertTrue($pro->needs_review);
        $this->assertEqualsCanonicalizing(['location_limit', 'scribe_allowance_amount'], $pro->needs_review_fields);
        $this->assertSame(3, $pro->location_limit);
        $this->assertTrue($pro->monthlyPrice->needs_review);
        $this->assertSame(['extra_practitioner_price'], $pro->monthlyPrice->needs_review_fields);
        $this->assertTrue($pro->annualPrice->needs_review);
        $this->assertSame(['extra_practitioner_price'], $pro->annualPrice->needs_review_fields);

        $sig = Plan::where('slug', 'signature')->firstOrFail();
        $this->assertTrue($sig->needs_review);
        $this->assertSame(['scribe_allowance_amount'], $sig->needs_review_fields);
        $this->assertNull($sig->location_limit);
        $this->assertTrue($sig->monthlyPrice->needs_review);
        $this->assertSame(['extra_practitioner_price'], $sig->monthlyPrice->needs_review_fields);
        $this->assertTrue($sig->annualPrice->needs_review);
        $this->assertSame(['extra_practitioner_price'], $sig->annualPrice->needs_review_fields);

        $scribePlus = AddOn::where('slug', 'scribe_plus')->firstOrFail();
        $this->assertEquals('15.00', $scribePlus->price_monthly);
        $this->assertEquals('150.00', $scribePlus->price_annual);
        $this->assertTrue($scribePlus->needs_review);
        $this->assertSame(['price_annual'], $scribePlus->needs_review_fields);
    }

    public function test_seeder_does_not_overwrite_admin_edits_when_rerun(): void
    {
        // 1. Simulate admin editing a plan
        $pro = Plan::where('slug', 'professional')->firstOrFail();
        $pro->update([
            'name' => 'Professional Custom',
            'location_limit' => 5,
            'needs_review' => false,
            'needs_review_fields' => null,
        ]);

        // 2. Simulate admin editing a plan price
        $proMonth = $pro->monthlyPrice;
        $proMonth->update([
            'base_price' => 75.00,
            'extra_practitioner_price' => 40.00,
            'needs_review' => false,
            'needs_review_fields' => null,
        ]);

        // 3. Simulate admin editing an add-on
        $scribePlus = AddOn::where('slug', 'scribe_plus')->firstOrFail();
        $scribePlus->update([
            'price_annual' => 165.00,
            'needs_review' => false,
            'needs_review_fields' => null,
        ]);

        // 4. Re-run seeder (as would happen during a deployment)
        $this->seed(SubscriptionPlansSeeder::class);

        // 5. Assert all admin custom values were preserved and NOT overwritten
        $freshPro = $pro->fresh();
        $this->assertSame('Professional Custom', $freshPro->name);
        $this->assertSame(5, $freshPro->location_limit);
        $this->assertFalse($freshPro->needs_review);
        $this->assertNull($freshPro->needs_review_fields);

        $freshMonth = $proMonth->fresh();
        $this->assertEquals('75.00', $freshMonth->base_price);
        $this->assertEquals('40.00', $freshMonth->extra_practitioner_price);
        $this->assertFalse($freshMonth->needs_review);

        $freshAddOn = $scribePlus->fresh();
        $this->assertEquals('165.00', $freshAddOn->price_annual);
        $this->assertFalse($freshAddOn->needs_review);
    }

    public function test_feature_matrix_is_configured_correctly_per_client_plan_list(): void
    {
        $essential = Plan::where('slug', 'essential')->firstOrFail();
        $pro = Plan::where('slug', 'professional')->firstOrFail();
        $sig = Plan::where('slug', 'signature')->firstOrFail();

        // 1. Basic features enabled on all 3 plans
        foreach ([
            'online_booking',
            'client_management',
            'intake_custom_forms',
            'consent_signatures',
            'clinical_notes',
            'billing_invoices',
            'basic_reporting',
            'client_portal',
            'website_builder',
        ] as $basicFeature) {
            $this->assertTrue($essential->hasFeature($basicFeature), "Essential should have {$basicFeature}");
            $this->assertTrue($pro->hasFeature($basicFeature), "Professional should have {$basicFeature}");
            $this->assertTrue($sig->hasFeature($basicFeature), "Signature should have {$basicFeature}");
        }

        // Essential does NOT have automation; automation starts at Professional
        $this->assertFalse($essential->hasFeature('automation'), 'Essential should NOT have automation');
        $this->assertTrue($pro->hasFeature('automation'), 'Professional should have automation');
        $this->assertTrue($sig->hasFeature('automation'), 'Signature should have automation');

        // 2. Pro & Signature only features (disabled on Essential)
        foreach ([
            'priority_support',
            'staff_receptionist_management',
            'rooms_resources',
            'advanced_scheduling',
            'advanced_financial_reporting',
        ] as $proFeature) {
            $this->assertFalse($essential->hasFeature($proFeature), "Essential should NOT have {$proFeature}");
            $this->assertTrue($pro->hasFeature($proFeature), "Professional should have {$proFeature}");
            $this->assertTrue($sig->hasFeature($proFeature), "Signature should have {$proFeature}");
        }

        // 3. Signature only features (disabled on Essential & Professional)
        foreach ([
            'advanced_roles',
            'advanced_analytics',
            'enhanced_website',
            'priority_onboarding',
            'data_migration',
        ] as $sigFeature) {
            $this->assertFalse($essential->hasFeature($sigFeature), "Essential should NOT have {$sigFeature}");
            $this->assertFalse($pro->hasFeature($sigFeature), "Professional should NOT have {$sigFeature}");
            $this->assertTrue($sig->hasFeature($sigFeature), "Signature should have {$sigFeature}");
        }
    }

    public function test_partial_unique_index_allows_archived_prices(): void
    {
        $plan = Plan::where('slug', 'essential')->firstOrFail();

        // Mark existing active price as inactive (archived)
        $currentMonth = $plan->monthlyPrice;
        $currentMonth->update(['is_active' => false]);

        // Creating a new active price works!
        $newActivePrice = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'currency' => 'CAD',
            'base_price' => 45.00,
            'extra_practitioner_price' => 0.00,
            'is_active' => true,
        ]);
        $this->assertNotNull($newActivePrice->id);

        // Multiple inactive prices for same plan & interval are allowed!
        $secondArchivedPrice = PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'currency' => 'CAD',
            'base_price' => 49.00,
            'extra_practitioner_price' => 0.00,
            'is_active' => false,
        ]);
        $this->assertNotNull($secondArchivedPrice->id);

        // Attempting to create a second ACTIVE price for same interval must fail unique index
        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
        PlanPrice::create([
            'plan_id' => $plan->id,
            'interval' => 'month',
            'currency' => 'CAD',
            'base_price' => 59.00,
            'extra_practitioner_price' => 0.00,
            'is_active' => true,
        ]);
    }

    public function test_tenant_and_pending_registration_relations_work(): void
    {
        $plan = Plan::where('slug', 'professional')->firstOrFail();
        $scribePlus = AddOn::where('slug', 'scribe_plus')->firstOrFail();

        $promo = PromoCode::create([
            'code' => 'TESTPROMO',
            'discount_type' => 'percent',
            'discount_value' => 20.00,
            'duration' => 'once',
            'is_active' => true,
        ]);
        $promo->plans()->attach($plan->id);
        $this->assertTrue($promo->isValidForPlan($plan->id));

        $tenant = Tenant::create([
            'name' => 'Test Clinic',
            'slug' => 'test-clinic-plans',
            'subdomain' => 'testclinicplans',
            'plan_id' => $plan->id,
            'billing_interval' => 'year',
            'promo_code_id' => $promo->id,
            'applied_promo_code' => 'TESTPROMO',
            'primary_contact_name' => 'Dr. Jane',
            'primary_contact_email' => 'jane@example.com',
            'primary_contact_phone' => '555-1234',
        ]);

        $this->assertSame($plan->id, $tenant->plan->id);
        $this->assertSame('TESTPROMO', $tenant->promoCode->code);
        $this->assertFalse($tenant->hasScribePlus());
        $this->assertFalse($tenant->isManuallySuspended());

        // Attach Scribe+ add-on
        $tenant->addOns()->attach($scribePlus->id, ['quantity' => 1, 'status' => 'active']);
        $this->assertTrue($tenant->hasScribePlus());

        // Test manual suspension flag (Correction 10)
        $tenant->update([
            'is_manually_suspended' => true,
            'manual_suspension_reason' => 'Terms of service violation',
        ]);
        $this->assertTrue($tenant->fresh()->isManuallySuspended());

        // Pending Registration relations
        $pending = PendingRegistration::create([
            'email' => 'applicant@example.com',
            'subdomain' => 'applicantclinic',
            'plan_id' => $plan->id,
            'billing_interval' => 'month',
            'promo_code_id' => $promo->id,
            'applied_promo_code' => 'TESTPROMO',
            'payload' => ['clinic_name' => 'Applicant Clinic'],
            'expires_at' => now()->addMinutes(30),
        ]);

        $this->assertSame($plan->id, $pending->plan->id);
        $this->assertSame('TESTPROMO', $pending->promoCode->code);
    }

    public function test_stripe_automatic_tax_platform_setting_defaults_to_off(): void
    {
        $setting = DB::table('platform_settings')->where('key', 'billing.stripe_automatic_tax')->first();
        $this->assertNotNull($setting);
        $val = json_decode($setting->value, true);
        $this->assertFalse($val['enabled'] ?? true);
    }

    public function test_plan_presenter_content_fixes_and_delta_computation(): void
    {
        $plans = Plan::with(['monthlyPrice', 'annualPrice', 'enabledFeatures'])
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();

        $presented = \App\Support\PlanPresenter::collectionForDisplay($plans);

        $this->assertCount(3, $presented);

        $essential = $presented[0];
        $pro = $presented[1];
        $sig = $presented[2];

        // 1. Limit lines at top of each card
        $this->assertSame('Essential', $essential['name']);
        $this->assertSame([
            'Up to 50 appointments/month',
            '1 location',
            'Standard support',
        ], $essential['limit_lines']);

        $this->assertSame('Professional', $pro['name']);
        $this->assertSame([
            'Unlimited appointments',
            'Multiple locations',
        ], $pro['limit_lines']);

        $this->assertSame('Signature', $sig['name']);
        $this->assertSame([
            'Unlimited appointments',
            'Unlimited locations',
        ], $sig['limit_lines']);

        // When admin confirms location limit on Professional (removes from needs_review_fields)
        $proPlanModel = Plan::where('slug', 'professional')->firstOrFail();
        $proPlanModel->needs_review_fields = ['scribe_allowance_amount']; // location_limit removed!
        $proPlanModel->save();

        $updatedPro = \App\Support\PlanPresenter::presentForDisplay($proPlanModel->fresh(['monthlyPrice', 'annualPrice', 'enabledFeatures']));
        $this->assertSame([
            'Unlimited appointments',
            'Up to 3 locations',
        ], $updatedPro['limit_lines']);

        // 2. Feature naming overrides
        $this->assertNotContains('Automation', $essential['features']);
        $this->assertContains('More automation', $pro['features']);
        $this->assertNotContains('Automation', $pro['features']);
        $this->assertContains('Advanced automation', $sig['features']);
        $this->assertNotContains('Automation', $sig['features']);

        // 3. "Everything in X, plus:" delta features
        $this->assertNull($essential['parent_tier_name']);
        $this->assertNotEmpty($essential['delta_features']);

        $this->assertSame('Essential', $pro['parent_tier_name']);
        $this->assertContains('More automation', $pro['delta_features']);
        $this->assertContains('Priority Support', $pro['delta_features']);
        $this->assertContains('Staff / Receptionist Management', $pro['delta_features']);
        $this->assertNotContains('Online Booking', $pro['delta_features']); // in Essential, so not in delta!

        $this->assertSame('Professional', $sig['parent_tier_name']);
        $this->assertContains('Advanced automation', $sig['delta_features']);
        $this->assertContains('Advanced Roles', $sig['delta_features']);
        $this->assertNotContains('Staff / Receptionist Management', $sig['delta_features']); // in Pro, so not in delta!
    }
}
