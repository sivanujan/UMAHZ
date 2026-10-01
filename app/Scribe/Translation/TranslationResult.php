<?php

namespace App\Scribe\Translation;

final class TranslationResult
{
    /**
     * @param  array<int, array{sequence: int, translated_text: string}>  $segments
     */
    public function __construct(
        public readonly array $segments,
        public readonly string $provider,
        public readonly ?string $model = null,
    ) {}
}
