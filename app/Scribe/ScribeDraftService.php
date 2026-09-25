<?php

namespace App\Scribe;

use App\Jobs\GenerateScribeDraft;
use App\Models\AuditEvent;
use App\Models\ClinicalNoteTemplate;
use App\Models\ScribeDraftItem;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\Tenant;
use App\Models\User;
use App\Scribe\Contracts\DraftingProvider;
use App\Scribe\Contracts\ObjectiveMeasurementSource;
use App\Scribe\Drafting\DraftingException;
use App\Scribe\Drafting\DraftingRequest;
use Illuminate\Support\Facades\DB;

/**
 * Phase 2: turn a finished transcript into a profession-specific DRAFT.
 *
 * The model's answer is untrusted. Every field id, select option, provenance
 * label and evidence pointer is validated here before it is stored as
 * scribe_draft_items. The draft is only a proposal: nothing here touches
 * clinical_notes, and the session never becomes "finalized".
 */
class ScribeDraftService
{
    public function __construct(
        private readonly DraftingProvider $drafting,
        private readonly ObjectiveMeasurementSource $measurements,
    ) {}

    /**
     * Queue a (re)generation. Idempotent while one is already running.
     */
    public function request(ScribeSession $session, User $user, ?string $ip): ScribeSession
    {
        if (! $session->hasValidConsent()) {
            throw new ScribeConsentException;
        }

        if (! in_array($session->status, [ScribeSession::STATUS_TRANSCRIPT_READY, ScribeSession::STATUS_DRAFT_READY], true)) {
            throw new ScribeStateException('A draft can be generated once the transcript is ready.');
        }

        if (! ScribeTranscriptSegment::where('scribe_session_id', $session->id)->exists()) {
            throw new ScribeStateException('There is no transcript to draft from yet.');
        }

        if ($session->draft_status === ScribeSession::DRAFT_GENERATING) {
            return $session;
        }

        DB::transaction(function () use ($session, $user, $ip) {
            $session->forceFill(['draft_status' => ScribeSession::DRAFT_GENERATING, 'draft_error' => null])->save();
            $this->audit($session, $user?->id, 'scribe.draft_requested', $ip, ['regenerate' => $session->draft_version > 0]);
        });

        GenerateScribeDraft::dispatch($session->id, $user->id);

        return $session->refresh();
    }

    /**
     * Run the provider and store the validated draft (called by the job).
     *
     * @throws DraftingException for the job to retry or fail
     */
    public function generate(string $sessionId, ?string $userId): void
    {
        $session = ScribeSession::withoutGlobalScopes()->find($sessionId);

        if (! $session || $session->draft_status !== ScribeSession::DRAFT_GENERATING) {
            return;
        }

        if (! $session->hasValidConsent()) {
            $this->markFailed($sessionId, 'Recording consent was withdrawn, so no draft was generated.');

            return;
        }

        $tenant = Tenant::findOrFail($session->tenant_id);
        $template = $this->templateFor($session, $tenant);
        $schema = $template->schema ?? ['sections' => []];

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->orderBy('sequence')
            ->get();

        $result = $this->drafting->draft(new DraftingRequest(
            discipline: $template->discipline,
            disciplineLabel: $session->discipline_label ?: $tenant->disciplineLabel($template->discipline),
            templateSchema: $schema,
            transcript: $segments->map(fn (ScribeTranscriptSegment $s) => [
                'id' => $s->id,
                'sequence' => $s->sequence,
                'text' => $s->text,
                'start_ms' => $s->start_ms,
                'end_ms' => $s->end_ms,
                'speaker_role' => $s->speaker_role,
            ])->all(),
            objectiveMeasurements: $this->measurements->approvedMeasurementsFor($session),
        ));

        $items = $this->validate($result->fields, $schema, $segments->keyBy('sequence')->all());

        DB::transaction(function () use ($session, $template, $schema, $items, $result, $userId) {
            $session = ScribeSession::withoutGlobalScopes()->lockForUpdate()->find($session->id);

            // Consent may have been withdrawn while the model was working.
            if (! $session->hasValidConsent()) {
                $session->forceFill(['draft_status' => ScribeSession::DRAFT_FAILED, 'draft_error' => 'Recording consent was withdrawn, so the draft was discarded.'])->save();

                return;
            }

            $version = $session->draft_version + 1;

            foreach ($items as $position => $item) {
                ScribeDraftItem::withoutGlobalScopes()->create([
                    'tenant_id' => $session->tenant_id,
                    'scribe_session_id' => $session->id,
                    'draft_version' => $version,
                    'section_key' => $item['field_id'],
                    'provenance' => $item['provenance'],
                    'content' => $item['text'],
                    'evidence' => $item['evidence'],
                    // Every item was worded by the model, even when it restates a speaker.
                    'generator' => array_diff_key($result->generator, ['usage' => true]),
                    'review_status' => ScribeDraftItem::REVIEW_PROPOSED,
                    'position' => $position,
                ]);
            }

            $session->forceFill([
                'draft_status' => ScribeSession::DRAFT_READY,
                'draft_error' => null,
                'draft_version' => $version,
                'draft_generated_at' => now(),
                'clinical_note_template_id' => $template->id,
                'draft_template_snapshot' => [
                    'name' => $template->name,
                    'version' => $template->version,
                    'discipline' => $template->discipline,
                    'schema' => $schema,
                ],
            ])->save();

            if ($session->status === ScribeSession::STATUS_TRANSCRIPT_READY) {
                $session->transitionTo(ScribeSession::STATUS_DRAFT_READY);
            }

            $this->audit($session, $userId, 'scribe.draft_generated', null, [
                'draft_version' => $version,
                'items' => count($items),
                'template' => $template->name.' v'.$template->version,
                'generator' => $result->generator,
            ]);
        });
    }

