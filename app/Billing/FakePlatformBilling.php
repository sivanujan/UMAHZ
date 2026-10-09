<?php

namespace App\Billing;

use App\Models\Tenant;

/**
 * Deterministic in-memory gateway for tests. Records every call so tests can
 * assert money-critical behaviour — above all that a rejected clinic's card is
 * discarded and startMonthlySubscription() (the first charge) is NEVER called.
 */
class FakePlatformBilling implements PlatformBilling
{
    /** @var array<int, array{email:string,name:string,id:string}> */
    public array $customers = [];
    /** @var array<int, string> customer ids a SetupIntent was created for */
    public array $setupIntents = [];
    /** @var array<int, array{tenant_id:string,payment_method:string,tier:string,full_time_count:int,part_time_count:int,items:array,total_monthly:float}> */
    public array $startedSubscriptions = [];
    /** @var array<int, array{tenant_id:string,tier:string,full_time_count:int,part_time_count:int,items:array}> */
    public array $syncedSubscriptions = [];
    /** @var array<int, array{customer:string,payment_method:?string}> */
    public array $discarded = [];

    /** The pm id that savedPaymentMethod() will report as saved. */
    public string $paymentMethodToReturn = 'pm_fake_card';
    /** Toggle to simulate a SetupIntent that never succeeded (no card saved). */
    public bool $cardWasSaved = true;

    public function createCustomer(string $email, string $name): string
    {
        $id = 'cus_fake_'.substr(md5($email.$name.count($this->customers)), 0, 12);
        $this->customers[] = ['email' => $email, 'name' => $name, 'id' => $id];

        return $id;
    }

    public function createSetupIntent(string $customerId): array
    {
        $this->setupIntents[] = $customerId;
        $id = 'seti_fake_'.substr(md5($customerId.count($this->setupIntents)), 0, 12);

        return ['id' => $id, 'client_secret' => $id.'_secret'];
    }

    public function savedPaymentMethod(string $setupIntentId): ?string
    {
        return $this->cardWasSaved ? $this->paymentMethodToReturn : null;
    }

    public function startMonthlySubscription(Tenant $tenant, string $paymentMethodId): void
    {
        $ft = $tenant->full_time_practitioners_count ?? 1;
        $pt = $tenant->part_time_practitioners_count ?? 0;

        if ($tenant->plan_id && $tenant->plan) {
            $addOns = $tenant->tenantAddOns()
                ->where('status', 'active')
                ->where('quantity', '>', 0)
                ->with('addOn')
                ->get()
                ->map(fn ($tao) => ['addon' => $tao->addOn, 'quantity' => $tao->quantity])
                ->all();
            $items = DynamicPlanPricing::buildSubscriptionItems($tenant->plan, $tenant->billing_interval ?? 'month', $tenant->totalPractitionersCount(), $addOns);
            $breakdown = DynamicPlanPricing::calculateBreakdown(
                $tenant->plan,
                $tenant->billing_interval ?? 'month',
                $tenant->totalPractitionersCount(),
                $addOns,
                $tenant->promoCode,
                allowExpiredLockedPromo: true
            );

            $this->startedSubscriptions[] = [
                'tenant_id' => $tenant->id,
                'payment_method' => $paymentMethodId,
                'tier' => $tenant->plan->slug,
                'plan_id' => $tenant->plan_id,
                'billing_interval' => $tenant->billing_interval ?? 'month',
                'full_time_count' => $ft,
                'part_time_count' => $pt,
                'items' => $items,
                'total_monthly' => $breakdown['total'],
            ];
            return;
        }

        $tier = $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE;

        $items = PlanPricing::buildSubscriptionItems($tier, $ft, $pt);
        $breakdown = PlanPricing::calculateBreakdown($tier, $ft, $pt);

        $this->startedSubscriptions[] = [
            'tenant_id' => $tenant->id,
            'payment_method' => $paymentMethodId,
            'tier' => $tier,
            'full_time_count' => $ft,
            'part_time_count' => $pt,
            'items' => $items,
            'total_monthly' => $breakdown['total_monthly'],
        ];
    }

    public function syncSubscriptionQuantities(Tenant $tenant, bool $invoiceImmediately = false): void
    {
        $ft = $tenant->full_time_practitioners_count ?? 1;
        $pt = $tenant->part_time_practitioners_count ?? 0;

        if ($tenant->plan_id && $tenant->plan) {
            $addOns = $tenant->tenantAddOns()
                ->where('status', 'active')
                ->where('quantity', '>', 0)
                ->with('addOn')
                ->get()
                ->map(fn ($tao) => ['addon' => $tao->addOn, 'quantity' => $tao->quantity])
                ->all();
            $items = DynamicPlanPricing::buildSubscriptionItems($tenant->plan, $tenant->billing_interval ?? 'month', $tenant->totalPractitionersCount(), $addOns);
            $tier = $tenant->plan->slug;
        } else {
            $tier = $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE;
            $items = PlanPricing::buildSubscriptionItems($tier, $ft, $pt);
        }

        $this->syncedSubscriptions[] = [
            'tenant_id' => $tenant->id,
            'tier' => $tier,
            'full_time_count' => $ft,
            'part_time_count' => $pt,
            'items' => $items,
        ];
    }

