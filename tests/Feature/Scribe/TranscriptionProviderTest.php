<?php

namespace Tests\Feature\Scribe;

use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Scribe\AssemblyAiTranscriptionProvider;
use App\Scribe\Contracts\ObjectiveMeasurementSource;
use App\Scribe\Contracts\TranscriptionProvider;
use App\Scribe\FakeTranscriptionProvider;
use App\Scribe\TranscriptionException;
use App\Scribe\TranscriptionRequest;
use App\Scribe\TranscriptionResult;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

class TranscriptionProviderTest extends ScribeTestCase
{
    public function test_provider_can_be_swapped_via_the_contract(): void
    {
        $custom = new class implements TranscriptionProvider
        {
            public function name(): string
            {
                return 'canadian-hosted';
            }

            public function transcribe(TranscriptionRequest $request): TranscriptionResult
            {
                return new TranscriptionResult('Transcribed in Canada.', 'en', 'ca-model-1');
            }
        };
        $this->app->instance(TranscriptionProvider::class, $custom);

        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));
        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);

        $segment = ScribeTranscriptSegment::withoutGlobalScopes()->firstOrFail();
        $this->assertSame('Transcribed in Canada.', $segment->text);
        $this->assertSame('canadian-hosted', $segment->provider);
        $this->assertSame('ca-model-1', $segment->provider_model);
        $this->assertSame('canadian-hosted', $session->fresh()->transcription_provider);
    }

    public function test_driver_config_selects_the_implementation(): void
    {
        $this->app->forgetInstance(TranscriptionProvider::class);

        config(['scribe.transcription.driver' => 'fake']);
        $this->assertInstanceOf(FakeTranscriptionProvider::class, $this->app->make(TranscriptionProvider::class));

        $this->app->forgetInstance(TranscriptionProvider::class);
        config(['scribe.transcription.driver' => 'assemblyai']);
        $this->assertInstanceOf(AssemblyAiTranscriptionProvider::class, $this->app->make(TranscriptionProvider::class));
    }

    public function test_assemblyai_uploads_polls_returns_text_and_deletes_the_transcript(): void
    {
        config([
            'scribe.transcription.assemblyai.api_key' => 'aai-test-key',
            'scribe.transcription.assemblyai.language' => 'en',
        ]);
        Sleep::fake();

        Http::fake([
            'api.assemblyai.com/v2/upload' => Http::response(['upload_url' => 'https://cdn.assemblyai.com/upload/abc']),
            'api.assemblyai.com/v2/transcript' => Http::response(['id' => 'tr_123', 'status' => 'queued']),
            'api.assemblyai.com/v2/transcript/tr_123' => Http::sequence()
                ->push(['id' => 'tr_123', 'status' => 'processing'])
                ->push(['id' => 'tr_123', 'status' => 'completed', 'text' => '  Client reports neck pain.  ', 'language_code' => 'en'])
                ->push([], 200), // DELETE
        ]);

        $result = (new AssemblyAiTranscriptionProvider)->transcribe(new TranscriptionRequest('audio-bytes', 'audio/webm', 'chunk-000000.webm'));

        $this->assertSame('Client reports neck pain.', $result->text);
        $this->assertSame('en', $result->language);

        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.assemblyai.com/v2/upload'
            && $r->hasHeader('authorization', 'aai-test-key')
            && $r->body() === 'audio-bytes');
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.assemblyai.com/v2/transcript'
            && $r['audio_url'] === 'https://cdn.assemblyai.com/upload/abc'
            && $r['language_code'] === 'en');
        // The transcript (and audio) is removed from AssemblyAI afterwards.
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/v2/transcript/tr_123'));
        Sleep::assertSleptTimes(1);
    }

    public function test_assemblyai_classifies_errors_as_retryable_or_not(): void
    {
        config(['scribe.transcription.assemblyai.api_key' => 'aai-test-key']);
        $request = new TranscriptionRequest('x', 'audio/webm', 'c.webm');

        // First call rate limited (retryable), second call bad key (not retryable).
        Http::fake(['api.assemblyai.com/*' => Http::sequence()
            ->push(['error' => 'Too many requests'], 429)
            ->push(['error' => 'Invalid API key'], 401)]);
        try {
            (new AssemblyAiTranscriptionProvider)->transcribe($request);
            $this->fail('Expected exception');
        } catch (TranscriptionException $e) {
            $this->assertTrue($e->retryable);
        }

        try {
            (new AssemblyAiTranscriptionProvider)->transcribe($request);
            $this->fail('Expected exception');
        } catch (TranscriptionException $e) {
            $this->assertFalse($e->retryable);
            $this->assertStringContainsString('Invalid API key', $e->getMessage());
        }
    }

    public function test_assemblyai_transcript_error_status_is_not_retried_and_is_still_deleted(): void
    {
        config(['scribe.transcription.assemblyai.api_key' => 'aai-test-key']);
        Sleep::fake();

        Http::fake([
            'api.assemblyai.com/v2/upload' => Http::response(['upload_url' => 'https://cdn.assemblyai.com/upload/abc']),
            'api.assemblyai.com/v2/transcript' => Http::response(['id' => 'tr_9', 'status' => 'queued']),
            'api.assemblyai.com/v2/transcript/tr_9' => Http::sequence()
                ->push(['id' => 'tr_9', 'status' => 'error', 'error' => 'File does not appear to contain audio.'])
                ->push([], 200),
        ]);

        try {
            (new AssemblyAiTranscriptionProvider)->transcribe(new TranscriptionRequest('x', 'audio/webm', 'c.webm'));
            $this->fail('Expected exception');
        } catch (TranscriptionException $e) {
            $this->assertFalse($e->retryable);
            $this->assertStringContainsString('does not appear to contain audio', $e->getMessage());
        }

        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/v2/transcript/tr_9'));
    }

    public function test_assemblyai_times_out_as_retryable(): void
    {
        config([
            'scribe.transcription.assemblyai.api_key' => 'aai-test-key',
            'scribe.transcription.assemblyai.max_wait_seconds' => 0,
        ]);
        Sleep::fake();

        Http::fake([
            'api.assemblyai.com/v2/upload' => Http::response(['upload_url' => 'https://cdn.assemblyai.com/upload/abc']),
            'api.assemblyai.com/v2/transcript' => Http::response(['id' => 'tr_slow', 'status' => 'queued']),
            'api.assemblyai.com/v2/transcript/tr_slow' => Http::response(['id' => 'tr_slow', 'status' => 'processing']),
        ]);

        $this->expectException(TranscriptionException::class);
        $this->expectExceptionMessage('longer than expected');

        (new AssemblyAiTranscriptionProvider)->transcribe(new TranscriptionRequest('x', 'audio/webm', 'c.webm'));
    }

    public function test_assemblyai_without_a_key_fails_clearly_and_makes_no_request(): void
    {
        config(['scribe.transcription.assemblyai.api_key' => null]);
        Http::fake();

        try {
            (new AssemblyAiTranscriptionProvider)->transcribe(new TranscriptionRequest('x', 'audio/webm', 'c.webm'));
            $this->fail('Expected exception');
        } catch (TranscriptionException $e) {
            $this->assertFalse($e->retryable);
            $this->assertStringContainsString('ASSEMBLYAI_API_KEY', $e->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_phase_four_motion_seam_is_bound_but_inert(): void
    {
        $this->assertSame([], $this->app->make(ObjectiveMeasurementSource::class)
            ->approvedMeasurementsFor(new ScribeSession));
    }
}
