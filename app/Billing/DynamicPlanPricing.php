<?php

namespace App\Billing;

use App\Models\AddOn;
use App\Models\Plan;
use App\Models\PromoCode;
use InvalidArgumentException;

class DynamicPlanPricing
{
    /**
     * Calculate complete subscription cost breakdown for a plan, interval, seats, and add-ons.
     *
     * @param array<int, array{addon: AddOn, quantity: int}> $addOns
     * @return array{
     *     plan_id: string,
     *     plan_name: string,
     *     interval: string,
     *     currency: string,
     *     base_price: float,
     *     included_practitioners: int,
     *     practitioners_count: int,
     *     extra_practitioners_count: int,
     *     extra_seat_unit_price: float,
     *     extra_practitioners_cost: float,
     *     addons_breakdown: array<int, array{addon_id: string, name: string, unit_price: float, quantity: int, total: float}>,
     *     addons_total: float,
     *     subtotal: float,
     *     discount_amount: float,
     *     discount_label: ?string,
     *     total: float,
     *     total_formatted: string,
     * }
     */
    public static function calculateBreakdown(
        Plan $plan,
        string $interval = 'month',
        int $practitionersCount = 1,
        array $addOns = [],
        ?PromoCode $promoCode = null,
        bool $allowExpiredLockedPromo = false
    ): array {
        $interval = strtolower($interval);
        if (! in_array($interval, ['month', 'year'], true)) {
            throw new InvalidArgumentException("Invalid billing interval [{$interval}]. Allowed: month, year.");
        }

        $price = $interval === 'year' ? $plan->annualPrice : $plan->monthlyPrice;
        if (! $price) {
            throw new InvalidArgumentException("No active price configured for plan [{$plan->name}] with interval [{$interval}].");
        }

        $practitionersCount = max(1, $practitionersCount);
        $included = $plan->included_practitioners ?? 1;

        $extraSeats = 0;
        $extraSeatsCost = 0.0;
        $extraSeatUnitPrice = (float) $price->extra_practitioner_price;

        $priceReviewFields = (array) ($price->needs_review_fields ?? []);
        $planReviewFields = (array) ($plan->needs_review_fields ?? []);
        $isExtraSeatPriceUnderReview = in_array('extra_practitioner_price', $priceReviewFields, true)
            || in_array('extra_practitioner_price', $planReviewFields, true);

        if ($plan->allows_extra_practitioners) {
            $extraSeats = max(0, $practitionersCount - $included);
            if ($isExtraSeatPriceUnderReview) {
                $extraSeatsCost = 0.0;
            } else {
                $extraSeatsCost = round($extraSeats * $extraSeatUnitPrice, 2);
            }
        }

        $basePrice = (float) $price->base_price;

        // Add-ons breakdown (Correction 4: add-on prices share the subscription interval)
        $addonsBreakdown = [];
        $addonsTotal = 0.0;

        foreach ($addOns as $item) {
            /** @var AddOn $addOn */
            $addOn = $item['addon'] ?? null;
            $qty = max(1, (int) ($item['quantity'] ?? 1));

            if ($addOn) {
                $unitPrice = $interval === 'year'
                    ? (float) ($addOn->price_annual ?? round($addOn->price_monthly * 10, 2))
                    : (float) $addOn->price_monthly;

                $total = round($unitPrice * $qty, 2);
                $addonsTotal += $total;

                $addonsBreakdown[] = [
                    'addon_id' => $addOn->id,
                    'name' => $addOn->name,
                    'unit_price' => $unitPrice,
                    'quantity' => $qty,
                    'total' => $total,
                ];
            }
        }

        $subtotal = round($basePrice + $extraSeatsCost + $addonsTotal, 2);

        // Promo code discount calculation
        $discountAmount = 0.0;
        $discountLabel = null;

        if ($promoCode && $promoCode->isValidForPlan($plan->id, $allowExpiredLockedPromo)) {
            if ($promoCode->discount_type === 'percent') {
                $discountAmount = round(($subtotal * (float) $promoCode->discount_value) / 100, 2);
                $discountLabel = "{$promoCode->code} ({$promoCode->discount_value}% off)";
            } elseif ($promoCode->discount_type === 'fixed_amount') {
                $discountAmount = min($subtotal, (float) $promoCode->discount_value);
                $discountLabel = "{$promoCode->code} ($" . number_format($promoCode->discount_value, 2) . ' off)';
            }
        }

        $total = max(0.0, round($subtotal - $discountAmount, 2));
        $cadenceSuffix = $interval === 'year' ? '/yr' : '/mo';
        $formatted = '$' . number_format($total, 2) . ' CAD' . $cadenceSuffix;

        return [
            'plan_id' => $plan->id,
            'plan_name' => $plan->name,
            'interval' => $interval,
            'currency' => $price->currency ?? 'CAD',
            'base_price' => $basePrice,
            'included_practitioners' => $included,
            'practitioners_count' => $practitionersCount,
            'extra_practitioners_count' => $extraSeats,
            'extra_seat_unit_price' => $extraSeatUnitPrice,
            'extra_practitioners_cost' => $extraSeatsCost,
            'extra_seat_price_under_review' => $isExtraSeatPriceUnderReview,
            'addons_breakdown' => $addonsBreakdown,
            'addons_total' => $addonsTotal,
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'discount_label' => $discountLabel,
            'total' => $total,
            'total_formatted' => $formatted,
            'total_monthly' => $total,
            'total_monthly_formatted' => $formatted,
            'first_charge_formatted' => (($plan->trial_days ?? 0) > 0 ? '$0.00 CAD' : $formatted),
            'total_due_formatted' => $formatted,
            'trial_days' => $plan->trial_days ?? 0,
        ];
    }

