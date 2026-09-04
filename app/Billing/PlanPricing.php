<?php

namespace App\Billing;

use App\Models\SubscriptionTierConfig;
use App\Models\Tenant;
use InvalidArgumentException;

class PlanPricing
{
    public const TIER_BALANCE = 'balance';
    public const TIER_PRACTICE = 'practice';
    public const TIER_THRIVE = 'thrive';

    public const TIERS = [
        self::TIER_BALANCE,
        self::TIER_PRACTICE,
        self::TIER_THRIVE,
    ];

    /**
     * Get the configuration definition for a specific tier.
     */
    public static function getTierConfig(string $tier): array
    {
        $config = SubscriptionTierConfig::getTier($tier) ?? config("billing.tiers.{$tier}");

        if (! $config) {
            throw new InvalidArgumentException("Invalid billing tier [{$tier}].");
        }

        return $config;
    }

    /**
     * Calculate the complete monthly cost breakdown for a tier and practitioner counts.
     *
     * @return array{
     *     tier: string,
     *     tier_name: string,
     *     base_price: float,
     *     full_time_count: int,
     *     part_time_count: int,
     *     additional_ft_count: int,
     *     additional_pt_count: int,
     *     additional_ft_cost: float,
     *     additional_pt_cost: float,
     *     total_monthly: float,
     *     total_monthly_formatted: string,
     *     total_practitioners: int,
     *     is_balance: bool,
     * }
     */
    public static function calculateBreakdown(string $tier, int $fullTimeCount = 1, int $partTimeCount = 0): array
    {
        $config = self::getTierConfig($tier);
        $fullTimeCount = max(1, $fullTimeCount);
        $partTimeCount = max(0, $partTimeCount);

        if ($tier === self::TIER_BALANCE) {
            $fullTimeCount = 1;
            $partTimeCount = 0;
            $additionalFt = 0;
            $additionalPt = 0;
            $additionalFtCost = 0.0;
            $additionalPtCost = 0.0;
            $totalMonthly = (float) $config['base_price'];
        } else {
            // Included 1 FT practitioner in base plan
            $additionalFt = max(0, $fullTimeCount - (int) ($config['included_full_time'] ?? 1));
            $additionalPt = $partTimeCount;
            $additionalFtCost = round($additionalFt * (float) ($config['addon_price_ft'] ?? 0), 2);
            $additionalPtCost = round($additionalPt * (float) ($config['addon_price_pt'] ?? 0), 2);
            $totalMonthly = round((float) $config['base_price'] + $additionalFtCost + $additionalPtCost, 2);
        }

        return [
            'tier' => $tier,
            'tier_name' => $config['name'],
            'base_price' => (float) $config['base_price'],
            'full_time_count' => $fullTimeCount,
            'part_time_count' => $partTimeCount,
            'additional_ft_count' => $additionalFt,
            'additional_pt_count' => $additionalPt,
            'additional_ft_cost' => $additionalFtCost,
            'additional_pt_cost' => $additionalPtCost,
            'total_monthly' => $totalMonthly,
            'total_monthly_formatted' => '$'.number_format($totalMonthly, 2).' CAD/mo',
            'total_practitioners' => $fullTimeCount + $partTimeCount,
            'is_balance' => $tier === self::TIER_BALANCE,
        ];
    }

    /**
     * Build the Stripe subscription item specifications (Price ID + quantity)
     * needed by Laravel Cashier / Stripe API.
     *
     * @return array<int, array{price: string, quantity: int}>
     */
    public static function buildSubscriptionItems(string $tier, int $fullTimeCount = 1, int $partTimeCount = 0): array
    {
        $config = self::getTierConfig($tier);
        $items = [];

        // 1. Base tier item (quantity 1)
        $basePriceId = $config['stripe_price_id'] ?? null;
        if (! empty($basePriceId)) {
            $items[] = [
                'price' => $basePriceId,
                'quantity' => 1,
            ];
        }

        if ($tier === self::TIER_BALANCE) {
            return $items;
        }

        // 2. Additional Full-Time practitioners add-on item
        $additionalFt = max(0, $fullTimeCount - (int) ($config['included_full_time'] ?? 1));
        $addonFtPriceId = $config['stripe_addon_price_ft_id'] ?? null;
        if ($additionalFt > 0 && ! empty($addonFtPriceId)) {
            $items[] = [
                'price' => $addonFtPriceId,
                'quantity' => $additionalFt,
            ];
        }

        // 3. Additional Part-Time practitioners add-on item
        $additionalPt = max(0, $partTimeCount);
        $addonPtPriceId = $config['stripe_addon_price_pt_id'] ?? null;
        if ($additionalPt > 0 && ! empty($addonPtPriceId)) {
            $items[] = [
                'price' => $addonPtPriceId,
                'quantity' => $additionalPt,
            ];
        }

        return $items;
    }

    /**
     * Validate whether a clinic can add another practitioner given its tier.
     */
    public static function validatePractitionerLimit(Tenant $tenant, int $newFtCount, int $newPtCount): bool
    {
        $tier = $tenant->plan_tier ?? self::TIER_PRACTICE;
        $config = self::getTierConfig($tier);

        if ($tier === self::TIER_BALANCE) {
            return ($newFtCount + $newPtCount) <= 1;
        }

        return true;
    }
}
