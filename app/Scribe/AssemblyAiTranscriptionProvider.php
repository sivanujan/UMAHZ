<?php

namespace App\Scribe;

use App\Scribe\Contracts\TranscriptionProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

/**
 * AssemblyAI speech-to-text over its REST API (same flow as the Python SDK):
 *   1. POST /v2/upload            raw audio bytes      -> upload_url
 *   2. POST /v2/transcript        { audio_url, ... }   -> transcript id
 *   3. GET  /v2/transcript/{id}   poll until completed -> text
 *   4. DELETE /v2/transcript/{id} remove the transcript + audio from AssemblyAI
 *
 * DATA RESIDENCY: audio is sent to AssemblyAI (US by default; set
 * ASSEMBLYAI_BASE_URL=https://api.eu.assemblyai.com for the EU region).
 * Review the provider for privacy/residency before real patient use — see
 * config/scribe.php.
 */
class AssemblyAiTranscriptionProvider implements TranscriptionProvider
{
    public function name(): string
    {
        return 'assemblyai';
    }

    public function transcribe(TranscriptionRequest $request): TranscriptionResult
    {
        $config = config('scribe.transcription.assemblyai');

        if (empty($config['api_key'])) {
            throw new TranscriptionException('Transcription is not configured (ASSEMBLYAI_API_KEY is missing).', retryable: false);
        }

        $http = Http::withHeaders(['authorization' => $config['api_key']])
            ->baseUrl(rtrim($config['base_url'], '/'))
            ->timeout($config['timeout'])
            ->acceptJson();

        $uploadUrl = $this->send(fn () => (clone $http)
            ->withBody($request->audio, 'application/octet-stream')
            ->post('/v2/upload'))
            ->json('upload_url');

        if (! $uploadUrl) {
            throw new TranscriptionException('Transcription service error: upload failed.', retryable: true);
        }

        $transcriptId = $this->send(fn () => (clone $http)->post('/v2/transcript', $this->transcriptOptions($uploadUrl, $request, $config)))
            ->json('id');

        if (! $transcriptId) {
            throw new TranscriptionException('Transcription service error: transcript was not created.', retryable: true);
        }

        try {
            $result = $this->poll($http, $transcriptId, $config);
        } finally {
            // Don't leave patient audio/text on the provider once we have it.
            $this->deleteQuietly($http, $transcriptId);
        }

        return new TranscriptionResult(
            text: trim((string) ($result['text'] ?? '')),
            language: $result['language_code'] ?? null,
            model: $result['speech_model'] ?? $config['speech_model'] ?? null,
        );
    }

    private function transcriptOptions(string $uploadUrl, TranscriptionRequest $request, array $config): array
    {
        $language = $request->language ?? $config['language'] ?? null;

        $options = ['audio_url' => $uploadUrl];

        if (! empty($config['speech_model'])) {
            $options['speech_model'] = $config['speech_model'];
        }

        if ($language === 'auto') {
            $options['language_detection'] = true;
        } elseif (! empty($language)) {
            $options['language_code'] = $language;
        }

        return $options;
    }

    /**
     * Wait for the transcript to finish (the job's timeout bounds this).
     */
    private function poll(PendingRequest $http, string $transcriptId, array $config): array
    {
        $deadline = microtime(true) + $config['max_wait_seconds'];

        while (true) {
            $body = $this->send(fn () => (clone $http)->get("/v2/transcript/{$transcriptId}"))->json();
            $status = $body['status'] ?? null;

            if ($status === 'completed') {
                return $body;
            }

            if ($status === 'error') {
                // e.g. unsupported / corrupt audio — retrying the same bytes won't help.
                throw new TranscriptionException('Transcription service error: '.($body['error'] ?? 'unknown error'), retryable: false);
            }

            if (microtime(true) >= $deadline) {
                throw new TranscriptionException('Transcription is taking longer than expected; it will be retried.', retryable: true);
            }

            Sleep::for($config['poll_interval_ms'])->milliseconds();
        }
    }

    /**
     * Run one HTTP call and map transport/HTTP failures to TranscriptionException.
     */
    private function send(callable $call): Response
    {
        try {
            $response = $call();
        } catch (ConnectionException $e) {
            throw new TranscriptionException('Could not reach the transcription service.', retryable: true, previous: $e);
        }

        if ($response->failed()) {
            $status = $response->status();
            // 408/409/429/5xx are transient; 401/403/4xx (bad key, bad request) will not fix itself.
            $retryable = $status >= 500 || in_array($status, [408, 409, 429], true);
            $detail = $response->json('error') ?? 'HTTP '.$status;

            throw new TranscriptionException('Transcription service error: '.(is_string($detail) ? $detail : 'HTTP '.$status), retryable: $retryable);
        }

        return $response;
    }

    private function deleteQuietly(PendingRequest $http, ?string $transcriptId): void
    {
        if (! $transcriptId) {
            return;
        }

        try {
            (clone $http)->delete("/v2/transcript/{$transcriptId}");
        } catch (\Throwable) {
            // Best effort; AssemblyAI retention settings are the backstop.
        }
    }
}
