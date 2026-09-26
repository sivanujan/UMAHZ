<?php

namespace App\Policies;

use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scopes\TenantScope;

/**
 * Encounter audio and transcripts are highly sensitive health data.
 *  - Only the practitioner running the session can record or manage it.
 *  - The clinic owner may also view it and withdraw consent on the client's behalf.
 *  - Receptionists (and other practitioners) can never access it.
 *  - Nothing crosses tenants.
 */
class ScribeSessionPolicy
{
    public function create(User $user): bool
    {
        $tenantId = TenantScope::getTenantId();
        $membership = $tenantId ? $this->membership($user, $tenantId) : null;

        return $membership
            && in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER], true)
            && (bool) Tenant::find($tenantId)?->scribeEnabled();
    }

    public function view(User $user, ScribeSession $session): bool
    {
        $membership = $this->membershipForSession($user, $session);
        if (! $membership) {
            return false;
        }

        if ($membership->role === StaffMembership::ROLE_CLINIC_OWNER) {
            return true;
        }

        return $membership->role === StaffMembership::ROLE_PRACTITIONER
            && (string) $session->staff_membership_id === (string) $membership->id;
    }

    /**
     * Start / pause / resume / stop / upload audio / capture consent / retry.
     */
    public function record(User $user, ScribeSession $session): bool
    {
        $membership = $this->membershipForSession($user, $session);

        return $membership
            && in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER], true)
            && (string) $session->staff_membership_id === (string) $membership->id;
    }

    public function withdrawConsent(User $user, ScribeSession $session): bool
    {
        return $this->view($user, $session);
    }

    /**
     * Scribe sessions are part of the clinical record trail: never deleted.
     */
    public function delete(User $user, ScribeSession $session): bool
    {
        return false;
    }

    private function membershipForSession(User $user, ScribeSession $session): ?StaffMembership
    {
        // Must match BOTH the request's tenant and the session's tenant.
        if ($session->tenant_id !== TenantScope::getTenantId()) {
            return null;
        }

        return $this->membership($user, $session->tenant_id);
    }

    private function membership(User $user, string $tenantId): ?StaffMembership
    {
        return StaffMembership::where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->first();
    }
}
