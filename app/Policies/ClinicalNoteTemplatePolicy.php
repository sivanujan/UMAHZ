<?php

namespace App\Policies;

use App\Models\ClinicalNoteTemplate;
use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class ClinicalNoteTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasActiveMembership($user);
    }

    public function view(User $user, ClinicalNoteTemplate $template): bool
    {
        return $this->hasActiveMembership($user) && $template->tenant_id === TenantScope::getTenantId();
    }

    public function update(User $user, ClinicalNoteTemplate $template): bool
    {
        $tenantId = TenantScope::getTenantId();
        if ($template->tenant_id !== $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);

        return $membership && $membership->role === StaffMembership::ROLE_CLINIC_OWNER;
    }

    private function hasActiveMembership(User $user): bool
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId) {
            return false;
        }

        return $user->staffMemberships()
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->exists();
    }

    private function membershipForTenant(User $user, string $tenantId): ?StaffMembership
    {
        return $user->staffMemberships()
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->first();
    }
}
