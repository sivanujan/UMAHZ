<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\StaffMembership;
use App\Models\User;
use App\Scopes\TenantScope;

class AppointmentPolicy
{
    /**
     * Determine whether the user can view the appointment.
     */
    public function view(User $user, Appointment $appointment): bool
    {
        $tenantId = TenantScope::getTenantId();
        if ($appointment->tenant_id !== $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);
        if (! $membership) {
            return false;
        }

        // Owners and receptionists can view any appointment in the clinic
        if (in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_RECEPTIONIST], true)) {
            return true;
        }

        // Practitioners can ONLY view appointments assigned to their staff membership
        return $appointment->staff_membership_id === $membership->id;
    }

    /**
     * Determine whether the user can update the appointment status.
     * Practitioners can only update status on appointments assigned to them.
     */
    public function updateStatus(User $user, Appointment $appointment): bool
    {
        $tenantId = TenantScope::getTenantId();
        if ($appointment->tenant_id !== $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);
        if (! $membership) {
            return false;
        }

        // Owners and receptionists can update status of any appointment in the clinic
        if (in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_RECEPTIONIST], true)) {
            return true;
        }

        // Practitioners can ONLY update status on their own appointments
        return $appointment->staff_membership_id === $membership->id;
    }

    /**
     * Determine whether the user can update appointment notes.
     */
    public function updateNotes(User $user, Appointment $appointment): bool
    {
        return $this->updateStatus($user, $appointment);
    }

    /**
     * Determine whether the user can modify booking details (time, service, room, client).
     * Strictly restricted to owners and receptionists — practitioners cannot reschedule or reassign.
     */
    public function update(User $user, Appointment $appointment): bool
    {
        $tenantId = TenantScope::getTenantId();
        if ($appointment->tenant_id !== $tenantId) {
            return false;
        }

        $membership = $this->membershipForTenant($user, $tenantId);
        if (! $membership) {
            return false;
        }

        return in_array($membership->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_RECEPTIONIST], true);
    }

    /**
     * Determine whether the user can cancel the appointment.
     * Cancellation is reserved for owners and receptionists.
     */
    public function cancel(User $user, Appointment $appointment): bool
    {
        return $this->update($user, $appointment);
    }

    /**
     * Resolve the active staff membership for the current user in the tenant.
     */
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
