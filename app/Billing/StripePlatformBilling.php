<?php

namespace App\Billing;

use App\Models\Tenant;
use Laravel\Cashier\Cashier;

/**
 * Live Stripe implementation of the platform billing gateway, backed by
 * Laravel Cashier + the Stripe SDK. Reads all keys from config/env (never
 * hardcoded). The monthly Price id comes from config('billing.price_monthly').
 */
class StripePlatformBilling implements PlatformBilling
{
    public function createCustomer(string $email, string $name): string
    {
        $customer = Cashier::stripe()->customers->create([
            'email' => $email,
            'name' => $name,
            'metadata' => ['platform' => 'umahz', 'kind' => 'clinic_registration'],
        ]);

        return $customer->id;
    }

    public function createSetupIntent(string $customerId): array
    {
        $intent = Cashier::stripe()->setupIntents->create([
            'customer' => $customerId,
            'payment_method_types' => ['card'],
            'usage' => 'off_session',
        ]);

        return ['id' => $intent->id, 'client_secret' => $intent->client_secret];
    }

    public function savedPaymentMethod(string $setupIntentId): ?string
    {
        $intent = Cashier::stripe()->setupIntents->retrieve($setupIntentId);

        return $intent->status === 'succeeded' ? $intent->payment_method : null;
    }

    public function startMonthlySubscription(Tenant $tenant, string $paymentMethodId): void
    {
        // 1. Dynamic Plan Path (Phase 4)
        if ($tenant->plan_id && $tenant->plan) {
            $interval = $tenant->billing_interval ?? 'month';
            $addOns = $tenant->tenantAddOns()
                ->where('status', 'active')
                ->where('quantity', '>', 0)
                ->with('addOn')
                ->get()
                ->map(fn ($tao) => ['addon' => $tao->addOn, 'quantity' => $tao->quantity])
                ->all();

            $items = DynamicPlanPricing::buildSubscriptionItems(
                $tenant->plan,
                $interval,
                $tenant->totalPractitionersCount(),
                $addOns
            );

            $builder = $tenant->newSubscription(Tenant::PLATFORM_SUBSCRIPTION);

            foreach ($items as $item) {
                $builder->price($item['price'], $item['quantity']);
            }

            if ($tenant->promoCode?->stripe_coupon_id) {
                $builder->withCoupon($tenant->promoCode->stripe_coupon_id);
            }

            if (($tenant->plan->trial_days ?? 0) > 0) {
                $builder->trialDays($tenant->plan->trial_days);
            }

            $taxSetting = \App\Models\PlatformSetting::get('billing.stripe_automatic_tax');
            if (is_array($taxSetting) && ! empty($taxSetting['enabled'])) {
                $builder->automaticTax();
            }

            $builder->create($paymentMethodId);
            return;
        }

        // 2. Legacy Plan Path (backwards compatible)
        $items = PlanPricing::buildSubscriptionItems(
            $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE,
            $tenant->full_time_practitioners_count ?? 1,
            $tenant->part_time_practitioners_count ?? 0
        );

        if (empty($items)) {
            $fallbackPrice = config('billing.price_monthly');
            if (empty($fallbackPrice)) {
                throw new \RuntimeException("No Stripe price configured for tier [{$tenant->plan_tier}].");
            }
            $items = [['price' => $fallbackPrice, 'quantity' => 1]];
        }

        // Cashier attaches the payment method as default and creates the
        // subscription — the first invoice is charged immediately here.
        $builder = $tenant->newSubscription(Tenant::PLATFORM_SUBSCRIPTION);

        foreach ($items as $item) {
            $builder->price($item['price'], $item['quantity']);
        }

        $builder->create($paymentMethodId);
    }

    public function syncSubscriptionQuantities(Tenant $tenant, bool $invoiceImmediately = false): void
    {
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

        if (! $subscription || ! $subscription->active()) {
            return;
        }

        if ($tenant->plan_id && $tenant->plan) {
            $addOns = $tenant->tenantAddOns()
                ->where('status', 'active')
                ->where('quantity', '>', 0)
                ->with('addOn')
                ->get()
                ->map(fn ($tao) => ['addon' => $tao->addOn, 'quantity' => $tao->quantity])
                ->all();

            $items = DynamicPlanPricing::buildSubscriptionItems(
                $tenant->plan,
                $tenant->billing_interval ?? 'month',
                $tenant->totalPractitionersCount(),
                $addOns
            );
        } else {
            $items = PlanPricing::buildSubscriptionItems(
                $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE,
                $tenant->full_time_practitioners_count ?? 1,
                $tenant->part_time_practitioners_count ?? 0
            );
        }

        if (! empty($items)) {
            $pricesWithQuantities = [];
            foreach ($items as $item) {
                $pricesWithQuantities[$item['price']] = ['quantity' => $item['quantity']];
            }
            if ($invoiceImmediately) {
                $subscription->swapAndInvoice($pricesWithQuantities);
            } else {
                $subscription->swap($pricesWithQuantities);
            }
        }
    }

