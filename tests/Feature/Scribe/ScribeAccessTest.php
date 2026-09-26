<?php

namespace Tests\Feature\Scribe;

use App\Models\AuditEvent;
use App\Models\ScribeSession;
use App\Models\StaffMembership;

class ScribeAccessTest extends ScribeTestCase
{
    public function test_a_clinic_cannot_access_another_clinics_sessions(): void
    {
        $lotus = $this->clinic('lotus');
        $cedar = $this->clinic('cedar');
        [$lotusPractitioner] = $this->staff($lotus);
        [$cedarOwner] = $this->staff($cedar, StaffMembership::ROLE_CLINIC_OWNER);

        $session = $this->recordingSession($lotusPractitioner, $lotus, $this->client($lotus));
        $this->uploadChunk($lotusPractitioner, $lotus, $session->id, 0);

        // Cedar's owner, on Cedar's subdomain, asking for Lotus's session id.
        $this->actingAs($cedarOwner)->getJson($this->url($cedar, "/sessions/{$session->id}"))->assertNotFound();
        $this->actingAs($cedarOwner)->postJson($this->url($cedar, "/sessions/{$session->id}/stop"))->assertNotFound();
        $this->actingAs($cedarOwner)->postJson($this->url($cedar, "/sessions/{$session->id}/consent/withdraw"), ['reason' => 'x'])->assertNotFound();

        // ...and on Lotus's subdomain they have no membership, so the workspace itself is refused.
        $this->actingAs($cedarOwner)->getJson($this->url($lotus, "/sessions/{$session->id}"))->assertNotFound();

        // Nor can Cedar open a session for a Lotus client.
        $this->actingAs($cedarOwner)->postJson($this->url($cedar, '/sessions'), ['client_id' => $session->client_id])
            ->assertUnprocessable();
    }

    public function test_receptionist_cannot_read_transcripts_or_record(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        [$receptionist] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client);
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);

        $this->actingAs($receptionist)->getJson($this->url($clinic, "/sessions/{$session->id}"))->assertForbidden();
        $this->actingAs($receptionist)->postJson($this->url($clinic, '/sessions'), ['client_id' => $client->id])->assertForbidden();
        $this->uploadChunk($receptionist, $clinic, $session->id, 1)->assertForbidden();

        $this->assertFalse(AuditEvent::where('action', 'scribe.transcript_viewed')->where('user_id', $receptionist->id)->exists());
    }

    public function test_only_the_sessions_practitioner_records_owner_may_view_other_practitioners_may_not(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        [$otherPractitioner] = $this->staff($clinic);
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->actingAs($otherPractitioner)->getJson($this->url($clinic, "/sessions/{$session->id}"))->assertForbidden();
        $this->uploadChunk($otherPractitioner, $clinic, $session->id, 0)->assertForbidden();

        $this->actingAs($owner)->getJson($this->url($clinic, "/sessions/{$session->id}"))
            ->assertOk()
            ->assertJsonPath('session.can_record', false);
        $this->uploadChunk($owner, $clinic, $session->id, 0)->assertForbidden();

        // Viewing is audited (once per window, not per poll).
        $this->actingAs($owner)->getJson($this->url($clinic, "/sessions/{$session->id}"))->assertOk();
        $this->assertSame(1, AuditEvent::where('action', 'scribe.transcript_viewed')->where('user_id', $owner->id)->count());
    }

    public function test_scribe_is_off_until_the_clinic_enables_it(): void
    {
        $clinic = $this->clinic('lotus', ['enabled' => false]);
        [$practitioner] = $this->staff($clinic);

        $this->openSession($practitioner, $clinic, $this->client($clinic))->assertForbidden();
        $this->assertSame(0, ScribeSession::withoutGlobalScopes()->count());
    }

    public function test_owner_can_configure_scribe_settings(): void
    {
        $clinic = $this->clinic('lotus', ['enabled' => false]);
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);
        [$practitioner] = $this->staff($clinic);

        $payload = ['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 6];

        $this->actingAs($practitioner)->patch('http://lotus.umahz.test/app/settings/scribe', $payload)->assertForbidden();

        $this->actingAs($owner)->patch('http://lotus.umahz.test/app/settings/scribe', $payload)->assertRedirect();
        $this->assertSame(['enabled' => true, 'audio_retention_mode' => 'retain_window', 'audio_retention_hours' => 6], $clinic->fresh()->scribeSettings());
        $this->assertTrue(AuditEvent::where('action', 'scribe.settings_updated')->exists());

        $this->actingAs($owner)->patch('http://lotus.umahz.test/app/settings/scribe', array_merge($payload, ['audio_retention_hours' => 9999]))
            ->assertSessionHasErrors('audio_retention_hours');
    }
}
