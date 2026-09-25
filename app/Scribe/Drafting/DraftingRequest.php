<?php

namespace App\Scribe\Drafting;

/**
 * Provider-neutral drafting input. Carries no client identifiers: only the
 * discipline, the template structure and the transcript text.
 */
final class DraftingRequest
{
    /**
     * @param  array<int, array{id: string, sequence: int, text: string, start_ms: int, end_ms: int, speaker_role: ?string}>  $transcript
     * @param  array<string, mixed>  $templateSchema  ClinicalNoteTemplate schema snapshot for the discipline
     * @param  array<int, array{section_key: string, content: string}>  $practitionerEntered
     * @param  array<int, ObjectiveMeasurement>  $objectiveMeasurements  (Phase 4, from ObjectiveMeasurementSource)
     */
    public function __construct(
        public readonly string $discipline,
        public readonly string $disciplineLabel,
        public readonly array $templateSchema,
        public readonly array $transcript,
        public readonly array $practitionerEntered = [],
        public readonly array $objectiveMeasurements = [],
    ) {}
}
