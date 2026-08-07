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
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'string', 'in:'.implode(',', self::INVITABLE_ROLES)],
        ]);

        $tenantId = TenantScope::getTenantId();

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

        $user->notify(new StaffInvitationNotification($membership));

        return back()->with('success', "Invitation sent to {$data['email']}.");
    }
}
