<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\IntakeFormTemplate;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\NotDisposableEmail;
use App\Notifications\ClinicApplicationReceivedNotification;
use App\Notifications\ClinicVerificationCodeNotification;
use App\Support\Disciplines;
use App\Support\EmailVerificationCode;
use App\Support\Tenancy;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
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
            'disciplineLabels' => Disciplines::FIXED_LABELS,
            'subdomainSuffix' => '.'.Tenancy::centralDomain(),
            'provinces' => \App\Support\ClinicOptions::PROVINCES,
        ]);
    }

    /**
     * Live availability + validity check for the subdomain field in the
     * wizard. Applies the same rules as store() so the client can never get a
     * "looks available" answer that the server would then reject.
     */
    public function checkSubdomain(Request $request): JsonResponse
    {
        $subdomain = Tenancy::normalize($request->query('subdomain'));

        $validator = Validator::make(
            ['subdomain' => $subdomain],
            ['subdomain' => Tenancy::rules()],
        );

        return response()->json([
            'subdomain' => $subdomain,
            'available' => $validator->passes(),
            'reason' => $validator->errors()->first('subdomain'),
        ]);
    }

    /**
     * Email an applicant a fresh verification code (step 1 of the wizard).
     * The account doesn't exist yet, so the code lives in the cache and the
     * mail is sent on-demand. Rate-limited by route middleware plus a
     * per-email resend cooldown.
     */
    public function sendCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', new NotDisposableEmail()],
        ]);

        $email = strtolower(trim($data['email']));

        if (User::where('email', $email)->exists()) {
            return response()->json([
                'sent' => false,
                'reason' => 'An account with this email already exists. Please sign in instead.',
            ], 422);
        }

        $wait = EmailVerificationCode::remainingCooldown($email);

        if ($wait > 0) {
            return response()->json([
                'sent' => false,
                'reason' => "Please wait {$wait}s before requesting another code.",
                'cooldown' => $wait,
            ], 429);
        }

        $code = EmailVerificationCode::generate($email);

        Notification::route('mail', $email)->notify(new ClinicVerificationCodeNotification($code));

        return response()->json([
            'sent' => true,
            'cooldown' => EmailVerificationCode::RESEND_COOLDOWN,
        ]);
    }

    /**
     * Check a submitted verification code. On success a short-lived "verified"
     * marker is written that store() later requires.
     */
    public function verifyCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string'],
        ]);

        $status = EmailVerificationCode::verify(strtolower(trim($data['email'])), $data['code']);

        return response()->json([
            'verified' => $status === 'ok',
            'reason' => match ($status) {
                'ok' => null,
                'expired' => 'That code has expired — request a new one.',
                'locked' => 'Too many attempts — request a new code.',
                default => 'That code is incorrect.',
            },
        ]);
    }

    /**
     * Create the owner's User account, a new Tenant in pending_review, the
     * clinic_owner staff membership, and a primary PractitionerProfile
     * carrying the license info submitted with the application. Nothing
     * here grants workspace access — EnsureStaffRole blocks every /app
     * route until a super admin approves the tenant.
     */
    public function store(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        // Normalise before validation so the `lowercase` rule reflects intent,
        // not casing the user happened to type.
        $request->merge(['subdomain' => Tenancy::normalize($request->input('subdomain'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class, new NotDisposableEmail()],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],

            'clinic_name' => ['required', 'string', 'max:255'],
            'subdomain' => Tenancy::rules(),
            'business_registration_number' => ['nullable', 'string', 'max:100'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_city' => ['nullable', 'string', 'max:120'],
            'address_region' => ['nullable', 'string', 'max:120'],
            'address_country' => ['nullable', 'string', 'max:120'],
            'address_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng' => ['nullable', 'numeric', 'between:-180,180'],

            'primary_contact_name' => ['required', 'string', 'max:255'],
            'primary_contact_email' => ['required', 'email', 'max:255', new NotDisposableEmail()],
            'primary_contact_phone' => ['required', 'string', 'max:50'],

            'requested_disciplines' => ['required', 'array', 'min:1'],
            'requested_disciplines.*' => ['required', 'string', 'max:60'],
            'custom_disciplines' => ['nullable', 'array', 'max:30'],
            'custom_disciplines.*' => ['nullable'],
            'estimated_practitioner_count' => ['required', 'integer', 'min:1', 'max:500'],

            'license_number' => ['required', 'string', 'max:100'],
            'licensing_body' => ['required', 'string', 'max:255'],
            'license_document' => ['required', 'file', 'extensions:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        // Process and validate custom disciplines
        $customDisciplines = [];
        $customSlugs = [];
        $fixedCodes = self::DISCIPLINES;
        $fixedLabelsLower = array_map('strtolower', Disciplines::FIXED_LABELS);

        if (! empty($data['custom_disciplines']) && is_array($data['custom_disciplines'])) {
            foreach ($data['custom_disciplines'] as $item) {
                $rawLabel = is_array($item) ? ($item['label'] ?? '') : (string) $item;
                $label = Disciplines::sanitizeLabel($rawLabel);
                if (empty($label)) {
                    continue;
                }
                if (mb_strlen($label) > 50) {
                    throw ValidationException::withMessages([
                        'custom_disciplines' => 'Custom discipline name may not be greater than 50 characters.',
                    ]);
                }
                $slug = is_array($item) && ! empty($item['slug'])
                    ? Disciplines::slugify((string) $item['slug'])
                    : Disciplines::slugify($label);

                if (empty($slug)) {
                    continue;
                }

                // Disallow duplicate of fixed 5
                if (in_array($slug, $fixedCodes, true) || in_array(strtolower($label), $fixedLabelsLower, true)) {
                    throw ValidationException::withMessages([
                        'custom_disciplines' => "The discipline \"{$label}\" is already a standard platform discipline.",
                    ]);
                }

                // Disallow duplicate within custom list
                if (in_array($slug, $customSlugs, true)) {
                    throw ValidationException::withMessages([
                        'custom_disciplines' => "Duplicate custom discipline \"{$label}\" provided.",
                    ]);
                }

                $customSlugs[] = $slug;
                $customDisciplines[] = [
                    'slug' => $slug,
                    'label' => $label,
                ];
            }
        }

        // Validate requested_disciplines are all either in fixedCodes or in customSlugs
        $allowedCodes = array_merge($fixedCodes, $customSlugs);
        foreach ($data['requested_disciplines'] as $reqDisc) {
            if (! in_array($reqDisc, $allowedCodes, true)) {
                throw ValidationException::withMessages([
                    'requested_disciplines' => "Invalid discipline selected: {$reqDisc}.",
                ]);
            }
        }

        // The client can't be trusted to have completed the code step — the
        // email must carry a server-side "verified" marker or we refuse.
        if (! EmailVerificationCode::isVerified($data['email'])) {
            throw ValidationException::withMessages([
                'email' => 'Please verify your email with the code we sent you before submitting.',
            ]);
        }

        $primaryDiscipline = $data['requested_disciplines'][0];
        $document = $request->file('license_document');

        $user = DB::transaction(function () use ($data, $customDisciplines, $primaryDiscipline, $document) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            // Email ownership was already proven by the code at step 1, so the
            // account starts verified — no after-the-fact verification link.
            $user->markEmailAsVerified();

            $tenant = Tenant::create([
                'name' => $data['clinic_name'],
                'slug' => $this->uniqueSlug($data['clinic_name']),
                'subdomain' => $data['subdomain'],
                'status' => Tenant::STATUS_PENDING_REVIEW,
                'business_registration_number' => $data['business_registration_number'] ?? null,
                'address' => [
                    'line1' => $data['address_line1'] ?? null,
                    'city' => $data['address_city'] ?? null,
                    'region' => $data['address_region'] ?? null,
                    'country' => $data['address_country'] ?? null,
                    'lat' => $data['address_lat'] ?? null,
                    'lng' => $data['address_lng'] ?? null,
                ],
                'primary_contact_name' => $data['primary_contact_name'],
                'primary_contact_email' => $data['primary_contact_email'],
                'primary_contact_phone' => $data['primary_contact_phone'],
                'requested_disciplines' => array_values($data['requested_disciplines']),
                'custom_disciplines' => $customDisciplines,
                'estimated_practitioner_count' => $data['estimated_practitioner_count'],
                'submitted_at' => now(),
            ]);

            // Ensure baseline / empty templates exist for this clinic
            IntakeFormTemplate::ensureDefaultsForTenant($tenant->id, $tenant->requested_disciplines);

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

        // One-time markers are spent — drop them.
        EmailVerificationCode::clear($data['email']);

        Auth::login($user);

        $tenant = $user->tenants()->first();

        $this->notifySafely($user, new ClinicApplicationReceivedNotification($tenant));

        // Registration happens on the central domain; the owner's application
        // status page lives on their new clinic subdomain. The session cookie
        // is shared across *.<central> so the login carries across. Cross-host,
        // so an Inertia location visit (not a plain redirect the XHR can't
        // follow across origins).
        return Tenancy::redirectTo($request, $tenant->appUrl('/clinic/status'));
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
