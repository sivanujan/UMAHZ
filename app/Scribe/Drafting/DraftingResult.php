<?php

namespace App\Scribe\Drafting;

/**
 * Raw drafting output, exactly as the model proposed it. It is UNTRUSTED:
 * ScribeDraftService validates every field id, option, provenance and evidence
 * pointer before anything is stored as scribe_draft_items.
 */
final class DraftingResult
{
    /**
     * @param  array<int, array{field_id: string, items: array<int, array{text: string, source: string, evidence: array<int, int>}>}>  $fields
     * @param  array{provider: string, model: ?string, prompt_version: string, usage?: array}  $generator
     */
    public function __construct(
        public readonly array $fields,
        public readonly array $generator,
    ) {}
}