    /**
     * Build the Stripe subscription line items (Price ID + quantity) for Cashier.
     * Guarantees all items share the exact same billing interval (Correction 4).
     *
     * @param array<int, array{addon: AddOn, quantity: int}> $addOns
     * @return array<int, array{price: string, quantity: int}>
     */
    public static function buildSubscriptionItems(
        Plan $plan,
        string $interval = 'month',
        int $practitionersCount = 1,
        array $addOns = []
    ): array {
        $interval = strtolower($interval);
        $price = $interval === 'year' ? $plan->annualPrice : $plan->monthlyPrice;

        if (! $price || empty($price->stripe_base_price_id)) {
            try {
                if ($price) {
                    app(\App\Services\StripeSubscriptionSyncService::class)->ensurePriceStripeIds($plan, $price);
                    $price->refresh();
                } else {
                    app(\App\Services\StripeSubscriptionSyncService::class)->syncPlan($plan);
                    $plan->refresh();
                    $price = $interval === 'year' ? $plan->annualPrice : $plan->monthlyPrice;
                }
            } catch (\Throwable $e) {
                // Ignore and fall through to validation check below
            }
        }

        if (! $price || empty($price->stripe_base_price_id)) {
            throw new InvalidArgumentException("Plan [{$plan->name}] has no active Stripe Price configured for interval [{$interval}].");
        }

        $items = [];

        // 1. Base Plan Item (Quantity 1)
        $items[] = [
            'price' => $price->stripe_base_price_id,
            'quantity' => 1,
        ];

        // 2. Extra Practitioner Seats Item (if allowed, extra seats > 0, price configured, and not under review)
        if ($plan->allows_extra_practitioners) {
            $extraSeats = max(0, $practitionersCount - ($plan->included_practitioners ?? 1));
            $isExtraSeatPriceUnderReview = in_array('extra_practitioner_price', (array) ($price->needs_review_fields ?? []), true)
                || in_array('extra_practitioner_price', (array) ($plan->needs_review_fields ?? []), true);

            if ($extraSeats > 0 && ! empty($price->stripe_extra_seat_price_id) && ! $isExtraSeatPriceUnderReview) {
                $items[] = [
                    'price' => $price->stripe_extra_seat_price_id,
                    'quantity' => $extraSeats,
                ];
            }
        }

        // 3. Add-on items sharing the exact same interval (Correction 4)
        foreach ($addOns as $item) {
            /** @var AddOn $addOn */
            $addOn = $item['addon'] ?? null;
            $quantity = max(1, (int) ($item['quantity'] ?? 1));

            if ($addOn) {
                $priceId = $interval === 'year'
                    ? $addOn->stripe_price_annual_id
                    : $addOn->stripe_price_monthly_id;

                if (! empty($priceId)) {
                    $items[] = [
                        'price' => $priceId,
                        'quantity' => $quantity,
                    ];
                }
            }
        }

        return $items;
    }

