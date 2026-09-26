<?php

namespace Tests\Feature\Scribe;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

class ScribeHandoffTest extends ScribeTestCase
{
    /**
     * Recorded, transcribed and drafted physiotherapy session.
     *
     * @return array{0: User, 1: Tenant, 2: ScribeSession, 3: StaffMembership, 4: Appointment}
     */
    private function draftedSession(): array
    {
        $clinic = $this->clinic('lotus');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $appointment = $this->appointment($clinic, $client, $membership);
        $session = $this->recordingSession($practitioner, $clinic, $client, $appointment);

        $this->provider->respondWith('My right shoulder has hurt for three weeks, about six out of ten.', 'Flexion is limited to 120 degrees. Come back in one week.');
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $this->uploadChunk($practitioner, $clinic, $session->id, 1);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"));

        $this->drafter->respondWith([
            ['field_id' => 'chief_complaint', 'items' => [
                ['text' => 'Right shoulder pain for 3 weeks.', 'source' => 'client_reported', 'evidence' => [0]],
            ]],
            ['field_id' => 'pain_score', 'items' => [['text' => '4-6 - Moderate pain', 'source' => 'client_reported', 'evidence' => [0]]]],
            ['field_id' => 'range_of_motion', 'items' => [['text' => 'Flexion limited to 120°.', 'source' => 'practitioner_stated', 'evidence' => [1]]]],
            ['field_id' => 'clinical_assessment', 'items' => [['text' => 'Likely shoulder mobility deficit.', 'source' => 'ai_generated', 'evidence' => [0, 1]]]],
            ['field_id' => 'return_schedule', 'items' => [['text' => '1 week', 'source' => 'practitioner_stated', 'evidence' => [1]]]],
        ]);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))
            ->assertJsonPath('session.status', ScribeSession::STATUS_DRAFT_READY);

        return [$practitioner, $clinic, $session->fresh(), $membership, $appointment];
    }

    public function test_handoff_creates_a_prefilled_draft_note_that_is_never_finalized(): void
    {
        [$practitioner, $clinic, $session, $membership, $appointment] = $this->draftedSession();

        $response = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))
            ->assertOk()
            ->assertJsonPath('session.status', ScribeSession::STATUS_HANDED_OFF)
            ->assertJsonPath('session.clinical_note.status', ClinicalNote::STATUS_DRAFT);

        $note = ClinicalNote::withoutGlobalScopes()->findOrFail($response->json('clinical_note_id'));
        $response->assertJsonPath('redirect', "/app/notes/{$note->id}/edit");

        $this->assertSame(ClinicalNote::STATUS_DRAFT, $note->status);
        $this->assertNull($note->finalized_at);
        $this->assertNull($note->signed_at);
        $this->assertSame($appointment->id, $note->appointment_id);
        $this->assertSame($membership->id, $note->staff_membership_id);
        $this->assertSame('physiotherapy', $note->discipline);

        $this->assertSame('Right shoulder pain for 3 weeks.', $note->content['chief_complaint']);
        $this->assertSame('4-6 - Moderate pain', $note->content['pain_score']);
        $this->assertSame('Flexion limited to 120°.', $note->content['range_of_motion']);
        $this->assertSame('1 week', $note->content['return_schedule']);

        $session->refresh();
        $this->assertSame($note->id, $session->clinical_note_id);
        $this->assertSame($practitioner->id, $session->handed_off_by_user_id);
        $this->assertCount(5, $session->handoff_fields['filled']);

        $this->assertTrue(AuditEvent::where('action', 'scribe.handed_off')->exists());
        $this->assertTrue(AuditEvent::where('action', 'clinical_note.created')->where('resource_id', $note->id)->exists());
    }

    public function test_existing_draft_note_is_prefilled_without_overwriting_what_the_practitioner_typed(): void
    {
        [$practitioner, $clinic, $session, $membership, $appointment] = $this->draftedSession();
        $template = ClinicalNoteTemplate::withoutGlobalScopes()->where('tenant_id', $clinic->id)->where('discipline', 'physiotherapy')->first();

        $note = ClinicalNote::withoutGlobalScopes()->create([
            'tenant_id' => $clinic->id,
            'client_id' => $session->client_id,
            'staff_membership_id' => $membership->id,
            'appointment_id' => $appointment->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'physiotherapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['chief_complaint' => 'Typed by me: left shoulder.'],
            'status' => ClinicalNote::STATUS_DRAFT,
        ]);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))
            ->assertOk()
            ->assertJsonPath('clinical_note_id', $note->id);

        $note->refresh();
        $this->assertSame('Typed by me: left shoulder.', $note->content['chief_complaint']);
        $this->assertSame('Flexion limited to 120°.', $note->content['range_of_motion']);
        $this->assertSame(1, ClinicalNote::withoutGlobalScopes()->count());
        $this->assertSame(['chief_complaint'], $session->fresh()->handoff_fields['skipped']);
    }

    public function test_a_signed_note_is_never_touched(): void
    {
        [$practitioner, $clinic, $session, $membership, $appointment] = $this->draftedSession();

        $note = ClinicalNote::withoutGlobalScopes()->create([
            'tenant_id' => $clinic->id,
            'client_id' => $session->client_id,
            'staff_membership_id' => $membership->id,
            'appointment_id' => $appointment->id,
            'discipline' => 'physiotherapy',
            'template_name' => 'Physio',
            'template_version' => 1,
            'schema_snapshot' => ['sections' => []],
            'content' => [],
            'status' => ClinicalNote::STATUS_FINALIZED,
            'finalized_at' => now(),
        ]);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_state');

        $this->assertSame([], $note->fresh()->content);
        $this->assertSame(ScribeSession::STATUS_DRAFT_READY, $session->fresh()->status);
    }

    public function test_handoff_requires_a_generated_draft_and_happens_once(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"));

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))->assertStatus(409);
        $this->assertSame(0, ClinicalNote::withoutGlobalScopes()->count());

        [$practitioner, $clinic2, $drafted] = $this->draftedSessionIn('cedar');
        $this->actingAs($practitioner)->postJson($this->url($clinic2, "/sessions/{$drafted->id}/handoff"))->assertOk();
        $this->actingAs($practitioner)->postJson($this->url($clinic2, "/sessions/{$drafted->id}/handoff"))->assertStatus(409);
        $this->actingAs($practitioner)->postJson($this->url($clinic2, "/sessions/{$drafted->id}/draft"))->assertStatus(409);
    }

    public function test_only_the_sessions_practitioner_can_hand_off(): void
    {
        [$practitioner, $clinic, $session] = $this->draftedSession();
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);
        [$receptionist] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        $other = $this->clinic('cedar');
        [$otherOwner] = $this->staff($other, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($receptionist)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))->assertForbidden();
        $this->actingAs($owner)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))->assertForbidden();
        $this->actingAs($otherOwner)->postJson($this->url($other, "/sessions/{$session->id}/handoff"))->assertNotFound();

        $this->assertSame(0, ClinicalNote::withoutGlobalScopes()->count());
    }

    public function test_editor_labels_prefilled_fields_with_their_sources(): void
    {
        [$practitioner, $clinic, $session] = $this->draftedSession();
        $noteId = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/handoff"))->json('clinical_note_id');

        $this->actingAs($practitioner)->get("http://lotus.umahz.test/app/notes/{$noteId}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ClinicalNotes/Editor')
                ->where('note.status', ClinicalNote::STATUS_DRAFT)
                ->where('note.content.chief_complaint', 'Right shoulder pain for 3 weeks.')
                ->where('scribeHandoff.session_id', $session->id)
                ->where('scribeHandoff.fields.chief_complaint', ['client_reported'])
                ->where('scribeHandoff.fields.range_of_motion', ['practitioner_stated'])
                ->where('scribeHandoff.fields.clinical_assessment', ['ai_generated']));
    }

    public function test_reopening_scribe_returns_to_the_drafted_session(): void
    {
        [$practitioner, $clinic, $session, , $appointment] = $this->draftedSession();

        $this->openSession($practitioner, $clinic, $session->client, $appointment)
            ->assertJsonPath('session.id', $session->id)
            ->assertJsonPath('session.status', ScribeSession::STATUS_DRAFT_READY)
            ->assertJsonPath('session.draft.version', 1);
    }

    /**
     * Same as draftedSession() but in a separately named clinic.
     *
     * @return array{0: User, 1: Tenant, 2: ScribeSession}
     */
    private function draftedSessionIn(string $sub): array
    {
        $clinic = $this->clinic($sub);
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));
        $this->provider->respondWith('My knee hurts.');
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"));
        $this->drafter->respondWith([
            ['field_id' => 'chief_complaint', 'items' => [['text' => 'Knee pain.', 'source' => 'client_reported', 'evidence' => [0]]]],
        ]);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"));

        return [$practitioner, $clinic, $session->fresh()];
    }
}
