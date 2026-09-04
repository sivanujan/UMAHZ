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

    public function syncSubscriptionQuantities(Tenant $tenant): void
    {
        $subscription = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

        if (! $subscription || ! $subscription->active()) {
            return;
        }

        $items = PlanPricing::buildSubscriptionItems(
            $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE,
            $tenant->full_time_practitioners_count ?? 1,
            $tenant->part_time_practitioners_count ?? 0
        );

        if (! empty($items)) {
            $pricesWithQuantities = [];
            foreach ($items as $item) {
                $pricesWithQuantities[$item['price']] = ['quantity' => $item['quantity']];
            }
            $subscription->swap($pricesWithQuantities);
        }
    }

    public function discardPaymentMethod(string $customerId, ?string $paymentMethodId): void
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
}
