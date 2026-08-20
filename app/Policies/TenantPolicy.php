<?php

namespace App\Policies;

use App\Models\Tenant;
use App\Models\User;

class TenantPolicy
{
    /**
     * Review (approve / request info / reject) a clinic application, and view
     * its submitted documents. Platform admins only — clinic staff never
     * review their own application.
     */
    public function review(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformAdmin();
    }

    public function viewDocuments(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformAdmin();
    }
}
