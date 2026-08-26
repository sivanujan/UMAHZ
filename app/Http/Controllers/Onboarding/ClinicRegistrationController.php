<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ClinicApplicationReceivedNotification;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class ClinicRegistrationController extends Controller
{
    public const DISCIPLINES = [
        PractitionerProfile::PROFESSION_MASSAGE_THERAPY,
        PractitionerProfile::PROFESSION_ACUPUNCTURE_TCM,
        PractitionerProfile::PROFESSION_PERSONAL_TRAINING,
        PractitionerProfile::PROFESSION_NUTRITION,
        PractitionerProfile::PROFESSION_COLON_HYDROTHERAPY,
    ];

    /**
     * Show the "Apply to Join" clinic application form. This is the only
     * place a brand-new tenant gets created — everything else (staff,
     * clients) joins an existing tenant via invite or the client
     * registration flow.
     */
    public function create(): Response
    {
        return Inertia::render('Onboarding/Register', [
            'disciplines' => self::DISCIPLINES,
        ]);
    }

    /**
     * Create the owner's User account, a new Tenant in pending_review, the
     * clinic_owner staff membership, and a primary PractitionerProfile
     * carrying the license info submitted with the application. Nothing
     * here grants workspace access — EnsureStaffRole blocks every /app
     * route until a super admin approves the tenant.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],

            'clinic_name' => ['required', 'string', 'max:255'],
            'business_registration_number' => ['nullable', 'string', 'max:100'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_city' => ['nullable', 'string', 'max:120'],
            'address_region' => ['nullable', 'string', 'max:120'],
            'address_country' => ['nullable', 'string', 'max:120'],

            'primary_contact_name' => ['required', 'string', 'max:255'],
            'primary_contact_email' => ['required', 'email', 'max:255'],
            'primary_contact_phone' => ['required', 'string', 'max:50'],

            'requested_disciplines' => ['required', 'array', 'min:1'],
            'requested_disciplines.*' => [Rule::in(self::DISCIPLINES)],
            'estimated_practitioner_count' => ['required', 'integer', 'min:1', 'max:500'],

            'license_number' => ['required', 'string', 'max:100'],
            'licensing_body' => ['required', 'string', 'max:255'],
            'license_document' => ['required', 'file', 'extensions:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $primaryDiscipline = $data['requested_disciplines'][0];
        $document = $request->file('license_document');

        $user = DB::transaction(function () use ($data, $primaryDiscipline, $document) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            $tenant = Tenant::create([
                'name' => $data['clinic_name'],
                'slug' => $this->uniqueSlug($data['clinic_name']),
                'status' => Tenant::STATUS_PENDING_REVIEW,
                'business_registration_number' => $data['business_registration_number'] ?? null,
                'address' => [
                    'line1' => $data['address_line1'] ?? null,
                    'city' => $data['address_city'] ?? null,
                    'region' => $data['address_region'] ?? null,
                    'country' => $data['address_country'] ?? null,
                ],
                'primary_contact_name' => $data['primary_contact_name'],
                'primary_contact_email' => $data['primary_contact_email'],
                'primary_contact_phone' => $data['primary_contact_phone'],
                'requested_disciplines' => $data['requested_disciplines'],
                'estimated_practitioner_count' => $data['estimated_practitioner_count'],
                'submitted_at' => now(),
            ]);

            $membership = StaffMembership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => StaffMembership::ROLE_CLINIC_OWNER,
                'status' => StaffMembership::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);

            // storeAs (not store) — store()'s auto-generated filename guesses
            // the extension from file content via ext-fileinfo, which isn't
            // guaranteed to be enabled; the client-supplied extension is fine
            // since we already validated it against an explicit allow-list.
            $path = $document->storeAs(
                "licenses/{$tenant->id}",
                Str::uuid().'.'.$document->getClientOriginalExtension(),
                'local'
            );

            PractitionerProfile::create([
                'staff_membership_id' => $membership->id,
                'profession' => $primaryDiscipline,
                'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
                'license_number' => $data['license_number'],
                'licensing_body' => $data['licensing_body'],
                'license_document_path' => $path,
                'license_document_original_name' => $document->getClientOriginalName(),
                'license_document_mime' => $document->getClientMimeType(),
                'is_primary_contact' => true,
            ]);

            return $user;
        });

        event(new Registered($user));

        Auth::login($user);

        $this->notifySafely($user, new ClinicApplicationReceivedNotification($user->tenants()->first()));

        return redirect()->route('clinic.status');
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
