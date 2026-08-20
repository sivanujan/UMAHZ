<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PractitionerProfile;
use App\Notifications\PractitionerRejectedNotification;
use App\Notifications\PractitionerVerifiedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PractitionerReviewController extends Controller
{
    /**
     * The secondary verification queue: practitioners added to an already-
     * live clinic. Deliberately excludes primary-contact profiles — those
     * are resolved together with their clinic's own approval, never here.
     */
    public function index(): Response
    {
        $profiles = PractitionerProfile::with('staffMembership.tenant', 'staffMembership.user')
            ->where('is_primary_contact', false)
            ->pendingVerification()
            ->get()
            ->sortBy('created_at')
            ->values()
            ->map(fn (PractitionerProfile $p) => [
                'id' => $p->id,
                'name' => $p->staffMembership->user->name,
                'tenant_name' => $p->staffMembership->tenant->name,
                'profession' => $p->profession,
                'submitted_ago' => $p->created_at->diffForHumans(),
            ]);

        return Inertia::render('Admin/Practitioners/Index', [
            'practitioners' => $profiles,
        ]);
    }

    public function show(PractitionerProfile $practitionerProfile): Response
    {
        $this->authorize('review', $practitionerProfile);

        $practitionerProfile->loadMissing('staffMembership.tenant', 'staffMembership.user');

        return Inertia::render('Admin/Practitioners/Show', [
            'practitioner' => [
                'id' => $practitionerProfile->id,
                'name' => $practitionerProfile->staffMembership->user->name,
                'email' => $practitionerProfile->staffMembership->user->email,
                'tenant_name' => $practitionerProfile->staffMembership->tenant->name,
                'profession' => $practitionerProfile->profession,
                'verification_status' => $practitionerProfile->verification_status,
                'license_number' => $practitionerProfile->license_number,
                'licensing_body' => $practitionerProfile->licensing_body,
                'has_document' => (bool) $practitionerProfile->license_document_path,
                'document_name' => $practitionerProfile->license_document_original_name,
                'document_mime' => $practitionerProfile->license_document_mime,
                'document_url' => $practitionerProfile->license_document_path
                    ? URL::temporarySignedRoute('admin.practitioners.document', now()->addMinutes(15), ['practitionerProfile' => $practitionerProfile->id])
                    : null,
                'review_note' => $practitionerProfile->review_note,
            ],
        ]);
    }

    public function approve(Request $request, PractitionerProfile $practitionerProfile): RedirectResponse
    {
        $this->authorize('review', $practitionerProfile);

        $practitionerProfile->update([
            'verification_status' => PractitionerProfile::VERIFICATION_VERIFIED,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'review_note' => null,
        ]);

        $this->logAuditEvent($request, $practitionerProfile, 'practitioner.verified');

        $practitionerProfile->loadMissing('staffMembership.user');
        $this->notifySafely($practitionerProfile->staffMembership->user, new PractitionerVerifiedNotification($practitionerProfile));

        return back()->with('success', 'Practitioner verified.');
    }

    public function reject(Request $request, PractitionerProfile $practitionerProfile): RedirectResponse
    {
        $this->authorize('review', $practitionerProfile);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $practitionerProfile->update([
            'verification_status' => PractitionerProfile::VERIFICATION_REJECTED,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'review_note' => $data['note'],
        ]);

        $this->logAuditEvent($request, $practitionerProfile, 'practitioner.rejected', $data['note']);

        $practitionerProfile->loadMissing('staffMembership.user');
        $this->notifySafely($practitionerProfile->staffMembership->user, new PractitionerRejectedNotification($practitionerProfile));

        return back()->with('success', 'Practitioner verification rejected.');
    }

    public function document(Request $request, PractitionerProfile $practitionerProfile): StreamedResponse
    {
        $this->authorize('viewDocument', $practitionerProfile);

        abort_unless($practitionerProfile->license_document_path, 404);

        $this->logAuditEvent($request, $practitionerProfile, 'practitioner.document_viewed');

        return Storage::disk('local')->response(
            $practitionerProfile->license_document_path,
            $practitionerProfile->license_document_original_name,
        );
    }

    protected function logAuditEvent(Request $request, PractitionerProfile $practitionerProfile, string $action, ?string $reason = null): void
    {
        $practitionerProfile->loadMissing('staffMembership');

        AuditEvent::create([
            'tenant_id' => $practitionerProfile->staffMembership->tenant_id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => PractitionerProfile::class,
            'resource_id' => $practitionerProfile->id,
            'ip_address' => $request->ip(),
            'reason' => $reason,
        ]);
    }
}
