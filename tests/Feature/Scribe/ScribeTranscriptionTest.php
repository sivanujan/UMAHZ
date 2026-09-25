<?php

namespace Tests\Feature\Scribe;

use App\Jobs\TranscribeAudioChunk;
use App\Models\AuditEvent;
use App\Models\ClinicalNote;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeDraftItem;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Scribe\TranscriptionException;
use Illuminate\Support\Facades\Queue;

class ScribeTranscriptionTest extends ScribeTestCase
{
    public function test_chunks_are_transcribed_and_appended_in_order(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        // Queue the uploads, then let the workers finish them OUT of order.
        Queue::fake();
        foreach ([0, 1, 2] as $seq) {
            $this->uploadChunk($practitioner, $clinic, $session->id, $seq)->assertStatus(202);
        }
        Queue::assertPushed(TranscribeAudioChunk::class, 3);

        $chunks = ScribeAudioChunk::withoutGlobalScopes()->orderBy('sequence')->get();
        $this->provider->respondWith('Third part.', 'First part.', 'Second part.');
        foreach ([2, 0, 1] as $seq) {
            (new TranscribeAudioChunk($chunks[$seq]->id))->handle($this->provider);
        }

        $this->actingAs($practitioner)->getJson($this->url($clinic, "/sessions/{$session->id}"))
            ->assertOk()
            ->assertJsonPath('session.segments.0.text', 'First part.')
            ->assertJsonPath('session.segments.1.text', 'Second part.')
            ->assertJsonPath('session.segments.2.text', 'Third part.')
            ->assertJsonPath('session.segments.1.start_ms', 12000)
            ->assertJsonPath('session.segments.0.source', ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION);

        // Incremental polling returns only newer segments.
        $this->actingAs($practitioner)->getJson($this->url($clinic, "/sessions/{$session->id}?after_sequence=1"))
            ->assertJsonCount(1, 'session.segments')
            ->assertJsonPath('session.segments.0.sequence', 2);

        // The provider gets the preceding text as context for continuity.
        $this->assertSame('First part.', $this->provider->requests[2]->prompt);
    }

    public function test_full_session_ends_transcript_ready_and_transcript_is_encrypted_at_rest(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $this->provider->respondWith('Client reports lower back pain for two weeks.');
        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/pause"))->assertJsonPath('session.status', 'paused');
        $this->uploadChunk($practitioner, $clinic, $session->id, 1)->assertStatus(409); // no audio while paused
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/resume"))->assertJsonPath('session.status', 'recording');

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"))
            ->assertOk()
            ->assertJsonPath('session.status', ScribeSession::STATUS_TRANSCRIPT_READY);

        $raw = \DB::table('scribe_transcript_segments')->value('text');
        $this->assertStringNotContainsString('lower back pain', $raw);

        foreach (['scribe.session_created', 'scribe.session_started', 'scribe.session_paused', 'scribe.session_resumed', 'scribe.session_stopped'] as $action) {
            $this->assertTrue(AuditEvent::where('action', $action)->where('resource_id', $session->id)->exists(), $action);
        }
    }

    public function test_re_sending_a_chunk_is_idempotent(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);
        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);

        $this->assertSame(1, ScribeAudioChunk::withoutGlobalScopes()->count());
        $this->assertCount(1, $this->provider->requests);
    }

    public function test_failed_chunk_is_reported_retried_and_never_loses_existing_text(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->provider->respondWith('Already transcribed.', new TranscriptionException('Transcription service error: HTTP 503'));
        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);
        $this->uploadChunk($practitioner, $clinic, $session->id, 1)->assertStatus(202);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"))
            ->assertJsonPath('session.status', ScribeSession::STATUS_TRANSCRIPT_READY)
            ->assertJsonPath('session.chunks.failed', 1)
            ->assertJsonPath('session.last_error', 'Transcription service error: HTTP 503')
            ->assertJsonPath('session.segments.0.text', 'Already transcribed.');

        // Failed audio is kept (within retention) so it can be retried.
        $failed = ScribeAudioChunk::withoutGlobalScopes()->where('sequence', 1)->first();
        $this->assertNotNull($failed->storage_path);

        $this->provider->respondWith('Recovered text.');
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/chunks/retry"))
            ->assertOk()
            ->assertJsonPath('retried', 1)
            ->assertJsonPath('session.status', ScribeSession::STATUS_TRANSCRIPT_READY)
            ->assertJsonPath('session.chunks.failed', 0)
            ->assertJsonPath('session.segments.0.text', 'Already transcribed.')
            ->assertJsonPath('session.segments.1.text', 'Recovered text.');
    }

    public function test_transient_errors_are_released_for_automatic_retry_on_a_real_queue(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        Queue::fake();
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->firstOrFail();

        $this->provider->respondWith(new TranscriptionException('HTTP 429', retryable: true));

        $job = (new TranscribeAudioChunk($chunk->id))->withFakeQueueInteractions();
        $job->handle($this->provider);

        $job->assertReleased();
        $this->assertSame(ScribeAudioChunk::STATUS_PENDING, $chunk->fresh()->status);
        $this->assertNotNull($chunk->fresh()->storage_path);
    }

    public function test_nothing_is_ever_auto_finalized(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $appointment = $this->appointment($clinic, $client, $membership);
        $session = $this->recordingSession($practitioner, $clinic, $client, $appointment);

        foreach ([0, 1] as $seq) {
            $this->uploadChunk($practitioner, $clinic, $session->id, $seq);
        }
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"))
            ->assertJsonPath('session.status', ScribeSession::STATUS_TRANSCRIPT_READY);

        // Scribe never creates, finalizes or signs a clinical note, and writes no draft items in Phase 1.
        $this->assertSame(0, ClinicalNote::withoutGlobalScopes()->count());
        $this->assertNull($session->fresh()->clinical_note_id);
        $this->assertSame(0, ScribeDraftItem::withoutGlobalScopes()->count());
        $this->assertNotContains('finalized', array_keys(ScribeSession::TRANSITIONS));
        foreach (ScribeSession::TRANSITIONS as $targets) {
            $this->assertNotContains('finalized', $targets);
        }
    }
}
