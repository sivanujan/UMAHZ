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
        // Count all active or invited practitioners for this tenant
        $practitionersCount = \App\Models\StaffMembership::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->where('role', \App\Models\StaffMembership::ROLE_PRACTITIONER)
                    ->orWhereHas('practitionerProfile');
            })
            ->whereIn('status', [
                \App\Models\StaffMembership::STATUS_ACTIVE,
                \App\Models\StaffMembership::STATUS_INVITED,
            ])
            ->count();

        // At minimum, 1 full-time practitioner (the clinic owner / primary contact)
        $practitionersCount = max(1, $practitionersCount);

        if ($tenant->isBalancePlan()) {
            $practitionersCount = 1;
        }

        $included = $tenant->plan?->included_practitioners ?? 1;
        $extraSeats = max(0, $practitionersCount - $included);

        $tenant->forceFill([
            'full_time_practitioners_count' => $practitionersCount,
            'part_time_practitioners_count' => 0,
            'extra_practitioner_seats' => $extraSeats,
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
        ])->save();
    }
}
