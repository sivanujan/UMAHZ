<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\NotDisposableEmail;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * The current Terms of Service version. Bump this string whenever the
     * ToS changes; existing acceptances remain tied to the version they
     * agreed to.
     */
    protected const TOS_VERSION = '2026-01-01';

    protected const CONTACT_METHODS = ['email', 'phone', 'sms'];

    /**
     * Display the client self-registration view.
     */
    public function create(Request $request): Response
    {
        $tenants = Tenant::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        $preselectedTenant = $request->query('clinic');

        return Inertia::render('Auth/Register', [
            'tenants' => $tenants,
            'preselectedTenantSlug' => $preselectedTenant,
            'tosVersion' => self::TOS_VERSION,
        ]);
    }

    /**
     * Handle an incoming client registration request. Staff accounts are
     * never created here — they are invite-only (see StaffInvitationController).
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class, new NotDisposableEmail()],
            'phone' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()->min(12)],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'preferred_contact_method' => ['required', Rule::in(self::CONTACT_METHODS)],
            'tenant_id' => ['required', 'uuid', Rule::exists('tenants', 'id')],
            'tos_accepted' => ['accepted'],
            'marketing_opt_in' => ['boolean'],
        ]);

        $user = User::create([
            'name' => trim($data['first_name'].' '.$data['last_name']),
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($data['password']),
            'tos_accepted_version' => self::TOS_VERSION,
            'tos_accepted_at' => now(),
            'marketing_opt_in' => $data['marketing_opt_in'] ?? false,
            'marketing_opt_in_at' => ($data['marketing_opt_in'] ?? false) ? now() : null,
        ]);

        // If reception already added this person as a walk-in client (no
        // login yet), link this registration to that existing record
        // instead of creating a duplicate.
        $existingClient = Client::where('tenant_id', $data['tenant_id'])
            ->where('email', $data['email'])
            ->whereNull('user_id')
            ->first();

        if ($existingClient) {
            $existingClient->fill([
                'user_id' => $user->id,
                'phone' => $existingClient->phone ?: $data['phone'],
                'date_of_birth' => $existingClient->date_of_birth ?: $data['date_of_birth'],
                'preferred_contact_method' => $existingClient->preferred_contact_method ?: $data['preferred_contact_method'],
            ])->save();
        } else {
            Client::create([
                'tenant_id' => $data['tenant_id'],
                'user_id' => $user->id,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'date_of_birth' => $data['date_of_birth'],
                'preferred_contact_method' => $data['preferred_contact_method'],
            ]);
        }

        // Fires the framework's SendEmailVerificationNotification listener,
        // which dispatches our branded VerifyEmailNotification to the new user.
        event(new Registered($user));

        Auth::login($user);

        // The portal (and every other app area) sits behind the 'verified'
        // middleware, so send the new user to the "check your email" notice
        // until they confirm their address.
        return redirect()->route('verification.notice');
    }
}
