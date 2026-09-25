<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ConsentType;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeDraftItem;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Scribe\ScribeConsentException;
use App\Scribe\ScribeDraftService;
use App\Scribe\ScribeHandoffService;
use App\Scribe\ScribeSessionService;
use App\Scribe\ScribeStateException;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * JSON API behind the Scribe panel. Every endpoint is tenant-checked and
 * policy-gated; every recording action passes the server-side consent gate in
 * ScribeSessionService.
 */
class ScribeSessionController extends Controller
{
    public function __construct(
        private readonly ScribeSessionService $scribe,
        private readonly ScribeDraftService $drafts,
        private readonly ScribeHandoffService $handoff,
    ) {}

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', ScribeSession::class);

        $tenantId = TenantScope::getTenantId();

        $data = $request->validate([
            'client_id' => ['required', 'uuid', Rule::exists('clients', 'id')->where('tenant_id', $tenantId)],
            'appointment_id' => ['nullable', 'uuid'],
        ]);

        $client = Client::where('tenant_id', $tenantId)->findOrFail($data['client_id']);

        $appointment = null;
        if (! empty($data['appointment_id'])) {
            $appointment = Appointment::where('tenant_id', $tenantId)
                ->where('client_id', $client->id)
                ->findOrFail($data['appointment_id']);
        }

        $membership = $this->membership($request, $tenantId);

        $session = $this->scribe->open(Tenant::findOrFail($tenantId), $membership, $request->user(), $client, $appointment, $request->ip());

