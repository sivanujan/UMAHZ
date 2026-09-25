<?php

namespace Tests\Feature\Scribe;

use App\Jobs\TranscribeAudioChunk;
use App\Models\AuditEvent;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

class ScribeConsentGateTest extends ScribeTestCase
{
    public function test_recording_is_refused_without_consent(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $appointment = $this->appointment($clinic, $client, $membership);

        $id = $this->openSession($practitioner, $clinic, $client, $appointment)
            ->assertCreated()
            ->assertJsonPath('session.status', ScribeSession::STATUS_CONSENT_PENDING)
            ->assertJsonPath('session.has_valid_consent', false)
            ->json('session.id');

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$id}/start"))
            ->assertForbidden()
            ->assertJsonPath('code', 'consent_required');

        // Audio is refused too (the session is not recording AND has no consent).
        $this->uploadChunk($practitioner, $clinic, $id, 0)->assertForbidden();

        $this->assertSame(0, ScribeAudioChunk::withoutGlobalScopes()->count());
        Storage::disk('local')->assertDirectoryEmpty('scribe');
        $this->assertSame(ScribeSession::STATUS_CONSENT_PENDING, ScribeSession::withoutGlobalScopes()->find($id)->status);
        $this->assertTrue(AuditEvent::where('action', 'scribe.recording_refused')->exists());
        $this->assertCount(0, $this->provider->requests);
    }

    public function test_consent_is_stored_with_signer_version_and_utc_timestamp_scoped_to_the_appointment(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $appointment = $this->appointment($clinic, $client, $membership);

        $id = $this->openSession($practitioner, $clinic, $client, $appointment)->json('session.id');
        $this->giveConsent($practitioner, $clinic, $id)
            ->assertOk()
            ->assertJsonPath('session.has_valid_consent', true)
            ->assertJsonPath('session.consent.signer_name', 'Alice Walker');

        $session = ScribeSession::withoutGlobalScopes()->find($id);
        $consent = Consent::withoutGlobalScopes()->find($session->consent_id);

        $this->assertSame('Alice Walker', $consent->signer_name);
        $this->assertSame(1, $consent->consent_version);
        $this->assertSame($appointment->id, $consent->appointment_id);
        $this->assertSame($practitioner->id, $consent->witnessed_by_user_id);
        $this->assertSame(ConsentType::CODE_AI_SCRIBE_RECORDING, $consent->consentType->code);
        $this->assertSame('UTC', $consent->agreed_at->getTimezone()->getName());
        $this->assertTrue(AuditEvent::where('action', 'scribe.consent_captured')->where('resource_id', $id)->exists());

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$id}/start"))
            ->assertOk()
            ->assertJsonPath('session.status', ScribeSession::STATUS_RECORDING);
    }

    public function test_consent_cannot_be_captured_until_the_clinic_supplies_the_wording(): void
    {
        $clinic = $this->clinic('lotus');
        ConsentType::ensureScribeTypeForTenant($clinic->id)->update(['body' => null]);
        [$practitioner] = $this->staff($clinic);
        $client = $this->client($clinic);

        $id = $this->openSession($practitioner, $clinic, $client)->json('session.id');

        $this->giveConsent($practitioner, $clinic, $id)->assertUnprocessable()->assertJsonValidationErrors('consent_type_id');
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$id}/start"))->assertForbidden();
    }

    public function test_a_consent_for_a_different_appointment_does_not_open_the_gate(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $apptA = $this->appointment($clinic, $client, $membership);
        $apptB = $this->appointment($clinic, $client, $membership);

        $sessionA = $this->openSession($practitioner, $clinic, $client, $apptA)->json('session.id');
        $this->giveConsent($practitioner, $clinic, $sessionA)->assertOk();

        $sessionB = $this->openSession($practitioner, $clinic, $client, $apptB)->json('session.id');

        // Try to reuse encounter A's consent for encounter B.
        ScribeSession::withoutGlobalScopes()->find($sessionB)->forceFill([
            'consent_id' => ScribeSession::withoutGlobalScopes()->find($sessionA)->consent_id,
        ])->save();

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$sessionB}/start"))->assertForbidden();
    }

    public function test_withdrawing_consent_stops_recording_immediately(): void
    {
        $clinic = $this->clinic('lotus', ['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 24]);
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);

        $this->actingAs($practitioner)
            ->postJson($this->url($clinic, "/sessions/{$session->id}/consent/withdraw"), ['reason' => 'Client asked to stop recording.'])
            ->assertOk()
            ->assertJsonPath('session.status', ScribeSession::STATUS_CONSENT_WITHDRAWN)
            ->assertJsonPath('session.has_valid_consent', false);

        $session->refresh();
        $this->assertNotNull($session->consent_withdrawn_at);
        $this->assertSame(Consent::STATUS_WITHDRAWN, Consent::withoutGlobalScopes()->find($session->consent_id)->status);

        // No more audio accepted, and no control can restart it.
        $this->uploadChunk($practitioner, $clinic, $session->id, 1)->assertForbidden();
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/resume"))->assertStatus(409);

        // All raw audio is purged on withdrawal, even under a retain window.
        $this->assertSame(0, ScribeAudioChunk::withoutGlobalScopes()->whereNotNull('storage_path')->count());
        Storage::disk('local')->assertDirectoryEmpty("scribe/{$clinic->id}/{$session->id}");

        $this->assertTrue(AuditEvent::where('action', 'scribe.consent_withdrawn')->exists());
        $this->assertTrue(AuditEvent::where('action', 'consent.withdrawn')->exists());
    }

    public function test_withdrawal_on_the_client_profile_also_stops_an_active_session(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $this->actingAs($practitioner)
            ->patch("http://lotus.umahz.test/app/consents/{$session->consent_id}/withdraw", ['reason' => 'Changed mind.'])
            ->assertRedirect();

        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertForbidden();
        $this->assertSame(ScribeSession::STATUS_CONSENT_WITHDRAWN, $session->fresh()->status);
    }

    public function test_audio_queued_before_withdrawal_is_never_sent_to_the_provider(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        Queue::fake();
        $this->uploadChunk($practitioner, $clinic, $session->id, 0)->assertStatus(202);
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->firstOrFail();

        Consent::withoutGlobalScopes()->find($session->consent_id)->update(['status' => Consent::STATUS_WITHDRAWN, 'withdrawn_at' => now()]);

        (new TranscribeAudioChunk($chunk->id))->handle($this->provider);

        $this->assertCount(0, $this->provider->requests);
        $this->assertSame(ScribeAudioChunk::STATUS_DISCARDED, $chunk->fresh()->status);
        $this->assertNull($chunk->fresh()->storage_path);
    }
}
