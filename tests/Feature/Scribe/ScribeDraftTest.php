<?php

namespace Tests\Feature\Scribe;

use App\Models\AuditEvent;
use App\Models\ClinicalNote;
use App\Models\Consent;
use App\Models\ScribeDraftItem;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scribe\Drafting\DraftingException;
use App\Scribe\Drafting\DraftingRequest;
use App\Scribe\Drafting\OpenRouterDraftingProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

class ScribeDraftTest extends ScribeTestCase
{
    /**
     * A physiotherapy session that has been recorded and fully transcribed.
     *
     * @return array{0: User, 1: Tenant, 2: ScribeSession}
     */
    private function transcribedSession(string $sub = 'lotus'): array
    {
        $clinic = $this->clinic($sub); // offers physiotherapy
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $this->provider->respondWith(
            'I have had pain in my right shoulder for three weeks, about a six out of ten.',
            'Shoulder flexion is limited to about 120 degrees. We did manual therapy today.',
        );
        $this->uploadChunk($practitioner, $clinic, $session->id, 0);
        $this->uploadChunk($practitioner, $clinic, $session->id, 1);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"))
            ->assertJsonPath('session.status', ScribeSession::STATUS_TRANSCRIPT_READY);

        return [$practitioner, $clinic, $session->fresh()];
    }

    private function goodDraft(): array
    {
        return [
            ['field_id' => 'chief_complaint', 'items' => [
                ['text' => 'Right shoulder pain for 3 weeks.', 'source' => 'client_reported', 'evidence' => [0]],
            ]],
            ['field_id' => 'pain_score', 'items' => [
                ['text' => '4-6 - moderate pain', 'source' => 'client_reported', 'evidence' => [0]], // case-insensitive option match
            ]],
            ['field_id' => 'range_of_motion', 'items' => [
                ['text' => 'Shoulder flexion limited to ~120°.', 'source' => 'practitioner_stated', 'evidence' => [1]],
            ]],
            ['field_id' => 'clinical_assessment', 'items' => [
                ['text' => 'Presentation consistent with a right shoulder mobility deficit.', 'source' => 'ai_generated', 'evidence' => [0, 1]],
            ]],
        ];
    }

