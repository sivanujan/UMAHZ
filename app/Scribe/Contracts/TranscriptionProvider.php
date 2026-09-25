<?php

namespace App\Scribe\Contracts;

use App\Scribe\TranscriptionException;
use App\Scribe\TranscriptionRequest;
use App\Scribe\TranscriptionResult;

/**
 * Speech-to-text contract. ALL Scribe logic talks to this interface, never to a
 * vendor SDK, so the provider can be swapped (e.g. for a Canadian-hosted one
 * that passes privacy/residency review) by rebinding it — same approach as
 * PatientBilling\Contracts\PaymentProvider.
 *
 * Implementations: AssemblyAiTranscriptionProvider, FakeTranscriptionProvider (tests).
 */
interface TranscriptionProvider
{
    /**
     * Stable identifier stored on sessions/segments for provenance (e.g. "assemblyai").
     */
    public function name(): string;

    /**
     * Transcribe one self-contained audio chunk.
     *
     * @throws TranscriptionException (retryable=true for transient faults: timeouts, 429, 5xx)
     */
    public function transcribe(TranscriptionRequest $request): TranscriptionResult;
}
