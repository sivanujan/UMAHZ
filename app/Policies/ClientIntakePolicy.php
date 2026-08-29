<?php

namespace App\Policies;

use App\Models\ClientIntake;
use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class ClientIntakePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasTenantAccess($user);
    }

    public function view(User $user, ClientIntake $intake): bool
    {
        return $this->hasTenantAccess($user) && $intake->tenant_id === TenantScope::getTenantId();
    }

    public function create(User $user): bool
    {
        return $this->hasTenantAccess($user);
    }

    public function update(User $user, ClientIntake $intake): bool
    {
        // Completed intakes are immutable healthcare records
        return false;
    }

    public function delete(User $user, ClientIntake $intake): bool
    {
        // Only pending links that have not been filled can be cancelled/deleted
        return $intake->status === ClientIntake::STATUS_PENDING && $this->hasTenantAccess($user);
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
