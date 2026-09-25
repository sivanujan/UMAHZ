<?php

namespace App\Scribe;

/**
 * Provider-neutral input for one chunk. Carries no patient identifiers: only
 * the audio and optional decoding hints ever leave UMAHZ.
 */
final class TranscriptionRequest
{
    public function __construct(
        public readonly string $audio,
        public readonly string $mimeType,
        public readonly string $filename,
        public readonly ?string $language = null,
        // Preceding transcript text; helps the model keep continuity across chunk boundaries.
        public readonly ?string $prompt = null,
    ) {}
}
