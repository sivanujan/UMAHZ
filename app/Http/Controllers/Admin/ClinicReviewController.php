<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\BlockedEmail;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Notifications\ClinicApplicationApprovedNotification;
use App\Notifications\ClinicApplicationNeedsInfoNotification;
use App\Notifications\ClinicApplicationRejectedNotification;
use App\Notifications\ClinicApplicationRejectionNotification;
use App\Notifications\ClinicApplicationFinalRejectionNotification;
use App\Notifications\ClinicApplicationPermanentRejectionNotification;
use App\Services\ClinicSubscriptionService;
use App\Support\ClinicOptions;
use App\Support\Tenancy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicReviewController extends Controller
{
    protected const FILTERABLE_STATUSES = [
        Tenant::STATUS_PENDING_REVIEW,
        Tenant::STATUS_NEEDS_MORE_INFO,
        Tenant::STATUS_APPROVED,
        Tenant::STATUS_REJECTED,
        Tenant::STATUS_SUSPENDED,
    ];

    /**
     * The review queue. Defaults to pending_review, sorted oldest-first so
     * the longest-waiting applications surface at the top.
     */
    public function index(Request $request): Response
    {
        $status = $request->query('status', Tenant::STATUS_PENDING_REVIEW);
        $status = in_array($status, self::FILTERABLE_STATUSES, true) ? $status : Tenant::STATUS_PENDING_REVIEW;

        $blockedBizRegs = BlockedEmail::whereNotNull('business_registration_number')->pluck('business_registration_number')->filter()->all();
        $blockedPhones = BlockedEmail::whereNotNull('phone')->pluck('phone')->filter()->all();

        $tenants = Tenant::query()
            ->where('status', $status)
            ->orderBy('submitted_at')
            ->get()
            ->map(function (Tenant $tenant) use ($blockedBizRegs, $blockedPhones) {
                $matchesBlocked = false;
                $matchReason = null;

                if (!empty($tenant->business_registration_number) && in_array($tenant->business_registration_number, $blockedBizRegs, true)) {
                    $matchesBlocked = true;
                    $matchReason = 'Matches blocked business registration number (' . $tenant->business_registration_number . ')';
                } elseif (!empty($tenant->primary_contact_phone) && in_array($tenant->primary_contact_phone, $blockedPhones, true)) {
                    $matchesBlocked = true;
                    $matchReason = 'Matches blocked contact phone (' . $tenant->primary_contact_phone . ')';
                }

                $attempt = $tenant->reapply_count ?: 1;
                $maxAttempts = $tenant->maxReapplyAttempts();

                return [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'plan_tier' => $tenant->plan_tier,
                    'plan_name' => $tenant->planName(),
                    'full_time_practitioners_count' => $tenant->full_time_practitioners_count,
                    'part_time_practitioners_count' => $tenant->part_time_practitioners_count,
                    'monthly_total' => $tenant->monthlyBillableTotal(),
                    'primary_contact_name' => $tenant->primary_contact_name,
                    'primary_contact_email' => $tenant->primary_contact_email,
                    'requested_disciplines' => $tenant->requested_disciplines,
                    'discipline_labels' => $tenant->offeredDisciplineLabels(),
                    'estimated_practitioner_count' => $tenant->estimated_practitioner_count,
                    'submitted_at' => $tenant->submitted_at?->format('M j, Y g:i A'),
                    'submitted_ago' => $tenant->submitted_at?->diffForHumans(),
                    'reapply_count' => $attempt,
                    'max_attempts' => $maxAttempts,
                    'is_reapplication' => $attempt > 1,
                    'matches_blocked' => $matchesBlocked,
                    'blocked_match_reason' => $matchReason,
                    'is_permanently_rejected' => (bool) $tenant->is_permanently_rejected,
                ];
            });

        return Inertia::render('Admin/Clinics/Index', [
            'tenants' => $tenants,
            'status' => $status,
            'statuses' => self::FILTERABLE_STATUSES,
        ]);
    }

    public function show(Request $request, Tenant $tenant): Response
    {
        $this->authorize('review', $tenant);

        $primaryProfile = PractitionerProfile::where('is_primary_contact', true)
            ->whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->first();

        $blockedBizRegs = BlockedEmail::whereNotNull('business_registration_number')->pluck('business_registration_number')->filter()->all();
        $blockedPhones = BlockedEmail::whereNotNull('phone')->pluck('phone')->filter()->all();

        $matchesBlocked = false;
        $matchReason = null;
        if (!empty($tenant->business_registration_number) && in_array($tenant->business_registration_number, $blockedBizRegs, true)) {
            $matchesBlocked = true;
            $matchReason = 'Matches blocked business registration number (' . $tenant->business_registration_number . ')';
        } elseif (!empty($tenant->primary_contact_phone) && in_array($tenant->primary_contact_phone, $blockedPhones, true)) {
            $matchesBlocked = true;
            $matchReason = 'Matches blocked contact phone (' . $tenant->primary_contact_phone . ')';
        }

        $attempt = $tenant->reapply_count ?: 1;
        $maxAttempts = $tenant->maxReapplyAttempts();
        $attemptsRemaining = max(0, $maxAttempts - $attempt);

        return Inertia::render('Admin/Clinics/Show', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'slug' => $tenant->slug,
                'plan_tier' => $tenant->plan_tier,
                'plan_name' => $tenant->planName(),
                'billing_interval' => $tenant->billing_interval ?? 'month',
                'applied_promo_code' => $tenant->applied_promo_code,
                'extra_practitioner_seats' => $tenant->extra_practitioner_seats ?? 0,
                'full_time_practitioners_count' => $tenant->full_time_practitioners_count,
                'part_time_practitioners_count' => $tenant->part_time_practitioners_count,
                'billing_breakdown' => $tenant->monthlyBillableBreakdown(),
                'business_registration_number' => $tenant->business_registration_number,
                'address' => $tenant->address,
                'primary_contact_name' => $tenant->primary_contact_name,
                'primary_contact_email' => $tenant->primary_contact_email,
                'primary_contact_phone' => $tenant->primary_contact_phone,
                'requested_disciplines' => $tenant->requested_disciplines,
                'discipline_labels' => $tenant->offeredDisciplineLabels(),
                'estimated_practitioner_count' => $tenant->estimated_practitioner_count,
                'submitted_at' => $tenant->submitted_at?->format('M j, Y g:i A'),
                'reviewed_at' => $tenant->reviewed_at?->format('M j, Y g:i A'),
                'review_note' => $tenant->review_note,
                'reapply_count' => $attempt,
                'max_attempts' => $maxAttempts,
                'attempts_remaining' => $attemptsRemaining,
                'can_reapply' => $tenant->canReapply(),
                'is_permanently_rejected' => (bool) $tenant->is_permanently_rejected,
                'rejection_sections' => $tenant->rejection_sections ?: [],
                'rejection_history' => $tenant->rejection_history ?: [],
                'matches_blocked' => $matchesBlocked,
                'blocked_match_reason' => $matchReason,
            ],
            'primaryPractitioner' => $primaryProfile ? [
                'id' => $primaryProfile->id,
                'profession' => $primaryProfile->profession,
                'profession_label' => $tenant->disciplineLabel($primaryProfile->profession),
                'license_number' => $primaryProfile->license_number,
                'licensing_body' => $primaryProfile->licensing_body,
                'has_document' => (bool) $primaryProfile->license_document_path,
                'document_name' => $primaryProfile->license_document_original_name,
                'document_mime' => $primaryProfile->license_document_mime,
                'document_url' => $primaryProfile->license_document_path
                    ? URL::temporarySignedRoute('admin.clinics.document', now()->addMinutes(15), ['tenant' => $tenant->id])
                    : null,
            ] : null,
        ]);
    }

    /**
     * The edit form — the site owner can correct any clinic's profile,
     * disciplines and subdomain.
     */
    public function edit(Request $request, Tenant $tenant): Response
    {
        $this->authorize('review', $tenant);

        return Inertia::render('Admin/Clinics/Edit', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'timezone' => $tenant->timezone,
                'currency' => $tenant->currency,
                'requested_disciplines' => $tenant->requested_disciplines,
                'business_registration_number' => $tenant->business_registration_number,
            ],
            'subdomainSuffix' => '.'.Tenancy::centralDomain(),
            'provinces' => ClinicOptions::PROVINCES,
            'countries' => ClinicOptions::COUNTRIES,
            'cities' => ClinicOptions::CITIES,
            'timezones' => ClinicOptions::TIMEZONES,
            'currencies' => ClinicOptions::CURRENCIES,
            'allDisciplines' => ClinicOptions::disciplines(),
            'customDisciplines' => $tenant->customDisciplinesList(),
            'disciplineLabels' => $tenant->allDisciplineLabels(),
        ]);
    }

    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        $request->merge(['subdomain' => Tenancy::normalize($request->input('subdomain'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subdomain' => Tenancy::rules($tenant->id),
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'business_registration_number' => ['nullable', 'string', 'max:100'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_city' => ['nullable', 'string', 'max:120'],
            'address_region' => ['nullable', Rule::in(ClinicOptions::PROVINCES)],
            'address_country' => ['nullable', Rule::in(ClinicOptions::COUNTRIES)],
            'address_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'timezone' => ['required', Rule::in(ClinicOptions::TIMEZONES)],
            'currency' => ['required', Rule::in(ClinicOptions::CURRENCIES)],
            'requested_disciplines' => ['required', 'array', 'min:1'],
            'requested_disciplines.*' => [Rule::in($tenant->availableDisciplineCodes())],
        ]);

        DB::transaction(function () use ($request, $tenant, $data) {
            $tenant->update([
                'name' => $data['name'],
                'subdomain' => $data['subdomain'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'business_registration_number' => $data['business_registration_number'] ?? null,
                'address' => [
                    'line1' => $data['address_line1'] ?? null,
                    'city' => $data['address_city'] ?? null,
                    'region' => $data['address_region'] ?? null,
                    'country' => $data['address_country'] ?? null,
                    'lat' => $data['address_lat'] ?? null,
                    'lng' => $data['address_lng'] ?? null,
                ],
                'timezone' => $data['timezone'],
                'currency' => $data['currency'],
                'requested_disciplines' => array_values($data['requested_disciplines']),
            ]);

            $this->logAuditEvent($request, $tenant, 'clinic.updated');
        });

        return redirect()->route('admin.clinics.show', $tenant->id)->with('success', "{$tenant->name} updated.");
    }

    /**
     * Suspend an active clinic — blocks all staff and client access
     * immediately (EnsureStaffRole / EnsureClientAccess require an approved
     * tenant) while keeping the data. Reversible via reactivate().
     */
    public function suspend(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        abort_unless($tenant->status === Tenant::STATUS_APPROVED, 403, 'Only an approved clinic can be suspended.');

        DB::transaction(function () use ($request, $tenant) {
            $tenant->update([
                'status' => Tenant::STATUS_SUSPENDED,
                'is_manually_suspended' => true,
            ]);
            $this->logAuditEvent($request, $tenant, 'clinic.suspended');
        });

        return back()->with('success', "{$tenant->name} suspended.");
    }

    public function reactivate(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        abort_unless($tenant->status === Tenant::STATUS_SUSPENDED, 403, 'Only a suspended clinic can be reactivated.');

        DB::transaction(function () use ($request, $tenant) {
            $tenant->update([
                'status' => Tenant::STATUS_APPROVED,
                'is_manually_suspended' => false,
            ]);
            $this->logAuditEvent($request, $tenant, 'clinic.reactivated');
        });

        return back()->with('success', "{$tenant->name} reactivated.");
    }

    public function approve(Request $request, Tenant $tenant, ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorize('review', $tenant);

        // If stripe_pm_id is not set locally but stripe_id exists, attempt to auto-recover
        // the customer's default or attached payment method from Stripe.
        if (empty($tenant->stripe_pm_id) && ! empty($tenant->stripe_id)) {
            try {
                $customer = \Laravel\Cashier\Cashier::stripe()->customers->retrieve($tenant->stripe_id);
                $defaultPm = $customer->invoice_settings->default_payment_method;
                if (! $defaultPm) {
                    $pms = \Laravel\Cashier\Cashier::stripe()->paymentMethods->all([
                        'customer' => $tenant->stripe_id,
                        'type' => 'card',
                        'limit' => 1,
                    ]);
                    $defaultPm = $pms->data[0]->id ?? null;
                }
                if ($defaultPm) {
                    $tenant->forceFill(['stripe_pm_id' => $defaultPm])->save();
                }
            } catch (\Throwable $e) {
                // Ignore fallback lookup errors
            }
        }

        // A saved card is required before an application is approved so
        // subscription billing can be activated.
        if (empty($tenant->stripe_id) || empty($tenant->stripe_pm_id)) {
            return back()->withErrors(['approve' => 'This clinic has no saved payment method on file and cannot be approved.']);
        }

        // THE FIRST CHARGE happens here. If the card is declined we must NOT
        // approve — surface the error and leave the application pending.
        try {
            $subscriptions->activate($tenant);
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['approve' => 'Could not start the subscription — the first charge failed: '.$e->getMessage()]);
        }

        // Subscription is live; now flip status + verify practitioner + audit
        // atomically.
        DB::transaction(function () use ($request, $tenant) {
            $tenant->update([
                'status' => Tenant::STATUS_APPROVED,
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_note' => null,
            ]);

            PractitionerProfile::where('is_primary_contact', true)
                ->whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
                ->update([
                    'verification_status' => PractitionerProfile::VERIFICATION_VERIFIED,
                    'reviewed_at' => now(),
                    'reviewed_by' => $request->user()->id,
                ]);

            $this->logAuditEvent($request, $tenant, 'subscription.started');
            $this->logAuditEvent($request, $tenant, 'clinic.approved');
        });

        // Kept OUTSIDE the transaction: a mail/queue failure must never roll back
        // a completed approval.
        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $this->notifySafely($owner, new ClinicApplicationApprovedNotification($tenant));

        return back()->with('success', "{$tenant->name} approved — subscription started.");
    }

    public function requestMoreInfo(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        // Note stays required — validation runs before any writes.
        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $tenant, $data) {
            $tenant->update([
                'status' => Tenant::STATUS_NEEDS_MORE_INFO,
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_note' => $data['note'],
            ]);

            $this->logAuditEvent($request, $tenant, 'clinic.needs_more_info', $data['note']);
        });

        // Outside the transaction: mail/queue failure must not roll back the review.
        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $this->notifySafely($owner, new ClinicApplicationNeedsInfoNotification($tenant));

        return back()->with('success', "Requested more information from {$tenant->name}.");
    }

    public function reject(Request $request, Tenant $tenant, ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorize('review', $tenant);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
            'sections' => ['nullable', 'array'],
            'sections.*' => ['string', 'in:clinic_details,documents_license,disciplines,contact,other'],
        ]);

        $sections = !empty($data['sections']) ? $data['sections'] : ['other'];
        $attempt = $tenant->reapply_count ?: 1;
        $maxAttempts = $tenant->maxReapplyAttempts();
        $isFinalAttempt = ($attempt >= $maxAttempts);

        // Discard saved payment method only on final rejection.
        // When re-application is allowed, retain the verified card on file.
        if ($isFinalAttempt) {
            $subscriptions->discard($tenant);
        }

        DB::transaction(function () use ($request, $tenant, $data, $sections, $attempt, $isFinalAttempt) {
            $history = $tenant->rejection_history ?? [];
            $history[] = [
                'attempt' => $attempt,
                'rejected_at' => now()->toIso8601String(),
                'rejected_by' => $request->user()->name,
                'review_note' => $data['note'],
                'sections' => $sections,
                'is_permanent' => false,
                'is_final' => $isFinalAttempt,
            ];

            $tenantUpdates = [
                'status' => Tenant::STATUS_REJECTED,
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_note' => $data['note'],
                'rejection_sections' => $sections,
                'rejection_history' => $history,
                'rejected_at' => now(),
            ];

            if ($isFinalAttempt) {
                $tenantUpdates['is_permanently_rejected'] = true;
            }

            $tenant->update($tenantUpdates);

            if ($isFinalAttempt) {
                $this->logAuditEvent($request, $tenant, 'subscription.discarded');
            }
            $this->logAuditEvent($request, $tenant, 'clinic.rejected', $data['note']);
        });

        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;

        if ($isFinalAttempt) {
            if ($owner) {
                BlockedEmail::firstOrCreate(
                    ['email' => strtolower(trim($owner->email))],
                    [
                        'reason' => "Max application attempts ({$maxAttempts}) reached: " . $data['note'],
                        'blocked_by_user_id' => $request->user()->id,
                        'tenant_id' => $tenant->id,
                        'business_registration_number' => $tenant->business_registration_number,
                        'phone' => $tenant->primary_contact_phone,
                    ]
                );

                $this->notifySafely($owner, new ClinicApplicationFinalRejectionNotification($tenant));
            }

            return back()->with('success', "{$tenant->name} rejected (maximum attempts reached, email blocked from further applications).");
        }

        if ($owner) {
            $this->notifySafely($owner, new ClinicApplicationRejectionNotification($tenant, $sections));
        }

        return back()->with('success', "{$tenant->name} rejected with re-apply link sent (attempt {$attempt} of {$maxAttempts}).");
    }

    public function rejectPermanent(Request $request, Tenant $tenant, ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $this->authorize('review', $tenant);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $attempt = $tenant->reapply_count ?: 1;

        // Discard saved payment method
        $subscriptions->discard($tenant);

        DB::transaction(function () use ($request, $tenant, $data, $attempt) {
            $history = $tenant->rejection_history ?? [];
            $history[] = [
                'attempt' => $attempt,
                'rejected_at' => now()->toIso8601String(),
                'rejected_by' => $request->user()->name,
                'review_note' => $data['note'],
                'sections' => ['all'],
                'is_permanent' => true,
            ];

            $tenant->update([
                'status' => Tenant::STATUS_PERMANENTLY_REJECTED,
                'is_permanently_rejected' => true,
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_note' => $data['note'],
                'rejection_sections' => ['all'],
                'rejection_history' => $history,
                'rejected_at' => now(),
            ]);

            $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
            if ($owner) {
                BlockedEmail::firstOrCreate(
                    ['email' => strtolower(trim($owner->email))],
                    [
                        'reason' => 'Permanent rejection: ' . $data['note'],
                        'blocked_by_user_id' => $request->user()->id,
                        'tenant_id' => $tenant->id,
                        'business_registration_number' => $tenant->business_registration_number,
                        'phone' => $tenant->primary_contact_phone,
                    ]
                );
            }

            $this->logAuditEvent($request, $tenant, 'subscription.discarded');
            $this->logAuditEvent($request, $tenant, 'clinic.permanently_rejected', $data['note']);
        });

        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        if ($owner) {
            $this->notifySafely($owner, new ClinicApplicationPermanentRejectionNotification($tenant));
        }

        return back()->with('success', "{$tenant->name} permanently rejected and email blocked.");
    }

    /**
     * PERMANENTLY delete a clinic and everything it owns. This is irreversible:
     * force-deleting the tenant cascades to wipe staff, clients, appointments,
     * clinical notes, invoices, etc. (audit events are kept with a nulled
     * tenant reference). The site owner must type the clinic's name to confirm.
     * Prefer suspend() for an operating clinic — this is the "wipe it" tool.
     */
    public function destroy(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        $request->validate(
            ['confirmation' => ['required', 'string', Rule::in([$tenant->name])]],
            ['confirmation.in' => 'The clinic name you typed does not match.'],
        );

        $tenantName = $tenant->name;
        $previousStatus = $tenant->status;
        $ownerIds = $tenant->staffMemberships()->where('role', StaffMembership::ROLE_CLINIC_OWNER)->pluck('user_id');

        $this->logAuditEvent($request, $tenant, 'clinic.deleted');

        DB::transaction(function () use ($tenant, $ownerIds) {
            // Real delete → DB cascade wipes all of this clinic's data.
            $tenant->forceDelete();

            // Remove owner accounts left orphaned (no other clinic membership,
            // not a client anywhere) — never delete a shared account.
            User::whereIn('id', $ownerIds)->get()->each(function (User $owner) {
                if (! $owner->staffMemberships()->exists() && ! $owner->clients()->exists()) {
                    $owner->delete();
                }
            });
        });

        if ($request->header('referer') && str_contains($request->header('referer'), '/admin/dashboard')) {
            return redirect()->route('admin.dashboard')->with('success', "{$tenantName} was permanently deleted.");
        }

        return redirect()->route('admin.clinics.index', ['status' => $previousStatus])
            ->with('success', "{$tenantName} was permanently deleted.");
    }

    /**
     * Stream the primary practitioner's license document from the private
     * disk. Route is gated by platform.admin + signed, and this policy
     * check, so a leaked link alone is not enough — it must also carry a
     * valid signature and be used by an authenticated platform admin.
     */
    public function document(Request $request, Tenant $tenant): StreamedResponse
    {
        $this->authorize('viewDocuments', $tenant);

        $profile = PractitionerProfile::where('is_primary_contact', true)
            ->whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->firstOrFail();

        abort_unless($profile->license_document_path, 404);

        $this->logAuditEvent($request, $tenant, 'clinic.document_viewed');

        return Storage::disk('local')->response(
            $profile->license_document_path,
            $profile->license_document_original_name,
        );
    }

    protected function logAuditEvent(Request $request, Tenant $tenant, string $action, ?string $reason = null): void
    {
        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => Tenant::class,
            'resource_id' => $tenant->id,
            'ip_address' => $request->ip(),
            'reason' => $reason,
        ]);
    }
}
