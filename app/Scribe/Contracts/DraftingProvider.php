<?php

namespace App\Scribe\Contracts;

use App\Scribe\Drafting\DraftingException;
use App\Scribe\Drafting\DraftingRequest;
use App\Scribe\Drafting\DraftingResult;

/**
 * Profession-specific structured draft generation. ALL Scribe logic talks to
 * this interface, never to a vendor API, so the model/vendor can be swapped by
 * rebinding it (config/scribe.php).
 *
 * Implementations: OpenRouterDraftingProvider (Claude Haiku 4.5 via OpenRouter),
 * FakeDraftingProvider (tests).
 *
 * Contract rules:
 *  - Input: ordered transcript, discipline snapshot and the discipline's
 *    ClinicalNoteTemplate schema (so each discipline gets its own structure),
 *    plus practitioner-entered and objective (Motion, Phase 4) data.
 *  - Output: fields -> items, each with one provenance and evidence pointers.
 *    The result is only a proposal. It never creates, finalizes or signs a
 *    ClinicalNote; the practitioner reviews it.
 */
interface DraftingProvider
{
    public function name(): string;

    /**
     * @throws DraftingException (retryable=true for transient faults)
     */
    public function draft(DraftingRequest $request): DraftingResult;
}
