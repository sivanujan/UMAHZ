<?php

namespace Tests\Feature\Scribe;

use App\Models\AuditEvent;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeTranscriptSegment;
use App\Scribe\TranscriptionException;
use Illuminate\Support\Facades\Storage;

class ScribeRetentionTest extends ScribeTestCase
{
    public function test_default_policy_deletes_raw_audio_right_after_transcription(): void
    {
        $clinic = $this->clinic('lotus'); // default: delete_after_transcription
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);

        $chunk = ScribeAudioChunk::withoutGlobalScopes()->firstOrFail();
        $this->assertSame(ScribeAudioChunk::STATUS_TRANSCRIBED, $chunk->status);
        $this->assertNull($chunk->storage_path);
        $this->assertNotNull($chunk->audio_purged_at);
        Storage::disk('local')->assertDirectoryEmpty("scribe/{$clinic->id}");

        // The transcript itself is clinical-record material and is kept.
        $this->assertSame(1, ScribeTranscriptSegment::withoutGlobalScopes()->count());
    }

    public function test_audio_is_encrypted_at_rest(): void
    {
        $clinic = $this->clinic('lotus', ['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 24]);
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->firstOrFail();

        $stored = Storage::disk('local')->get($chunk->storage_path);
        // Laravel encrypter payload (base64 JSON: iv/value/mac), never the raw bytes.
        $this->assertStringStartsWith('eyJpdiI6', $stored);
        $this->assertNotSame($chunk->readAudio(), $stored);
        $this->assertStringStartsWith('fake-opus-audio-0-', $chunk->readAudio());
        $this->assertStringNotContainsString('fake-opus-audio', $stored);
    }

    public function test_retain_window_keeps_audio_until_the_window_passes_then_the_cleanup_job_purges_it(): void
    {
        $clinic = $this->clinic('lotus', ['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 6]);
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->firstOrFail();

        $this->artisan('scribe:purge-audio')->assertSuccessful();
        $this->assertNotNull($chunk->fresh()->storage_path, 'Still inside the 6h window.');

        $this->travel(7)->hours();
        $this->artisan('scribe:purge-audio')->assertSuccessful();

        $this->assertNull($chunk->fresh()->storage_path);
        Storage::disk('local')->assertDirectoryEmpty("scribe/{$clinic->id}");
        $this->assertSame(1, ScribeTranscriptSegment::withoutGlobalScopes()->count());
        $this->assertTrue(AuditEvent::where('action', 'scribe.audio_purged')->where('resource_id', $session->id)->exists());
    }

    public function test_untranscribed_audio_is_purged_after_the_safety_window_under_the_default_policy(): void
    {
        $clinic = $this->clinic('lotus', ['enabled' => true, 'audio_retention_mode' => 'delete_after_transcription', 'audio_retention_hours' => 24]);
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->provider->respondWith(new TranscriptionException('HTTP 503'));
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->firstOrFail();
        $this->assertSame(ScribeAudioChunk::STATUS_FAILED, $chunk->status);
        $this->assertNotNull($chunk->storage_path);

        $this->travel(25)->hours();
        $this->artisan('scribe:purge-audio')->assertSuccessful();

        $this->assertNull($chunk->fresh()->storage_path);
    }

    public function test_retention_is_per_clinic(): void
    {
        $keep = $this->clinic('lotus', ['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 48]);
        $short = $this->clinic('cedar', ['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 1]);
        [$a] = $this->staff($keep);
        [$b] = $this->staff($short);

        $sa = $this->recordingSession($a, $keep, $this->client($keep));
        $this->uploadChunk($a, $keep, $sa->id, 0);
        $sb = $this->recordingSession($b, $short, $this->client($short));
        $this->uploadChunk($b, $short, $sb->id, 0);

        $this->travel(2)->hours();
        $this->artisan('scribe:purge-audio');

        $this->assertNotNull(ScribeAudioChunk::withoutGlobalScopes()->where('scribe_session_id', $sa->id)->value('storage_path'));
        $this->assertNull(ScribeAudioChunk::withoutGlobalScopes()->where('scribe_session_id', $sb->id)->value('storage_path'));
    }
}
