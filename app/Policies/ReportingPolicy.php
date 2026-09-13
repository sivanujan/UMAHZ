<?php

namespace App\Policies;

use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class ReportingPolicy
{
    /**
     * Determine whether the user can view operational reports (Appointments, Retention, Utilization).
     */
    public function viewAny(User $user): bool
    {
        $membership = $this->membershipForCurrentTenant($user);
        if (! $membership) {
            return $user->is_platform_admin ?? false;
        }

        return in_array($membership->role, [
            StaffMembership::ROLE_CLINIC_OWNER,
            StaffMembership::ROLE_PRACTITIONER,
            StaffMembership::ROLE_RECEPTIONIST,
        ], true);
    }

    /**
     * Determine whether the user can view financial and revenue reports (OWNER-ONLY).
     */
    public function viewFinancial(User $user): bool
    {
        if ($user->is_platform_admin ?? false) {
            return true;
        }

        $membership = $this->membershipForCurrentTenant($user);
        if (! $membership) {
            return false;
        }

        return $membership->role === StaffMembership::ROLE_CLINIC_OWNER;
    }

    /**
     * Determine whether the user can export financial reports to CSV (OWNER-ONLY).
     */
    public function exportFinancial(User $user): bool
    {
        return $this->viewFinancial($user);
    }

    /**
     * Determine whether the user can export operational reports to CSV.
     */
    public function export(User $user): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Resolve the active staff membership for the current user in the active tenant.
     */
    private function membershipForCurrentTenant(User $user): ?StaffMembership
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId) {
            return null;
        }

        return $user->activeStaffMemberships()
            ->where('tenant_id', $tenantId)
            ->first();
    }
}
