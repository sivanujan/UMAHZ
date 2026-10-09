<?php

namespace App\Services;

use App\Billing\PlatformBilling;
use App\Models\AddOn;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\PromoCode;
use Illuminate\Support\Facades\DB;

class StripeSubscriptionSyncService
{
    public function __construct(private readonly PlatformBilling $billing)
    {
    }

    /**
     * Synchronize a Plan and its active Prices to Stripe.
     */
    public function syncPlan(Plan $plan): void
    {
        // 1. Ensure Stripe Product exists
        if (empty($plan->stripe_product_id)) {
            $productId = $this->billing->createStripeProduct(
                "UMAHZ {$plan->name}",
                $plan->tagline,
                [
                    'plan_id' => $plan->id,
                    'slug' => $plan->slug,
                ]
            );
            $plan->update(['stripe_product_id' => $productId]);
        } else {
            $this->billing->updateStripeProduct($plan->stripe_product_id, [
                'name' => "UMAHZ {$plan->name}",
                'description' => $plan->tagline,
            ]);
        }

        // 2. Ensure each active PlanPrice has corresponding Stripe Prices
        $activePrices = $plan->activePrices()->get();
        foreach ($activePrices as $price) {
            $this->ensurePriceStripeIds($plan, $price);
        }

        $plan->unsetRelation('activePrices');
        $plan->unsetRelation('prices');
        $plan->unsetRelation('monthlyPrice');
        $plan->unsetRelation('annualPrice');
    }

    /**
     * Ensure base and extra seat Stripe Prices exist for a PlanPrice.
     * Respects Correction 4: placeholder prices (needs_review = true) are NEVER synced.
     */
    public function ensurePriceStripeIds(Plan $plan, PlanPrice $price): void
    {
        if (empty($plan->stripe_product_id)) {
            $productId = $this->billing->createStripeProduct(
                "UMAHZ {$plan->name}",
                $plan->tagline,
                [
                    'plan_id' => $plan->id,
                    'slug' => $plan->slug,
                ]
            );
            $plan->update(['stripe_product_id' => $productId]);
            $plan->stripe_product_id = $productId;
        }

        $updates = [];

        $isBasePricePlaceholder = (float) $price->base_price <= 0
            || (! empty($price->needs_review_fields) && in_array('base_price', $price->needs_review_fields, true))
            || ($price->needs_review && empty($price->needs_review_fields));

        // Base price: skip if marked as needs_review (Correction 4)
        if ($isBasePricePlaceholder) {
            // Placeholder unconfirmed price; skip Stripe sync until admin reviews and saves
        } elseif (empty($price->stripe_base_price_id)) {
            $lookupKey = "plan_{$plan->slug}_{$price->interval}";
            $basePriceId = $this->billing->createStripePrice(
                $plan->stripe_product_id,
                (float) $price->base_price,
                $price->currency ?? 'CAD',
                $price->interval,
                [
                    'kind' => 'base',
                    'plan_id' => $plan->id,
                    'interval' => $price->interval,
                ],
                $lookupKey
            );
            $updates['stripe_base_price_id'] = $basePriceId;
        }

        // Extra seat price (Correction 4: shared interval with base plan, skip if placeholder)
        $isExtraSeatPlaceholder = ! empty($price->needs_review_fields) && in_array('extra_practitioner_price', $price->needs_review_fields, true);
        if ($plan->allows_extra_practitioners && (float) $price->extra_practitioner_price > 0 && ! $isExtraSeatPlaceholder && empty($price->stripe_extra_seat_price_id)) {
            $extraSeatLookupKey = "plan_{$plan->slug}_seat_{$price->interval}";
            $extraSeatPriceId = $this->billing->createStripePrice(
                $plan->stripe_product_id,
                (float) $price->extra_practitioner_price,
                $price->currency ?? 'CAD',
                $price->interval,
                [
                    'kind' => 'extra_practitioner_seat',
                    'plan_id' => $plan->id,
                    'interval' => $price->interval,
                ],
                $extraSeatLookupKey
            );
            $updates['stripe_extra_seat_price_id'] = $extraSeatPriceId;
        }

        if (! empty($updates)) {
            $price->update($updates);
        }
    }

