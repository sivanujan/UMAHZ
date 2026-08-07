<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\StaffMembership;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class AcceptInviteController extends Controller
{
    /**
     * Show the "set your password" form for an invited staff member.
     * The route is protected by the `signed` middleware, so reaching this
     * method already proves possession of the emailed link.
     */
    public function show(Request $request, StaffMembership $staffMembership): Response|RedirectResponse
    {
        if ($staffMembership->status !== StaffMembership::STATUS_INVITED) {
            return redirect()->route('login')->with('status', 'This invitation has already been used or is no longer valid.');
        }

        $staffMembership->loadMissing('user', 'tenant');

        return Inertia::render('Auth/AcceptInvite', [
            'staffMembership' => $staffMembership->id,
            'name' => $staffMembership->user->name,
            'email' => $staffMembership->user->email,
            'tenantName' => $staffMembership->tenant->name,
            'role' => $staffMembership->role,
            'signature' => $request->query('signature'),
            'expires' => $request->query('expires'),
        ]);
    }

    /**
     * Activate the invited account: set a real password, mark the
     * membership active, and sign the user in.
     */
    public function store(Request $request, StaffMembership $staffMembership): RedirectResponse
    {
        if ($staffMembership->status !== StaffMembership::STATUS_INVITED) {
            return redirect()->route('login')->with('status', 'This invitation has already been used or is no longer valid.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $staffMembership->loadMissing('user');
        $user = $staffMembership->user;

        $user->forceFill([
            'name' => $data['name'],
            'password' => Hash::make($data['password']),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        $staffMembership->forceFill([
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ])->save();

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('current_tenant_id', $staffMembership->tenant_id);

        return redirect()->route('app.dashboard')->with('success', 'Your account is now active. Welcome aboard!');
    }
}
