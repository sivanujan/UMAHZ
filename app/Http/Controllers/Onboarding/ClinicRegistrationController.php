<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class ClinicRegistrationController extends Controller
{
    /**
     * Show the "Create Your Clinic" signup form. This is the only place a
     * brand-new tenant gets created — everything else (staff, clients)
     * joins an existing tenant via invite or the client registration flow.
     */
    public function create(): Response
    {
        return Inertia::render('Onboarding/Register');
    }

    /**
     * Create the owner's User account, a new Tenant, and the clinic_owner
     * staff membership that links them, then send the owner into email
     * verification before the setup wizard.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'clinic_name' => ['required', 'string', 'max:255'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            $tenant = Tenant::create([
                'name' => $data['clinic_name'],
                'slug' => $this->uniqueSlug($data['clinic_name']),
            ]);

            StaffMembership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => StaffMembership::ROLE_CLINIC_OWNER,
                'status' => StaffMembership::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);

            return $user;
        });

        event(new Registered($user));

        Auth::login($user);

        $user->sendEmailVerificationNotification();

        return redirect()->route('verification.notice');
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'clinic';
        $slug = $base;
        $suffix = 1;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = "{$base}-".(++$suffix);
        }

        return $slug;
    }
}