    public function discardPaymentMethod(?string $customerId, ?string $paymentMethodId): void
    {
        $this->discarded[] = ['customer' => $customerId, 'payment_method' => $paymentMethodId];
    }

    public function swapSubscriptionWithoutProration(Tenant $tenant): void
    {
        $this->syncSubscriptionQuantities($tenant);
    }

    /** @var array<string, array{name:string, description:?string, metadata:array}> */
    public array $products = [];
    /** @var array<string, array{product_id:string, amount:float, currency:string, interval:string, metadata:array, active:bool}> */
    public array $prices = [];
    /** @var array<int, string> */
    public array $archivedPrices = [];
    /** @var array<string, array> */
    public array $coupons = [];
    /** @var array<string, array{coupon_id:string, code:string, active:bool, max_redemptions:?int, expires_at:?int}> */
    public array $promotionCodes = [];

    public function createStripeProduct(string $name, ?string $description = null, array $metadata = []): string
    {
        $searchKey = $metadata['slug'] ?? $metadata['plan_id'] ?? $metadata['addon_id'] ?? null;
        if ($searchKey) {
            foreach ($this->products as $id => $p) {
                if (($p['metadata']['slug'] ?? null) === $searchKey ||
                    ($p['metadata']['plan_id'] ?? null) === $searchKey ||
                    ($p['metadata']['addon_id'] ?? null) === $searchKey) {
                    return $id;
                }
            }
        }

        $id = 'prod_fake_'.substr(md5($name.count($this->products)), 0, 14);
        $this->products[$id] = [
            'name' => $name,
            'description' => $description,
            'metadata' => $metadata,
        ];

        return $id;
    }

    public function updateStripeProduct(string $productId, array $params): void
    {
        if (isset($this->products[$productId])) {
            $this->products[$productId] = array_merge($this->products[$productId], $params);
        }
    }

    public function createStripePrice(string $productId, float $amount, string $currency, string $interval, array $metadata = [], ?string $lookupKey = null): string
    {
        if ($lookupKey) {
            foreach ($this->prices as $id => $p) {
                if (($p['lookup_key'] ?? null) === $lookupKey && ($p['active'] ?? true)) {
                    return $id;
                }
            }
        }

        $id = 'price_fake_'.substr(md5($productId.$amount.$interval.count($this->prices)), 0, 14);
        $this->prices[$id] = [
            'product_id' => $productId,
            'amount' => $amount,
            'currency' => $currency,
            'interval' => $interval,
            'metadata' => $metadata,
            'lookup_key' => $lookupKey,
            'active' => true,
        ];

        return $id;
    }

    public function archiveStripePrice(string $priceId): void
    {
        $this->archivedPrices[] = $priceId;
        if (isset($this->prices[$priceId])) {
            $this->prices[$priceId]['active'] = false;
        }
    }

    public function createStripeCoupon(array $params): string
    {
        $id = 'coupon_fake_'.substr(md5(json_encode($params).count($this->coupons)), 0, 14);
        $this->coupons[$id] = $params;

        return $id;
    }

    public function createStripePromotionCode(string $couponId, string $code, ?int $maxRedemptions = null, ?int $expiresAt = null): string
    {
        $id = 'promo_fake_'.substr(md5($couponId.$code.count($this->promotionCodes)), 0, 14);
        $this->promotionCodes[$id] = [
            'coupon_id' => $couponId,
            'code' => $code,
            'active' => true,
            'max_redemptions' => $maxRedemptions,
            'expires_at' => $expiresAt,
        ];

        return $id;
    }

    public function deactivateStripePromotionCode(string $promotionCodeId): void
    {
        if (isset($this->promotionCodes[$promotionCodeId])) {
            $this->promotionCodes[$promotionCodeId]['active'] = false;
        }
    }

    /** Test helper: was the first charge ever triggered for this tenant? */
    public function charged(Tenant $tenant): bool
    {
        return collect($this->startedSubscriptions)->contains('tenant_id', $tenant->id);
    }

    /** Test helper: get subscription record for tenant */
    public function subscriptionFor(Tenant $tenant): ?array
    {
        return collect($this->startedSubscriptions)->firstWhere('tenant_id', $tenant->id);
    }
}
