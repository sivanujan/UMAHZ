<?php

namespace Tests\Feature\Scribe;

use App\Models\AuditEvent;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\ScribeDraftItem;
use App\Models\ScribeDraftVersion;
use App\Models\ScribeSession;
use App\Models\ScribeTranscriptSegment;
use App\Models\StaffMembership;

class ScribeSessionHistoryTest extends ScribeTestCase
{
    protected function getTemplate($tenant, string $discipline = 'acupuncture'): ClinicalNoteTemplate
    {
        $existing = ClinicalNoteTemplate::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        return ClinicalNoteTemplate::create([
            'tenant_id' => $tenant->id,
            'discipline' => $discipline,
            'name' => 'Initial Assessment',
            'version' => 1,
            'is_active' => true,
            'schema' => [
                'sections' => [
                    [
                        'id' => 'subjective',
                        'title' => 'Subjective',
                        'fields' => [
                            ['id' => 'chief_complaint', 'type' => 'text', 'label' => 'Chief Complaint'],
                        ],
                    ],
                ],
            ],
        ]);
    }

    protected function templateSnapshot(ClinicalNoteTemplate $template): array
    {
        return [
            'name' => $template->name,
            'version' => $template->version,
            'discipline' => $template->discipline,
            'schema' => $template->schema,
        ];
    }

    /**
     * Requirement 1 & 6:
     * Client session list returns only this tenant's sessions, newest first.
     */
    public function test_client_session_list_returns_only_this_tenants_sessions_newest_first(): void
    {
        $tenantA = $this->clinic('clinica');
        [$userA, $membershipA] = $this->staff($tenantA, StaffMembership::ROLE_PRACTITIONER);
        $clientA = $this->client($tenantA);

        $tenantB = $this->clinic('clinicb');
        [$userB, $membershipB] = $this->staff($tenantB, StaffMembership::ROLE_PRACTITIONER);
        $clientB = $this->client($tenantB);

        // Session 1 on Clinic A (older)
        $session1 = ScribeSession::create([
            'tenant_id' => $tenantA->id,
            'client_id' => $clientA->id,
            'staff_membership_id' => $membershipA->id,
            'status' => ScribeSession::STATUS_HANDED_OFF,
            'language' => 'zh',
            'note_output_language' => 'en',
        ]);
        $session1->forceFill([
            'created_at' => now()->subHours(5),
            'updated_at' => now()->subHours(5),
        ])->save();

        // Session 2 on Clinic A (newer)
        $session2 = ScribeSession::create([
            'tenant_id' => $tenantA->id,
            'client_id' => $clientA->id,
            'staff_membership_id' => $membershipA->id,
            'status' => ScribeSession::STATUS_DRAFT_READY,
            'language' => 'en',
            'note_output_language' => 'en',
        ]);
        $session2->forceFill([
            'created_at' => now()->subHours(1),
            'updated_at' => now()->subHours(1),
        ])->save();

        // Session on Clinic B (should not appear)
        ScribeSession::create([
            'tenant_id' => $tenantB->id,
            'client_id' => $clientB->id,
            'staff_membership_id' => $membershipB->id,
            'status' => ScribeSession::STATUS_HANDED_OFF,
            'language' => 'zh',
            'note_output_language' => 'en',
        ]);

        // Query sessions for client A
        $response = $this->actingAs($userA)->getJson("http://{$tenantA->subdomain}.umahz.test/app/clients/{$clientA->id}/sessions");

        $response->assertOk();
        $sessions = $response->json('sessions');

        $this->assertCount(2, $sessions);
        $this->assertEquals($session2->id, $sessions[0]['id'], 'Newest session should appear first');
        $this->assertEquals($session1->id, $sessions[1]['id'], 'Older session should appear second');

        // Cross-tenant access: user B querying client A should 404
        $crossTenant = $this->actingAs($userB)->getJson("http://{$tenantB->subdomain}.umahz.test/app/clients/{$clientA->id}/sessions");
        $crossTenant->assertNotFound();
    }

