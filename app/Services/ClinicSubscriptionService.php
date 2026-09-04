<?php

namespace App\Services;

use App\Billing\PlatformBilling;
use App\Models\Tenant;

/**
 * Orchestrates the CLINIC -> UMAHZ platform subscription lifecycle around the
 * admin review decision and Stripe webhooks. All Stripe I/O goes through the
 * PlatformBilling gateway so this logic is deterministically testable.
 */
class ClinicSubscriptionService
{
    public function __construct(private readonly PlatformBilling $billing)
    {
    }

    /**
     * Start the monthly subscription for a just-approved clinic — THE FIRST
     * CHARGE. Idempotent: a tenant already active is never charged twice.
     *
     * @throws \RuntimeException if no card was saved (should be impossible: a
     *         card is required before an application is ever submitted).
     */
    public function activate(Tenant $tenant): void
    {
        if ($tenant->subscription_status === Tenant::SUBSCRIPTION_ACTIVE) {
            return;
        }

        if (empty($tenant->stripe_id) || empty($tenant->stripe_pm_id)) {
            throw new \RuntimeException("Cannot start subscription for tenant {$tenant->id}: no saved card.");
        }

        $this->billing->startMonthlySubscription($tenant, $tenant->stripe_pm_id);

        $tenant->forceFill([
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'payment_failed_at' => null,
        ])->save();
    }

    /**
     * Discard the saved card for a rejected clinic. No charge ever happened, so
     * there is nothing to refund — we simply detach the card and leave the
     * tenant with no subscription.
     */
    public function discard(Tenant $tenant): void
    {
        $this->billing->discardPaymentMethod($tenant->stripe_id, $tenant->stripe_pm_id);

        $tenant->forceFill([
            'stripe_pm_id' => null,
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ])->save();
    }

    /**
     * A payment succeeded (or the subscription is otherwise healthy). Clears any
     * past-due flag and restores a suspended-for-nonpayment clinic.
     */
    public function markActive(Tenant $tenant): void
    {
        $updates = [
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'payment_failed_at' => null,
        ];

        // Restore access if the clinic had been suspended for non-payment.
        if ($tenant->status === Tenant::STATUS_SUSPENDED) {
            $updates['status'] = Tenant::STATUS_APPROVED;
        }

        $tenant->forceFill($updates)->save();
    }

    /**
     * A payment failed but Stripe is still retrying (dunning). Grace period: the
     * clinic keeps access; we flag it and record when it first failed.
     */
    public function markPastDue(Tenant $tenant): void
    {
        $tenant->forceFill([
            'subscription_status' => Tenant::SUBSCRIPTION_PAST_DUE,
            'payment_failed_at' => $tenant->payment_failed_at ?? now(),
        ])->save();
    }

    /**
     * Recompute actual practitioner counts from the tenant's staff memberships
     * and sync subscription item quantities on Stripe.
     */
    public function syncPractitionerCounts(Tenant $tenant): void
    {
        // Find all active or invited practitioner profiles for this tenant
        $profiles = \App\Models\PractitionerProfile::query()
            ->whereHas('staffMembership', function ($q) use ($tenant) {
                $q->where('tenant_id', $tenant->id)
                    ->whereIn('status', [
                        \App\Models\StaffMembership::STATUS_ACTIVE,
                        \App\Models\StaffMembership::STATUS_INVITED,
                    ]);
            })
            ->get();

        $ftCount = 0;
        $ptCount = 0;

        foreach ($profiles as $profile) {
            if ($profile->employment_type === \App\Models\PractitionerProfile::EMPLOYMENT_PART_TIME) {
                $ptCount++;
            } else {
                $ftCount++;
            }
        }

        // At minimum, 1 full-time practitioner (the clinic owner / primary contact)
        $ftCount = max(1, $ftCount);

        if ($tenant->isBalancePlan()) {
            $ftCount = 1;
            $ptCount = 0;
        }

        $tenant->forceFill([
            'full_time_practitioners_count' => $ftCount,
            'part_time_practitioners_count' => $ptCount,
        ])->save();

        if ($tenant->subscription_status === Tenant::SUBSCRIPTION_ACTIVE) {
            $this->billing->syncSubscriptionQuantities($tenant);
        }
    }

    /**
     * Check if a tenant's plan allows adding another practitioner.
     */
    public function canAddPractitioner(Tenant $tenant): bool
    {
        return $tenant->canAddPractitioner();
    }

    /**
     * The subscription is fully canceled/unpaid — the clinic lapses. Suspend
     * access rather than letting it continue silently.
     */
    public function markCanceled(Tenant $tenant): void
    {
        $tenant->forceFill([
            'subscription_status' => Tenant::SUBSCRIPTION_CANCELED,
            'status' => Tenant::STATUS_SUSPENDED,
        ])->save();
    }
}
