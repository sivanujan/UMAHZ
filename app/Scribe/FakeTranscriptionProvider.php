<?php

namespace App\Scribe;

use App\Scribe\Contracts\TranscriptionProvider;

/**
 * Deterministic, network-free provider for tests and local UI work
 * (SCRIBE_TRANSCRIPTION_DRIVER=fake). Proves Scribe depends only on the contract.
 */
class FakeTranscriptionProvider implements TranscriptionProvider
{
    /** @var array<int, TranscriptionRequest> */
    public array $requests = [];

    /** @var array<int, string|\Throwable> queued responses, consumed in order */
    private array $queue = [];

    public function name(): string
    {
        return 'fake';
    }

    /**
     * Queue the next responses: a string is returned as the transcript, a
     * Throwable is thrown (e.g. new TranscriptionException('boom')).
     */
    public function respondWith(string|\Throwable ...$responses): static
    {
        array_push($this->queue, ...$responses);

        return $this;
    }

    public function transcribe(TranscriptionRequest $request): TranscriptionResult
    {
        $this->requests[] = $request;

        $next = array_shift($this->queue);

        if ($next instanceof \Throwable) {
            throw $next;
        }

        return new TranscriptionResult(
            text: $next ?? 'Fake transcript for '.$request->filename.'.',
            language: 'en',
            model: 'fake-1',
        );
    }
}
