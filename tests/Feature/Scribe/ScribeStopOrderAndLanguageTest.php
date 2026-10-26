<?php

namespace Tests\Feature\Scribe;

use App\Jobs\TranscribeAudioChunk;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;

class ScribeStopOrderAndLanguageTest extends ScribeTestCase
{
    /**
     * Requirement: Unit test: out-of-order segments are sorted by start_ms.
     */
    public function test_out_of_order_segments_are_sorted_by_start_ms(): void
    {
        $clinic = $this->clinic('sortorder');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client);

        // Insert segments out-of-order: sequence 0 at 12s, sequence 1 at 0s, sequence 2 at 6s
        ScribeTranscriptSegment::create([
            'tenant_id' => $clinic->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'start_ms' => 12000,
            'end_ms' => 15000,
            'text' => 'Third sentence at 12s.',
            'source' => ScribeTranscriptSegment::SOURCE_AI_STREAMING,
            'provider' => 'assemblyai_streaming',
            'language' => 'en',
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $clinic->id,
            'scribe_session_id' => $session->id,
            'sequence' => 1,
            'start_ms' => 0,
            'end_ms' => 5000,
            'text' => 'First sentence at 0s.',
            'source' => ScribeTranscriptSegment::SOURCE_AI_STREAMING,
            'provider' => 'assemblyai_streaming',
            'language' => 'en',
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $clinic->id,
            'scribe_session_id' => $session->id,
            'sequence' => 2,
            'start_ms' => 6000,
            'end_ms' => 10000,
            'text' => 'Second sentence at 6s.',
            'source' => ScribeTranscriptSegment::SOURCE_AI_STREAMING,
            'provider' => 'assemblyai_streaming',
            'language' => 'en',
        ]);

        // 1. Verify model relation $session->segments returns ordered by start_ms
        $orderedSegments = $session->segments;
        $this->assertCount(3, $orderedSegments);
        $this->assertSame(0, $orderedSegments[0]->start_ms);
        $this->assertSame('First sentence at 0s.', $orderedSegments[0]->text);
        $this->assertSame(6000, $orderedSegments[1]->start_ms);
        $this->assertSame('Second sentence at 6s.', $orderedSegments[1]->text);
        $this->assertSame(12000, $orderedSegments[2]->start_ms);
        $this->assertSame('Third sentence at 12s.', $orderedSegments[2]->text);

        // 2. Verify JSON payload endpoint returns ordered segments
        $res = $this->actingAs($practitioner)->getJson($this->url($clinic, "/sessions/{$session->id}"));
        $res->assertOk();

