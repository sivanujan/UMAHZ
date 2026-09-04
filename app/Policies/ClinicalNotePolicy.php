<?php

namespace App\Policies;

use App\Models\ClinicalNote;
use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class ClinicalNotePolicy
{
    /**
     * Determine whether the user can view the clinical note (metadata or full record).
     */
    public function view(User $user, ClinicalNote $note): bool
    {
        $membership = $this->membershipForTenant($user, $note->tenant_id);
        if (! $membership) {
            return false;
        }

        // Owners and practitioners in the clinic can view clinical notes
        if (in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER, StaffMembership::ROLE_RECEPTIONIST], true)) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can read the sensitive clinical note content/body.
     * Receptionists are strictly forbidden from viewing the clinical note body.
     */
    public function viewBody(User $user, ClinicalNote $note): bool
    {
        $membership = $this->membershipForTenant($user, $note->tenant_id);
        if (! $membership) {
            return false;
        }

        return in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER], true);
    }

    /**
     * Determine whether the user can create a clinical note draft.
     */
    public function create(User $user): bool
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId) {
            $membership = $user->activeWorkspaceMemberships()->first();
            $tenantId = $membership?->tenant_id;
        }

        if (! $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);
        if (! $membership) {
            return false;
        }

        return in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER], true);
    }

    /**
     * Determine whether the user can update/autosave the draft note.
     * Once finalized, a note is immutable and cannot be updated.
     */
    public function update(User $user, ClinicalNote $note): bool
    {
        if ($note->isImmutable()) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $note->tenant_id);
        if (! $membership) {
            return false;
        }

        // Only the assigned practitioner or clinic owner can edit the draft
        if ($membership->role === StaffMembership::ROLE_CLINIC_OWNER) {
            return true;
        }

        if ($membership->role === StaffMembership::ROLE_PRACTITIONER) {
            return ! $note->staff_membership_id || (string) $note->staff_membership_id === (string) $membership->id;
        }

        return false;
    }

    /**
     * Determine whether the user can finalize and sign the note.
     */
    public function finalize(User $user, ClinicalNote $note): bool
    {
        if ($note->isImmutable()) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $note->tenant_id);
        if (! $membership) {
            return false;
        }

        return in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER], true);
    }

    /**
     * Determine whether the user can append a signed addendum to a finalized note.
     */
    public function addAddendum(User $user, ClinicalNote $note): bool
    {
        if (! $note->isImmutable()) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $note->tenant_id);
        if (! $membership) {
            return false;
        }

        return in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_PRACTITIONER], true);
    }

    /**
     * Determine whether the user can delete a note.
     * Finalized and addended notes are legal healthcare records and can NEVER be deleted.
     */
    public function delete(User $user, ClinicalNote $note): bool
    {
        if ($note->isImmutable()) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $note->tenant_id);
        if (! $membership) {
            return false;
        }

        if ($membership->role === StaffMembership::ROLE_CLINIC_OWNER) {
            return true;
        }

        if ($membership->role === StaffMembership::ROLE_PRACTITIONER) {
            return ! $note->staff_membership_id || (string) $note->staff_membership_id === (string) $membership->id;
        }

        return false;
    }

    private function membershipForTenant(User $user, string $tenantId): ?StaffMembership
    {
        return StaffMembership::where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->first();
    }
}
