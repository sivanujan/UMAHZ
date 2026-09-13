<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\StaffMembership;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class PlatformStaffController extends Controller
{
    /**
     * Display a listing of all platform staff members and administrators.
     */
    public function index(Request $request): Response
    {
        // Get all users who have the Platform Admin role or a platform_admin staff membership
        $staff = User::query()
            ->where(function ($query) {
                $query->whereHas('roles', function ($q) {
                    $q->where('name', 'Platform Admin');
                })->orWhereHas('staffMemberships', function ($q) {
                    $q->where('role', StaffMembership::ROLE_PLATFORM_ADMIN);
                });
            })
            ->latest('created_at')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'email_verified' => ! is_null($user->email_verified_at),
                'email_verified_at' => $user->email_verified_at?->format('M j, Y'),
                'two_factor_enabled' => ! is_null($user->two_factor_secret),
                'is_current_user' => $user->id === $request->user()->id,
                'created_at' => $user->created_at?->format('M j, Y'),
            ]);

        return Inertia::render('Admin/Staff/Index', [
            'staff' => $staff,
        ]);
    }

    /**
     * Store a newly created platform staff member.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'string', Password::defaults()],
        ]);

        $user = DB::transaction(function () use ($validated, $request) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => $validated['password'],
                'email_verified_at' => now(),
            ]);

            // Ensure the role exists and assign it
            Role::firstOrCreate(['name' => 'Platform Admin', 'guard_name' => 'web']);
            $user->assignRole('Platform Admin');

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'action' => 'platform_staff.created',
                'resource_type' => User::class,
                'resource_id' => $user->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'email' => $user->email,
                    'name' => $user->name,
                ],
            ]);

            return $user;
        });

        return back()->with('success', "Platform admin {$user->name} has been added.");
    }

    /**
     * Update the specified platform staff member.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', Password::defaults()],
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
        ];

        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        $user->update($data);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'action' => 'platform_staff.updated',
            'resource_type' => User::class,
            'resource_id' => $user->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'email' => $user->email,
                'name' => $user->name,
                'password_reset' => ! empty($validated['password']),
            ],
        ]);

        return back()->with('success', "Platform admin {$user->name} updated successfully.");
    }

    /**
     * Remove the specified platform staff member.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        // 1. Prevent removing self
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['destroy' => 'You cannot remove your own platform admin account.']);
        }

        // 2. Prevent removing the last admin
        $totalAdmins = User::query()
            ->where(function ($query) {
                $query->whereHas('roles', fn ($q) => $q->where('name', 'Platform Admin'))
                    ->orWhereHas('staffMemberships', fn ($q) => $q->where('role', StaffMembership::ROLE_PLATFORM_ADMIN));
            })->count();

        if ($totalAdmins <= 1) {
            return back()->withErrors(['destroy' => 'Cannot remove the last remaining platform administrator.']);
        }

        $adminName = $user->name;

        DB::transaction(function () use ($user, $request) {
            // Revoke Platform Admin role
            if ($user->hasRole('Platform Admin')) {
                $user->removeRole('Platform Admin');
            }

            // Remove any platform_admin memberships
            $user->staffMemberships()
                ->where('role', StaffMembership::ROLE_PLATFORM_ADMIN)
                ->delete();

            // If user has no other clinic staff roles and is not a client, delete the user entirely
            if (! $user->staffMemberships()->exists() && ! $user->clients()->exists()) {
                $user->delete();
            }

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'action' => 'platform_staff.removed',
                'resource_type' => User::class,
                'resource_id' => $user->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'email' => $user->email,
                    'name' => $user->name,
                ],
            ]);
        });

        return back()->with('success', "Platform admin {$adminName} was removed.");
    }
}