        $payloadSegments = $res->json('session.segments');
        $this->assertCount(3, $payloadSegments);
        $this->assertSame(0, $payloadSegments[0]['start_ms']);
        $this->assertSame('First sentence at 0s.', $payloadSegments[0]['text']);
        $this->assertSame(6000, $payloadSegments[1]['start_ms']);
        $this->assertSame('Second sentence at 6s.', $payloadSegments[1]['text']);
        $this->assertSame(12000, $payloadSegments[2]['start_ms']);
        $this->assertSame('Third sentence at 12s.', $payloadSegments[2]['text']);
    }

    /**
     * Requirement: Unit test: final flush on stop is not duplicated when chunk fallback also ran.
     */
    public function test_final_flush_on_stop_is_not_duplicated_when_chunk_fallback_also_ran(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('deduponstop');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client);

        // 1. First streaming turn at 0-12s
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                [
                    'sequence' => 0,
                    'text' => 'Good morning doctor, I have knee pain.',
                    'start_ms' => 0,
                    'end_ms' => 11500,
                    'language' => 'en',
                ],
            ],
            'client_recorded_ms' => 12000,
        ])->assertOk();

        // 2. Final streaming turn on stop at 12-17s
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                [
                    'sequence' => 1,
                    'text' => 'Pain worsens when descending stairs and bending.',
                    'start_ms' => 12000,
                    'end_ms' => 17200,
                    'language' => 'en',
                ],
            ],
            'client_recorded_ms' => 17500,
        ])->assertOk();

        // 3. Parallel chunk fallback also ran and was transcribed with the same speech
        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $clinic->id,
            'scribe_session_id' => $session->id,
            'sequence' => 2,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 12000,
            'offset_ms' => 12000,
            'status' => ScribeAudioChunk::STATUS_PENDING,
        ]);

        // Configure fake provider to return matching transcript text
        $this->provider->respondWith('Pain worsens when descending stairs and bending.');
        (new TranscribeAudioChunk($chunk->id))->handle($this->provider);

        // Verify that the duplicate chunk segment was not inserted into database
        $segmentsInDb = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->get();

        $this->assertCount(2, $segmentsInDb);

        // 4. Verify API response is deduplicated and sorted by start_ms
        $res = $this->actingAs($practitioner)->getJson($this->url($clinic, "/sessions/{$session->id}"));
        $res->assertOk();

        $segments = $res->json('session.segments');
        $this->assertCount(2, $segments);
        $this->assertSame('Good morning doctor, I have knee pain.', $segments[0]['text']);
        $this->assertSame(0, $segments[0]['start_ms']);
        $this->assertSame('Pain worsens when descending stairs and bending.', $segments[1]['text']);
        $this->assertSame(12000, $segments[1]['start_ms']);

        // Verify helper deduplicateSegments handles in-memory duplicate segments
        $duplicateChunkSegment = new ScribeTranscriptSegment([
            'tenant_id' => $clinic->id,
            'scribe_session_id' => $session->id,
            'sequence' => 3,
            'start_ms' => 12000,
            'end_ms' => 24000,
            'text' => 'Pain worsens when descending stairs and bending.',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        $deduped = ScribeTranscriptSegment::deduplicateSegments(collect([$segmentsInDb[0], $segmentsInDb[1], $duplicateChunkSegment]));
        $this->assertCount(2, $deduped);
    }

    /**
     * Requirement: Unit test: language label matches the language used.
     */
    public function test_language_label_matches_the_language_used(): void
    {
        $clinic = $this->clinic('langlabeltest', ['enabled' => true, 'enabled_languages' => ['en', 'fr']]);
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);

        // Scenario 1: Session selected language is French ('fr')
        $sessionFr = ScribeSession::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'fr',
            'status' => ScribeSession::STATUS_CONSENT_PENDING,
        ]);

        $this->assertSame('French', $sessionFr->languageLabel());

        $resFr = $this->actingAs($practitioner)->getJson($this->url($clinic, "/sessions/{$sessionFr->id}"));
        $resFr->assertOk();
        $this->assertSame('French', $resFr->json('session.language_label'));
        $this->assertSame('fr', $resFr->json('session.language'));
        $this->assertFalse($resFr->json('session.has_language_mismatch'));

        // Scenario 2: Session was selected as English ('en'), but patient spoke French
        // and transcript segments were detected as French ('fr')
        $sessionEnWithFrench = ScribeSession::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'en',
            'status' => ScribeSession::STATUS_RECORDING,
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $clinic->id,
            'scribe_session_id' => $sessionEnWithFrench->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 5000,
            'text' => 'Bonjour docteur, j\'ai mal au genou droit depuis trois semaines.',
            'language' => 'fr',
            'detected_language' => 'fr',
            'source' => ScribeTranscriptSegment::SOURCE_AI_STREAMING,
            'provider' => 'assemblyai_streaming',
        ]);

        // languageLabel() must match the language actually used (French)
        $this->assertSame('French', $sessionEnWithFrench->languageLabel());
        $this->assertSame('French', $sessionEnWithFrench->detectedLanguageLabel());
        $this->assertSame('fr', $sessionEnWithFrench->detectedLanguage());
        $this->assertSame('fr', $sessionEnWithFrench->actualLanguage());
        $this->assertSame('English', $sessionEnWithFrench->selectedLanguageLabel());
        $this->assertTrue($sessionEnWithFrench->isNonEnglish());

        // API payload reflects the language actually used in language_label and flags mismatch
        $resDetected = $this->actingAs($practitioner)->getJson($this->url($clinic, "/sessions/{$sessionEnWithFrench->id}"));
        $resDetected->assertOk();
        $this->assertSame('French', $resDetected->json('session.language_label'));
        $this->assertSame('fr', $resDetected->json('session.detected_language'));
        $this->assertSame('French', $resDetected->json('session.detected_language_label'));
        $this->assertSame('English', $resDetected->json('session.selected_language_label'));
        $this->assertTrue($resDetected->json('session.has_language_mismatch'));
    }
}
