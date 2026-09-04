<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\StaffMembership;
use App\Models\User;
use App\Notifications\StaffInvitationNotification;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StaffInvitationController extends Controller
{
    protected const INVITABLE_ROLES = [
        StaffMembership::ROLE_PRACTITIONER,
        StaffMembership::ROLE_RECEPTIONIST,
        StaffMembership::ROLE_CLINIC_OWNER,
    ];

    /**
     * List staff at the current tenant, plus the invite form.
     */
    public function index(Request $request): Response
    {
        $tenantId = TenantScope::getTenantId();

        $memberships = StaffMembership::with('user')
            ->where('tenant_id', $tenantId)
            ->latest('created_at')
            ->get()
            ->map(fn (StaffMembership $membership) => [
                'id' => $membership->id,
                'name' => $membership->user->name,
                'email' => $membership->user->email,
                'role' => $membership->role,
                'status' => $membership->status,
                'invited_at' => $membership->invited_at?->diffForHumans(),
                'joined_at' => $membership->joined_at?->diffForHumans(),
                // The owner can't act on their own row.
                'is_self' => $membership->user_id === $request->user()->id,
            ]);

        return Inertia::render('Settings/Staff/Index', [
            'staff' => $memberships,
            'roles' => self::INVITABLE_ROLES,
        ]);
    }

    /**
     * Invite a new staff member by email. Creates a placeholder user account
     * (if one doesn't already exist) and an "invited" staff membership; the
     * user only gains real access once they accept via the emailed link.
     */
    public function store(Request $request, \App\Services\ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'string', 'in:'.implode(',', self::INVITABLE_ROLES)],
            'employment_type' => ['nullable', 'string', 'in:full_time,part_time'],
        ]);

        $tenantId = TenantScope::getTenantId();
        $tenant = \App\Models\Tenant::find($tenantId);

        if ($data['role'] === StaffMembership::ROLE_PRACTITIONER && $tenant && ! $subscriptions->canAddPractitioner($tenant)) {
            $limit = $tenant->maxPractitioners() ?? 1;
            return back()->withErrors([
                'role' => "Your current plan ({$tenant->planName()}) is limited to {$limit} practitioner(s). Please upgrade your clinic subscription plan to add more practitioners.",
            ]);
        }

        $user = User::firstOrCreate(
            ['email' => $data['email']],
            [
                'name' => Str::before($data['email'], '@'),
                'password' => Str::password(32),
            ]
        );

        $existing = StaffMembership::where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return back()->withErrors(['email' => 'This person already has a staff membership at this clinic.']);
        }

        $membership = StaffMembership::create([
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'role' => $data['role'],
            'status' => StaffMembership::STATUS_INVITED,
            'invited_at' => now(),
        ]);

        if ($tenant) {
            $subscriptions->syncPractitionerCounts($tenant);
        }

        $this->notifySafely($user, new StaffInvitationNotification($membership));

        return back()->with('success', "Invitation sent to {$data['email']}.");
    }

    /**
     * Suspend / reactivate a staff member (toggle their access without losing
     * their records).
     */
    public function updateStatus(Request $request, StaffMembership $membership, \App\Services\ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([StaffMembership::STATUS_ACTIVE, StaffMembership::STATUS_SUSPENDED])],
        ]);

        // The last-owner guard only applies when we're REVOKING access.
        $this->authorizeManage($request, $membership, revoking: $data['status'] !== StaffMembership::STATUS_ACTIVE);

        $membership->update([
            'status' => $data['status'],
            'joined_at' => $membership->joined_at ?? now(),
        ]);

        if ($membership->tenant) {
            $subscriptions->syncPractitionerCounts($membership->tenant);
        }

        $verb = $data['status'] === StaffMembership::STATUS_ACTIVE ? 'reactivated' : 'suspended';

        return back()->with('success', "Staff member {$verb}.");
    }

    /**
     * Remove a staff member from the clinic. A pending invite is deleted
     * outright; an active/suspended member is DEACTIVATED (access revoked) so
     * their appointments and clinical notes — which cascade-delete with the
     * membership — are preserved.
     */
    public function destroy(Request $request, StaffMembership $membership, \App\Services\ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorizeManage($request, $membership, revoking: true);
        $tenant = $membership->tenant;

        if ($membership->status === StaffMembership::STATUS_INVITED) {
            $membership->delete();

            if ($tenant) {
                $subscriptions->syncPractitionerCounts($tenant);
            }

            return back()->with('success', 'Invitation cancelled.');
        }

        $membership->update(['status' => StaffMembership::STATUS_DEACTIVATED]);

        if ($tenant) {
            $subscriptions->syncPractitionerCounts($tenant);
        }

        return back()->with('success', 'Staff member removed. Their records are retained.');
    }

    /**
     * Shared guardrails for staff management: the membership must belong to the
     * current tenant (subdomain identifies the clinic but never authorizes
     * cross-tenant access), the owner can't act on their own membership, and
     * the clinic's last active owner can't be removed.
     */
    protected function authorizeManage(Request $request, StaffMembership $membership, bool $revoking): void
    {
        $tenantId = TenantScope::getTenantId();

        // Row-level isolation: a {membership} id from another clinic is a 404.
        abort_unless($membership->tenant_id === $tenantId, 404);

        abort_if($membership->user_id === $request->user()->id, 403, 'You cannot change your own membership.');

        if ($revoking && $membership->role === StaffMembership::ROLE_CLINIC_OWNER) {
            $anotherOwner = StaffMembership::where('tenant_id', $tenantId)
                ->where('role', StaffMembership::ROLE_CLINIC_OWNER)
                ->where('status', StaffMembership::STATUS_ACTIVE)
                ->whereKeyNot($membership->id)
                ->exists();

            abort_unless($anotherOwner, 403, "You cannot remove the clinic's only owner.");
        }
    }
}
