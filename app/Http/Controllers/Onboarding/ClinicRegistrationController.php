<?php

namespace App\Http\Controllers\Onboarding;

use App\Billing\PlatformBilling;
use App\Http\Controllers\Controller;
use App\Models\IntakeFormTemplate;
use App\Models\PendingRegistration;
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
use Illuminate\Support\Facades\Storage;
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
            'tiers' => \App\Models\SubscriptionTierConfig::allTiers(),
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

        // A subdomain temporarily reserved by another in-progress registration
        // is treated as unavailable until that reservation expires.
        $reserved = PendingRegistration::query()->live()
            ->where('subdomain', $subdomain)
            ->exists();

        $available = $validator->passes() && ! $reserved;

        return response()->json([
            'subdomain' => $subdomain,
            'available' => $available,
            'reason' => $reserved
                ? 'That subdomain is currently reserved by another registration in progress.'
                : $validator->errors()->first('subdomain'),
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
     * Validate the full application payload and normalise custom disciplines.
     * Shared by prepare() (card capture) and store() (finalize) so both apply
     * exactly the same rules. Returns the validated data plus derived bits.
     *
     * @return array{data:array, customDisciplines:array, primaryDiscipline:string}
     */
    private function validateApplication(Request $request): array
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

            'plan_tier' => ['required', 'string', Rule::in(\App\Billing\PlanPricing::TIERS)],
            'full_time_practitioners_count' => ['required', 'integer', 'min:1', 'max:500'],
            'part_time_practitioners_count' => ['required', 'integer', 'min:0', 'max:500'],
            'estimated_practitioner_count' => ['nullable', 'integer', 'min:1', 'max:500'],

            'license_number' => ['required', 'string', 'max:100'],
            'licensing_body' => ['required', 'string', 'max:255'],
            'license_document' => ['required', 'file', 'extensions:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        // Enforce Balance plan tier rule: 1 practitioner max, no add-ons
        if ($data['plan_tier'] === \App\Billing\PlanPricing::TIER_BALANCE) {
            if ((int) $data['full_time_practitioners_count'] !== 1 || (int) $data['part_time_practitioners_count'] !== 0) {
                throw ValidationException::withMessages([
                    'plan_tier' => 'The Balance plan is limited to 1 practitioner with no add-ons.',
                ]);
            }
        }

        $data['estimated_practitioner_count'] = (int) $data['full_time_practitioners_count'] + (int) $data['part_time_practitioners_count'];

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

        return [
            'data' => $data,
            'customDisciplines' => $customDisciplines,
            'primaryDiscipline' => $data['requested_disciplines'][0],
        ];
    }

    /**
     * STEP: capture a card before the application is submitted. Validates the
     * full application, stashes it in a short-lived PendingRegistration (which
     * reserves the subdomain), creates a Stripe customer + SetupIntent, and
     * returns the client secret so the wizard can collect the card. NOTHING is
     * charged and NO tenant is created here — a card must be saved first.
     */
    public function prepare(Request $request, PlatformBilling $billing): JsonResponse
    {
        $processed = $this->validateApplication($request);
        $data = $processed['data'];

        // Store the license file to a temporary path; it's moved into the
        // tenant's own folder only once the application is finalized.
        $document = $request->file('license_document');
        $licensePath = $document->storeAs(
            'pending-licenses',
            Str::uuid().'.'.$document->getClientOriginalExtension(),
            'local'
        );

        $ttl = (int) config('billing.pending_registration_ttl_minutes', 30);

        // One live pending row per email — re-preparing updates in place so an
        // abandoned Stripe customer isn't multiplied on every keystroke.
        $pending = PendingRegistration::query()->firstOrNew(['email' => $data['email']]);

        // Password is hashed now; the "hashed" cast on User skips re-hashing an
        // already-hashed value at finalize, so we never store it in the clear.
        $payload = $data;
        unset($payload['license_document']);
        $payload['password'] = Hash::make($data['password']);
        $payload['custom_disciplines'] = $processed['customDisciplines'];
        $payload['primary_discipline'] = $processed['primaryDiscipline'];

        $pending->fill([
            'subdomain' => $data['subdomain'],
            'plan_tier' => $data['plan_tier'],
            'full_time_practitioners_count' => $data['full_time_practitioners_count'],
            'part_time_practitioners_count' => $data['part_time_practitioners_count'],
            'ip_address' => $request->ip(),
            'payload' => $payload,
            'license_document_path' => $licensePath,
            'license_document_original_name' => $document->getClientOriginalName(),
            'license_document_mime' => $document->getClientMimeType(),
            'expires_at' => now()->addMinutes($ttl),
        ]);

        // Reuse an existing Stripe customer across re-prepares.
        if (empty($pending->stripe_customer_id)) {
            $pending->stripe_customer_id = $billing->createCustomer($data['email'], $data['clinic_name']);
        }

        $intent = $billing->createSetupIntent($pending->stripe_customer_id);
        $pending->stripe_setup_intent_id = $intent['id'];
        $pending->save();

        return response()->json([
            'pending_id' => $pending->id,
            'client_secret' => $intent['client_secret'],
            'publishable_key' => config('cashier.key'),
        ]);
    }

    /**
     * STEP: finalize the application AFTER a card has been saved. Verifies the
     * SetupIntent actually saved a payment method, then promotes the pending
     * registration into a real User + Tenant (pending_review) carrying the
     * Stripe customer + saved card, and submits it to the admin. Still no
     * charge — that happens only on approval.
     */
    public function store(Request $request, PlatformBilling $billing): \Symfony\Component\HttpFoundation\Response
    {
        $validated = $request->validate([
            'pending_id' => ['required', 'uuid'],
        ]);

        $pending = PendingRegistration::query()->live()->find($validated['pending_id']);

        if (! $pending) {
            throw ValidationException::withMessages([
                'pending_id' => 'Your registration session has expired. Please start again.',
            ]);
        }

        // A real card must be saved on the SetupIntent, or we do not submit.
        $paymentMethodId = $billing->savedPaymentMethod($pending->stripe_setup_intent_id);

        if (! $paymentMethodId) {
            throw ValidationException::withMessages([
                'card' => 'We could not confirm your card. Please re-enter your payment details.',
            ]);
        }

        $payload = $pending->payload;

        // Re-check uniqueness at the last moment (a race could have taken the
        // email or subdomain since prepare()).
        if (User::where('email', $payload['email'])->exists()) {
            throw ValidationException::withMessages(['email' => 'An account with this email already exists.']);
        }
        if (Tenant::where('subdomain', $pending->subdomain)->exists()) {
            throw ValidationException::withMessages(['subdomain' => 'That subdomain has just been taken. Please choose another.']);
        }

        $user = DB::transaction(function () use ($pending, $payload, $paymentMethodId) {
            $user = User::create([
                'name' => $payload['name'],
                'email' => $payload['email'],
                // Already hashed in prepare(); the "hashed" cast leaves it as-is.
                'password' => $payload['password'],
            ]);
            $user->markEmailAsVerified();

            $tenant = Tenant::create([
                'name' => $payload['clinic_name'],
                'slug' => $this->uniqueSlug($payload['clinic_name']),
                'subdomain' => $pending->subdomain,
                'status' => Tenant::STATUS_PENDING_REVIEW,
                'plan_tier' => $payload['plan_tier'] ?? $pending->plan_tier ?? \App\Billing\PlanPricing::TIER_PRACTICE,
                'full_time_practitioners_count' => $payload['full_time_practitioners_count'] ?? $pending->full_time_practitioners_count ?? 1,
                'part_time_practitioners_count' => $payload['part_time_practitioners_count'] ?? $pending->part_time_practitioners_count ?? 0,
                'business_registration_number' => $payload['business_registration_number'] ?? null,
                'address' => [
                    'line1' => $payload['address_line1'] ?? null,
                    'city' => $payload['address_city'] ?? null,
                    'region' => $payload['address_region'] ?? null,
                    'country' => $payload['address_country'] ?? null,
                    'lat' => $payload['address_lat'] ?? null,
                    'lng' => $payload['address_lng'] ?? null,
                ],
                'primary_contact_name' => $payload['primary_contact_name'],
                'primary_contact_email' => $payload['primary_contact_email'],
                'primary_contact_phone' => $payload['primary_contact_phone'],
                'requested_disciplines' => array_values($payload['requested_disciplines']),
                'custom_disciplines' => $payload['custom_disciplines'] ?? [],
                'estimated_practitioner_count' => $payload['estimated_practitioner_count'] ?? 1,
                'submitted_at' => now(),
                'subscription_status' => Tenant::SUBSCRIPTION_NONE,
            ]);

            // Attach the saved Stripe customer + card (opaque tokens only). These
            // columns are Cashier-managed, so set them directly.
            $tenant->forceFill([
                'stripe_id' => $pending->stripe_customer_id,
                'stripe_pm_id' => $paymentMethodId,
            ])->save();

            IntakeFormTemplate::ensureDefaultsForTenant($tenant->id, $tenant->requested_disciplines);

            $membership = StaffMembership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => StaffMembership::ROLE_CLINIC_OWNER,
                'status' => StaffMembership::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);

            // Move the license out of the temp folder into the tenant's own path.
            $finalPath = "licenses/{$tenant->id}/".basename($pending->license_document_path);
            Storage::disk('local')->move($pending->license_document_path, $finalPath);

            PractitionerProfile::create([
                'staff_membership_id' => $membership->id,
                'profession' => $payload['primary_discipline'],
                'employment_type' => PractitionerProfile::EMPLOYMENT_FULL_TIME,
                'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
                'license_number' => $payload['license_number'],
                'licensing_body' => $payload['licensing_body'],
                'license_document_path' => $finalPath,
                'license_document_original_name' => $pending->license_document_original_name,
                'license_document_mime' => $pending->license_document_mime,
                'is_primary_contact' => true,
            ]);

            $pending->delete();

            return $user;
        });

        event(new Registered($user));
        EmailVerificationCode::clear($payload['email']);
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
