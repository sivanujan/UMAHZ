<?php

namespace Tests\Feature\Scribe;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\ScribeUsageLedger;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scribe\Drafting\DraftingRequest;
use App\Scribe\Drafting\DraftingResponse;
use App\Scribe\ScribeDraftService;
use App\Scribe\Translation\ScribeTranslationService;
use App\Services\PlanEntitlements;

class ScribeStreamingTest extends ScribeTestCase
{
    public function test_token_gate_fails_when_streaming_feature_flag_is_disabled(): void
    {
        config(['scribe.streaming.enabled' => false]);

        $clinic = $this->clinic('streamoff');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/token"));

        $res->assertForbidden()
            ->assertJsonPath('error', 'streaming_disabled');
    }

    public function test_token_gate_fails_without_valid_consent(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamnoconsent');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $appointment = $this->appointment($clinic, $client, $membership);

        $sessionId = $this->openSession($practitioner, $clinic, $client, $appointment)->json('session.id');

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$sessionId}/token"));

        $res->assertForbidden()
            ->assertJsonPath('error', 'consent_required');
    }

    public function test_token_gate_fails_for_receptionist(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamrole');
        [$practitioner, $pMembership] = $this->staff($clinic);
        [$receptionist] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $pMembership));

        $res = $this->actingAs($receptionist)->postJson($this->url($clinic, "/sessions/{$session->id}/token"));

        $res->assertForbidden()
            ->assertJsonPath('error', 'unauthorized_role');
    }

    public function test_token_gate_issues_token_for_practitioner_when_enabled_and_consented(): void
    {
        config([
            'scribe.streaming.enabled' => true,
            'scribe.streaming.model' => 'universal-3-6-pro',
            'scribe.streaming.sample_rate' => 16000,
            'scribe.streaming.max_session_duration_seconds' => 3600,
        ]);

        $clinic = $this->clinic('streamok');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/token"));

        $res->assertOk()
            ->assertJsonStructure([
                'token',
                'websocket_url',
                'speech_model',
                'sample_rate',
                'mode',
                'max_session_duration_seconds',
                'language',
            ]);

        $this->assertSame('universal-3-6-pro', $res->json('speech_model'));
        $this->assertSame(3600, $res->json('max_session_duration_seconds'));
        $this->assertNotEmpty($res->json('token'));
    }

    public function test_token_gate_does_not_block_when_allowance_is_exceeded(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamallowance');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        // Seed usage exceeding 600 minutes
        $tz = $clinic->timezone ?: 'America/Toronto';
        $now = \Carbon\Carbon::now($tz);
        ScribeUsageLedger::updateOrCreate(
            [
                'tenant_id' => $clinic->id,
                'staff_membership_id' => $membership->id,
                'period_start' => $now->copy()->startOfMonth()->toDateString(),
                'period_end' => $now->copy()->endOfMonth()->toDateString(),
            ],
            [
                'recorded_ms' => 700 * 60 * 1000,
                'streaming_billed_ms' => 0,
                'session_count' => 10,
            ]
        );

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/token"));

        // Must still succeed without blocking
        $res->assertOk()
            ->assertJsonStructure(['token', 'speech_model']);
    }

    public function test_incremental_turn_saving_creates_segments_with_streaming_source(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamturns');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $turns = [
            [
                'sequence' => 0,
                'text' => 'Good morning. How can I help you today?',
                'start_ms' => 0,
                'end_ms' => 2500,
                'language' => 'en',
            ],
            [
                'sequence' => 1,
                'text' => 'I have sharp pain in my lower back since yesterday.',
                'start_ms' => 2600,
                'end_ms' => 5800,
                'language' => 'en',
            ],
        ];

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => $turns,
            'connection_duration_sec' => 10,
        ]);

        $res->assertOk()
            ->assertJson(['saved' => 2]);

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->orderBy('sequence')
            ->get();

        $this->assertCount(2, $segments);
        $this->assertSame(ScribeTranscriptSegment::SOURCE_AI_STREAMING, $segments[0]->source);
        $this->assertSame('Good morning. How can I help you today?', $segments[0]->text);
        $this->assertSame(ScribeTranscriptSegment::SOURCE_AI_STREAMING, $segments[1]->source);
        $this->assertSame('I have sharp pain in my lower back since yesterday.', $segments[1]->text);

        $freshSession = $session->fresh();
        $this->assertTrue($freshSession->is_streaming);
        $this->assertSame(5800, $freshSession->recorded_ms);
        $this->assertSame(10000, $freshSession->streaming_billed_ms);
    }

    public function test_incremental_turn_saving_idempotency_prevents_duplicate_segments(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamidempotent');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $turn = [
            'sequence' => 0,
            'text' => 'Hello doctor.',
            'start_ms' => 0,
            'end_ms' => 1500,
            'language' => 'en',
        ];

        // Send turn first time
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [$turn],
        ])->assertOk();

        // Send same turn second time (network retry / resend)
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [$turn],
        ])->assertOk();

        $count = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->count();

        $this->assertSame(1, $count);
    }

    public function test_turn_saving_refused_if_consent_is_revoked_mid_session(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamrevoked');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        // Revoke consent
        Consent::withoutGlobalScopes()->where('id', $session->consent_id)->update([
            'status' => Consent::STATUS_WITHDRAWN,
            'withdrawn_at' => now(),
            'withdrawal_reason' => 'Patient changed mind',
        ]);

        $turn = [
            'sequence' => 0,
            'text' => 'This should be rejected.',
            'start_ms' => 0,
            'end_ms' => 1000,
        ];

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [$turn],
        ]);

        $res->assertForbidden()
            ->assertJsonPath('error', 'consent_revoked');

        $this->assertSame(0, ScribeTranscriptSegment::withoutGlobalScopes()->where('scribe_session_id', $session->id)->count());
    }

    public function test_stop_settles_streaming_session_to_transcript_ready(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamstop');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $turns = [
            [
                'sequence' => 0,
                'text' => 'Patient has left elbow tendonitis.',
                'start_ms' => 0,
                'end_ms' => 3000,
                'language' => 'en',
            ],
        ];

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => $turns,
            'connection_duration_sec' => 5,
        ])->assertOk();

        // Stop session
        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"));

        $res->assertOk();
        $fresh = $session->fresh();
        $this->assertSame(ScribeSession::STATUS_TRANSCRIPT_READY, $fresh->status);
        $fullText = $fresh->segments->pluck('text')->implode(' ');
        $this->assertStringContainsString('Patient has left elbow tendonitis.', $fullText);
    }

    public function test_usage_tracking_records_both_client_and_billed_streaming_duration(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamusage');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                ['sequence' => 0, 'text' => 'Session turn 1.', 'start_ms' => 0, 'end_ms' => 12000, 'language' => 'en'],
            ],
            'connection_duration_sec' => 15,
        ])->assertOk();

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"))->assertOk();

        $ledger = ScribeUsageLedger::where('tenant_id', $clinic->id)->first();

        $this->assertNotNull($ledger);
        $this->assertSame(12000, $ledger->recorded_ms);
        $this->assertSame(15000, $ledger->streaming_billed_ms);

        $billedMinutes = PlanEntitlements::calculateStreamingBilledMinutes($clinic);
        $this->assertEquals(0.3, $billedMinutes); // 15000ms / 60000 = 0.25 min rounded to 1 decimal = 0.3
    }

    public function test_translation_works_with_streaming_segments(): void
    {
        config([
            'scribe.streaming.enabled' => true,
            'scribe.drafting.driver' => 'fake',
        ]);

        $clinic = $this->clinic('streamtrans', ['enabled' => true, 'enabled_languages' => ['en', 'fr']]);
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        // Set session language to French
        $session->forceFill(['language' => 'fr'])->save();

        // Ingest streaming turn in French
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                [
                    'sequence' => 0,
                    'text' => 'Douleur au genou droit depuis trois semaines.',
                    'start_ms' => 0,
                    'end_ms' => 3200,
                    'language' => 'fr',
                ],
            ],
        ])->assertOk();

        // Run translation
        $service = app(ScribeTranslationService::class);
        $translated = $service->translate($session->fresh());

        $this->assertNotEmpty($translated);
        $fresh = $session->fresh();
        $this->assertSame(ScribeSession::TRANSLATION_COMPLETED, $fresh->translation_status);
        $this->assertTrue($fresh->is_translated);

        $segment = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->first();

        $this->assertNotNull($segment->translated_text);
        $this->assertSame(ScribeTranscriptSegment::SOURCE_AI_STREAMING, $segment->source);
    }

    public function test_drafting_works_with_streaming_segments(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('streamdraft');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        // Ingest streaming segments
        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                [
                    'sequence' => 0,
                    'text' => 'Patient has right shoulder pain for 3 weeks.',
                    'start_ms' => 0,
                    'end_ms' => 3000,
                    'language' => 'en',
                ],
                [
                    'sequence' => 1,
                    'text' => 'Shoulder flexion limited to 120 degrees.',
                    'start_ms' => 3100,
                    'end_ms' => 6000,
                    'language' => 'en',
                ],
            ],
        ])->assertOk();

        $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/stop"))->assertOk();

        // Fake drafting provider returns valid draft
        $this->drafter->respondWith([
            ['field_id' => 'chief_complaint', 'items' => [
                ['text' => 'Right shoulder pain for 3 weeks.', 'source' => 'client_reported', 'evidence' => [0]],
            ]],
            ['field_id' => 'range_of_motion', 'items' => [
                ['text' => 'Flexion limited to 120 degrees.', 'source' => 'practitioner_stated', 'evidence' => [1]],
            ]],
        ]);

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/draft"));

        $res->assertStatus(202)
            ->assertJsonPath('session.status', ScribeSession::STATUS_DRAFT_READY);

        $fresh = $session->fresh();
        $this->assertSame(ScribeSession::STATUS_DRAFT_READY, $fresh->status);
        $this->assertCount(2, $fresh->draftItems);
    }

    /**
     * Requirement: Test exact frontend payload structure sent by useScribeRecorder.js
     * so that validation never rejects it with 422 Unprocessable Content.
     */
    public function test_exact_frontend_payload_is_accepted_and_persisted(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('frontendstream');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        // Exactly the payload shape useScribeRecorder sends
        $frontendPayload = [
            'turns' => [
                [
                    'sequence' => 0,
                    'text' => 'Patient has persistent knee swelling.',
                    'start_ms' => 0,
                    'end_ms' => 2450,
                    'language' => 'en',
                    'source' => 'ai_streaming',
                ],
                [
                    'sequence' => 1,
                    'text' => 'Pain increases after climbing stairs.',
                    'start_ms' => 2500,
                    'end_ms' => 4820,
                    'language' => 'en',
                    'source' => 'ai_streaming',
                ],
            ],
            'client_recorded_ms' => 5200,
            'connection_duration_seconds' => 6,
        ];

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), $frontendPayload);

        $res->assertOk()
            ->assertJsonPath('saved', 2)
            ->assertJsonPath('saved_turns', 2);

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->orderBy('sequence')
            ->get();

        $this->assertCount(2, $segments);
        $this->assertSame('Patient has persistent knee swelling.', $segments[0]->text);
        $this->assertSame(0, $segments[0]->start_ms);
        $this->assertSame(2450, $segments[0]->end_ms);
        $this->assertSame('Pain increases after climbing stairs.', $segments[1]->text);
        $this->assertSame(2500, $segments[1]->start_ms);
        $this->assertSame(4820, $segments[1]->end_ms);

        $fresh = $session->fresh();
        $this->assertTrue($fresh->is_streaming);
        $this->assertSame(5200, $fresh->recorded_ms);
        $this->assertSame(6000, $fresh->streaming_billed_ms);
    }

    /**
     * Requirement: Empty turns array with connection duration must be valid and not return 422.
     */
    public function test_empty_turns_array_with_duration_is_accepted_without_422(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('emptyturns');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [],
            'client_recorded_ms' => 3000,
            'connection_duration_seconds' => 4,
        ]);

        $res->assertOk()
            ->assertJsonPath('saved', 0);

        $this->assertSame(4000, $session->fresh()->streaming_billed_ms);
    }

    /**
     * Requirement: Turns with floats, numeric strings, or empty/whitespace text are handled gracefully.
     */
    public function test_turns_with_floats_and_empty_text_do_not_fail_validation(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('numericturns');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                [
                    'sequence' => '0',
                    'text' => 'Normal turn text.',
                    'start_ms' => 100.5,
                    'end_ms' => 1500.8,
                    'language' => 'en',
                ],
                [
                    'sequence' => 1,
                    'text' => '   ', // whitespace only
                    'start_ms' => 1600,
                    'end_ms' => 2000,
                ],
            ],
            'client_recorded_ms' => 2000.4,
        ]);

        $res->assertOk()
            ->assertJsonPath('saved', 1);

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->get();

        $this->assertCount(1, $segments);
        $this->assertSame('Normal turn text.', $segments[0]->text);
        $this->assertSame(101, $segments[0]->start_ms);
        $this->assertSame(1501, $segments[0]->end_ms);
    }

    /**
     * Requirement: In-payload duplicate sequences do not cause unique constraint errors or duplicates.
     */
    public function test_in_payload_duplicate_sequences_are_idempotently_deduplicated(): void
    {
        config(['scribe.streaming.enabled' => true]);

        $clinic = $this->clinic('deduptest');
        [$practitioner, $membership] = $this->staff($clinic);
        $client = $this->client($clinic);
        $session = $this->recordingSession($practitioner, $clinic, $client, $this->appointment($clinic, $client, $membership));

        $res = $this->actingAs($practitioner)->postJson($this->url($clinic, "/sessions/{$session->id}/streaming-turns"), [
            'turns' => [
                [
                    'sequence' => 0,
                    'text' => 'First version of turn zero',
                    'start_ms' => 0,
                    'end_ms' => 1000,
                ],
                [
                    'sequence' => 0,
                    'text' => 'Updated version of turn zero',
                    'start_ms' => 0,
                    'end_ms' => 1200,
                ],
            ],
        ]);

        $res->assertOk();

        $segments = ScribeTranscriptSegment::withoutGlobalScopes()
            ->where('scribe_session_id', $session->id)
            ->get();

        $this->assertCount(1, $segments);
        $this->assertSame('Updated version of turn zero', $segments[0]->text);
        $this->assertSame(1200, $segments[0]->end_ms);
    }
}
