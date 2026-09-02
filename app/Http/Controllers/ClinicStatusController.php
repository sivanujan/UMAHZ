<?php

namespace App\Http\Controllers;

use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Notifications\ClinicApplicationReceivedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClinicStatusController extends Controller
{
    /**
     * The "your application is under review" / needs-more-info / rejected
     * page. Reached by EnsureStaffRole for any staff member whose tenant
     * isn't approved yet — it's the one route exempt from that gate.
     */
    public function show(Request $request): Response
    {
        $membership = $request->attributes->get('staffMembership');
        $tenant = $membership->tenant;

        return Inertia::render('Clinic/Status', [
            'tenant' => [
                'name' => $tenant->name,
                'status' => $tenant->status,
                'submitted_at' => $tenant->submitted_at?->format('M j, Y'),
                'reviewed_at' => $tenant->reviewed_at?->format('M j, Y'),
                'review_note' => $tenant->review_note,
                'business_registration_number' => $tenant->business_registration_number,
                'address' => $tenant->address,
                'primary_contact_name' => $tenant->primary_contact_name,
                'primary_contact_email' => $tenant->primary_contact_email,
                'primary_contact_phone' => $tenant->primary_contact_phone,
                'requested_disciplines' => $tenant->requested_disciplines,
                'estimated_practitioner_count' => $tenant->estimated_practitioner_count,
            ],
            'canEdit' => $membership->role === StaffMembership::ROLE_CLINIC_OWNER
                && $tenant->status === Tenant::STATUS_NEEDS_MORE_INFO,
            'disciplines' => $tenant->availableDisciplineCodes(),
            'disciplineLabels' => $tenant->allDisciplineLabels(),
        ]);
    }

    /**
     * Resubmit an application that was sent back for more info. Only the
     * clinic_owner can do this, and only while status is needs_more_info —
     * this is deliberately NOT a full new signup.
     */
    public function update(Request $request): RedirectResponse
    {
        $membership = $request->attributes->get('staffMembership');
        $tenant = $membership->tenant;

        abort_unless($membership->role === StaffMembership::ROLE_CLINIC_OWNER, 403);
        abort_unless($tenant->status === Tenant::STATUS_NEEDS_MORE_INFO, 403, 'This application is not open for edits.');

        $data = $request->validate([
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
            'requested_disciplines.*' => [Rule::in($tenant->availableDisciplineCodes())],
            'estimated_practitioner_count' => ['required', 'integer', 'min:1', 'max:500'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'licensing_body' => ['nullable', 'string', 'max:255'],
            'license_document' => ['nullable', 'file', 'extensions:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $tenant->update([
            'name' => $data['clinic_name'],
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
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'submitted_at' => now(),
            'review_note' => null,
        ]);

        $primaryProfile = PractitionerProfile::where('staff_membership_id', $membership->id)
            ->where('is_primary_contact', true)
            ->first();

        if ($primaryProfile) {
            $updates = [
                'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
                'review_note' => null,
            ];

            if (!empty($data['license_number'])) {
                $updates['license_number'] = $data['license_number'];
            }
            if (!empty($data['licensing_body'])) {
                $updates['licensing_body'] = $data['licensing_body'];
            }
            if ($request->hasFile('license_document')) {
                $document = $request->file('license_document');
                $updates['license_document_path'] = $document->storeAs(
                    "licenses/{$tenant->id}",
                    Str::uuid().'.'.$document->getClientOriginalExtension(),
                    'local'
                );
                $updates['license_document_original_name'] = $document->getClientOriginalName();
                $updates['license_document_mime'] = $document->getClientMimeType();
            }

            $primaryProfile->update($updates);
        }

        $this->notifySafely($membership->user, new ClinicApplicationReceivedNotification($tenant));

        return back()->with('success', 'Application resubmitted for review.');
    }
}