    /**
     * Update an active PlanPrice adhering to Stripe Price immutability (Correction 1).
     * Archives old Stripe prices, marks old PlanPrice inactive (grandfathered),
     * and creates a new active PlanPrice with new Stripe Price IDs.
     */
    public function updatePlanPrice(PlanPrice $oldPrice, float $newBasePrice, float $newExtraSeatPrice = 0.00): PlanPrice
    {
        // If identical amount, nothing to do
        if ((float) $oldPrice->base_price === $newBasePrice && (float) $oldPrice->extra_practitioner_price === $newExtraSeatPrice) {
            return $oldPrice;
        }

        $plan = $oldPrice->plan;

        return DB::transaction(function () use ($plan, $oldPrice, $newBasePrice, $newExtraSeatPrice) {
            // 1. Archive old Stripe prices in Stripe
            if (! empty($oldPrice->stripe_base_price_id)) {
                $this->billing->archiveStripePrice($oldPrice->stripe_base_price_id);
            }
            if (! empty($oldPrice->stripe_extra_seat_price_id)) {
                $this->billing->archiveStripePrice($oldPrice->stripe_extra_seat_price_id);
            }

            // 2. Mark old PlanPrice inactive (grandfathered)
            $oldPrice->update([
                'is_active' => false,
                'is_grandfathered' => true,
            ]);

            // 3. Create new active PlanPrice
            $newPrice = PlanPrice::create([
                'plan_id' => $plan->id,
                'interval' => $oldPrice->interval,
                'currency' => $oldPrice->currency ?? 'CAD',
                'base_price' => $newBasePrice,
                'extra_practitioner_price' => $newExtraSeatPrice,
                'is_active' => true,
                'is_grandfathered' => false,
                'needs_review' => false,
                'needs_review_fields' => null,
            ]);

            // 4. Generate new Stripe Prices
            $this->ensurePriceStripeIds($plan, $newPrice);

            $plan->unsetRelation('prices');
            $plan->unsetRelation('activePrices');
            $plan->unsetRelation('monthlyPrice');
            $plan->unsetRelation('annualPrice');

            return $newPrice->fresh();
        });
    }

    /**
     * Synchronize an AddOn (e.g. Scribe+) and its monthly and annual prices to Stripe.
     */
    public function syncAddOn(AddOn $addOn): void
    {
        if (empty($addOn->stripe_product_id)) {
            $productId = $this->billing->createStripeProduct(
                "UMAHZ Add-on: {$addOn->name}",
                $addOn->description,
                [
                    'addon_id' => $addOn->id,
                    'slug' => $addOn->slug,
                ]
            );
            $addOn->update(['stripe_product_id' => $productId]);
        }

        $updates = [];

        // Monthly Price (skip if placeholder)
        $isMonthlyPlaceholder = $addOn->needs_review && in_array('price_monthly', $addOn->needs_review_fields ?? [], true);
        if (! $isMonthlyPlaceholder && empty($addOn->stripe_price_monthly_id) && (float) $addOn->price_monthly > 0) {
            $monthlyLookupKey = "addon_{$addOn->slug}_month";
            $updates['stripe_price_monthly_id'] = $this->billing->createStripePrice(
                $addOn->stripe_product_id,
                (float) $addOn->price_monthly,
                'CAD',
                'month',
                ['addon_id' => $addOn->id, 'interval' => 'month'],
                $monthlyLookupKey
            );
        }

        // Annual Price (skip if placeholder)
        $isAnnualPlaceholder = $addOn->needs_review && in_array('price_annual', $addOn->needs_review_fields ?? [], true);
        if (! $isAnnualPlaceholder && empty($addOn->stripe_price_annual_id) && (float) $addOn->price_annual > 0) {
            $annualLookupKey = "addon_{$addOn->slug}_year";
            $updates['stripe_price_annual_id'] = $this->billing->createStripePrice(
                $addOn->stripe_product_id,
                (float) $addOn->price_annual,
                'CAD',
                'year',
                ['addon_id' => $addOn->id, 'interval' => 'year'],
                $annualLookupKey
            );
        }

        if (! empty($updates)) {
            $addOn->update($updates);
        }
    }

    /**
     * Synchronize a PromoCode with Stripe Coupons & Promotion Codes.
     */
    public function syncPromoCode(PromoCode $promoCode): void
    {
        // 1. Create Coupon if missing
        if (empty($promoCode->stripe_coupon_id)) {
            $couponParams = [
                'name' => "UMAHZ Promo: {$promoCode->code}",
                'duration' => $promoCode->duration,
            ];

            if ($promoCode->duration === 'repeating' && $promoCode->duration_in_months) {
                $couponParams['duration_in_months'] = $promoCode->duration_in_months;
            }

            if ($promoCode->discount_type === 'percent') {
                $couponParams['percent_off'] = (float) $promoCode->discount_value;
            } else {
                $couponParams['amount_off'] = (int) round(((float) $promoCode->discount_value) * 100);
                $couponParams['currency'] = 'cad';
            }

            $couponId = $this->billing->createStripeCoupon($couponParams);
            $promoCode->update(['stripe_coupon_id' => $couponId]);
        }

        // 2. Create Promotion Code if missing
        if (empty($promoCode->stripe_promo_code_id)) {
            $promoCodeId = $this->billing->createStripePromotionCode(
                $promoCode->stripe_coupon_id,
                $promoCode->code,
                $promoCode->max_redemptions,
                $promoCode->expires_at?->timestamp
            );
            $promoCode->update(['stripe_promo_code_id' => $promoCodeId]);
        }

        // 3. Deactivate if no longer active
        if (! $promoCode->is_active && ! empty($promoCode->stripe_promo_code_id)) {
            $this->billing->deactivateStripePromotionCode($promoCode->stripe_promo_code_id);
        }
    }
}