    public function swapSubscriptionWithoutProration(Tenant $tenant): void
    {
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

        if (! $subscription || ! $subscription->active()) {
            return;
        }

        if ($tenant->plan_id && $tenant->plan) {
            $addOns = $tenant->tenantAddOns()
                ->where('status', 'active')
                ->where('quantity', '>', 0)
                ->with('addOn')
                ->get()
                ->map(fn ($tao) => ['addon' => $tao->addOn, 'quantity' => $tao->quantity])
                ->all();

            $items = DynamicPlanPricing::buildSubscriptionItems(
                $tenant->plan,
                $tenant->billing_interval ?? 'month',
                $tenant->totalPractitionersCount(),
                $addOns
            );
        } else {
            $items = PlanPricing::buildSubscriptionItems(
                $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE,
                $tenant->full_time_practitioners_count ?? 1,
                $tenant->part_time_practitioners_count ?? 0
            );
        }

        if (! empty($items)) {
            $pricesWithQuantities = [];
            foreach ($items as $item) {
                $pricesWithQuantities[$item['price']] = ['quantity' => $item['quantity']];
            }
            $subscription->noProrate()->swap($pricesWithQuantities);
        }
    }

    public function discardPaymentMethod(?string $customerId, ?string $paymentMethodId): void
    {
        if (! $paymentMethodId) {
            return;
        }

        try {
            Cashier::stripe()->paymentMethods->detach($paymentMethodId);
        } catch (\Throwable $e) {
            // Already detached / never fully attached — nothing to charge, so a
            // failure here is not fatal to the rejection flow.
        }
    }

    public function createStripeProduct(string $name, ?string $description = null, array $metadata = []): string
    {
        // Idempotency: check if product with this plan_id or addon_id or slug already exists
        $searchKey = $metadata['slug'] ?? $metadata['plan_id'] ?? $metadata['addon_id'] ?? null;
        if ($searchKey) {
            try {
                $existing = Cashier::stripe()->products->all(['limit' => 50, 'active' => true]);
                foreach ($existing->data as $prod) {
                    if (($prod->metadata['slug'] ?? null) === $searchKey ||
                        ($prod->metadata['plan_id'] ?? null) === $searchKey ||
                        ($prod->metadata['addon_id'] ?? null) === $searchKey) {
                        return $prod->id;
                    }
                }
            } catch (\Throwable $e) {
                // Fall back to creation
            }
        }

        $params = [
            'name' => $name,
            'metadata' => array_merge(['platform' => 'umahz'], $metadata),
        ];

        if ($description) {
            $params['description'] = $description;
        }

        $product = Cashier::stripe()->products->create($params);

        return $product->id;
    }

    public function updateStripeProduct(string $productId, array $params): void
    {
        Cashier::stripe()->products->update($productId, $params);
    }

    public function createStripePrice(string $productId, float $amount, string $currency, string $interval, array $metadata = [], ?string $lookupKey = null): string
    {
        if ($lookupKey) {
            try {
                $existing = Cashier::stripe()->prices->all([
                    'lookup_keys' => [$lookupKey],
                    'active' => true,
                    'limit' => 1,
                ]);
                if (! empty($existing->data)) {
                    return $existing->data[0]->id;
                }
            } catch (\Throwable $e) {
                // Fall back to creation
            }
        }

        $params = [
            'product' => $productId,
            'unit_amount' => (int) round($amount * 100),
            'currency' => strtolower($currency),
            'recurring' => [
                'interval' => $interval,
            ],
            'metadata' => array_merge(['platform' => 'umahz'], $metadata),
        ];

        if ($lookupKey) {
            $params['lookup_key'] = $lookupKey;
            $params['transfer_lookup_key'] = true;
        }

        $price = Cashier::stripe()->prices->create($params);

        return $price->id;
    }

    public function archiveStripePrice(string $priceId): void
    {
        Cashier::stripe()->prices->update($priceId, ['active' => false]);
    }

    public function createStripeCoupon(array $params): string
    {
        $coupon = Cashier::stripe()->coupons->create($params);

        return $coupon->id;
    }

    public function createStripePromotionCode(string $couponId, string $code, ?int $maxRedemptions = null, ?int $expiresAt = null): string
    {
        $payload = [
            'coupon' => $couponId,
            'code' => $code,
        ];

        if ($maxRedemptions !== null) {
            $payload['max_redemptions'] = $maxRedemptions;
        }

        if ($expiresAt !== null) {
            $payload['expires_at'] = $expiresAt;
        }

        $promo = Cashier::stripe()->promotionCodes->create($payload);

        return $promo->id;
    }

    public function deactivateStripePromotionCode(string $promotionCodeId): void
    {
        Cashier::stripe()->promotionCodes->update($promotionCodeId, ['active' => false]);
    }
}
