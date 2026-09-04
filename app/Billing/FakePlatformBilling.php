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
        $tier = $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE;
        $ft = $tenant->full_time_practitioners_count ?? 1;
        $pt = $tenant->part_time_practitioners_count ?? 0;

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

    public function syncSubscriptionQuantities(Tenant $tenant): void
    {
        $tier = $tenant->plan_tier ?? PlanPricing::TIER_PRACTICE;
        $ft = $tenant->full_time_practitioners_count ?? 1;
        $pt = $tenant->part_time_practitioners_count ?? 0;

        $items = PlanPricing::buildSubscriptionItems($tier, $ft, $pt);

        $this->syncedSubscriptions[] = [
            'tenant_id' => $tenant->id,
            'tier' => $tier,
            'full_time_count' => $ft,
            'part_time_count' => $pt,
            'items' => $items,
        ];
    }

    public function discardPaymentMethod(string $customerId, ?string $paymentMethodId): void
    {
        $this->discarded[] = ['customer' => $customerId, 'payment_method' => $paymentMethodId];
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
