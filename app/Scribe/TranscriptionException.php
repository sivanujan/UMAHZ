<?php

namespace App\Scribe;

use RuntimeException;

class TranscriptionException extends RuntimeException
{
    public function __construct(string $message, public readonly bool $retryable = true, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
