<?php

namespace App\Jobs;

use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\Tenant;
use App\Scribe\Contracts\TranscriptionProvider;
use App\Scribe\ScribeSessionService;
use App\Scribe\TranscriptionException;
use App\Scribe\TranscriptionRequest;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Sends one audio chunk to the TranscriptionProvider and stores the text as an
 * ordered transcript segment. Runs on a queue worker (no tenant context), so
 * every lookup is explicit about tenant and the consent gate is re-checked
 * both before the audio leaves UMAHZ and before the result is saved.
 */
class TranscribeAudioChunk implements ShouldQueue
{
    use Queueable;

    public int $tries;

    // Below the database queue retry_after (90s) so a slow call is never run twice;
    // the provider's own wait (ASSEMBLYAI_MAX_WAIT_SECONDS, 60s) sits inside it.
    public int $timeout = 80;

    /** Seconds between automatic retries of transient provider errors. */
    public array $backoff = [5, 20, 60];

    public function __construct(public readonly string $chunkId)
    {
        $this->tries = max(1, (int) config('scribe.max_attempts', 4));
        $this->onQueue(config('scribe.queue', 'default'));
    }

    public function handle(TranscriptionProvider $provider): void
    {
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->find($this->chunkId);

        if (! $chunk || in_array($chunk->status, [ScribeAudioChunk::STATUS_TRANSCRIBED, ScribeAudioChunk::STATUS_DISCARDED], true)) {
            return;
        }

        $session = ScribeSession::withoutGlobalScopes()->find($chunk->scribe_session_id);

        if (! $session || $session->tenant_id !== $chunk->tenant_id) {
            return;
        }

        if (! $session->hasValidConsent()) {
            $this->discard($chunk);

            return;
        }

        if (! $chunk->hasAudio()) {
            $this->markFailed($chunk, $session, 'The audio for this chunk is no longer available (retention window passed).');

            return;
        }

        $chunk->forceFill([
            'status' => ScribeAudioChunk::STATUS_PROCESSING,
            'attempts' => $chunk->attempts + 1,
        ])->save();

        $previousText = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->where('sequence', '<', $chunk->sequence)
            ->orderByDesc('sequence')
            ->first()?->text;

        try {
            $result = $provider->transcribe(new TranscriptionRequest(
                audio: $chunk->readAudio(),
                mimeType: $chunk->mime_type,
                filename: sprintf('chunk-%06d.%s', $chunk->sequence, ScribeSessionService::extensionFor($chunk->mime_type)),
                prompt: $previousText,
            ));
        } catch (TranscriptionException $e) {
            $this->handleProviderError($chunk, $session, $e);

            return;
        }

        $saved = DB::transaction(function () use ($chunk, $session, $result, $provider) {
            // Consent may have been withdrawn while the provider was working.
            if (! $session->fresh()->hasValidConsent()) {
                return false;
            }

            if ($result->text !== '') {
                ScribeTranscriptSegment::withoutGlobalScopes()->updateOrCreate(
                    ['scribe_session_id' => $session->id, 'sequence' => $chunk->sequence],
                    [
                        'tenant_id' => $session->tenant_id,
                        'scribe_audio_chunk_id' => $chunk->id,
                        'text' => $result->text,
                        'start_ms' => $chunk->offset_ms,
                        'end_ms' => $chunk->offset_ms + $chunk->duration_ms,
                        'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
                        'provider' => $provider->name(),
                        'provider_model' => $result->model,
                        'language' => $result->language,
                    ]
                );
            }

            $chunk->forceFill([
                'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
                'transcribed_at' => now(),
                'last_error' => null,
            ])->save();

            return true;
        });

        if (! $saved) {
            $this->discard($chunk);

            return;
        }

        $tenant = Tenant::find($session->tenant_id);
        if (($tenant?->scribeSettings()['audio_retention_mode'] ?? 'delete_after_transcription') === 'delete_after_transcription') {
            $chunk->purgeAudio();
        }

        ScribeSessionService::settle($session->id);
    }

    /**
     * Unexpected (non-provider) failure after all attempts.
     */
    public function failed(?Throwable $e): void
    {
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->find($this->chunkId);
        $session = $chunk ? ScribeSession::withoutGlobalScopes()->find($chunk->scribe_session_id) : null;

        if ($chunk && $session && ! in_array($chunk->status, [ScribeAudioChunk::STATUS_TRANSCRIBED, ScribeAudioChunk::STATUS_DISCARDED], true)) {
            $this->markFailed($chunk, $session, 'Transcription failed unexpectedly. You can retry this part of the recording.');
        }
    }

    private function handleProviderError(ScribeAudioChunk $chunk, ScribeSession $session, TranscriptionException $e): void
    {
        // The sync driver cannot delay a release, so there the chunk is marked
        // failed straight away and the practitioner retries it from the panel.
        $canRetry = $e->retryable
            && $this->job !== null
            && $this->job->getConnectionName() !== 'sync'
            && $this->attempts() < $this->tries;

        if ($canRetry) {
            $chunk->forceFill(['status' => ScribeAudioChunk::STATUS_PENDING, 'last_error' => $e->getMessage()])->save();
            $this->release($this->backoff[min($this->attempts() - 1, count($this->backoff) - 1)]);

            return;
        }

        $this->markFailed($chunk, $session, $e->getMessage());
    }

    private function markFailed(ScribeAudioChunk $chunk, ScribeSession $session, string $message): void
    {
        $chunk->forceFill(['status' => ScribeAudioChunk::STATUS_FAILED, 'last_error' => $message])->save();
        $session->forceFill(['last_error' => $message])->save();

        ScribeSessionService::settle($session->id);
    }

    private function discard(ScribeAudioChunk $chunk): void
    {
        $chunk->forceFill(['status' => ScribeAudioChunk::STATUS_DISCARDED, 'last_error' => 'Discarded: recording consent withdrawn.'])->save();
        $chunk->purgeAudio();

        ScribeSessionService::settle($chunk->scribe_session_id);
    }
}
