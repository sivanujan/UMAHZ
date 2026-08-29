<?php

namespace App\Policies;

use App\Models\IntakeFormTemplate;
use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class IntakeFormTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasTenantAccess($user);
    }

    public function view(User $user, IntakeFormTemplate $template): bool
    {
        return $this->hasTenantAccess($user) && $template->tenant_id === TenantScope::getTenantId();
    }

    public function update(User $user, IntakeFormTemplate $template): bool
    {
        if ($template->tenant_id !== TenantScope::getTenantId()) {
            return false;
        }

        $membership = $user->staffMemberships()
            ->where('tenant_id', $template->tenant_id)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->first();

        return in_array($membership?->role, [
            StaffMembership::ROLE_CLINIC_OWNER,
            StaffMembership::ROLE_PLATFORM_ADMIN,
        ], true);
    }

    private function hasTenantAccess(User $user): bool
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
}
