<?php

namespace App\Http\Controllers;

use App\Billing\PlatformBilling;
use App\Models\AuditEvent;
use App\Models\BlockedEmail;
use App\Models\PlatformSetting;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Notifications\ClinicApplicationReceivedNotification;
use App\Support\ClinicOptions;
use App\Support\Disciplines;
use App\Support\Tenancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClinicReapplyController extends Controller
{
    /**
     * Entry point from signed email link. Authenticates the owner and redirects
     * to the clinic's re-application page.
     */
    public function entry(Request $request, Tenant $tenant): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'This re-apply link has expired or is invalid. Please sign in to your account.');
        }

        if (! $tenant->canReapply()) {
            return redirect('/login')->with('error', 'This application cannot be resubmitted. Please contact support@umahz.com.');
        }

        $owner = $tenant->staffMemberships()->where('role', StaffMembership::ROLE_CLINIC_OWNER)->first()?->user;
        if (! $owner) {
            abort(404, 'Clinic owner not found.');
        }

        Auth::login($owner);
        $request->session()->put('current_tenant_id', $tenant->id);

        return redirect()->to($tenant->appUrl('/clinic/reapply'));
    }

    /**
     * Show the re-apply form with existing pre-filled details.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $membership = $request->attributes->get('staffMembership');
        $tenant = $membership->tenant;

        if (! $tenant->canReapply()) {
            return redirect('/clinic/status');
        }

        $primaryProfile = PractitionerProfile::where('is_primary_contact', true)
            ->whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->first();

        // Check if tenant's existing subdomain is still available or held
        $subdomainValid = false;
        $subdomainConflict = null;
        if (! empty($tenant->subdomain)) {
            $takenByOther = Tenant::where('subdomain', $tenant->subdomain)
                ->where('id', '!=', $tenant->id)
                ->exists();

            if (! $takenByOther) {
                $subdomainValid = true;
            } else {
                $subdomainConflict = 'Your previous subdomain is no longer available. Please select a new one.';
            }
        }

        $nextAttempt = ($tenant->reapply_count ?: 1) + 1;
        $maxAttempts = $tenant->maxReapplyAttempts();

        return Inertia::render('Clinic/Reapply', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'subdomain_valid' => $subdomainValid,
                'subdomain_conflict' => $subdomainConflict,
                'business_registration_number' => $tenant->business_registration_number,
                'address' => $tenant->address,
                'primary_contact_name' => $tenant->primary_contact_name,
                'primary_contact_email' => $tenant->primary_contact_email,
                'primary_contact_phone' => $tenant->primary_contact_phone,
                'requested_disciplines' => $tenant->requested_disciplines ?: [],
                'custom_disciplines' => $tenant->custom_disciplines ?: [],
                'estimated_practitioner_count' => $tenant->estimated_practitioner_count ?: 1,
                'plan_tier' => $tenant->plan_tier,
                'billing_interval' => $tenant->billing_interval ?: 'month',
                'full_time_practitioners_count' => $tenant->full_time_practitioners_count ?: 1,
                'part_time_practitioners_count' => $tenant->part_time_practitioners_count ?: 0,
                'rejection_note' => $tenant->review_note,
                'rejection_sections' => $tenant->rejection_sections ?: [],
                'current_attempt' => $tenant->reapply_count ?: 1,
                'next_attempt' => $nextAttempt,
                'max_attempts' => $maxAttempts,
                'attempts_remaining' => $tenant->attemptsRemaining(),
            ],
            'primaryPractitioner' => $primaryProfile ? [
                'id' => $primaryProfile->id,
                'profession' => $primaryProfile->profession,
                'license_number' => $primaryProfile->license_number,
                'licensing_body' => $primaryProfile->licensing_body,
                'has_document' => (bool) $primaryProfile->license_document_path,
                'document_name' => $primaryProfile->license_document_original_name,
            ] : null,
            'allDisciplines' => ClinicOptions::disciplines(),
            'provinces' => ClinicOptions::PROVINCES,
            'subdomainSuffix' => '.'.Tenancy::centralDomain(),
            'stripePublishableKey' => config('cashier.key'),
        ]);
    }

    /**
     * Create SetupIntent for re-collecting payment method during re-apply.
     */
    public function createSetupIntent(Request $request, PlatformBilling $billing): JsonResponse
    {
        $membership = $request->attributes->get('staffMembership');
        $tenant = $membership->tenant;

        if (! $tenant->canReapply()) {
            return response()->json(['message' => 'Re-application is not allowed.'], 403);
        }

        try {
            $setupIntent = $billing->createSetupIntent([
                'tenant_id' => $tenant->id,
                'action' => 'clinic_reapply',
            ]);

            return response()->json([
                'client_secret' => $setupIntent->client_secret,
                'publishable_key' => config('cashier.key'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Could not create secure payment session. Please try again.',
            ], 500);
        }
    }

    /**
     * Submit the updated application and card details.
     */
    public function submit(Request $request, PlatformBilling $billing): RedirectResponse
    {
        $membership = $request->attributes->get('staffMembership');
        $tenant = $membership->tenant;

        if (! $tenant->canReapply()) {
            abort(403, 'This application is not open for re-application.');
        }

        $request->merge(['subdomain' => Tenancy::normalize($request->input('subdomain'))]);

        $data = $request->validate([
            'clinic_name' => ['required', 'string', 'max:255'],
            'subdomain' => Tenancy::rules($tenant->id),
            'business_registration_number' => ['nullable', 'string', 'max:100'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_city' => ['nullable', 'string', 'max:120'],
            'address_region' => ['nullable', 'string', 'max:120'],
            'address_country' => ['nullable', 'string', 'max:120'],
            'primary_contact_name' => ['required', 'string', 'max:255'],
            'primary_contact_phone' => ['required', 'string', 'max:50'],
            'requested_disciplines' => ['required', 'array', 'min:1'],
            'requested_disciplines.*' => ['required', 'string', 'max:60'],
            'estimated_practitioner_count' => ['required', 'integer', 'min:1', 'max:500'],
            'license_number' => ['required', 'string', 'max:100'],
            'licensing_body' => ['required', 'string', 'max:255'],
            'license_document' => ['nullable', 'file', 'extensions:pdf,jpg,jpeg,png', 'max:10240'],
            'stripe_setup_intent_id' => ['nullable', 'string'],
        ]);

        // Retain existing card verified during registration.
        // If a new card SetupIntent was optionally provided, use the new payment method.
        $paymentMethodId = $tenant->stripe_pm_id;
        if (! empty($data['stripe_setup_intent_id'])) {
            $newPm = $billing->savedPaymentMethod($data['stripe_setup_intent_id']);
            if ($newPm) {
                $paymentMethodId = $newPm;
            }
        }

        // Compute change history diff
        $changes = [];
        if ($tenant->name !== $data['clinic_name']) {
            $changes[] = "Clinic name changed from '{$tenant->name}' to '{$data['clinic_name']}'";
        }
        if ($tenant->subdomain !== $data['subdomain']) {
            $changes[] = "Subdomain changed from '{$tenant->subdomain}' to '{$data['subdomain']}'";
        }
        if (($tenant->business_registration_number ?? '') !== ($data['business_registration_number'] ?? '')) {
            $changes[] = 'Updated business registration number';
        }
        if (($tenant->primary_contact_name ?? '') !== $data['primary_contact_name']) {
            $changes[] = 'Updated primary contact name';
        }
        if (($tenant->primary_contact_phone ?? '') !== $data['primary_contact_phone']) {
            $changes[] = 'Updated primary contact phone';
        }
        if ($request->hasFile('license_document')) {
            $changes[] = 'Uploaded replacement license verification document';
        }

        $currentAttempt = $tenant->reapply_count ?: 1;
        $nextAttempt = $currentAttempt + 1;

        DB::transaction(function () use ($request, $tenant, $membership, $data, $paymentMethodId, $changes, $nextAttempt) {
            $history = $tenant->rejection_history ?? [];
            if (! empty($history)) {
                $lastIndex = count($history) - 1;
                $history[$lastIndex]['changes_resubmitted'] = $changes ?: ['Application details reviewed and confirmed'];
                $history[$lastIndex]['resubmitted_at'] = now()->toIso8601String();
            }

            $tenant->update([
                'name' => $data['clinic_name'],
                'subdomain' => $data['subdomain'],
                'subdomain_released_at' => null,
                'business_registration_number' => $data['business_registration_number'] ?? null,
                'address' => [
                    'line1' => $data['address_line1'] ?? null,
                    'city' => $data['address_city'] ?? null,
                    'region' => $data['address_region'] ?? null,
                    'country' => $data['address_country'] ?? null,
                ],
                'primary_contact_name' => $data['primary_contact_name'],
                'primary_contact_phone' => $data['primary_contact_phone'],
                'requested_disciplines' => $data['requested_disciplines'],
                'estimated_practitioner_count' => $data['estimated_practitioner_count'],
                'stripe_pm_id' => $paymentMethodId,
                'status' => Tenant::STATUS_PENDING_REVIEW,
                'reapply_count' => $nextAttempt,
                'submitted_at' => now(),
                'review_note' => null,
                'rejection_sections' => null,
                'rejection_history' => $history,
            ]);

            $primaryProfile = PractitionerProfile::where('is_primary_contact', true)
                ->whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
                ->first();

            if ($primaryProfile) {
                $profileUpdates = [
                    'license_number' => $data['license_number'],
                    'licensing_body' => $data['licensing_body'],
                    'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
                    'review_note' => null,
                ];

                if ($request->hasFile('license_document')) {
                    $doc = $request->file('license_document');
                    $path = $doc->storeAs(
                        "licenses/{$tenant->id}",
                        Str::uuid().'.'.$doc->getClientOriginalExtension(),
                        'local'
                    );
                    $profileUpdates['license_document_path'] = $path;
                    $profileUpdates['license_document_original_name'] = $doc->getClientOriginalName();
                    $profileUpdates['license_document_mime'] = $doc->getClientMimeType();
                }

                $primaryProfile->update($profileUpdates);
            }

            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()->id,
                'action' => 'clinic.reapplied',
                'resource_type' => Tenant::class,
                'resource_id' => $tenant->id,
                'ip_address' => $request->ip(),
                'reason' => "Re-applied for review (attempt {$nextAttempt})",
                'metadata' => [
                    'attempt' => $nextAttempt,
                    'changes' => $changes,
                ],
            ]);
        });

        $this->notifySafely($membership->user, new ClinicApplicationReceivedNotification($tenant));

        return redirect()->to('/clinic/status')->with('success', "Application updated and resubmitted for review (attempt {$nextAttempt}).");
    }
}