    public function test_generates_a_profession_specific_draft_with_separate_provenance(): void
    {
        [$practitioner, $clinic, $session] = $this->transcribedSession();
        $this->drafter->respondWith($this->goodDraft());

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))
            ->assertStatus(202)
            ->assertJsonPath('session.status', ScribeSession::STATUS_DRAFT_READY)
            ->assertJsonPath('session.draft.status', ScribeSession::DRAFT_READY)
            ->assertJsonPath('session.draft.version', 1)
            ->assertJsonPath('session.draft.sections.0.fields.0.id', 'chief_complaint')
            ->assertJsonPath('session.draft.sections.0.fields.0.items.0.provenance', 'client_reported')
            ->assertJsonPath('session.draft.sections.0.fields.0.items.0.evidence', [0])
            ->assertJsonPath('session.draft.sections.0.fields.1.items.0.content', '4-6 - Moderate pain');

        // The physiotherapy template + ordered transcript were sent to the model.
        /** @var DraftingRequest $sent */
        $sent = $this->drafter->requests[0];
        $this->assertSame('physiotherapy', $sent->discipline);
        $this->assertSame('range_of_motion', $sent->templateSchema['sections'][1]['fields'][0]['id']);
        $this->assertSame([0, 1], array_column($sent->transcript, 'sequence'));

        $byProvenance = ScribeDraftItem::withoutGlobalScopes()->get()->groupBy('provenance')->map->count();
        $this->assertSame(2, $byProvenance['client_reported']);
        $this->assertSame(1, $byProvenance['practitioner_stated']);
        $this->assertSame(1, $byProvenance['ai_generated']);

        $item = ScribeDraftItem::withoutGlobalScopes()->where('section_key', 'range_of_motion')->first();
        $this->assertSame(1, $item->evidence[0]['sequence']);
        $this->assertNotNull($item->evidence[0]['segment_id']);
        $this->assertSame('fake-draft-1', $item->generator['model']);
        $this->assertSame(ScribeDraftItem::REVIEW_PROPOSED, $item->review_status);

        // Draft text is encrypted at rest.
        $this->assertStringNotContainsString('120', \DB::table('scribe_draft_items')->where('id', $item->id)->value('content'));

        $this->assertTrue(AuditEvent::where('action', 'scribe.draft_requested')->exists());
        $this->assertTrue(AuditEvent::where('action', 'scribe.draft_generated')->exists());
    }

    public function test_untrusted_model_output_is_validated_before_saving(): void
    {
        [$practitioner, $clinic, $session] = $this->transcribedSession();
        $this->drafter->respondWith([
            ['field_id' => 'made_up_field', 'items' => [['text' => 'Should be dropped', 'source' => 'ai_generated', 'evidence' => [0]]]],
            ['field_id' => 'pain_score', 'items' => [['text' => 'Eleven out of ten', 'source' => 'client_reported', 'evidence' => [0]]]],
            ['field_id' => 'chief_complaint', 'items' => [
                ['text' => 'Claims client said it, but cites nothing', 'source' => 'client_reported', 'evidence' => []],
                ['text' => 'Cites a segment that does not exist', 'source' => 'practitioner_stated', 'evidence' => [42]],
                ['text' => 'Pretends to be a measurement', 'source' => 'objective_measurement', 'evidence' => [1]],
                ['text' => '   ', 'source' => 'ai_generated', 'evidence' => [0]],
            ]],
        ]);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))->assertStatus(202);

        $items = ScribeDraftItem::withoutGlobalScopes()->orderBy('position')->get();

        $this->assertSame(['chief_complaint'], $items->pluck('section_key')->unique()->values()->all());
        $this->assertCount(3, $items);
        // Unsupported "someone said it" claims and model-assigned measurement labels become ai_generated.
        $this->assertSame(['ai_generated', 'ai_generated', 'ai_generated'], $items->pluck('provenance')->all());
        $this->assertSame([], $items[1]->evidence);
    }

    public function test_draft_requires_valid_consent(): void
    {
        [$practitioner, $clinic, $session] = $this->transcribedSession();
        Consent::withoutGlobalScopes()->find($session->consent_id)->update(['status' => Consent::STATUS_WITHDRAWN, 'withdrawn_at' => now()]);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))
            ->assertForbidden()
            ->assertJsonPath('code', 'consent_required');

        $this->assertCount(0, $this->drafter->requests);
    }

    public function test_draft_requires_a_finished_transcript(): void
    {
        $clinic = $this->clinic('lotus');
        [$practitioner] = $this->staff($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $this->client($clinic));

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))->assertStatus(409);
        $this->assertCount(0, $this->drafter->requests);
    }

    public function test_only_the_sessions_practitioner_can_generate_and_other_roles_are_blocked(): void
    {
        [$practitioner, $clinic, $session] = $this->transcribedSession();
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);
        [$receptionist] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        $other = $this->clinic('cedar');
        [$otherOwner] = $this->staff($other, StaffMembership::ROLE_CLINIC_OWNER);

        $this->actingAs($receptionist)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))->assertForbidden();
        $this->actingAs($owner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))->assertForbidden();
        $this->actingAs($otherOwner)->postJson($this->url($other, "/sessions/{$session->id}/draft"))->assertNotFound();

        $this->assertCount(0, $this->drafter->requests);
    }

    public function test_regenerating_keeps_history_and_never_creates_or_finalizes_a_note(): void
    {
        [$practitioner, $clinic, $session] = $this->transcribedSession();
        $this->drafter->respondWith($this->goodDraft(), [
            ['field_id' => 'chief_complaint', 'items' => [['text' => 'Second attempt.', 'source' => 'ai_generated', 'evidence' => [0]]]],
        ]);

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))->assertStatus(202);
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))
            ->assertStatus(202)
            ->assertJsonPath('session.draft.version', 2)
            ->assertJsonPath('session.draft.sections.0.fields.0.items.0.content', 'Second attempt.');

        $this->assertSame(4, ScribeDraftItem::withoutGlobalScopes()->where('draft_version', 1)->count());
        $this->assertSame(1, ScribeDraftItem::withoutGlobalScopes()->where('draft_version', 2)->count());

        $this->assertSame(0, ClinicalNote::withoutGlobalScopes()->count());
        $this->assertNull($session->fresh()->clinical_note_id);
        $this->assertSame(ScribeSession::STATUS_DRAFT_READY, $session->fresh()->status);
    }

    public function test_provider_failure_is_reported_and_the_transcript_is_untouched(): void
    {
        [$practitioner, $clinic, $session] = $this->transcribedSession();
        $this->drafter->respondWith(new DraftingException('AI drafting service error: Insufficient credits', retryable: false));

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"))
            ->assertStatus(202)
            ->assertJsonPath('session.status', ScribeSession::STATUS_TRANSCRIPT_READY)
            ->assertJsonPath('session.draft.status', ScribeSession::DRAFT_FAILED)
            ->assertJsonPath('session.draft.error', 'AI drafting service error: Insufficient credits')
            ->assertJsonCount(2, 'session.segments');

        $this->assertTrue(AuditEvent::where('action', 'scribe.draft_failed')->exists());
    }

    public function test_openrouter_sends_the_prompt_with_privacy_routing_and_parses_the_reply(): void
    {
        config(['scribe.drafting.openrouter.api_key' => 'or-test-key', 'scribe.drafting.openrouter.model' => 'anthropic/claude-haiku-4.5']);

        $reply = "```json\n".json_encode(['fields' => [
            ['field_id' => 'chief_complaint', 'items' => [['text' => 'Right shoulder pain.', 'source' => 'client_reported', 'evidence' => [0]]]],
        ]])."\n```";

        Http::fake(['openrouter.ai/*' => Http::response([
            'model' => 'anthropic/claude-haiku-4.5',
            'choices' => [['message' => ['content' => $reply], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 1200, 'completion_tokens' => 150, 'cost' => 0.00195],
        ])]);

        $result = (new OpenRouterDraftingProvider)->draft(new DraftingRequest(
            'physiotherapy',
            'Physiotherapy',
            ['sections' => [['id' => 'subjective', 'title' => 'Subjective', 'fields' => [['id' => 'chief_complaint', 'label' => 'Chief complaint', 'type' => 'long_text']]]]],
            [['id' => 'seg-1', 'sequence' => 0, 'text' => 'My right shoulder hurts.', 'start_ms' => 0, 'end_ms' => 12000, 'speaker_role' => null]],
        ));

        $this->assertSame('chief_complaint', $result->fields[0]['field_id']);
        $this->assertSame('anthropic/claude-haiku-4.5', $result->generator['model']);
        $this->assertSame(0.00195, $result->generator['usage']['cost_usd']);

        Http::assertSent(function (Request $r) {
            return $r->url() === 'https://openrouter.ai/api/v1/chat/completions'
                && $r->hasHeader('Authorization', 'Bearer or-test-key')
                && $r['model'] === 'anthropic/claude-haiku-4.5'
                && $r['provider']['data_collection'] === 'deny'
                && str_contains($r['messages'][1]['content'], '#0 [00:00] My right shoulder hurts.')
                && str_contains($r['messages'][1]['content'], '"field_id":"chief_complaint"');
        });
    }

    public function test_openrouter_without_a_key_fails_clearly_and_sends_nothing(): void
    {
        $request = new DraftingRequest('physiotherapy', 'Physiotherapy', ['sections' => []], []);

        config(['scribe.drafting.openrouter.api_key' => null]);
        Http::fake();
        try {
            (new OpenRouterDraftingProvider)->draft($request);
            $this->fail('Expected exception');
        } catch (DraftingException $e) {
            $this->assertFalse($e->retryable);
            $this->assertStringContainsString('OPENROUTER_API_KEY', $e->getMessage());
        }
        Http::assertNothingSent();
    }

    public function test_openrouter_errors_are_classified_as_retryable_or_not(): void
    {
        $request = new DraftingRequest('physiotherapy', 'Physiotherapy', ['sections' => []], []);

        config(['scribe.drafting.openrouter.api_key' => 'or-test-key']);
        Http::fake(['openrouter.ai/*' => Http::sequence()
            ->push(['error' => ['message' => 'Insufficient credits']], 402)
            ->push(['error' => ['message' => 'Rate limited']], 429)
            ->push(['choices' => [['message' => ['content' => 'Sorry, I cannot help.'], 'finish_reason' => 'stop']]])]);

        foreach ([[false, 'Insufficient credits'], [true, 'Rate limited'], [true, 'unexpected format']] as [$retryable, $message]) {
            try {
                (new OpenRouterDraftingProvider)->draft($request);
                $this->fail('Expected exception');
            } catch (DraftingException $e) {
                $this->assertSame($retryable, $e->retryable, $message);
                $this->assertStringContainsString($message, $e->getMessage());
            }
        }
    }
}
