<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteAddendum;
use App\Models\ClinicalNoteTemplate;
use App\Models\ClientIntake;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClinicalNoteController extends Controller
{
    /**
     * Show editor to draft a new clinical note for an appointment or client encounter.
     */
    public function create(Request $request, Client $client): Response|RedirectResponse
    {
        $this->authorizeClient($client);

        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::findOrFail($tenantId);
        $user = $request->user();

        $membership = $user->staffMemberships()
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->with('practitionerProfile')
            ->firstOrFail();

        // If practitioner, resolve their profession; otherwise fallback to clinic's first discipline
        $discipline = $membership->practitionerProfile?->profession ?? $tenant->allOfferedDisciplines()[0] ?? 'massage_therapy';

        $appointmentId = $request->query('appointment_id');
        $appointment = null;
        if ($appointmentId) {
            $appointment = Appointment::where('tenant_id', $tenantId)
                ->where('client_id', $client->id)
                ->find($appointmentId);

            // Check if a note already exists for this appointment
            $existingNote = ClinicalNote::where('tenant_id', $tenantId)
                ->where('appointment_id', $appointmentId)
                ->first();

            if ($existingNote) {
                return redirect()->route('app.notes.edit', ['note' => $existingNote->id]);
            }
        }

        ClinicalNoteTemplate::ensureDefaultsForTenant($tenantId, [$discipline]);

        $template = ClinicalNoteTemplate::where('tenant_id', $tenantId)
            ->where('discipline', $discipline)
            ->where('is_active', true)
            ->first() ?? ClinicalNoteTemplate::where('tenant_id', $tenantId)->firstOrFail();

        // Optional read-only reference to the client's latest completed intake form
        $latestIntake = ClientIntake::where('tenant_id', $tenantId)
            ->where('client_id', $client->id)
            ->whereIn('status', [ClientIntake::STATUS_COMPLETED, ClientIntake::STATUS_FLAGGED])
            ->latest('submitted_at')
            ->first();

        return Inertia::render('ClinicalNotes/Editor', [
            'client' => [
                'id' => $client->id,
                'name' => $client->full_name ?? trim("{$client->first_name} {$client->last_name}"),
                'first_name' => $client->first_name,
                'last_name' => $client->last_name,
                'email' => $client->email,
                'phone' => $client->phone,
                'date_of_birth' => $client->date_of_birth?->format('Y-m-d'),
                'sex' => $client->sex,
            ],
            'appointment' => $appointment ? [
                'id' => $appointment->id,
                'starts_at' => $appointment->starts_at->toIso8601String(),
                'service_name' => $appointment->service_name,
                'status' => $appointment->status,
            ] : null,
            'note' => null,
            'template' => $template,
            'practitioner' => [
                'id' => $membership->id,
                'name' => $user->name,
                'discipline' => $discipline,
                'discipline_label' => $tenant->disciplineLabel($discipline),
                'credentials' => $membership->practitionerProfile?->credentials ?? '',
                'registration_number' => $membership->practitionerProfile?->registration_number ?? '',
            ],
            'referenceIntake' => $latestIntake ? [
                'id' => $latestIntake->id,
                'discipline' => $latestIntake->discipline,
                'submitted_at' => $latestIntake->submitted_at?->toIso8601String(),
                'responses' => $latestIntake->responses,
                'schema' => $latestIntake->schema_snapshot,
                'flags' => $latestIntake->contraindication_flags,
            ] : null,
        ]);
    }

    /**
     * Store or initialize a new draft clinical note.
     */
    public function store(Request $request, Client $client): RedirectResponse|JsonResponse
    {
        $this->authorizeClient($client);

        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::findOrFail($tenantId);
        $user = $request->user();

        $membership = $user->staffMemberships()
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->with('practitionerProfile')
            ->firstOrFail();

        $validated = $request->validate([
            'appointment_id' => ['nullable', 'uuid'],
            'clinical_note_template_id' => ['required', 'uuid'],
            'content' => ['nullable', 'array'],
        ]);

        $template = ClinicalNoteTemplate::where('tenant_id', $tenantId)
            ->findOrFail($validated['clinical_note_template_id']);

        $note = DB::transaction(function () use ($tenantId, $client, $membership, $template, $validated, $user, $request) {
            $created = ClinicalNote::create([
                'tenant_id' => $tenantId,
                'client_id' => $client->id,
                'staff_membership_id' => $membership->id,
                'appointment_id' => $validated['appointment_id'] ?? null,
                'clinical_note_template_id' => $template->id,
                'discipline' => $template->discipline,
                'template_name' => $template->name,
                'template_version' => $template->version,
                'schema_snapshot' => $template->schema,
                'content' => $validated['content'] ?? [],
                'status' => ClinicalNote::STATUS_DRAFT,
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'action' => 'clinical_note.created',
                'resource_type' => 'ClinicalNote',
                'resource_id' => $created->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'client_id' => $client->id,
                    'discipline' => $template->discipline,
                    'appointment_id' => $validated['appointment_id'] ?? null,
                ],
            ]);

            return $created;
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'note_id' => $note->id,
                'message' => 'Draft initialized successfully',
            ]);
        }

        return redirect("/app/notes/{$note->id}/edit")
            ->with('success', 'Clinical note draft created.');
    }

    /**
     * Edit an existing draft note.
     */
    public function edit(Request $request, ClinicalNote $note): Response|RedirectResponse
    {
        $this->authorize('view', $note);

        if ($note->isImmutable()) {
            return redirect("/app/notes/{$note->id}");
        }

        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::findOrFail($tenantId);
        $client = $note->client;
        $user = $request->user();

        $membership = $note->staffMembership()->with('practitionerProfile', 'user')->first();

        // Optional read-only reference to the client's latest completed intake form
        $latestIntake = ClientIntake::where('tenant_id', $tenantId)
            ->where('client_id', $client->id)
            ->whereIn('status', [ClientIntake::STATUS_COMPLETED, ClientIntake::STATUS_FLAGGED])
            ->latest('submitted_at')
            ->first();

        return Inertia::render('ClinicalNotes/Editor', [
            'client' => [
                'id' => $client->id,
                'name' => $client->full_name ?? trim("{$client->first_name} {$client->last_name}"),
                'first_name' => $client->first_name,
                'last_name' => $client->last_name,
                'email' => $client->email,
                'phone' => $client->phone,
                'date_of_birth' => $client->date_of_birth?->format('Y-m-d'),
                'sex' => $client->sex,
            ],
            'appointment' => $note->appointment ? [
                'id' => $note->appointment->id,
                'starts_at' => $note->appointment->starts_at->toIso8601String(),
                'service_name' => $note->appointment->service_name,
                'status' => $note->appointment->status,
            ] : null,
            'note' => [
                'id' => $note->id,
                'status' => $note->status,
                'discipline' => $note->discipline,
                'content' => $note->content ?? [],
                'template_version' => $note->template_version,
                'updated_at' => $note->updated_at->toIso8601String(),
            ],
            'template' => $note->template ?? [
                'id' => $note->clinical_note_template_id,
                'name' => $note->template_name,
                'schema' => $note->schema_snapshot,
            ],
            'practitioner' => [
                'id' => $membership?->id,
                'name' => $membership?->user?->name ?? $user->name,
                'discipline' => $note->discipline,
                'discipline_label' => $tenant->disciplineLabel($note->discipline),
                'credentials' => $membership?->practitionerProfile?->credentials ?? '',
                'registration_number' => $membership?->practitionerProfile?->registration_number ?? '',
            ],
            'referenceIntake' => $latestIntake ? [
                'id' => $latestIntake->id,
                'discipline' => $latestIntake->discipline,
                'submitted_at' => $latestIntake->submitted_at?->toIso8601String(),
                'responses' => $latestIntake->responses,
                'schema' => $latestIntake->schema_snapshot,
                'flags' => $latestIntake->contraindication_flags,
            ] : null,
        ]);
    }

    /**
     * Autosave draft clinical note content.
     */
    public function autosave(Request $request, ClinicalNote $note): JsonResponse
    {
        $this->authorize('update', $note);

        if ($note->isImmutable()) {
            return response()->json([
                'success' => false,
                'message' => 'Finalized clinical notes cannot be modified.',
            ], 403);
        }

        $validated = $request->validate([
            'content' => ['required', 'array'],
        ]);

        $note->update([
            'content' => $validated['content'],
        ]);

        return response()->json([
            'success' => true,
            'updated_at' => $note->updated_at->toIso8601String(),
            'message' => 'Draft autosaved.',
        ]);
    }

    /**
     * Finalize and sign a clinical note (locking it into an immutable record).
     */
    public function finalize(Request $request, ClinicalNote $note): RedirectResponse|JsonResponse
    {
        $this->authorize('finalize', $note);

        if ($note->isImmutable()) {
            return back()->withErrors(['error' => 'This note has already been finalized and signed.']);
        }

        $validated = $request->validate([
            'signer_name' => ['required', 'string', 'max:255'],
            'signer_credentials' => ['nullable', 'string', 'max:255'],
            'attestation_text' => ['required', 'string', 'max:2000'],
            'content' => ['required', 'array'],
        ]);

        DB::transaction(function () use ($note, $validated, $request) {
            $template = $note->template ?? ClinicalNoteTemplate::find($note->clinical_note_template_id);
            $now = now();

            $note->update([
                'content' => $validated['content'],
                'schema_snapshot' => $template?->schema ?? $note->schema_snapshot,
                'template_version' => $template?->version ?? $note->template_version ?? 1,
                'template_name' => $template?->name ?? $note->template_name,
                'status' => ClinicalNote::STATUS_FINALIZED,
                'signer_name' => $validated['signer_name'],
                'signer_credentials' => $validated['signer_credentials'] ?? null,
                'attestation_text' => $validated['attestation_text'],
                'signed_at' => $now,
                'finalized_at' => $now,
                'finalized_by_user_id' => $request->user()->id,
            ]);

            AuditEvent::create([
                'tenant_id' => $note->tenant_id,
                'user_id' => $request->user()->id,
                'action' => 'clinical_note.finalized',
                'resource_type' => 'ClinicalNote',
                'resource_id' => $note->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'signer_name' => $validated['signer_name'],
                    'signer_credentials' => $validated['signer_credentials'] ?? null,
                    'finalized_at' => $now->toIso8601String(),
                ],
            ]);
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Clinical note finalized and signed successfully.',
                'redirect' => "/app/notes/{$note->id}",
            ]);
        }

        return redirect("/app/notes/{$note->id}")
            ->with('success', 'Clinical note finalized and signed.');
    }

    /**
     * Display a finalized clinical note with all historical addenda.
     */
    public function show(Request $request, ClinicalNote $note): Response|JsonResponse
    {
        $this->authorize('view', $note);

        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::findOrFail($tenantId);
        $user = $request->user();
        $canViewBody = $user->can('viewBody', $note);

        // Audit the view action
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'action' => 'clinical_note.viewed',
            'resource_type' => 'ClinicalNote',
            'resource_id' => $note->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'can_view_body' => $canViewBody,
            ],
        ]);

        $client = $note->client;
        $authorMembership = $note->staffMembership()->with('practitionerProfile', 'user')->first();
        $addenda = $note->addenda()->with('staffMembership.user')->get();

        $notePayload = [
            'id' => $note->id,
            'status' => $note->status,
            'discipline' => $note->discipline,
            'discipline_label' => $tenant->disciplineLabel($note->discipline),
            'template_name' => $note->template_name,
            'template_version' => $note->template_version,
            'schema' => $canViewBody ? ($note->schema_snapshot ?? $note->template?->schema) : null,
            'content' => $canViewBody ? $note->content : null,
            'signer_name' => $note->signer_name,
            'signer_credentials' => $note->signer_credentials,
            'attestation_text' => $note->attestation_text,
            'signed_at' => $note->signed_at?->toIso8601String(),
            'finalized_at' => $note->finalized_at?->toIso8601String(),
            'created_at' => $note->created_at->toIso8601String(),
            'can_view_body' => $canViewBody,
            'author' => [
                'name' => $authorMembership?->user?->name ?? 'Practitioner',
                'credentials' => $authorMembership?->practitionerProfile?->credentials,
            ],
            'addenda' => $addenda->map(fn ($ad) => [
                'id' => $ad->id,
                'author_name' => $ad->author_name,
                'author_role' => $ad->author_role,
                'reason' => $ad->reason,
                'content' => $canViewBody ? $ad->content : null,
                'signed_at' => $ad->signed_at->toIso8601String(),
            ]),
        ];

        if ($request->wantsJson()) {
            return response()->json([
                'note' => $notePayload,
            ]);
        }

        return Inertia::render('ClinicalNotes/Show', [
            'client' => [
                'id' => $client->id,
                'name' => $client->full_name ?? trim("{$client->first_name} {$client->last_name}"),
                'email' => $client->email,
                'phone' => $client->phone,
                'date_of_birth' => $client->date_of_birth?->format('Y-m-d'),
                'sex' => $client->sex,
            ],
            'appointment' => $note->appointment ? [
                'id' => $note->appointment->id,
                'starts_at' => $note->appointment->starts_at->toIso8601String(),
                'service_name' => $note->appointment->service_name,
            ] : null,
            'note' => $notePayload,
            'clinic' => [
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
            ],
        ]);
    }

    /**
     * Append a signed addendum to a finalized clinical note.
     */
    public function addAddendum(Request $request, ClinicalNote $note): RedirectResponse|JsonResponse
    {
        $this->authorize('addAddendum', $note);

        if ($note->isDraft()) {
            return back()->withErrors(['error' => 'Addenda can only be appended to finalized clinical notes.']);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:10000'],
            'author_name' => ['required', 'string', 'max:255'],
        ]);

        $tenantId = TenantScope::getTenantId();
        $user = $request->user();

        $membership = $user->staffMemberships()
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->firstOrFail();

        DB::transaction(function () use ($note, $tenantId, $membership, $user, $validated, $request) {
            $now = now();

            $addendum = ClinicalNoteAddendum::create([
                'tenant_id' => $tenantId,
                'clinical_note_id' => $note->id,
                'staff_membership_id' => $membership->id,
                'author_user_id' => $user->id,
                'author_name' => $validated['author_name'],
                'author_role' => $membership->role,
                'reason' => $validated['reason'],
                'content' => $validated['content'],
                'signed_at' => $now,
            ]);

            // Update parent note status to addended if not already
            if ($note->status !== ClinicalNote::STATUS_ADDENDED) {
                $note->update(['status' => ClinicalNote::STATUS_ADDENDED]);
            }

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'action' => 'clinical_note.addendum_added',
                'resource_type' => 'ClinicalNoteAddendum',
                'resource_id' => $addendum->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'clinical_note_id' => $note->id,
                    'reason' => $validated['reason'],
                    'author_name' => $validated['author_name'],
                    'signed_at' => $now->toIso8601String(),
                ],
            ]);
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Signed addendum appended successfully.',
            ]);
        }

        return back()->with('success', 'Addendum appended successfully.');
    }

    /**
     * Delete a draft note (finalized notes cannot be deleted).
     */
    public function destroy(Request $request, ClinicalNote $note): RedirectResponse
    {
        $this->authorize('delete', $note);

        if ($note->isImmutable()) {
            return back()->withErrors(['error' => 'Finalized healthcare records cannot be deleted.']);
        }

        $tenantId = $note->tenant_id;
        $clientId = $note->client_id;
        $noteId = $note->id;

        DB::transaction(function () use ($note, $tenantId, $noteId, $request) {
            $note->delete();

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'clinical_note.deleted',
                'resource_type' => 'ClinicalNote',
                'resource_id' => $noteId,
                'ip_address' => $request->ip(),
            ]);
        });

        return redirect("/app/clients/{$clientId}")
            ->with('success', 'Draft clinical note deleted.');
    }

    private function authorizeClient(Client $client): void
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId || $client->tenant_id !== $tenantId) {
            abort(404);
        }
    }
}
