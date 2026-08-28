<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Notifications\ClinicApplicationApprovedNotification;
use App\Notifications\ClinicApplicationNeedsInfoNotification;
use App\Notifications\ClinicApplicationRejectedNotification;
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

        $tenants = Tenant::query()
            ->where('status', $status)
            ->orderBy('submitted_at')
            ->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'primary_contact_name' => $tenant->primary_contact_name,
                'primary_contact_email' => $tenant->primary_contact_email,
                'requested_disciplines' => $tenant->requested_disciplines,
                'estimated_practitioner_count' => $tenant->estimated_practitioner_count,
                'submitted_at' => $tenant->submitted_at?->format('M j, Y g:i A'),
                'submitted_ago' => $tenant->submitted_at?->diffForHumans(),
            ]);

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

        return Inertia::render('Admin/Clinics/Show', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'slug' => $tenant->slug,
                'business_registration_number' => $tenant->business_registration_number,
                'address' => $tenant->address,
                'primary_contact_name' => $tenant->primary_contact_name,
                'primary_contact_email' => $tenant->primary_contact_email,
                'primary_contact_phone' => $tenant->primary_contact_phone,
                'requested_disciplines' => $tenant->requested_disciplines,
                'estimated_practitioner_count' => $tenant->estimated_practitioner_count,
                'submitted_at' => $tenant->submitted_at?->format('M j, Y g:i A'),
                'reviewed_at' => $tenant->reviewed_at?->format('M j, Y g:i A'),
                'review_note' => $tenant->review_note,
            ],
            'primaryPractitioner' => $primaryProfile ? [
                'id' => $primaryProfile->id,
                'profession' => $primaryProfile->profession,
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
            'timezone' => ['required', Rule::in(ClinicOptions::TIMEZONES)],
            'currency' => ['required', Rule::in(ClinicOptions::CURRENCIES)],
            'requested_disciplines' => ['required', 'array', 'min:1'],
            'requested_disciplines.*' => [Rule::in(ClinicRegistrationController::DISCIPLINES)],
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
            $tenant->update(['status' => Tenant::STATUS_SUSPENDED]);
            $this->logAuditEvent($request, $tenant, 'clinic.suspended');
        });

        return back()->with('success', "{$tenant->name} suspended.");
    }

    public function reactivate(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        abort_unless($tenant->status === Tenant::STATUS_SUSPENDED, 403, 'Only a suspended clinic can be reactivated.');

        DB::transaction(function () use ($request, $tenant) {
            $tenant->update(['status' => Tenant::STATUS_APPROVED]);
            $this->logAuditEvent($request, $tenant, 'clinic.reactivated');
        });

        return back()->with('success', "{$tenant->name} reactivated.");
    }

    public function approve(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        // Status change + primary-practitioner verification + audit insert must
        // all land together or not at all.
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

            $this->logAuditEvent($request, $tenant, 'clinic.approved');
        });

        // Kept OUTSIDE the transaction: a mail/queue failure must never roll back
        // a completed approval.
        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $this->notifySafely($owner, new ClinicApplicationApprovedNotification($tenant));

        return back()->with('success', "{$tenant->name} approved.");
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

    public function reject(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        // Note stays required — validation runs before any writes.
        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $tenant, $data) {
            $tenant->update([
                'status' => Tenant::STATUS_REJECTED,
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'review_note' => $data['note'],
            ]);

            $this->logAuditEvent($request, $tenant, 'clinic.rejected', $data['note']);
        });

        // Outside the transaction: mail/queue failure must not roll back the review.
        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $this->notifySafely($owner, new ClinicApplicationRejectedNotification($tenant));

        return back()->with('success', "{$tenant->name} rejected.");
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
