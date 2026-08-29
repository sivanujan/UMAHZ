<?php

namespace App\Policies;

use App\Models\Consent;
use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class ConsentPolicy
{
    /**
     * Determine whether the user can view the consent document.
     */
    public function view(User $user, Consent $consent): bool
    {
        $tenantId = TenantScope::getTenantId();
        if ($consent->tenant_id !== $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);

        return $membership && $membership->status === StaffMembership::STATUS_ACTIVE;
    }

    /**
     * Determine whether the user can record/capture a consent for a client.
     */
    public function create(User $user): bool
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);

        return $membership && $membership->status === StaffMembership::STATUS_ACTIVE;
    }

    /**
     * Signed consents are immutable: updating is permanently blocked.
     */
    public function update(User $user, Consent $consent): bool
    {
        return false;
    }

    /**
     * Determine whether the user can withdraw a signed consent.
     */
    public function withdraw(User $user, Consent $consent): bool
    {
        return $this->view($user, $consent);
    }

    /**
     * Hard-deleting consent records is not permitted (must be marked withdrawn to preserve audit trail).
     */
    public function delete(User $user, Consent $consent): bool
    {
        return false;
    }

    private function membershipForTenant(User $user, ?string $tenantId): ?StaffMembership
    {
        if (! $tenantId) {
            return null;
        }

        return $user->activeStaffMemberships()
            ->where('tenant_id', $tenantId)
            ->first();
    }
}
