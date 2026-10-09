<?php

namespace Tests\Feature\Scribe;

use App\Jobs\TranscribeAudioChunk;
use App\Models\AuditEvent;
use App\Models\ClinicalNote;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scribe\LanguageRegistry;
use App\Scribe\ScribeDraftService;
use App\Scribe\Translation\ScribeTranslationService;

class ScribeMultiLanguageTest extends ScribeTestCase
{
    public function test_default_language_is_english_and_enabled_languages_always_includes_english(): void
    {
        $tenant = $this->clinic('langdefault', ['enabled' => true]);

        $this->assertEquals(['en'], $tenant->scribeEnabledLanguages());

        // Even if updated with only 'zh', 'en' must always be present.
        $tenant->updateScribeSettings(['enabled_languages' => ['zh']]);
        $this->assertContains('en', $tenant->scribeEnabledLanguages());
        $this->assertContains('zh', $tenant->scribeEnabledLanguages());
    }

    public function test_clinic_owner_can_configure_enabled_languages(): void
    {
        $tenant = $this->clinic('langsettings', ['enabled' => true]);
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $response = $this->actingAs($owner)->patch("http://{$tenant->subdomain}.umahz.test/app/settings/scribe", [
            'enabled' => true,
            'audio_retention_mode' => 'delete_after_transcription',
            'audio_retention_hours' => 24,
            'enabled_languages' => ['en', 'zh'],
        ]);

        $response->assertRedirect();
        $tenant->refresh();
        $this->assertEquals(['en', 'zh'], $tenant->scribeEnabledLanguages());
    }