    /**
     * Requirement 2:
     * Read-only view returns both original text and translated_text per segment.
     * Never drops the original text.
     */
    public function test_read_only_view_returns_both_original_text_and_translated_text_per_segment(): void
    {
        $tenant = $this->clinic('clinica');
        [$user, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_DRAFT_READY,
            'language' => 'zh',
            'note_output_language' => 'en',
            'translation_status' => 'completed',
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'provider' => 'assemblyai',
            'sequence' => 0,
            'start_ms' => 0,
            'end_ms' => 3200,
            'text' => '患者有头痛和脖子僵硬。',
            'translated_text' => 'Patient presents with headache and neck stiffness.',
            'translation_status' => 'completed',
        ]);

        ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'provider' => 'assemblyai',
            'sequence' => 1,
            'start_ms' => 3200,
            'end_ms' => 6400,
            'text' => '脉搏沉细，舌苔薄白。',
            'translated_text' => 'Pulse is deep and thin, tongue coating is thin and white.',
            'translation_status' => 'completed',
        ]);

        $response = $this->actingAs($user)->getJson($this->url($tenant, "/sessions/{$session->id}"));

        $response->assertOk();
        $segments = $response->json('session.segments');
        $this->assertCount(2, $segments);

        $this->assertEquals('患者有头痛和脖子僵硬。', $segments[0]['text']);
        $this->assertEquals('Patient presents with headache and neck stiffness.', $segments[0]['translated_text']);

        $this->assertEquals('脉搏沉细，舌苔薄白。', $segments[1]['text']);
        $this->assertEquals('Pulse is deep and thin, tongue coating is thin and white.', $segments[1]['translated_text']);
    }

    /**
     * Requirement 3:
     * Clinical note created from Scribe exposes a link to its session; another tenant gets 404.
     */
    public function test_clinical_note_created_from_scribe_exposes_link_to_its_session_and_cross_tenant_gets_404(): void
    {
        $tenantA = $this->clinic('clinica');
        [$userA, $membershipA] = $this->staff($tenantA, StaffMembership::ROLE_PRACTITIONER);
        $clientA = $this->client($tenantA);

        $tenantB = $this->clinic('clinicb');
        [$userB, $membershipB] = $this->staff($tenantB, StaffMembership::ROLE_PRACTITIONER);

        $template = ClinicalNoteTemplate::create([
            'tenant_id' => $tenantA->id,
            'discipline' => 'physiotherapy',
            'name' => 'SOAP Standard',
            'version' => 1,
            'is_published' => true,
            'schema' => [
                'sections' => [
                    [
                        'id' => 'subjective',
                        'title' => 'Subjective',
                        'fields' => [
                            ['id' => 'chief_complaint', 'label' => 'Chief Complaint', 'type' => 'textarea'],
                        ],
                    ],
                ],
            ],
        ]);

        $session = ScribeSession::create([
            'tenant_id' => $tenantA->id,
            'client_id' => $clientA->id,
            'staff_membership_id' => $membershipA->id,
            'status' => ScribeSession::STATUS_DRAFT_READY,
            'language' => 'en',
            'draft_version' => 1,
            'clinical_note_template_id' => $template->id,
            'draft_template_snapshot' => $this->templateSnapshot($template),
        ]);

        // Add draft item
        ScribeDraftItem::create([
            'tenant_id' => $tenantA->id,
            'scribe_session_id' => $session->id,
            'draft_version' => 1,
            'section_key' => 'chief_complaint',
            'content' => 'Patient has lower back pain after lifting weights.',
            'provenance' => 'client_stated',
        ]);

        ScribeDraftVersion::create([
            'tenant_id' => $tenantA->id,
            'scribe_session_id' => $session->id,
            'version' => 1,
            'clinical_note_template_id' => $template->id,
            'template_name' => $template->name,
            'template_snapshot' => $this->templateSnapshot($template),
            'draft_status' => 'ready',
        ]);

        // Perform handoff
        $handoffResponse = $this->actingAs($userA)->postJson($this->url($tenantA, "/sessions/{$session->id}/handoff"), [
            'clinical_note_template_id' => $template->id,
            'version' => 1,
        ]);

        $handoffResponse->assertOk();
        $noteId = $handoffResponse->json('clinical_note_id');
        $this->assertNotNull($noteId);

        // Check note stores scribe_session_id
        $note = ClinicalNote::withoutGlobalScopes()->findOrFail($noteId);
        $this->assertEquals($session->id, $note->scribe_session_id);

        // View note as tenant A practitioner: exposes scribe session link & handoff
        $noteResponse = $this->actingAs($userA)->getJson("http://{$tenantA->subdomain}.umahz.test/app/notes/{$note->id}");
        $noteResponse->assertOk();
        $this->assertEquals($session->id, $noteResponse->json('note.scribe_session_id'));
        $this->assertStringContainsString($session->id, $noteResponse->json('note.scribe_session_url'));
        $this->assertEquals($session->id, $noteResponse->json('scribeHandoff.session_id'));

        // Cross-tenant access: user B gets 404
        $crossTenantNote = $this->actingAs($userB)->getJson("http://{$tenantB->subdomain}.umahz.test/app/notes/{$note->id}");
        $crossTenantNote->assertNotFound();

        $crossTenantSession = $this->actingAs($userB)->getJson("http://{$tenantB->subdomain}.umahz.test/app/scribe/sessions/{$session->id}");
        $crossTenantSession->assertNotFound();
    }

    /**
     * Requirement 4:
     * All draft versions returned; latest marked; handoff from an older version works.
     */
    public function test_all_draft_versions_returned_and_latest_marked_and_handoff_from_older_version_works(): void
    {
        $tenant = $this->clinic('clinica');
        [$user, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);

        $template = ClinicalNoteTemplate::create([
            'tenant_id' => $tenant->id,
            'discipline' => 'physiotherapy',
            'name' => 'SOAP Standard',
            'version' => 1,
            'is_published' => true,
            'schema' => [
                'sections' => [
                    [
                        'id' => 'subjective',
                        'title' => 'Subjective',
                        'fields' => [
                            ['id' => 'chief_complaint', 'label' => 'Chief Complaint', 'type' => 'textarea'],
                        ],
                    ],
                ],
            ],
        ]);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_DRAFT_READY,
            'language' => 'en',
            'draft_version' => 2,
            'clinical_note_template_id' => $template->id,
            'draft_template_snapshot' => $this->templateSnapshot($template),
        ]);

        // Version 1 items
        ScribeDraftItem::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'draft_version' => 1,
            'section_key' => 'chief_complaint',
            'content' => 'Version 1: Mild lower back soreness.',
            'provenance' => 'client_stated',
        ]);
        ScribeDraftVersion::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'version' => 1,
            'clinical_note_template_id' => $template->id,
            'template_name' => $template->name,
            'template_snapshot' => $this->templateSnapshot($template),
            'draft_status' => 'ready',
        ]);

        // Version 2 items
        ScribeDraftItem::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'draft_version' => 2,
            'section_key' => 'chief_complaint',
            'content' => 'Version 2: Severe lower back spasm radiating to left glute.',
            'provenance' => 'client_stated',
        ]);
        ScribeDraftVersion::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'version' => 2,
            'clinical_note_template_id' => $template->id,
            'template_name' => $template->name,
            'template_snapshot' => $this->templateSnapshot($template),
            'draft_status' => 'ready',
        ]);

        // Check draft payload returns both versions
        $sessionResponse = $this->actingAs($user)->getJson($this->url($tenant, "/sessions/{$session->id}"));
        $sessionResponse->assertOk();

        $versions = $sessionResponse->json('session.draft.versions');
        $this->assertCount(2, $versions);

        $v1 = collect($versions)->firstWhere('version', 1);
        $v2 = collect($versions)->firstWhere('version', 2);

        $this->assertNotNull($v1);
        $this->assertNotNull($v2);
        $this->assertFalse($v1['is_latest']);
        $this->assertTrue($v2['is_latest']);

        // Handoff specifically requesting Version 1
        $handoffResponse = $this->actingAs($user)->postJson($this->url($tenant, "/sessions/{$session->id}/handoff"), [
            'clinical_note_template_id' => $template->id,
            'version' => 1,
        ]);

        $handoffResponse->assertOk();
        $noteId = $handoffResponse->json('clinical_note_id');
        $note = ClinicalNote::withoutGlobalScopes()->findOrFail($noteId);

        // Content must come from Version 1, not Version 2
        $this->assertStringContainsString('Version 1: Mild lower back soreness.', $note->content['chief_complaint']);
    }

    /**
     * Requirement 4 & 5:
     * Discard marks the version, writes audit, does not delete rows.
     */
    public function test_discard_marks_the_version_writes_audit_and_does_not_delete_rows(): void
    {
        $tenant = $this->clinic('clinica');
        [$user, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_DRAFT_READY,
            'language' => 'en',
            'draft_version' => 1,
        ]);

        $item = ScribeDraftItem::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'draft_version' => 1,
            'section_key' => 'subjective',
            'content' => 'Some draft content to discard.',
            'provenance' => 'ai_generated',
        ]);

        $versionRow = ScribeDraftVersion::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'version' => 1,
            'status' => 'ready',
        ]);

        $initialCount = ScribeDraftItem::withoutGlobalScopes()->where('scribe_session_id', $session->id)->count();

        // Call discard
        $discardResponse = $this->actingAs($user)->postJson($this->url($tenant, "/sessions/{$session->id}/discard-draft"), [
            'version' => 1,
        ]);

        $discardResponse->assertOk();

        // 1. Verify rows were NOT deleted
        $currentCount = ScribeDraftItem::withoutGlobalScopes()->where('scribe_session_id', $session->id)->count();
        $this->assertEquals($initialCount, $currentCount, 'Draft items must not be hard-deleted on discard');

        // 2. Verify version record is marked discarded
        $versionRow->refresh();
        $this->assertNotNull($versionRow->discarded_at);
        $this->assertEquals($user->id, $versionRow->discarded_by);

        $item->refresh();
        $this->assertNotNull($item->discarded_at);
        $this->assertEquals($user->id, $item->discarded_by);

        // 3. Verify audit log was created
        $audit = AuditEvent::where('tenant_id', $tenant->id)
            ->where('action', 'scribe.draft_discarded')
            ->where('user_id', $user->id)
            ->latest()
            ->first();

        $this->assertNotNull($audit, 'An audit entry must be logged for draft discard');
        $this->assertEquals($session->id, $audit->resource_id);

        // 4. Verify attempting to handoff a discarded version fails
        $handoffResponse = $this->actingAs($user)->postJson($this->url($tenant, "/sessions/{$session->id}/handoff"), [
            'version' => 1,
        ]);
        $handoffResponse->assertStatus(409);
    }

    /**
     * Requirement 5 & 6:
     * Viewing a past session writes an audit entry (scribe.session.viewed).
     */
    public function test_viewing_past_session_writes_audit_entry(): void
    {
        $tenant = $this->clinic('clinica');
        [$user, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_HANDED_OFF,
            'language' => 'zh',
            'draft_version' => 1,
        ]);

        // Viewing the session via GET /sessions/{id}
        $response = $this->actingAs($user)->getJson($this->url($tenant, "/sessions/{$session->id}"));
        $response->assertOk();

        $audit = AuditEvent::where('tenant_id', $tenant->id)
            ->where('action', 'scribe.session.viewed')
            ->where('user_id', $user->id)
            ->where('resource_id', $session->id)
            ->first();

        $this->assertNotNull($audit, 'Viewing a past scribe session must create a scribe.session.viewed audit entry');
    }

    /**
     * Privacy & Consent:
     * If consent was withdrawn, the session transcript is excluded from history listing.
     */
    public function test_session_with_withdrawn_consent_is_excluded_from_history_listing(): void
    {
        $tenant = $this->clinic('clinica');
        [$user, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);

        // Active session
        $activeSession = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_HANDED_OFF,
            'language' => 'en',
        ]);

        // Withdrawn consent session
        ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_CONSENT_WITHDRAWN,
            'language' => 'en',
        ]);

        $response = $this->actingAs($user)->getJson("http://{$tenant->subdomain}.umahz.test/app/clients/{$client->id}/sessions");
        $response->assertOk();

        $sessions = $response->json('sessions');
        $this->assertCount(1, $sessions);
        $this->assertEquals($activeSession->id, $sessions[0]['id']);
    }

    /**
     * Access control:
     * Receptionist is forbidden from accessing Scribe history.
     */
    public function test_receptionist_cannot_access_scribe_sessions(): void
    {
        $tenant = $this->clinic('clinica');
        [$receptionist, $membership] = $this->staff($tenant, StaffMembership::ROLE_RECEPTIONIST);
        $client = $this->client($tenant);

        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'status' => ScribeSession::STATUS_HANDED_OFF,
            'language' => 'en',
        ]);

        $response = $this->actingAs($receptionist)->getJson("http://{$tenant->subdomain}.umahz.test/app/clients/{$client->id}/sessions");
        $response->assertForbidden();

        $responseSession = $this->actingAs($receptionist)->getJson($this->url($tenant, "/sessions/{$session->id}"));
        $responseSession->assertForbidden();
    }

    /**
     * Requirement:
     * Backfill existing data in migration and ensure safe to run twice (idempotency).
     */
    public function test_migration_backfills_old_style_draft_items_and_note_link_and_is_safe_to_run_twice(): void
    {
        $tenant = $this->clinic('clinica');
        [$practitioner, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);
        $template = $this->getTemplate($tenant, 'acupuncture');

        // Note created before scribe_session_id column was populated
        $note = ClinicalNote::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'acupuncture',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective' => 'Old note text'],
            'status' => ClinicalNote::STATUS_DRAFT,
            'scribe_session_id' => null,
        ]);

        // Session handed off before scribe_draft_versions table existed
        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'clinical_note_template_id' => $template->id,
            'status' => ScribeSession::STATUS_HANDED_OFF,
            'language' => 'en',
            'draft_version' => 1,
            'draft_template_snapshot' => $this->templateSnapshot($template),
            'draft_generated_at' => now()->subHours(2),
            'clinical_note_id' => $note->id,
            'handed_off_at' => now()->subHour(),
        ]);

        // Seed old style draft items without version rows
        ScribeDraftItem::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'draft_version' => 1,
            'section_key' => 'subjective',
            'content' => 'Neck pain',
            'provenance' => ScribeDraftItem::PROVENANCE_CLIENT_REPORTED,
        ]);

        // Delete any draft version row that might have been automatically created
        ScribeDraftVersion::where('scribe_session_id', $session->id)->delete();
        $this->assertEquals(0, ScribeDraftVersion::where('scribe_session_id', $session->id)->count());

        // Run the migration's up() method (first run)
        $migration = require database_path('migrations/2026_11_08_100001_create_scribe_draft_versions_and_add_history_fields.php');
        $migration->up();

        // Check that scribe_draft_versions has been created
        $versionRow = ScribeDraftVersion::where('scribe_session_id', $session->id)->where('version', 1)->first();
        $this->assertNotNull($versionRow);
        $this->assertEquals(1, $versionRow->version);
        $this->assertEquals($template->id, $versionRow->clinical_note_template_id);

        // Check that clinical note was backfilled
        $note->refresh();
        $this->assertEquals($session->id, $note->scribe_session_id);

        // Run the migration's up() method a SECOND time to prove idempotency
        $migration->up();

        // Ensure no duplicate rows or errors
        $this->assertEquals(1, ScribeDraftVersion::where('scribe_session_id', $session->id)->where('version', 1)->count());

        // Verify the note endpoint exposes the session link
        $noteResponse = $this->actingAs($practitioner)->get("http://{$tenant->subdomain}.umahz.test/app/notes/{$note->id}/edit");
        $noteResponse->assertOk();
    }

    /**
     * Requirement:
     * Withdrawn consent: if a note links to a session whose consent was withdrawn,
     * the "View original conversation" action returns a clear message instead of an error.
     */
    public function test_withdrawn_consent_session_linked_to_note_shows_clear_message_without_error(): void
    {
        $tenant = $this->clinic('clinica');
        [$practitioner, $membership] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);
        $template = $this->getTemplate($tenant, 'acupuncture');

        // Session whose consent was withdrawn
        $session = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'clinical_note_template_id' => $template->id,
            'status' => ScribeSession::STATUS_CONSENT_WITHDRAWN,
            'language' => 'zh',
            'consent_withdrawn_at' => now()->subHour(),
        ]);

        // Add dummy segment that should be hidden
        ScribeTranscriptSegment::create([
            'tenant_id' => $tenant->id,
            'scribe_session_id' => $session->id,
            'provider' => 'mock',
            'sequence' => 1,
            'start_ms' => 0,
            'end_ms' => 3000,
            'text' => 'Private patient speech',
            'language' => 'zh',
        ]);

        // Note linked to this session
        $note = ClinicalNote::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'acupuncture',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective' => 'Existing content'],
            'status' => ClinicalNote::STATUS_DRAFT,
            'scribe_session_id' => $session->id,
        ]);

        // 1. Fetching session details returns 200 with withdrawn consent message and empty segments
        $sessionResponse = $this->actingAs($practitioner)->getJson($this->url($tenant, "/sessions/{$session->id}"));
        $sessionResponse->assertOk();
        $sessionData = $sessionResponse->json('session');

        $this->assertTrue($sessionData['is_consent_withdrawn']);
        $this->assertEquals('Transcript hidden because the client withdrew consent', $sessionData['consent_withdrawn_message']);
        $this->assertEmpty($sessionData['segments'], 'Withdrawn consent must not leak transcript segments');

        // 2. Fetching note editor returns 200 with clear consent withdrawn flag and message
        $noteResponse = $this->actingAs($practitioner)->get("http://{$tenant->subdomain}.umahz.test/app/notes/{$note->id}/edit");
        $noteResponse->assertOk();
        $handoff = $noteResponse->viewData('page')['props']['scribeHandoff'] ?? [];

        $this->assertTrue($handoff['is_consent_withdrawn']);
        $this->assertEquals('Transcript hidden because the client withdrew consent', $handoff['consent_withdrawn_message']);
    }
}
