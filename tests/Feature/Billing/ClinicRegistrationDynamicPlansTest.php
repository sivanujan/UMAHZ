<?php

namespace Tests\Feature\Billing;

use App\Models\Plan;
use App\Models\PromoCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicRegistrationDynamicPlansTest extends TestCase
{
    use RefreshDatabase;

    public function test_validate_promo_code_returns_discount_breakdown(): void
    {
        $plan = Plan::create([
            'name' => 'Practice',
            'slug' => 'practice',
            'is_active' => true,
            'allows_extra_practitioners' => true,
        ]);
        $plan->prices()->create([
            'interval' => 'month',
            'base_price' => 79.00,
            'extra_practitioner_price' => 35.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => false,
        ]);

        $promo = PromoCode::create([
            'code' => 'WELCOME20',
            'discount_type' => 'percent',
            'discount_value' => 20,
            'is_active' => true,
        ]);

        $response = $this->postJson('http://umahz.test/clinics/register/validate-promo', [
            'promo_code' => 'welcome20',
            'plan_id' => $plan->id,
            'billing_interval' => 'month',
            'practitioners_count' => 1,
        ]);

        $response->assertOk();
        $response->assertJson([
            'valid' => true,
            'promo' => [
                'code' => 'WELCOME20',
            ],
            'breakdown' => [
                'base_price' => 79,
                'discount_amount' => 15.8,
                'total' => 63.2,
            ],
        ]);
    }

    public function test_validate_promo_code_returns_error_for_invalid_code(): void
    {
        $plan = Plan::create([
            'name' => 'Practice',
            'slug' => 'practice',
            'is_active' => true,
        ]);
        $plan->prices()->create([
            'interval' => 'month',
            'base_price' => 79.00,
            'extra_practitioner_price' => 35.00,
            'currency' => 'CAD',
            'is_active' => true,
            'needs_review' => false,
        ]);

        $response = $this->postJson('http://umahz.test/clinics/register/validate-promo', [
            'promo_code' => 'NONEXISTENT',
            'plan_id' => $plan->id,
            'billing_interval' => 'month',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'valid' => false,
            'reason' => 'That promo code is invalid.',
        ]);
    }

    public function test_pricing_page_renders_all_active_plans_and_masks_placeholder_review_fields(): void
    {
        $activePlan = Plan::create([
            'name' => 'Active Clinic Plan',
            'slug' => 'active-clinic',
            'is_active' => true,
            'display_order' => 1,
            'needs_review' => false,
            'allows_extra_practitioners' => true,
        ]);
        $activePlan->prices()->create([
            'interval' => 'month',
            'base_price' => 99.00,
            'extra_practitioner_price' => 40.00,
            'is_active' => true,
            'needs_review' => false,
            'currency' => 'CAD',
        ]);

        $placeholderPlan = Plan::create([
            'name' => 'Needs Review Plan',
            'slug' => 'needs-review-plan',
            'is_active' => true,
            'display_order' => 2,
            'needs_review' => true,
            'allows_extra_practitioners' => true,
            'needs_review_fields' => ['extra_practitioner_price', 'scribe_allowance_amount'],
        ]);
        $placeholderPlan->prices()->create([
            'interval' => 'month',
            'base_price' => 49.00,
            'extra_practitioner_price' => 0.00,
            'is_active' => true,
            'needs_review' => true,
            'currency' => 'CAD',
        ]);

        $response = $this->get('http://umahz.test/pricing');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Pricing')
            ->has('plans', 2)
            ->where('plans.0.name', 'Active Clinic Plan')
            ->where('plans.0.show_extra_seat_price', true)
            ->where('plans.1.name', 'Needs Review Plan')
            ->where('plans.1.show_extra_seat_price', false)
            ->where('plans.1.show_scribe_allowance', false)
        );
    }
}