    public function test_open_session_sets_default_language_and_can_pick_enabled_language(): void
    {
        $tenant = $this->clinic('langpick', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner] = $this->staff($tenant);
        $client = $this->client($tenant);

        // Default open -> 'en'
        $res1 = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
        ]);
        $res1->assertCreated();
        $this->assertEquals('en', $res1->json('session.language'));
        $this->assertEquals('English', $res1->json('session.language_label'));
        $this->assertFalse($res1->json('session.is_non_english'));

        // Update language to 'zh'
        $sessionId = $res1->json('session.id');
        $patchRes = $this->actingAs($practitioner)->patchJson($this->url($tenant, "/sessions/{$sessionId}/language"), [
            'language' => 'zh',
        ]);
        $patchRes->assertOk();
        $this->assertEquals('zh', $patchRes->json('session.language'));
        $this->assertEquals('Mandarin (Chinese)', $patchRes->json('session.language_label'));
        $this->assertTrue($patchRes->json('session.is_non_english'));
    }

    public function test_cannot_pick_language_not_enabled_for_clinic(): void
    {
        $tenant = $this->clinic('langrestricted', ['enabled' => true, 'enabled_languages' => ['en']]);
        [$practitioner] = $this->staff($tenant);
        $client = $this->client($tenant);

        $res = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
        ]);
        $sessionId = $res->json('session.id');

        $patchRes = $this->actingAs($practitioner)->patchJson($this->url($tenant, "/sessions/{$sessionId}/language"), [
            'language' => 'zh',
        ]);
        $patchRes->assertStatus(422);
    }

    public function test_cannot_change_language_once_recording_starts(): void
    {
        $tenant = $this->clinic('langlocked', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = $this->recordingSession($practitioner, $tenant, $client);

        $patchRes = $this->actingAs($practitioner)->patchJson($this->url($tenant, "/sessions/{$session->id}/language"), [
            'language' => 'zh',
        ]);
        $patchRes->assertStatus(409);
    }

    public function test_force_new_creates_fresh_session(): void
    {
        $tenant = $this->clinic('forcenew', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner] = $this->staff($tenant);
        $client = $this->client($tenant);

        // First session
        $res1 = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
        ])->assertCreated();
        $id1 = $res1->json('session.id');

        // Normal second call returns existing session
        $res2 = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
        ])->assertSuccessful();
        $this->assertEquals($id1, $res2->json('session.id'));

        // Calling with force_new creates a brand new session
        $res3 = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
            'force_new' => true,
            'language' => 'zh',
        ])->assertCreated();
        $id3 = $res3->json('session.id');

        $this->assertNotEquals($id1, $id3);
        $this->assertEquals('zh', $res3->json('session.language'));
    }

    public function test_chunk_transcription_passes_language_and_stores_on_segment(): void
    {
        $tenant = $this->clinic('chunklang', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner] = $this->staff($tenant);
        $client = $this->client($tenant);

        // Open session with Mandarin
        $res = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
            'language' => 'zh',
        ]);
        $sessionId = $res->json('session.id');
        $this->giveConsent($practitioner, $tenant, $sessionId);
        $this->actingAs($practitioner)->postJson($this->url($tenant, "/sessions/{$sessionId}/start"));

        $uploadRes = $this->uploadChunk($practitioner, $tenant, $sessionId, 0);
        $uploadRes->assertAccepted();
        $chunkId = $uploadRes->json('chunk.id');

        // Run the transcription job
        $chunk = ScribeAudioChunk::withoutGlobalScopes()->findOrFail($chunkId);
        (new TranscribeAudioChunk($chunk->id))->handle($this->provider);

        $segment = ScribeTranscriptSegment::withoutGlobalScopes()->where('scribe_session_id', $sessionId)->first();
        $this->assertNotNull($segment);
        $this->assertEquals('zh', $segment->language);
    }

    public function test_translation_service_translates_non_english_segments_and_logs_audit(): void
    {
        $tenant = $this->clinic('transservice', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'zh',
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
        ]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 10000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        $segment = ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 10000,
            'text' => '患者主诉右膝疼痛，持续三周，上下楼梯时加重。',
            'language' => 'zh',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        $translationService = app(ScribeTranslationService::class);
        $translatedSegments = $translationService->translate($session);

        $this->assertCount(1, $translatedSegments);

        $session->refresh();
        $this->assertTrue($session->is_translated);
        $this->assertNotNull($session->translated_at);

        $segment->refresh();
        $this->assertNotNull($segment->translated_text);
        $this->assertStringContainsString('right knee', strtolower($segment->translated_text));

        // Audit event logged
        $this->assertTrue(
            AuditEvent::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('action', 'scribe.transcript_translated')
                ->exists()
        );
    }

    public function test_mandarin_session_drafts_in_english_without_waiting_for_translation(): void
    {
        $tenant = $this->clinic('drafttrans', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'zh',
            'note_output_language' => 'en',
            'status' => ScribeSession::STATUS_CONSENT_PENDING,
        ]);

        $this->giveConsent($practitioner, $tenant, $session->id)->assertOk();
        $session->update(['status' => ScribeSession::STATUS_TRANSCRIPT_READY]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 10000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 10000,
            'text' => '患者主诉右膝疼痛，持续三周。',
            'language' => 'zh',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        $session->update(['draft_status' => ScribeSession::DRAFT_GENERATING]);

        $drafterService = app(ScribeDraftService::class);
        $drafterService->generate($session->id, $practitioner->id);

        $session->refresh();
        $this->assertEquals(ScribeSession::DRAFT_READY, $session->draft_status);
        // Drafting must NOT run translation.
        $this->assertFalse($session->is_translated);

        // Drafting receives original transcript text and outputs note in English
        $this->assertNotEmpty($this->drafter->requests);
        $request = end($this->drafter->requests);
        $this->assertEquals('en', $request->outputLanguage);
        $this->assertEquals('English', $request->outputLanguageLabel);
        $this->assertEquals('患者主诉右膝疼痛，持续三周。', $request->transcript[0]['text']);
    }

    public function test_french_session_drafts_in_english_note(): void
    {
        $tenant = $this->clinic('frenchdraft', ['enabled' => true, 'enabled_languages' => ['en', 'fr']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'fr',
            'note_output_language' => 'en',
            'status' => ScribeSession::STATUS_CONSENT_PENDING,
        ]);

        $this->giveConsent($practitioner, $tenant, $session->id)->assertOk();
        $session->update(['status' => ScribeSession::STATUS_TRANSCRIPT_READY]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/french.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 10000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 10000,
            'text' => 'Le patient signale une douleur lombaire depuis deux semaines.',
            'language' => 'fr',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        $session->update(['draft_status' => ScribeSession::DRAFT_GENERATING]);

        $drafterService = app(ScribeDraftService::class);
        $drafterService->generate($session->id, $practitioner->id);

        $session->refresh();
        $this->assertEquals(ScribeSession::DRAFT_READY, $session->draft_status);

        $request = end($this->drafter->requests);
        $this->assertEquals('en', $request->outputLanguage);
        $this->assertEquals('English', $request->outputLanguageLabel);
        $this->assertEquals('Le patient signale une douleur lombaire depuis deux semaines.', $request->transcript[0]['text']);
    }

    public function test_translation_missing_ids_retried_once_then_marks_failed_without_fake_text(): void
    {
        config([
            'scribe.drafting.driver' => 'openrouter',
            'scribe.drafting.openrouter.api_key' => 'test-api-key',
        ]);

        $tenant = $this->clinic('transretry', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'zh',
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
        ]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 10000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        $seg1 = ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 5000,
            'text' => '第一段中文文本。',
            'language' => 'zh',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        $seg2 = ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 1,
            'start_ms' => 5000,
            'end_ms' => 10000,
            'text' => '第二段中文文本。',
            'language' => 'zh',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        // Mock OpenRouter Chat API:
        // Batch request returns only seg1 (omits seg2).
        // Retry request still returns empty segments array (still omits seg2).
        \Illuminate\Support\Facades\Http::fake([
            '*/chat/completions' => \Illuminate\Support\Facades\Http::sequence()
                ->push([
                    'choices' => [
                        [
                            'message' => [
                                'content' => json_encode([
                                    'segments' => [
                                        ['id' => $seg1->id, 'sequence' => 0, 'translated_text' => 'First segment in English.'],
                                    ],
                                ]),
                            ],
                        ],
                    ],
                ])
                ->push([
                    'choices' => [
                        [
                            'message' => [
                                'content' => json_encode(['segments' => []]),
                            ],
                        ],
                    ],
                ]),
        ]);

        $service = app(ScribeTranslationService::class);
        $service->translate($session);

        $seg1->refresh();
        $seg2->refresh();
        $session->refresh();

        // Seg 1 was translated
        $this->assertEquals('First segment in English.', $seg1->translated_text);
        $this->assertEquals(ScribeSession::TRANSLATION_COMPLETED, $seg1->translation_status);

        // Seg 2 was missing -> retried once -> marked failed with NULL translated_text (never fake text!)
        $this->assertNull($seg2->translated_text);
        $this->assertEquals(ScribeSession::TRANSLATION_FAILED, $seg2->translation_status);
        $this->assertStringNotContainsString('English translation:', (string) $seg2->translated_text);

        // Session reflects partial/failed translation
        $this->assertFalse($session->is_translated);
        $this->assertEquals(ScribeSession::TRANSLATION_FAILED, $session->translation_status);
    }

    public function test_translation_batch_splitting(): void
    {
        config([
            'scribe.drafting.driver' => 'openrouter',
            'scribe.drafting.openrouter.api_key' => 'test-api-key',
            'scribe.translation_batch_size' => 10,
        ]);

        $tenant = $this->clinic('transbatch', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'zh',
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
        ]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 150000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        $segments = [];
        for ($i = 0; $i < 15; $i++) {
            $segments[] = ScribeTranscriptSegment::create([
                'tenant_id' => $tenant->id,
                'scribe_session_id' => $session->id,
                'scribe_audio_chunk_id' => $chunk->id,
                'sequence' => $i,
                'start_ms' => $i * 10000,
                'end_ms' => ($i + 1) * 10000,
                'text' => "段落 {$i}",
                'language' => 'zh',
                'provider' => 'fake',
                'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
            ]);
        }

        \Illuminate\Support\Facades\Http::fake(function (\Illuminate\Http\Client\Request $req) {
            $body = json_decode($req->body(), true);
            $userContent = $body['messages'][1]['content'] ?? '';
            // Parse segment IDs from input JSON payload inside prompt
            $startPos = strpos($userContent, '[');
            $endPos = strrpos($userContent, ']');
            $translated = [];
            if ($startPos !== false && $endPos !== false) {
                $segments = json_decode(substr($userContent, $startPos, $endPos - $startPos + 1), true) ?? [];
                foreach ($segments as $item) {
                    $translated[] = [
                        'id' => $item['id'],
                        'sequence' => (int) $item['sequence'],
                        'translated_text' => "Translated paragraph {$item['sequence']}",
                    ];
                }
            }

            return \Illuminate\Support\Facades\Http::response([
                'choices' => [
                    ['message' => ['content' => json_encode(['segments' => $translated])]],
                ],
            ], 200);
        });

        $service = app(ScribeTranslationService::class);
        $service->translate($session);

        \Illuminate\Support\Facades\Http::assertSentCount(2);

        $session->refresh();
        $this->assertTrue($session->is_translated);
        $this->assertEquals(ScribeSession::TRANSLATION_COMPLETED, $session->translation_status);
        $this->assertEquals(15, ScribeTranscriptSegment::where('scribe_session_id', $session->id)->whereNotNull('translated_text')->count());
    }

    public function test_translation_truncated_or_invalid_json_handled_cleanly(): void
    {
        config([
            'scribe.drafting.driver' => 'openrouter',
            'scribe.drafting.openrouter.api_key' => 'test-api-key',
        ]);

        $tenant = $this->clinic('transinvalid', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'zh',
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
        ]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 10000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        $seg = ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 10000,
            'text' => '截断的中文文本。',
            'language' => 'zh',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        \Illuminate\Support\Facades\Http::fake([
            '*/chat/completions' => \Illuminate\Support\Facades\Http::response([
                'choices' => [
                    ['message' => ['content' => '{"segments": [{"id": "'.$seg->id.'", "text": "Trun']],
                ],
            ], 200),
        ]);

        $service = app(ScribeTranslationService::class);
        $service->translate($session);

        $seg->refresh();
        $session->refresh();

        $this->assertNull($seg->translated_text);
        $this->assertEquals(ScribeSession::TRANSLATION_FAILED, $seg->translation_status);
        $this->assertFalse($session->is_translated);
        $this->assertEquals(ScribeSession::TRANSLATION_FAILED, $session->translation_status);
    }

    public function test_registry_hidden_languages_not_shown_and_beta_badge_flag(): void
    {
        LanguageRegistry::clearCache();

        \App\Models\ScribeLanguage::create([
            'code' => 'de',
            'label' => 'German',
            'native_name' => 'Deutsch',
            'provider' => 'assemblyai',
            'provider_code' => 'de',
            'supports_transcription' => true,
            'supports_note_output' => false,
            'status' => \App\Models\ScribeLanguage::STATUS_HIDDEN,
            'sort_order' => 10,
        ]);

        \App\Models\ScribeLanguage::create([
            'code' => 'es',
            'label' => 'Spanish',
            'native_name' => 'Español',
            'provider' => 'assemblyai',
            'provider_code' => 'es',
            'supports_transcription' => true,
            'supports_note_output' => false,
            'status' => \App\Models\ScribeLanguage::STATUS_BETA,
            'sort_order' => 11,
        ]);

        LanguageRegistry::clearCache();

        $encounterLanguages = LanguageRegistry::forEncounter();

        // Hidden language 'de' must NOT be shown
        $this->assertNull($encounterLanguages->firstWhere('code', 'de'));

        // Beta language 'es' is shown and has is_beta flag
        $es = $encounterLanguages->firstWhere('code', 'es');
        $this->assertNotNull($es);
        $this->assertTrue($es->isBeta());
    }

    public function test_registry_admin_crud_permissions_enforced(): void
    {
        $tenant = $this->clinic('adminperm', ['enabled' => true]);
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$practitioner] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);

        // Non-platform-admin is forbidden
        $this->actingAs($owner)->get('/admin/scribe-languages')->assertForbidden();
        $this->actingAs($practitioner)->get('/admin/scribe-languages')->assertForbidden();

        // Platform admin can access
        $adminUser = User::factory()->create();
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $res = $this->actingAs($adminUser)->get('/admin/scribe-languages');
        $res->assertOk();

        // Admin can store a language
        $storeRes = $this->actingAs($adminUser)->post('/admin/scribe-languages', [
            'code' => 'ja',
            'label' => 'Japanese',
            'native_name' => '日本語',
            'provider' => 'assemblyai',
            'provider_code' => 'ja',
            'supports_transcription' => true,
            'supports_note_output' => false,
            'status' => 'beta',
            'sort_order' => 20,
        ]);
        $storeRes->assertRedirect();
        $this->assertDatabaseHas('scribe_languages', ['code' => 'ja', 'status' => 'beta']);
    }

    public function test_controller_returns_clean_errors_on_provider_failure(): void
    {
        $tenant = $this->clinic('cleanerrors', ['enabled' => true]);
        [$practitioner] = $this->staff($tenant);
        $client = $this->client($tenant);

        $res = $this->actingAs($practitioner)->postJson($this->url($tenant, '/sessions'), [
            'client_id' => $client->id,
            'language' => 'en',
        ])->assertCreated();

        $sessionId = $res->json('session.id');
        $session = ScribeSession::withoutGlobalScopes()->findOrFail($sessionId);

        // Trying to translate an English session returns a clean 422 JSON error, never a 500
        $transRes = $this->actingAs($practitioner)->postJson($this->url($tenant, "/sessions/{$sessionId}/translate"));
        $transRes->assertStatus(422);
        $this->assertEquals('translation_not_required', $transRes->json('code'));
        $this->assertArrayHasKey('message', $transRes->json());
        $this->assertArrayHasKey('session', $transRes->json());
    }

    public function test_handoff_records_language_and_translation_provenance(): void
    {
        $tenant = $this->clinic('handofflang', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        [$practitioner, $membership] = $this->staff($tenant);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'language' => 'zh',
            'is_translated' => true,
            'translated_at' => now(),
            'status' => ScribeSession::STATUS_CONSENT_PENDING,
        ]);

        $this->giveConsent($practitioner, $tenant, $session->id)->assertOk();
        $session->update([
            'status' => ScribeSession::STATUS_DRAFT_READY,
            'draft_status' => ScribeSession::DRAFT_READY,
            'draft_version' => 1,
        ]);

        $chunk = ScribeAudioChunk::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'sequence' => 0,
            'storage_path' => 'fake/path.webm',
            'mime_type' => 'audio/webm;codecs=opus',
            'byte_size' => 1024,
            'duration_ms' => 10000,
            'offset_ms' => 0,
            'status' => ScribeAudioChunk::STATUS_TRANSCRIBED,
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'scribe_audio_chunk_id' => $chunk->id,
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 10000,
            'text' => '患者主诉右膝疼痛。',
            'translated_text' => 'Patient complains of right knee pain.',
            'language' => 'zh',
            'provider' => 'fake',
            'source' => ScribeTranscriptSegment::SOURCE_AI_TRANSCRIPTION,
        ]);

        $res = $this->actingAs($practitioner)->postJson($this->url($tenant, "/sessions/{$session->id}/handoff"));
        $res->assertOk();

        $session->refresh();
        $this->assertEquals(ScribeSession::STATUS_HANDED_OFF, $session->status);
        $this->assertNotNull($session->clinical_note_id);

        $handoffFields = $session->handoff_fields;
        $this->assertEquals('zh', $handoffFields['language']);
        $this->assertEquals('Mandarin (Chinese)', $handoffFields['source_language_label']);
        $this->assertTrue($handoffFields['is_translated']);

        $note = ClinicalNote::withoutGlobalScopes()->findOrFail($session->clinical_note_id);
        $this->assertEquals(ClinicalNote::STATUS_DRAFT, $note->status); // Never auto-finalized!
    }

    public function test_tenant_isolation_for_multi_language_session(): void
    {
        $tenantA = $this->clinic('tenanta', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);
        $tenantB = $this->clinic('tenantb', ['enabled' => true, 'enabled_languages' => ['en', 'zh']]);

        [$practitionerA] = $this->staff($tenantA);
        [$practitionerB] = $this->staff($tenantB);
        $clientA = $this->client($tenantA);

        $res = $this->actingAs($practitionerA)->postJson($this->url($tenantA, '/sessions'), [
            'client_id' => $clientA->id,
            'language' => 'zh',
        ]);
        $sessionId = $res->json('session.id');

        // Practitioner B cannot access or update Tenant A's session
        $forbiddenRes = $this->actingAs($practitionerB)->patchJson($this->url($tenantB, "/sessions/{$sessionId}/language"), [
            'language' => 'en',
        ]);
        $forbiddenRes->assertStatus(404);
    }
}
