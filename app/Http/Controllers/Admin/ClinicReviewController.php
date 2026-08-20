<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PractitionerProfile;
use App\Models\Tenant;
use App\Notifications\ClinicApplicationApprovedNotification;
use App\Notifications\ClinicApplicationNeedsInfoNotification;
use App\Notifications\ClinicApplicationRejectedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function approve(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

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

        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $owner?->notify(new ClinicApplicationApprovedNotification($tenant));

        return back()->with('success', "{$tenant->name} approved.");
    }

    public function requestMoreInfo(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $tenant->update([
            'status' => Tenant::STATUS_NEEDS_MORE_INFO,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'review_note' => $data['note'],
        ]);

        $this->logAuditEvent($request, $tenant, 'clinic.needs_more_info', $data['note']);

        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $owner?->notify(new ClinicApplicationNeedsInfoNotification($tenant));

        return back()->with('success', "Requested more information from {$tenant->name}.");
    }

    public function reject(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->authorize('review', $tenant);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $tenant->update([
            'status' => Tenant::STATUS_REJECTED,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'review_note' => $data['note'],
        ]);

        $this->logAuditEvent($request, $tenant, 'clinic.rejected', $data['note']);

        $owner = $tenant->staffMemberships()->where('role', 'clinic_owner')->first()?->user;
        $owner?->notify(new ClinicApplicationRejectedNotification($tenant));

        return back()->with('success', "{$tenant->name} rejected.");
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