    /**
     * Calculate plan upgrade proration based on days/months used on current plan.
     *
     * Rules:
     * - Monthly plan:
     *   - Threshold: 20 days.
     *   - Daily rate: current_plan_price / 30 (e.g. $39 / 30 = $1.30/day).
     *   - If days_used >= 20: 0 credit, charge full new plan total ($69).
     *   - If days_used < 20: credit = current_plan_price - (days_used * daily_rate).
     *     Net charge = new_plan_total - credit.
     *
     * - Annual plan:
     *   - Threshold: 7 months.
     *   - Monthly rate: current_plan_annual_price / 12 (e.g. $390 / 12 = $32.50/mo).
     *   - If months_used >= 7: 0 credit, charge full new annual plan total.
     *   - If months_used < 7: credit = current_plan_annual_price - (months_used * monthly_rate).
     *     Net charge = new_plan_total - credit.
     *
     * @return array{
     *     is_upgrade: bool,
     *     current_plan_name: ?string,
     *     current_interval: string,
     *     current_price: float,
     *     period_type: string,
     *     units_used: int,
     *     units_label: string,
     *     threshold: int,
     *     threshold_reached: bool,
     *     unit_rate: float,
     *     used_cost: float,
     *     unused_credit: float,
     *     new_plan_total: float,
     *     net_amount_due: float,
     *     net_amount_due_formatted: string,
     *     summary: string,
     * }
     */
    public static function calculateUpgradeProration(
        \App\Models\Tenant $tenant,
        Plan $targetPlan,
        string $targetInterval,
        float $targetNewTotal
    ): array {
        $currentPlan = $tenant->plan;
        $currentInterval = $tenant->billing_interval ?: 'month';

        if (! $currentPlan) {
            return [
                'is_upgrade' => false,
                'current_plan_name' => null,
                'current_interval' => $targetInterval,
                'current_price' => 0.0,
                'period_type' => $targetInterval === 'year' ? 'month' : 'day',
                'units_used' => 0,
                'units_label' => $targetInterval === 'year' ? 'month(s)' : 'day(s)',
                'threshold' => $targetInterval === 'year' ? 7 : 20,
                'threshold_reached' => false,
                'unit_rate' => 0.0,
                'used_cost' => 0.0,
                'unused_credit' => 0.0,
                'new_plan_total' => $targetNewTotal,
                'net_amount_due' => $targetNewTotal,
                'net_amount_due_formatted' => '$' . number_format($targetNewTotal, 2) . ' CAD',
                'summary' => 'New plan setup at standard rate.',
            ];
        }

        $isUpgrade = ($targetPlan->display_order > $currentPlan->display_order)
            || ($targetPlan->id === $currentPlan->id && $currentInterval === 'month' && $targetInterval === 'year');

        $currentPriceRecord = $currentInterval === 'year' ? $currentPlan->annualPrice : $currentPlan->monthlyPrice;
        $currentPrice = $currentPriceRecord ? (float) $currentPriceRecord->base_price : ($currentInterval === 'year' ? 390.0 : 39.0);

        // Determine plan start date
        $startDate = $tenant->plan_started_at;
        if (! $startDate) {
            $subscription = $tenant->subscription(\App\Models\Tenant::PLATFORM_SUBSCRIPTION);
            if ($subscription) {
                try {
                    $stripeSub = $subscription->asStripeSubscription();
                    if (! empty($stripeSub->current_period_start)) {
                        $startDate = \Carbon\Carbon::createFromTimestamp($stripeSub->current_period_start);
                    }
                } catch (\Throwable) {
                    // Fallback
                }
            }
        }
        $startDate = $startDate ?: ($tenant->created_at ?: now());

        if ($currentInterval === 'year') {
            $periodType = 'month';
            $unitsLabel = 'month(s)';
            $threshold = 7;
            $unitsUsed = (int) max(0, $startDate->diffInMonths(now()));
            $unitRate = round($currentPrice / 12, 2);

            if ($unitsUsed >= $threshold) {
                $thresholdReached = true;
                $usedCost = $currentPrice;
                $unusedCredit = 0.0;
                $netAmountDue = $targetNewTotal;
                $summary = "{$unitsUsed} month(s) used (7+ months threshold reached). Full plan price applies with no credit.";
            } else {
                $thresholdReached = false;
                $usedCost = round($unitsUsed * $unitRate, 2);
                $unusedCredit = max(0.0, round($currentPrice - $usedCost, 2));
                $netAmountDue = max(0.0, round($targetNewTotal - $unusedCredit, 2));
                $summary = "{$unitsUsed} month(s) used at \${$unitRate}/mo (\${$usedCost}). Unused credit of \${$unusedCredit} applied to today's charge.";
            }
        } else {
            $periodType = 'day';
            $unitsLabel = 'day(s)';
            $threshold = 20;
            $unitsUsed = (int) max(0, $startDate->diffInDays(now()));
            $unitRate = round($currentPrice / 30, 2); // e.g. $39 / 30 = $1.30/day

            if ($unitsUsed >= $threshold) {
                $thresholdReached = true;
                $usedCost = $currentPrice;
                $unusedCredit = 0.0;
                $netAmountDue = $targetNewTotal;
                $summary = "{$unitsUsed} day(s) used (20+ days threshold reached). Full plan price applies with no credit.";
            } else {
                $thresholdReached = false;
                $usedCost = round($unitsUsed * $unitRate, 2);
                $unusedCredit = max(0.0, round($currentPrice - $usedCost, 2));
                $netAmountDue = max(0.0, round($targetNewTotal - $unusedCredit, 2));
                $summary = "{$unitsUsed} day(s) used at \${$unitRate}/day (\${$usedCost}). Unused credit of \${$unusedCredit} applied to today's charge.";
            }
        }

        return [
            'is_upgrade' => $isUpgrade,
            'current_plan_name' => $currentPlan->name,
            'current_interval' => $currentInterval,
            'current_price' => $currentPrice,
            'period_type' => $periodType,
            'units_used' => $unitsUsed,
            'units_label' => $unitsLabel,
            'threshold' => $threshold,
            'threshold_reached' => $thresholdReached,
            'unit_rate' => $unitRate,
            'used_cost' => $usedCost,
            'unused_credit' => $unusedCredit,
            'new_plan_total' => $targetNewTotal,
            'net_amount_due' => $netAmountDue,
            'net_amount_due_formatted' => '$' . number_format($netAmountDue, 2) . ' CAD',
            'summary' => $summary,
        ];
    }
}
