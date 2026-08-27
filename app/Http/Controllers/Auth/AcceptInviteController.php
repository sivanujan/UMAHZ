<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\PractitionerProfile;
use App\Http\Controllers\Controller;
use App\Models\StaffMembership;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

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
            // Practitioners provide license info + document as part of
            // accepting — this is the "lighter secondary" verification
            // queue the clinic's own operation never blocks on.
            'requiresLicense' => $staffMembership->role === StaffMembership::ROLE_PRACTITIONER,
            'disciplines' => ClinicRegistrationController::DISCIPLINES,
        ]);
    }

    /**
     * Activate the invited account: set a real password, mark the
     * membership active, and sign the user in.
     */
    public function store(Request $request, StaffMembership $staffMembership): HttpResponse|RedirectResponse
    {
        if ($staffMembership->status !== StaffMembership::STATUS_INVITED) {
            return redirect()->route('login')->with('status', 'This invitation has already been used or is no longer valid.');
        }

        $isPractitioner = $staffMembership->role === StaffMembership::ROLE_PRACTITIONER;

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];

        if ($isPractitioner) {
            $rules += [
                'discipline' => ['required', Rule::in(ClinicRegistrationController::DISCIPLINES)],
                'license_number' => ['required', 'string', 'max:100'],
                'licensing_body' => ['required', 'string', 'max:255'],
                'license_document' => ['required', 'file', 'extensions:pdf,jpg,jpeg,png', 'max:10240'],
            ];
        }

        $data = $request->validate($rules);

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

        if ($isPractitioner) {
            $document = $request->file('license_document');
            $path = $document->storeAs(
                "licenses/{$staffMembership->tenant_id}",
                Str::uuid().'.'.$document->getClientOriginalExtension(),
                'local'
            );

            PractitionerProfile::create([
                'staff_membership_id' => $staffMembership->id,
                'profession' => $data['discipline'],
                'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
                'license_number' => $data['license_number'],
                'licensing_body' => $data['licensing_body'],
                'license_document_path' => $path,
                'license_document_original_name' => $document->getClientOriginalName(),
                'license_document_mime' => $document->getClientMimeType(),
                'is_primary_contact' => false,
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('current_tenant_id', $staffMembership->tenant_id);

        $message = $isPractitioner
            ? 'Your account is active. Your license is pending verification by our team, but you have full access in the meantime.'
            : 'Your account is now active. Welcome aboard!';

        // Invite acceptance happens on the central domain; send the new staff
        // member into their clinic's subdomain workspace (cross-host: Inertia
        // location visit).
        $request->session()->flash('success', $message);

        return Tenancy::redirectTo($request, $staffMembership->tenant->appUrl('/app/dashboard'));
    }
}
