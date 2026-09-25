<?php

namespace App\Scribe;

use App\Models\AuditEvent;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\ScribeDraftItem;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Phase 3: hand a Scribe draft to the Clinical Notes module.
 *
 * Scribe feeds INTO Clinical Notes and never replaces it:
 *  - it only ever creates or pre-fills a note in DRAFT status;
 *  - it fills only empty fields, never overwriting what the practitioner typed;
 *  - it refuses to touch a finalized/addended note (corrections are addenda);
 *  - reviewing, editing and signing stay entirely in ClinicalNoteController.
 */
class ScribeHandoffService
{
    public function handoff(ScribeSession $session, User $user, ?string $ip): ClinicalNote
    {
        if ($session->status !== ScribeSession::STATUS_DRAFT_READY || $session->draft_version < 1) {
            throw new ScribeStateException('Generate an AI draft before sending it to the clinical note.');
        }

        return DB::transaction(function () use ($session, $user, $ip) {
            $session = ScribeSession::withoutGlobalScopes()->lockForUpdate()->findOrFail($session->id);

            if ($session->status !== ScribeSession::STATUS_DRAFT_READY) {
                throw new ScribeStateException('This draft has already been sent to a clinical note.');
            }

            [$note, $created] = $this->targetNote($session, $user);

            $values = $this->valuesFromDraft($session);
            $content = $note->content ?? [];
            $noteFieldIds = $this->fieldIds($note->schema_snapshot ?? []);

            $filled = [];
            $skipped = [];
            foreach ($values as $fieldId => $value) {
                if (! in_array($fieldId, $noteFieldIds, true)) {
                    continue; // note uses a different template; nothing to map to
                }
                if ($this->isFilled($content[$fieldId] ?? null)) {
                    $skipped[] = $fieldId; // the practitioner already wrote something here

                    continue;
                }
                $content[$fieldId] = $value;
                $filled[] = $fieldId;
            }

            // Always a draft: the practitioner reviews and signs in Clinical Notes.
            $note->forceFill(['content' => $content, 'status' => ClinicalNote::STATUS_DRAFT])->save();

            $session->transitionTo(ScribeSession::STATUS_HANDED_OFF, [
                'clinical_note_id' => $note->id,
                'handed_off_at' => now(),
                'handed_off_by_user_id' => $user->id,
                'handoff_fields' => [
                    'draft_version' => $session->draft_version,
                    'filled' => $filled,
                    'skipped' => $skipped,
                ],
            ]);

            if ($created) {
                $this->audit($session->tenant_id, $user->id, 'clinical_note.created', 'ClinicalNote', $note->id, $ip, [
                    'client_id' => $note->client_id,
                    'discipline' => $note->discipline,
                    'appointment_id' => $note->appointment_id,
                    'source' => 'ai_scribe',
                ]);
            }

            $this->audit($session->tenant_id, $user->id, 'scribe.handed_off', ScribeSession::class, $session->id, $ip, [
                'client_id' => $session->client_id,
                'clinical_note_id' => $note->id,
                'note_created' => $created,
                'draft_version' => $session->draft_version,
                'fields_filled' => count($filled),
                'fields_skipped' => count($skipped),
            ]);

            return $note;
        });
    }

    /**
     * The note to pre-fill: the one already linked, else the appointment's
     * existing note, else a new draft on the draft's template.
     *
     * @return array{0: ClinicalNote, 1: bool} [note, created]
     */
    private function targetNote(ScribeSession $session, User $user): array
    {
        $existing = null;

        if ($session->clinical_note_id) {
            $existing = ClinicalNote::withoutGlobalScopes()->find($session->clinical_note_id);
        }

        if (! $existing && $session->appointment_id) {
            // Clinical Notes allows one note per appointment.
            $existing = ClinicalNote::withoutGlobalScopes()
                ->where('tenant_id', $session->tenant_id)
                ->where('appointment_id', $session->appointment_id)
                ->first();
        }

        if ($existing) {
            if ($existing->tenant_id !== $session->tenant_id || $existing->client_id !== $session->client_id) {
                throw new ScribeStateException('The linked clinical note does not belong to this client.');
            }
            if ($existing->isImmutable()) {
                throw new ScribeStateException('The clinical note for this appointment is already signed. Add an addendum to it instead.');
            }
            if (! $user->can('update', $existing)) {
                throw new ScribeStateException('The clinical note for this appointment belongs to another practitioner.');
            }

            return [$existing, false];
        }

        $template = ClinicalNoteTemplate::withoutGlobalScopes()
            ->where('tenant_id', $session->tenant_id)
            ->find($session->clinical_note_template_id);

        $snapshot = $session->draft_template_snapshot ?? [];

        $membership = StaffMembership::where('user_id', $user->id)
            ->where('tenant_id', $session->tenant_id)
            ->where('status', StaffMembership::STATUS_ACTIVE)
            ->firstOrFail();

        $note = ClinicalNote::withoutGlobalScopes()->create([
            'tenant_id' => $session->tenant_id,
            'client_id' => $session->client_id,
            'staff_membership_id' => $membership->id,
            'appointment_id' => $session->appointment_id,
            'clinical_note_template_id' => $template?->id,
            'discipline' => $snapshot['discipline'] ?? $template?->discipline ?? $session->discipline,
            'template_name' => $snapshot['name'] ?? $template?->name ?? 'Clinical Note',
            'template_version' => $snapshot['version'] ?? $template?->version ?? 1,
            // The exact structure the draft was written for.
            'schema_snapshot' => $snapshot['schema'] ?? $template?->schema ?? ['sections' => []],
            'content' => [],
            'status' => ClinicalNote::STATUS_DRAFT,
        ]);

        return [$note, true];
    }

    /**
     * Collapse the latest draft version into note-field values.
     *
     * @return array<string, string|array<int, string>>
     */
    private function valuesFromDraft(ScribeSession $session): array
    {
        $types = [];
        foreach ($session->draft_template_snapshot['schema']['sections'] ?? [] as $section) {
            foreach ($section['fields'] ?? [] as $field) {
                $types[$field['id']] = $field['type'] ?? 'long_text';
            }
        }

        $values = [];
        $items = ScribeDraftItem::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->where('draft_version', $session->draft_version)
            ->where('review_status', '!=', ScribeDraftItem::REVIEW_REJECTED)
            ->orderBy('position')
            ->get()
            ->groupBy('section_key');

        foreach ($items as $fieldId => $fieldItems) {
            $texts = $fieldItems->pluck('content')->filter(fn ($t) => trim((string) $t) !== '')->values();
            if ($texts->isEmpty()) {
                continue;
            }

            $values[$fieldId] = match ($types[$fieldId] ?? 'long_text') {
                'multiselect' => $texts->unique()->values()->all(),
                'select', 'radio' => $texts->first(),
                'short_text' => $texts->implode('; '),
                default => $texts->implode("\n"),
            };
        }

        return $values;
    }

    private function fieldIds(array $schema): array
    {
        $ids = [];
        foreach ($schema['sections'] ?? [] as $section) {
            foreach ($section['fields'] ?? [] as $field) {
                if (! empty($field['id'])) {
                    $ids[] = $field['id'];
                }
            }
        }

        return $ids;
    }

    private function isFilled(mixed $value): bool
    {
        return is_array($value) ? $value !== [] : trim((string) $value) !== '';
    }

    private function audit(string $tenantId, string $userId, string $action, string $type, string $id, ?string $ip, array $metadata): void
    {
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => $type,
            'resource_id' => $id,
            'ip_address' => $ip,
            'metadata' => $metadata,
        ]);
    }
}