        return response()->json(['session' => $this->payload($session, $request)], 201);
    }

    /**
     * Full state + transcript. Polled by the panel; pass ?after_sequence=N to
     * receive only newer segments.
     */
    public function show(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'view');

        // Audit transcript access, de-duplicated per user+session for 10
        // minutes so near-live polling does not flood the audit log.
        if (Cache::add("scribe:viewed:{$scribeSession->id}:{$request->user()->id}", true, now()->addMinutes(10))) {
            AuditEvent::create([
                'tenant_id' => $scribeSession->tenant_id,
                'user_id' => $request->user()->id,
                'action' => 'scribe.transcript_viewed',
                'resource_type' => ScribeSession::class,
                'resource_id' => $scribeSession->id,
                'ip_address' => $request->ip(),
                'metadata' => ['client_id' => $scribeSession->client_id],
            ]);
        }

        $after = $request->integer('after_sequence', -1);

        return response()->json(['session' => $this->payload($scribeSession, $request, $after)]);
    }

    public function captureConsent(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        $data = $request->validate([
            'signer_name' => ['required', 'string', 'max:255'],
            'signature_type' => ['required', Rule::in(['draw', 'typed'])],
            'signature_data' => ['required', 'string', 'max:500000'],
            'confirmed' => ['accepted'],
        ]);

        return $this->run($request, $scribeSession, fn () => $this->scribe->captureConsent($scribeSession, $data, $request->user(), $request->ip()));
    }

    public function withdrawConsent(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'withdrawConsent');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return $this->run($request, $scribeSession, fn () => $this->scribe->withdrawConsent($scribeSession, $request->user(), $data['reason'], $request->ip()));
    }

    public function start(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, fn () => $this->scribe->start($scribeSession, $request->user(), $request->ip()));
    }

    public function pause(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, fn () => $this->scribe->pause($scribeSession, $request->user(), $request->ip()));
    }

    public function resume(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, fn () => $this->scribe->resume($scribeSession, $request->user(), $request->ip()));
    }

    public function stop(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, fn () => $this->scribe->stop($scribeSession, $request->user(), $request->ip()));
    }

    public function uploadChunk(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        $data = $request->validate([
            'audio' => [
                'required', 'file',
                'max:'.config('scribe.max_chunk_kb'),
                'mimetypes:'.implode(',', ScribeSessionService::ACCEPTED_MIME_TYPES),
            ],
            'sequence' => ['required', 'integer', 'min:0', 'max:100000'],
            'duration_ms' => ['required', 'integer', 'min:0', 'max:120000'],
            'offset_ms' => ['required', 'integer', 'min:0'],
        ]);

        return $this->run($request, $scribeSession, function () use ($request, $scribeSession, $data) {
            $chunk = $this->scribe->acceptChunk(
                $scribeSession,
                $request->file('audio'),
                (int) $data['sequence'],
                (int) $data['duration_ms'],
                (int) $data['offset_ms'],
                $request->user(),
                $request->ip(),
            );

            return ['chunk' => ['id' => $chunk->id, 'sequence' => $chunk->sequence, 'status' => $chunk->fresh()->status]];
        }, status: 202);
    }

    /**
     * Phase 2: (re)generate the profession-specific AI draft from the transcript.
     */
    public function generateDraft(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, fn () => $this->drafts->request($scribeSession, $request->user(), $request->ip()), status: 202);
    }

    /**
     * Phase 3: pre-fill a DRAFT clinical note from the AI draft. The
     * practitioner reviews, edits and signs it in Clinical Notes.
     */
    public function handoff(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, function () use ($request, $scribeSession) {
            $note = $this->handoff->handoff($scribeSession, $request->user(), $request->ip());

            return ['clinical_note_id' => $note->id, 'redirect' => "/app/notes/{$note->id}/edit"];
        });
    }

    public function retryFailed(Request $request, ScribeSession $scribeSession): JsonResponse
    {
        $this->authorizeSession($scribeSession, 'record');

        return $this->run($request, $scribeSession, fn () => ['retried' => $this->scribe->retryFailed($scribeSession, $request->user(), $request->ip())]);
    }

    /**
     * Run a service action and map domain refusals to HTTP responses.
     */
    private function run(Request $request, ScribeSession $session, Closure $action, int $status = 200): JsonResponse
    {
        try {
            $extra = $action();
        } catch (ScribeConsentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'consent_required',
                'session' => $this->payload($session->refresh(), $request),
            ], 403);
        } catch (ScribeStateException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'invalid_state',
                'session' => $this->payload($session->refresh(), $request),
            ], 409);
        }

        $body = is_array($extra) ? $extra : [];

        return response()->json(array_merge($body, [
            'session' => $this->payload($session->refresh(), $request),
        ]), $status);
    }

    private function authorizeSession(ScribeSession $session, string $ability): void
    {
        // Explicit tenant check (route-model binding runs before tenant context).
        abort_unless($session->tenant_id === TenantScope::getTenantId(), 404);
        Gate::authorize($ability, $session);
    }

    private function membership(Request $request, string $tenantId): StaffMembership
    {
        return $request->user()->staffMemberships()
            ->where('tenant_id', $tenantId)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->firstOrFail();
    }

    private function payload(ScribeSession $session, Request $request, int $afterSequence = -1): array
    {
        $tenant = Tenant::find($session->tenant_id);
        $session->loadMissing(['client', 'appointment', 'consent']);

        $consentType = ConsentType::withoutGlobalScopes()
            ->where('tenant_id', $session->tenant_id)
            ->where('code', ConsentType::CODE_AI_SCRIBE_RECORDING)
            ->first();

        $segments = ScribeTranscriptSegment::where('scribe_session_id', $session->id)
            ->where('sequence', '>', $afterSequence)
            ->orderBy('sequence')
            ->get()
            ->map(fn (ScribeTranscriptSegment $s) => [
                'id' => $s->id,
                'sequence' => $s->sequence,
                'text' => $s->text,
                'start_ms' => $s->start_ms,
                'end_ms' => $s->end_ms,
                'source' => $s->source,
            ]);

        $chunkCounts = ScribeAudioChunk::where('scribe_session_id', $session->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $consent = $session->consent;
        $settings = $tenant?->scribeSettings() ?? config('scribe.defaults');

        return [
            'id' => $session->id,
            'status' => $session->status,
            'client' => ['id' => $session->client_id, 'name' => $session->client?->full_name],
            'appointment' => $session->appointment ? [
                'id' => $session->appointment->id,
                'starts_at' => $session->appointment->starts_at?->toIso8601String(),
                'service_name' => $session->appointment->service_name,
            ] : null,
            'discipline' => $session->discipline,
            'discipline_label' => $session->discipline_label,
            'has_valid_consent' => $session->hasValidConsent(),
            'consent' => $consent ? [
                'id' => $consent->id,
                'signer_name' => $consent->signer_name,
                'version' => $consent->consent_version,
                'agreed_at' => $consent->agreed_at?->toIso8601String(),
                'status' => $consent->status,
                'withdrawn_at' => $consent->withdrawn_at?->toIso8601String(),
            ] : null,
            'consent_type' => $consentType ? [
                'id' => $consentType->id,
                'name' => $consentType->name,
                'agreement_source' => $consentType->agreement_source ?? ConsentType::SOURCE_TEXT,
                'body' => $consentType->body,
                'version' => $consentType->version ?? 1,
                'is_configured' => $consentType->isConfigured(),
                'pdf_url' => $consentType->pdf_path ? url("/app/consent-types/{$consentType->id}/document") : null,
            ] : null,
            'recorded_ms' => $session->recorded_ms,
            // Lets a reloaded panel continue chunk numbering without collisions.
            'next_sequence' => (int) (ScribeAudioChunk::where('scribe_session_id', $session->id)->max('sequence') ?? -1) + 1,
            'started_at' => $session->started_at?->toIso8601String(),
            'stopped_at' => $session->stopped_at?->toIso8601String(),
            'transcript_ready_at' => $session->transcript_ready_at?->toIso8601String(),
            'consent_withdrawn_at' => $session->consent_withdrawn_at?->toIso8601String(),
            'last_error' => $session->last_error,
            'chunks' => [
                'pending' => (int) (($chunkCounts[ScribeAudioChunk::STATUS_PENDING] ?? 0) + ($chunkCounts[ScribeAudioChunk::STATUS_PROCESSING] ?? 0)),
                'transcribed' => (int) ($chunkCounts[ScribeAudioChunk::STATUS_TRANSCRIBED] ?? 0),
                'failed' => (int) ($chunkCounts[ScribeAudioChunk::STATUS_FAILED] ?? 0),
                'discarded' => (int) ($chunkCounts[ScribeAudioChunk::STATUS_DISCARDED] ?? 0),
            ],
            'segments' => $segments,
            'provider' => $session->transcription_provider,
            'audio_retention' => $settings,
            'can_record' => $request->user()->can('record', $session),
            'timezone' => $tenant?->timezone,
            'draft' => $this->draftPayload($session),
            'clinical_note' => $session->clinical_note_id ? [
                'id' => $session->clinical_note_id,
                'status' => $session->clinicalNote?->status,
                'url' => $session->clinicalNote?->isDraft()
                    ? "/app/notes/{$session->clinical_note_id}/edit"
                    : "/app/notes/{$session->clinical_note_id}",
            ] : null,
            'handed_off_at' => $session->handed_off_at?->toIso8601String(),
        ];
    }

    /**
     * Latest draft version grouped by the template it was written for. Every
     * item keeps its provenance and evidence so the UI never blends sources.
     */
    private function draftPayload(ScribeSession $session): array
    {
        $items = $session->draft_version > 0
            ? ScribeDraftItem::where('scribe_session_id', $session->id)
                ->where('draft_version', $session->draft_version)
                ->orderBy('position')
                ->get()
                ->groupBy('section_key')
            : collect();

        $sections = [];
        foreach ($session->draft_template_snapshot['schema']['sections'] ?? [] as $section) {
            $fields = [];
            foreach ($section['fields'] ?? [] as $field) {
                $fields[] = [
                    'id' => $field['id'],
                    'label' => $field['label'] ?? $field['id'],
                    'type' => $field['type'] ?? 'long_text',
                    'items' => ($items[$field['id']] ?? collect())->map(fn (ScribeDraftItem $i) => [
                        'id' => $i->id,
                        'content' => $i->content,
                        'provenance' => $i->provenance,
                        'review_status' => $i->review_status,
                        'evidence' => array_column($i->evidence ?? [], 'sequence'),
                    ])->values(),
                ];
            }
            $sections[] = ['id' => $section['id'] ?? null, 'title' => $section['title'] ?? '', 'fields' => $fields];
        }

        return [
            'status' => $session->draft_status,
            'error' => $session->draft_error,
            'version' => $session->draft_version,
            'generated_at' => $session->draft_generated_at?->toIso8601String(),
            'template' => $session->draft_template_snapshot
                ? $session->draft_template_snapshot['name'].' (v'.$session->draft_template_snapshot['version'].')'
                : null,
            'sections' => $sections,
        ];
    }
}