    public function markFailed(string $sessionId, string $message): void
    {
        $session = ScribeSession::withoutGlobalScopes()->find($sessionId);

        if (! $session) {
            return;
        }

        $session->forceFill(['draft_status' => ScribeSession::DRAFT_FAILED, 'draft_error' => $message])->save();
        $this->audit($session, null, 'scribe.draft_failed', null, ['error' => $message]);
    }

    /**
     * The discipline's active template (created from the starter set if missing).
     */
    private function templateFor(ScribeSession $session, Tenant $tenant): ClinicalNoteTemplate
    {
        $discipline = $session->discipline ?: ($tenant->offeredDisciplineCodes()[0] ?? 'massage_therapy');

        ClinicalNoteTemplate::ensureDefaultsForTenant($tenant->id, [$discipline]);

        return ClinicalNoteTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('discipline', $discipline)
            ->where('is_active', true)
            ->latest('version')
            ->first()
            ?? throw new DraftingException("No active clinical note template for \"{$discipline}\".", retryable: false);
    }

    /**
     * Keep only what the template allows and the transcript supports.
     *
     * @param  array<string, ScribeTranscriptSegment>  $segmentsBySequence
     * @return array<int, array{field_id: string, provenance: string, text: string, evidence: array}>
     */
    private function validate(array $fields, array $schema, array $segmentsBySequence): array
    {
        $defs = [];
        foreach ($schema['sections'] ?? [] as $section) {
            foreach ($section['fields'] ?? [] as $field) {
                if (! empty($field['id'])) {
                    $defs[$field['id']] = $field;
                }
            }
        }

        $out = [];
        $seenSingle = [];

        foreach ($fields as $field) {
            $def = $defs[$field['field_id'] ?? ''] ?? null;
            if (! $def || ! is_array($field['items'] ?? null)) {
                continue; // unknown field: the model made it up
            }

            $type = $def['type'] ?? 'long_text';
            $options = array_values(array_filter((array) ($def['options'] ?? []), 'is_string'));

            foreach ($field['items'] as $item) {
                $text = trim((string) ($item['text'] ?? ''));
                if ($text === '') {
                    continue;
                }

                if (in_array($type, ['select', 'radio', 'multiselect'], true)) {
                    $match = collect($options)->first(fn ($o) => mb_strtolower(trim($o)) === mb_strtolower($text));
                    if ($match === null) {
                        continue; // not a real option
                    }
                    $text = $match;

                    if ($type !== 'multiselect') {
                        if (isset($seenSingle[$def['id']])) {
                            continue; // single-choice field: keep the first answer only
                        }
                        $seenSingle[$def['id']] = true;
                    }
                }

                $evidence = collect((array) ($item['evidence'] ?? []))
                    ->filter(fn ($n) => is_numeric($n) && isset($segmentsBySequence[(int) $n]))
                    ->map(fn ($n) => ['sequence' => (int) $n, 'segment_id' => $segmentsBySequence[(int) $n]->id])
                    ->unique('sequence')
                    ->values()
                    ->all();

                $provenance = in_array($item['source'] ?? null, ScribeDraftItem::AI_ASSIGNABLE_PROVENANCES, true)
                    ? $item['source']
                    : ScribeDraftItem::PROVENANCE_AI_GENERATED;

                // A claim that "the client/practitioner said this" must point at what they said.
                if ($provenance !== ScribeDraftItem::PROVENANCE_AI_GENERATED && $evidence === []) {
                    $provenance = ScribeDraftItem::PROVENANCE_AI_GENERATED;
                }

                $out[] = [
                    'field_id' => $def['id'],
                    'provenance' => $provenance,
                    'text' => mb_substr($text, 0, 5000),
                    'evidence' => $evidence,
                ];
            }
        }

        return $out;
    }

    private function audit(ScribeSession $session, ?string $userId, string $action, ?string $ip, array $metadata = []): void
    {
        AuditEvent::create([
            'tenant_id' => $session->tenant_id,
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => ScribeSession::class,
            'resource_id' => $session->id,
            'ip_address' => $ip,
            'metadata' => array_merge(['client_id' => $session->client_id], $metadata),
        ]);
    }
}
