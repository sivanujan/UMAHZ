<?php

namespace Tests\Feature\ClinicalNotes;

use App\Models\AssessmentTest;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\ClinicalNoteTestResult;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AssessmentTestLibraryTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $ownerA;
    private User $practitionerA;
    private StaffMembership $membershipA;
    private User $ownerB;
    private Client $clientA;

    protected function setUp(): void
    {
        parent::setUp();

        // Clinic A setup
        $this->tenantA = Tenant::create([
            'name' => 'Metro Physiotherapy',
            'slug' => 'metro-physio',
            'subdomain' => 'metro-physio',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => 'clinic@metrophysio.test',
            'offered_disciplines' => ['physiotherapy'],
        ]);

        $this->ownerA = User::factory()->create(['email' => 'owner@metrophysio.test', 'email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->ownerA->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $this->practitionerA = User::factory()->create(['email' => 'physio@metrophysio.test', 'email_verified_at' => now()]);
        $this->membershipA = StaffMembership::create([
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->practitionerA->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        PractitionerProfile::create([
            'tenant_id' => $this->tenantA->id,
            'staff_membership_id' => $this->membershipA->id,
            'profession' => 'physiotherapy',
            'credentials' => 'PT #98765',
        ]);

        $this->clientA = Client::create([
            'tenant_id' => $this->tenantA->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@client.test',
        ]);

        // Clinic B setup
        $this->tenantB = Tenant::create([
            'name' => 'Eastside Wellness',
            'slug' => 'eastside',
            'subdomain' => 'eastside',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => 'clinic@eastside.test',
            'offered_disciplines' => ['chiropractic'],
        ]);

        $this->ownerB = User::factory()->create(['email' => 'owner@eastside.test', 'email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $this->tenantB->id,
            'user_id' => $this->ownerB->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
    }

    private function createAdmin(): User
    {
        $hq = Tenant::create([
            'name' => 'Platform HQ',
            'slug' => 'hq',
            'subdomain' => 'hq',
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $user = User::factory()->create([
            'email' => 'admin@platform.test',
            'email_verified_at' => now(),
        ]);

        StaffMembership::create([
            'tenant_id' => $hq->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        return $user;
    }

    public function test_practitioners_see_only_reviewed_platform_tests_plus_own_clinic_tests(): void
    {
        // 1. Platform reviewed test
        $platformReviewed = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'shoulder',
            'name' => 'Hawkins-Kennedy Impingement Test',
            'aliases' => ['Hawkins Test'],
            'purpose' => 'Assesses subacromial impingement',
            'procedure' => 'Passive internal rotation at 90 deg flexion',
            'positive_finding' => 'Subacromial pain reproduction',
            'disciplines' => ['physio', 'chiro'],
            'status' => AssessmentTest::STATUS_REVIEWED,
        ]);

        // 2. Platform draft test (should be HIDDEN from practitioner)
        $platformDraft = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'knee',
            'name' => 'Lachman Draft Test',
            'purpose' => 'Assesses ACL integrity',
            'procedure' => 'Anterior drawer at 20-30 deg flexion',
            'positive_finding' => 'Soft end-feel',
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        // 3. Platform archived test (should be HIDDEN)
        $platformArchived = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'hip',
            'name' => 'Old Deprecated Hip Test',
            'purpose' => 'Deprecated',
            'procedure' => 'Deprecated',
            'positive_finding' => 'Deprecated',
            'status' => AssessmentTest::STATUS_ARCHIVED,
        ]);

        // 4. Clinic A custom test
        $clinicACustom = AssessmentTest::create([
            'tenant_id' => $this->tenantA->id,
            'body_region' => 'lumbar',
            'name' => 'Metro Lumbar Extension Screen',
            'purpose' => 'Assesses facet loading',
            'procedure' => 'Standing extension with lateral flexion',
            'positive_finding' => 'Local back pain',
            'status' => AssessmentTest::STATUS_REVIEWED,
        ]);

        // 5. Clinic B custom test (should be HIDDEN from clinic A)
        $clinicBCustom = AssessmentTest::create([
            'tenant_id' => $this->tenantB->id,
            'body_region' => 'cervical',
            'name' => 'Eastside Cervical Rotation Screen',
            'purpose' => 'Assesses cervical spine',
            'procedure' => 'Active rotation',
            'positive_finding' => 'Restricted ROM',
            'status' => AssessmentTest::STATUS_REVIEWED,
        ]);

        // Access via practitioner of Clinic A
        $response = $this->actingAs($this->practitionerA)
            ->getJson('http://metro-physio.umahz.test/app/tests/lookup');

        $response->assertStatus(200);
        $tests = collect($response->json());
        $testIds = $tests->pluck('id')->all();

        // Must see: Platform reviewed and Clinic A custom
        $this->assertContains($platformReviewed->id, $testIds);
        $this->assertContains($clinicACustom->id, $testIds);

        // Must NOT see: Platform draft, platform archived, clinic B custom
        $this->assertNotContains($platformDraft->id, $testIds);
        $this->assertNotContains($platformArchived->id, $testIds);
        $this->assertNotContains($clinicBCustom->id, $testIds);
    }

    public function test_platform_admin_can_view_all_tests_and_create_new_test(): void
    {
        $admin = $this->createAdmin();

        $draft = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'shoulder',
            'name' => 'Neer Impingement Sign',
            'purpose' => 'Assesses subacromial impingement',
            'procedure' => 'Full forward flexion with internal rotation',
            'positive_finding' => 'Pain at terminal flexion',
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        // Admin sees draft in admin view
        $response = $this->actingAs($admin)
            ->get('http://umahz.test/admin/tests');
        $response->assertStatus(200);

        // Admin creates new test
        $createResponse = $this->actingAs($admin)
            ->post('http://umahz.test/admin/tests', [
                'name' => 'Empty Can Test',
                'body_region' => 'shoulder',
                'aliases' => ['Jobe Test'],
                'purpose' => 'Assesses supraspinatus tendon pathology or tear',
                'procedure' => 'Elevate arm to 90 degrees in scapular plane with thumbs pointed down, resist downward pressure',
                'positive_finding' => 'Pain or weakness compared to contralateral side',
                'interpretation_notes' => 'High sensitivity for supraspinatus tears',
                'disciplines' => ['physio', 'chiro'],
                'status' => 'draft',
            ]);

        $createResponse->assertRedirect();
        $this->assertDatabaseHas('assessment_tests', [
            'name' => 'Empty Can Test',
            'tenant_id' => null,
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'assessment_test.created',
            'user_id' => $admin->id,
        ]);
    }

    public function test_platform_admin_can_mark_test_as_reviewed_and_archive(): void
    {
        $admin = $this->createAdmin();

        $test = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'knee',
            'name' => 'Lachman Test',
            'purpose' => 'Assesses anterior cruciate ligament integrity',
            'procedure' => 'Patient supine, knee in 20-30 deg flexion, translate tibia anteriorly',
            'positive_finding' => 'Increased anterior translation or lack of firm end-feel',
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        // Mark as reviewed
        $reviewResponse = $this->actingAs($admin)
            ->post("http://umahz.test/admin/tests/{$test->id}/review");

        $reviewResponse->assertRedirect();
        $test->refresh();

        $this->assertSame(AssessmentTest::STATUS_REVIEWED, $test->status);
        $this->assertSame($admin->id, $test->reviewed_by);
        $this->assertNotNull($test->reviewed_at);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'assessment_test.reviewed',
            'resource_id' => $test->id,
        ]);

        // Archive test
        $archiveResponse = $this->actingAs($admin)
            ->post("http://umahz.test/admin/tests/{$test->id}/archive");

        $archiveResponse->assertRedirect();
        $test->refresh();
        $this->assertSame(AssessmentTest::STATUS_ARCHIVED, $test->status);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'assessment_test.archived',
            'resource_id' => $test->id,
        ]);
    }

    public function test_platform_admin_csv_import_preview_and_import(): void
    {
        $admin = $this->createAdmin();

        $csvContent = <<<CSV
body_region,name,aliases,purpose,procedure,positive_finding,interpretation_notes,disciplines,references
shoulder,Neer Impingement Test,Neer Sign,Assesses subacromial impingement,Full passive flexion with scapula stabilized,Pain in anterior shoulder,Sensitivity 79%,physio;chiro,Neer CS 1983
knee,Anterior Drawer Test,,Assesses ACL laxity,Knee at 90 deg pull tibia anteriorly,Excessive anterior translation,Good specificity,physio,Marshall 1975
invalid_region,Broken Test,,Broken purpose,Broken procedure,Broken finding,,physio,
CSV;

        $file = UploadedFile::fake()->createWithContent('assessment_tests.csv', $csvContent);

        // 1. Preview
        $previewResponse = $this->actingAs($admin)
            ->postJson('http://umahz.test/admin/tests/import-preview', [
                'csv_file' => $file,
            ]);

        $previewResponse->assertStatus(200);
        $previewData = $previewResponse->json();

        $this->assertSame(3, $previewData['total_rows']);
        $this->assertSame(2, $previewData['valid_count']);
        $this->assertSame(1, $previewData['error_count']);
        $this->assertNotEmpty($previewData['errors']);

        // 2. Import
        $importResponse = $this->actingAs($admin)
            ->post('http://umahz.test/admin/tests/import', [
                'csv_file' => $file,
            ]);

        $importResponse->assertRedirect();

        // Imported rows are always draft and platform-scoped
        $this->assertDatabaseHas('assessment_tests', [
            'name' => 'Neer Impingement Test',
            'tenant_id' => null,
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        $this->assertDatabaseHas('assessment_tests', [
            'name' => 'Anterior Drawer Test',
            'tenant_id' => null,
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        $this->assertDatabaseMissing('assessment_tests', [
            'name' => 'Broken Test',
        ]);
    }

    public function test_platform_admin_csv_export(): void
    {
        $admin = $this->createAdmin();

        AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'shoulder',
            'name' => 'Yergason Test',
            'purpose' => 'Assesses biceps tendon pathology',
            'procedure' => 'Resisted supination with elbow flexed',
            'positive_finding' => 'Pain in bicipital groove',
            'status' => AssessmentTest::STATUS_REVIEWED,
        ]);

        $response = $this->actingAs($admin)
            ->get('http://umahz.test/admin/tests/export');

        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $content = $response->streamedContent();
        $this->assertStringContainsString('Yergason Test', $content);
        $this->assertStringContainsString('body_region', $content);
    }

    public function test_clinic_owner_and_practitioner_can_create_update_and_delete_own_test(): void
    {
        // 1. Create custom test as clinic owner
        $createResponse = $this->actingAs($this->ownerA)
            ->post('http://metro-physio.umahz.test/app/tests', [
                'name' => 'Modified Thomas Test',
                'body_region' => 'hip',
                'aliases' => ['Thomas Sign'],
                'purpose' => 'Assesses hip flexor tightness and rectus femoris contracture',
                'procedure' => 'Supine at plinth edge with one knee held to chest',
                'positive_finding' => 'Thigh fails to touch plinth or knee extends beyond 90 degrees',
                'disciplines' => ['physio'],
            ]);

        $createResponse->assertRedirect();

        $customTest = AssessmentTest::where('name', 'Modified Thomas Test')->first();
        $this->assertNotNull($customTest);
        $this->assertSame($this->tenantA->id, $customTest->tenant_id);

        // 2. Update custom test as practitioner
        $updateResponse = $this->actingAs($this->practitionerA)
            ->put("http://metro-physio.umahz.test/app/tests/{$customTest->id}", [
                'name' => 'Modified Thomas Test (Updated)',
                'body_region' => 'hip',
                'purpose' => 'Updated clinical purpose for psoas and rectus femoris evaluation',
                'procedure' => 'Updated steps',
                'positive_finding' => 'Updated findings',
                'disciplines' => ['physio'],
            ]);

        $updateResponse->assertRedirect();
        $customTest->refresh();
        $this->assertSame('Modified Thomas Test (Updated)', $customTest->name);

        // 3. Delete custom test
        $deleteResponse = $this->actingAs($this->practitionerA)
            ->delete("http://metro-physio.umahz.test/app/tests/{$customTest->id}");

        $deleteResponse->assertRedirect();
        $this->assertSoftDeleted('assessment_tests', ['id' => $customTest->id]);
    }

    public function test_tenant_isolation_cross_clinic_access_is_denied(): void
    {
        // Clinic A custom test
        $customTestA = AssessmentTest::create([
            'tenant_id' => $this->tenantA->id,
            'body_region' => 'cervical',
            'name' => 'Clinic A Exclusive Test',
            'purpose' => 'Private protocol',
            'procedure' => 'Private',
            'positive_finding' => 'Private',
            'status' => AssessmentTest::STATUS_REVIEWED,
        ]);

        // Clinic B owner attempts to update Clinic A test -> 404
        $updateResponse = $this->actingAs($this->ownerB)
            ->put("http://eastside.umahz.test/app/tests/{$customTestA->id}", [
                'name' => 'Malicious Overwrite',
                'body_region' => 'cervical',
                'purpose' => 'Hacked',
                'procedure' => 'Hacked',
                'positive_finding' => 'Hacked',
            ]);
        $updateResponse->assertStatus(404);

        // Clinic B owner attempts to delete Clinic A test -> 404
        $deleteResponse = $this->actingAs($this->ownerB)
            ->delete("http://eastside.umahz.test/app/tests/{$customTestA->id}");
        $deleteResponse->assertStatus(404);
    }

    public function test_clinical_note_saves_test_results_with_snapshots_and_supports_autosave(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenantA->id, ['physiotherapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenantA->id)->first();

        $assessmentTest = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'shoulder',
            'name' => 'Speed Test',
            'purpose' => 'Assesses bicipital tendinopathy',
            'procedure' => 'Resisted shoulder flexion with elbow extended and forearm supinated',
            'positive_finding' => 'Pain localized to bicipital groove',
            'status' => AssessmentTest::STATUS_REVIEWED,
        ]);

        // 1. Create note with test results
        $createResponse = $this->actingAs($this->practitionerA)
            ->postJson("http://metro-physio.umahz.test/app/clients/{$this->clientA->id}/notes", [
                'clinical_note_template_id' => $template->id,
                'content' => ['subjective_history' => 'Right shoulder anterior pain'],
                'test_results' => [
                    [
                        'assessment_test_id' => $assessmentTest->id,
                        'test_name' => $assessmentTest->name,
                        'body_region' => $assessmentTest->body_region,
                        'side' => 'right',
                        'result' => 'positive',
                        'pain_reproduced' => true,
                        'notes' => 'Concordant anterior shoulder pain reproduced at 60 deg flexion',
                    ],
                ],
            ]);

        $createResponse->assertStatus(200);
        $noteId = $createResponse->json('note_id');
        $this->assertNotNull($noteId);

        // Verify snapshot in database
        $this->assertDatabaseHas('clinical_note_test_results', [
            'clinical_note_id' => $noteId,
            'assessment_test_id' => $assessmentTest->id,
            'test_name_snapshot' => 'Speed Test',
            'body_region_snapshot' => 'shoulder',
            'side' => 'right',
            'result' => 'positive',
            'pain_reproduced' => true,
            'notes' => 'Concordant anterior shoulder pain reproduced at 60 deg flexion',
        ]);

        // 2. Modifying original library test name DOES NOT alter the snapshot
        $assessmentTest->update(['name' => 'Speed Test (Renamed By Admin)']);

        $note = ClinicalNote::with('testResults')->find($noteId);
        $firstResult = $note->testResults->first();
        $this->assertSame('Speed Test', $firstResult->test_name_snapshot);

        // 3. Autosave note with additional test
        $autosaveResponse = $this->actingAs($this->practitionerA)
            ->patchJson("http://metro-physio.umahz.test/app/notes/{$noteId}/autosave", [
                'content' => ['subjective_history' => 'Right shoulder anterior pain updated'],
                'test_results' => [
                    [
                        'id' => $firstResult->id,
                        'assessment_test_id' => $assessmentTest->id,
                        'side' => 'right',
                        'result' => 'positive',
                        'pain_reproduced' => true,
                        'notes' => 'Updated notes on Speed test',
                    ],
                    [
                        'test_name' => 'Yergason Test (Ad-hoc)',
                        'body_region' => 'shoulder',
                        'side' => 'bilateral',
                        'result' => 'negative',
                        'pain_reproduced' => false,
                        'notes' => 'No pain on resisted supination',
                    ],
                ],
            ]);

        $autosaveResponse->assertStatus(200);
        $this->assertCount(2, ClinicalNoteTestResult::where('clinical_note_id', $noteId)->get());
    }

    public function test_finalized_note_locks_test_results_and_rejects_modifications(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenantA->id, ['physiotherapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenantA->id)->first();

        $note = ClinicalNote::create([
            'tenant_id' => $this->tenantA->id,
            'client_id' => $this->clientA->id,
            'staff_membership_id' => $this->membershipA->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'physiotherapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective_history' => 'Initial exam'],
            'status' => ClinicalNote::STATUS_DRAFT,
        ]);

        // Finalize note with test results
        $finalizeResponse = $this->actingAs($this->practitionerA)
            ->post("http://metro-physio.umahz.test/app/notes/{$note->id}/finalize", [
                'signer_name' => 'Jane Smith, PT',
                'signer_credentials' => 'PT #98765',
                'attestation_text' => 'I attest that the clinical record accurately reflects encounter findings.',
                'content' => ['subjective_history' => 'Finalized content'],
                'test_results' => [
                    [
                        'test_name' => 'Empty Can Test',
                        'body_region' => 'shoulder',
                        'side' => 'right',
                        'result' => 'positive',
                        'pain_reproduced' => true,
                        'notes' => 'Marked pain on resistance',
                    ],
                ],
            ]);

        $finalizeResponse->assertRedirect();
        $note->refresh();
        $this->assertSame(ClinicalNote::STATUS_FINALIZED, $note->status);
        $this->assertTrue($note->isImmutable());

        // Attempting to autosave or alter test results on signed note yields 403 Forbidden
        $tamperResponse = $this->actingAs($this->practitionerA)
            ->patchJson("http://metro-physio.umahz.test/app/notes/{$note->id}/autosave", [
                'content' => ['subjective_history' => 'Tampered content'],
                'test_results' => [],
            ]);

        $tamperResponse->assertStatus(403);
    }

    public function test_admin_csv_template_download_contains_header_and_single_placeholder_row(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)
            ->get('http://umahz.test/admin/tests/template');

        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));

        $content = $response->streamedContent();
        $lines = array_filter(explode("\n", trim($content)));

        $this->assertCount(2, $lines);
        $this->assertStringContainsString('body_region,name,aliases,purpose,procedure,positive_finding,interpretation_notes,disciplines,references', $lines[0]);
        $this->assertStringContainsString('Example test - replace me', $lines[1]);

        // Clinical sensitivity/specificity numbers or research citations must NOT be present
        $this->assertStringNotContainsString('sensitivity', strtolower($content));
        $this->assertStringNotContainsString('specificity', strtolower($content));
        $this->assertStringNotContainsString('0.', $content);
    }

    public function test_platform_admin_can_review_test_with_reviewer_display_and_credential(): void
    {
        $admin = $this->createAdmin();

        $test = AssessmentTest::create([
            'tenant_id' => null,
            'body_region' => 'shoulder',
            'name' => 'Pending Review Shoulder Test',
            'purpose' => 'Clinical test purpose',
            'procedure' => 'Step 1, step 2',
            'positive_finding' => 'Concordant pain',
            'status' => AssessmentTest::STATUS_DRAFT,
        ]);

        $response = $this->actingAs($admin)
            ->post("http://umahz.test/admin/tests/{$test->id}/review", [
                'reviewer_name' => 'Zainab Qureshi',
                'reviewer_credential' => 'RMT',
            ]);

        $response->assertRedirect();
        $test->refresh();

        $this->assertSame(AssessmentTest::STATUS_REVIEWED, $test->status);
        $this->assertSame($admin->id, $test->reviewed_by);
        $this->assertNotNull($test->reviewed_at);
        $this->assertSame('Zainab Qureshi', $test->reviewer_name);
        $this->assertSame('RMT', $test->reviewer_credential);
        $this->assertSame('Zainab Qureshi, RMT', $test->reviewer_display);
    }

    public function test_finalized_note_can_append_test_results_via_addendum_without_altering_original_results(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenantA->id, ['physiotherapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenantA->id)->first();

        // Finalized note with 1 initial test
        $note = ClinicalNote::create([
            'tenant_id' => $this->tenantA->id,
            'client_id' => $this->clientA->id,
            'staff_membership_id' => $this->membershipA->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'physiotherapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective_history' => 'Initial exam finalized'],
            'status' => ClinicalNote::STATUS_FINALIZED,
            'finalized_at' => now(),
            'signed_at' => now(),
            'signer_name' => 'Jane Smith, PT',
        ]);

        $originalTest = ClinicalNoteTestResult::create([
            'tenant_id' => $this->tenantA->id,
            'clinical_note_id' => $note->id,
            'addendum_id' => null,
            'test_name_snapshot' => 'Empty Can Test',
            'body_region_snapshot' => 'shoulder',
            'side' => 'right',
            'result' => 'positive',
            'pain_reproduced' => true,
            'notes' => 'Original test result documented before signing',
            'recorded_by' => $this->practitionerA->id,
        ]);

        // Submit Addendum with additional test
        $addendumResponse = $this->actingAs($this->practitionerA)
            ->post("http://metro-physio.umahz.test/app/notes/{$note->id}/addenda", [
                'reason' => 'Late entry',
                'author_name' => 'Jane Smith, PT',
                'content' => 'Documenting follow-up test performed at the end of session.',
                'test_results' => [
                    [
                        'test_name_snapshot' => 'Neer Impingement Test',
                        'body_region_snapshot' => 'shoulder',
                        'side' => 'right',
                        'result' => 'positive',
                        'pain_reproduced' => true,
                        'notes' => 'Additional test appended via addendum',
                    ],
                ],
            ]);

        $addendumResponse->assertRedirect();

        // Verify database state: 2 test results total
        $allResults = ClinicalNoteTestResult::where('clinical_note_id', $note->id)->get();
        $this->assertCount(2, $allResults);

        // Original result is untouched
        $originalReloaded = ClinicalNoteTestResult::find($originalTest->id);
        $this->assertNull($originalReloaded->addendum_id);
        $this->assertSame('Original test result documented before signing', $originalReloaded->notes);

        // Addended result is tagged with addendum_id
        $addendedResult = $allResults->firstWhere('test_name_snapshot', 'Neer Impingement Test');
        $this->assertNotNull($addendedResult);
        $this->assertNotNull($addendedResult->addendum_id);

        // View note and check payload structure
        $showResponse = $this->actingAs($this->practitionerA)
            ->get("http://metro-physio.umahz.test/app/notes/{$note->id}");

        $showResponse->assertStatus(200);
        $pageProps = $showResponse->viewData('page')['props'];

        // Root testResults contains only original (where addendum_id is null)
        $this->assertCount(1, $pageProps['testResults']);
        $this->assertSame('Empty Can Test', $pageProps['testResults'][0]['test_name_snapshot']);

        // Addenda list contains the addended test result
        $this->assertCount(1, $pageProps['note']['addenda']);
        $this->assertCount(1, $pageProps['note']['addenda'][0]['test_results']);
        $this->assertSame('Neer Impingement Test', $pageProps['note']['addenda'][0]['test_results'][0]['test_name_snapshot']);
    }

    public function test_empty_state_when_no_tests_exist_in_library(): void
    {
        $response = $this->actingAs($this->practitionerA)
            ->get('http://metro-physio.umahz.test/app/tests');

        $response->assertStatus(200);
        $pageProps = $response->viewData('page')['props'];

        $this->assertCount(0, $pageProps['tests']['data']);

        $lookupResponse = $this->actingAs($this->practitionerA)
            ->getJson('http://metro-physio.umahz.test/app/tests/lookup');

        $lookupResponse->assertStatus(200);
        $this->assertCount(0, $lookupResponse->json());
    }
}
