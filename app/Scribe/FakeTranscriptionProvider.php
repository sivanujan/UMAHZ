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

        $defaultText = match ($request->language) {
            'zh' => '患者主诉右侧肩颈部酸痛两周，伏案工作后明显加重。触诊发现右侧斜方肌及肩胛提肌明显紧张伴压痛点。',
            default => 'Patient reports persistent tightness and aching in the right neck and shoulder area for two weeks, worsening after desk work.',
        };

        return new TranscriptionResult(
            text: $next ?? $defaultText,
            language: $request->language ?? 'en',
            model: 'fake-1',
        );
    }
}
