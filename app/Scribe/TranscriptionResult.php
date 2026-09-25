<?php

namespace App\Scribe;

final class TranscriptionResult
{
    public function __construct(
        public readonly string $text,
        public readonly ?string $language = null,
        public readonly ?string $model = null,
    ) {}
}
