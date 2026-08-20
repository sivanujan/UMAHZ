<?php

namespace App\Policies;

use App\Models\PractitionerProfile;
use App\Models\User;

class PractitionerProfilePolicy
{
    /**
     * Review (approve / reject) a practitioner's license verification, and
     * view their submitted document. Platform admins only.
     */
    public function review(User $user, PractitionerProfile $practitionerProfile): bool
    {
        return $user->isPlatformAdmin();
    }

    public function viewDocument(User $user, PractitionerProfile $practitionerProfile): bool
    {
        return $user->isPlatformAdmin();
    }
}
