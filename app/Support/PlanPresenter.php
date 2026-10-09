<?php

namespace App\Support;

use App\Models\Plan;
use Illuminate\Support\Collection;

class PlanPresenter
{
    /**
     * Format a collection of plans with limit lines, label overrides, and "Everything in X, plus:" deltas.
     *
     * @param iterable<Plan> $plans
     * @param array<string, mixed> $options
     * @return array<int, array<string, mixed>>
     */
    public static function collectionForDisplay(iterable $plans, array $options = []): array
    {
        $planList = $plans instanceof Collection ? $plans : collect($plans);
        $sortedPlans = $planList->sortBy('display_order')->values();

        $result = [];
        $previousPlan = null;

        foreach ($sortedPlans as $plan) {
            $result[] = self::presentForDisplay($plan, $previousPlan, $options);
            $previousPlan = $plan;
        }

        return $result;
    }

    /**
     * Present a single plan for front-end presentation.
     *
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public static function presentForDisplay(Plan $plan, ?Plan $previousPlan = null, array $options = []): array
    {
        $monthly = $plan->monthlyPrice;
        $annual = $plan->annualPrice;

        $monthlyReviewFields = $monthly?->needs_review_fields ?? [];
        $annualReviewFields = $annual?->needs_review_fields ?? [];
        $planReviewFields = $plan->needs_review_fields ?? [];

        $showExtraSeatPrice = ! in_array('extra_practitioner_price', $monthlyReviewFields, true)
            && ! in_array('extra_practitioner_price', $annualReviewFields, true)
            && ! in_array('extra_practitioner_price', $planReviewFields, true);
        $showScribeAllowance = ! in_array('scribe_allowance_amount', $planReviewFields, true);
        $showLocationLimit = ! in_array('location_limit', $planReviewFields, true);

        // 1. Data-driven Limit Lines at top of card (Requirement 1)
        $limitLines = self::computeLimitLines($plan, $showLocationLimit);

        // 2. Feature Display Names & Label Overrides (Requirement 2)
        $allFeatures = self::getPlanFeatureDisplayNames($plan);

        // 3. "Everything in X, plus:" delta features (Requirement 3)
        $parentTierName = $previousPlan?->name;
        $deltaFeatures = self::computeDeltaFeatures($plan, $previousPlan);

        // Downgrade constraint options (for Billing page)
        $downgradeBlocked = $options['downgrade_blocked'][$plan->id] ?? false;
        $blockReason = $options['block_reasons'][$plan->id] ?? null;

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'tagline' => $plan->tagline,
            'description' => $plan->description,
            'badge' => $plan->badge === 'Most Popular' ? 'Clinic' : $plan->badge,
            'is_popular' => $plan->slug === 'professional' || $plan->badge === 'Most Popular',
            'display_order' => $plan->display_order,
            'trial_days' => $plan->trial_days,
            'included_practitioners' => $plan->included_practitioners,
            'max_practitioners' => $plan->max_practitioners,
            'allows_extra_practitioners' => (bool) $plan->allows_extra_practitioners,
            'appointment_limit_monthly' => $plan->appointment_limit_monthly,
            'location_limit' => $showLocationLimit ? $plan->location_limit : null,
            'support_level' => $plan->support_level,
            'scribe_allowance_amount' => $showScribeAllowance ? $plan->scribe_allowance_amount : null,
            'needs_review' => (bool) $plan->needs_review,
            'show_extra_seat_price' => $showExtraSeatPrice,
            'show_scribe_allowance' => $showScribeAllowance,
            'show_location_limit' => $showLocationLimit,

            // Pricing data structures compatible with all 3 pages
            'monthly_price' => $monthly ? [
                'base_price' => (float) $monthly->base_price,
                'extra_practitioner_price' => (float) $monthly->extra_practitioner_price,
            ] : null,
            'annual_price' => $annual ? [
                'base_price' => (float) $annual->base_price,
                'extra_practitioner_price' => (float) $annual->extra_practitioner_price,
            ] : null,
            'monthly_base_price' => $monthly ? (float) $monthly->base_price : null,
            'annual_base_price' => $annual ? (float) $annual->base_price : null,
            'annual_monthly_equivalent' => $annual ? round(((float) $annual->base_price) / 12, 2) : null,
            'extra_seat_monthly' => $monthly ? (float) $monthly->extra_practitioner_price : 0,
            'extra_seat_annual' => $annual ? (float) $annual->extra_practitioner_price : 0,

            // Limit lines & features
            'limit_lines' => $limitLines,
            'features' => $allFeatures,
            'parent_tier_name' => $parentTierName,
            'delta_features' => $deltaFeatures,

            // Downgrade constraints for billing
            'downgrade_blocked' => $downgradeBlocked,
            'block_reason' => $blockReason,
        ];
    }

    /**
     * Compute limit lines from plan data (not hard-coded).
     *
     * @return array<int, string>
     */
    public static function computeLimitLines(Plan $plan, bool $showLocationLimit): array
    {
        $lines = [];

        // 1. Appointments line
        if ($plan->appointment_limit_monthly !== null) {
            $lines[] = "Up to {$plan->appointment_limit_monthly} appointments/month";
        } else {
            $lines[] = 'Unlimited appointments';
        }

        // 2. Locations line
        if (! $showLocationLimit) {
            // Masked / Under review
            $lines[] = 'Multiple locations';
        } elseif ($plan->location_limit === null) {
            $lines[] = 'Unlimited locations';
        } elseif ($plan->location_limit === 1) {
            $lines[] = '1 location';
        } else {
            $lines[] = "Up to {$plan->location_limit} locations";
        }

        // 3. Support line (from plan data)
        if (! empty($plan->support_level)) {
            $lines[] = $plan->support_level;
        }

        return $lines;
    }

    /**
     * Get all enabled feature names for a plan, applying any plan_features display label overrides.
     *
     * @return array<int, string>
     */
    public static function getPlanFeatureDisplayNames(Plan $plan): array
    {
        return $plan->enabledFeatures->map(function ($feature) {
            return $feature->pivot?->display_label ?: $feature->name;
        })->values()->all();
    }

    /**
     * Compute delta features over the predecessor tier.
     *
     * @return array<int, string>
     */
    public static function computeDeltaFeatures(Plan $plan, ?Plan $previousPlan): array
    {
        $currentFeatures = $plan->enabledFeatures->map(function ($feature) {
            return [
                'id' => $feature->id,
                'key' => $feature->key,
                'name' => $feature->pivot?->display_label ?: $feature->name,
                'default_name' => $feature->name,
            ];
        });

        if (! $previousPlan) {
            return $currentFeatures->pluck('name')->all();
        }

        $prevFeaturesByKey = $previousPlan->enabledFeatures->mapWithKeys(function ($feature) {
            return [$feature->key => $feature->pivot?->display_label ?: $feature->name];
        });

        $delta = [];
        foreach ($currentFeatures as $feat) {
            $key = $feat['key'];
            $name = $feat['name'];

            // Extra feature not present in previous tier
            if (! $prevFeaturesByKey->has($key)) {
                $delta[] = $name;
                continue;
            }

            // Upgraded feature display label (e.g. "Automation" -> "More automation")
            if ($prevFeaturesByKey->get($key) !== $name) {
                $delta[] = $name;
            }
        }

        return $delta;
    }
}
