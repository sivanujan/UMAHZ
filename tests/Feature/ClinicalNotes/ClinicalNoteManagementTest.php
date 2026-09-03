<?php

namespace Tests\Feature\ClinicalNotes;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteAddendum;
use App\Models\ClinicalNoteTemplate;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Scopes\TenantScope;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ClinicalNoteManagementTest extends TestCase
{
    use DatabaseTransactions;

    private Tenant $tenant;
    private User $owner;
    private User $practitionerUser;
    private StaffMembership $practitionerMembership;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Healing Hands Wellness',
            'slug' => 'healinghands',
            'subdomain' => 'healinghands',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => 'clinic@healinghands.test',
            'offered_disciplines' => ['massage_therapy', 'acupuncture_tcm'],
        ]);

        app()->instance('current_tenant_id', $this->tenant->id);

        $this->owner = User::factory()->create(['email' => 'owner@healinghands.test', 'email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $this->practitionerUser = User::factory()->create([
            'name' => 'Jane Smith, RMT',
            'email' => 'jane@healinghands.test',
            'email_verified_at' => now(),
        ]);

        $this->practitionerMembership = StaffMembership::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->practitionerUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        PractitionerProfile::create([
            'tenant_id' => $this->tenant->id,
            'staff_membership_id' => $this->practitionerMembership->id,
            'profession' => 'massage_therapy',
            'credentials' => 'RMT #12345',
            'bio' => 'Registered Massage Therapist',
        ]);

        $this->client = Client::create([
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Alice',
            'last_name' => 'Walker',
            'email' => 'alice@client.test',
            'phone' => '555-0100',
        ]);
    }

    public function test_clinical_note_templates_defaults_are_seeded_for_offered_disciplines(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy', 'acupuncture_tcm']);

        $this->assertDatabaseHas('clinical_note_templates', [
            'tenant_id' => $this->tenant->id,
            'discipline' => 'massage_therapy',
            'name' => 'Massage Therapy Clinical SOAP Note',
            'version' => 1,
        ]);

        $this->assertDatabaseHas('clinical_note_templates', [
            'tenant_id' => $this->tenant->id,
            'discipline' => 'acupuncture_tcm',
            'name' => 'Acupuncture & TCM Clinical Encounter Record',
            'version' => 1,
        ]);
    }

    public function test_owner_can_update_template_schema_and_version_increments(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)
            ->where('discipline', 'massage_therapy')
            ->first();

        $response = $this->actingAs($this->owner)
            ->patch("http://healinghands.umahz.test/app/settings/clinical-note-templates/{$template->id}", [
                'name' => 'Custom Massage SOAP v2',
                'description' => 'Updated clinic SOAP standard',
                'schema' => [
                    'sections' => [
                        [
                            'id' => 'sec_custom',
                            'title' => 'Custom Assessment',
                            'fields' => [
                                ['id' => 'field_custom', 'label' => 'Custom Observation', 'type' => 'long_text'],
                            ],
                        ],
                    ],
                ],
                'is_active' => true,
            ]);

        $response->assertRedirect();
        $template->refresh();

        $this->assertSame(2, $template->version);
        $this->assertSame('Custom Massage SOAP v2', $template->name);
        $this->assertSame('Custom Assessment', $template->schema['sections'][0]['title']);
    }

    public function test_practitioner_can_create_draft_clinical_note_and_autosave(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)
            ->where('discipline', 'massage_therapy')
            ->first();

        // 1. Initial draft creation
        $createResponse = $this->actingAs($this->practitionerUser)
            ->postJson("http://healinghands.umahz.test/app/clients/{$this->client->id}/notes", [
                'clinical_note_template_id' => $template->id,
                'content' => [
                    'subjective_history' => 'Patient reports tension in upper trapezius for 3 days.',
                ],
            ]);

        $createResponse->assertStatus(200);
        $createResponse->assertJson(['success' => true]);
        $noteId = $createResponse->json('note_id');

        $this->assertDatabaseHas('clinical_notes', [
            'id' => $noteId,
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => ClinicalNote::STATUS_DRAFT,
            'discipline' => 'massage_therapy',
        ]);

        // 2. Autosave update
        $autosaveResponse = $this->actingAs($this->practitionerUser)
            ->patchJson("http://healinghands.umahz.test/app/notes/{$noteId}/autosave", [
                'content' => [
                    'subjective_history' => 'Patient reports tension in upper trapezius for 3 days.',
                    'objective_palpation' => 'Hypertonicity noted in bilateral levator scapulae.',
                ],
            ]);

        $autosaveResponse->assertStatus(200);
        $autosaveResponse->assertJson(['success' => true]);

        $note = ClinicalNote::find($noteId);
        $this->assertSame('Hypertonicity noted in bilateral levator scapulae.', $note->content['objective_palpation']);
        $this->assertSame(ClinicalNote::STATUS_DRAFT, $note->status);
    }

    public function test_practitioner_can_finalize_and_sign_clinical_note_locking_the_record(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)
            ->where('discipline', 'massage_therapy')
            ->first();

        $note = ClinicalNote::create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitionerMembership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'massage_therapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => [
                'subjective_history' => 'Patient treated for shoulder mobility.',
            ],
            'status' => ClinicalNote::STATUS_DRAFT,
        ]);

        $finalizeResponse = $this->actingAs($this->practitionerUser)
            ->post("http://healinghands.umahz.test/app/notes/{$note->id}/finalize", [
                'signer_name' => 'Jane Smith, RMT',
                'signer_credentials' => 'RMT #12345',
                'attestation_text' => 'I attest that the clinical documentation recorded above accurately reflects the encounter.',
                'content' => [
                    'subjective_history' => 'Patient treated for shoulder mobility.',
                    'plan_treatment' => 'Recommended follow-up in 2 weeks.',
                ],
            ]);

        $finalizeResponse->assertRedirect("http://healinghands.umahz.test/app/notes/{$note->id}");

        $note->refresh();
        $this->assertSame(ClinicalNote::STATUS_FINALIZED, $note->status);
        $this->assertTrue($note->isFinalized());
        $this->assertTrue($note->isImmutable());
        $this->assertSame('Jane Smith, RMT', $note->signer_name);
        $this->assertSame('RMT #12345', $note->signer_credentials);
        $this->assertNotNull($note->finalized_at);
        $this->assertNotNull($note->signed_at);
        $this->assertSame($this->practitionerUser->id, $note->finalized_by_user_id);
    }

    public function test_finalized_notes_are_immutable_and_reject_edits_or_deletions(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)->first();

        $note = ClinicalNote::create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitionerMembership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'massage_therapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective_history' => 'Final assessment'],
            'signer_name' => 'Jane Smith, RMT',
            'status' => ClinicalNote::STATUS_FINALIZED,
            'finalized_at' => now(),
            'signed_at' => now(),
        ]);

        // Attempting autosave edit on finalized note must be forbidden
        $editResponse = $this->actingAs($this->practitionerUser)
            ->patchJson("http://healinghands.umahz.test/app/notes/{$note->id}/autosave", [
                'content' => ['subjective_history' => 'Malicious alteration attempt'],
            ]);

        $editResponse->assertStatus(403);

        // Attempting delete on finalized note must be forbidden
        $deleteResponse = $this->actingAs($this->practitionerUser)
            ->delete("http://healinghands.umahz.test/app/notes/{$note->id}");

        $deleteResponse->assertStatus(403);

        // Content remains unchanged
        $note->refresh();
        $this->assertSame('Final assessment', $note->content['subjective_history']);
    }

    public function test_practitioner_can_append_signed_addenda_to_finalized_note(): void
    {
        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)->first();

        $note = ClinicalNote::create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitionerMembership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'massage_therapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective_history' => 'Original clinical note content'],
            'signer_name' => 'Jane Smith, RMT',
            'status' => ClinicalNote::STATUS_FINALIZED,
            'finalized_at' => now(),
            'signed_at' => now(),
        ]);

        $addendumResponse = $this->actingAs($this->practitionerUser)
            ->post("http://healinghands.umahz.test/app/notes/{$note->id}/addenda", [
                'reason' => 'Treatment clarification',
                'author_name' => 'Jane Smith, RMT',
                'content' => 'Patient confirmed no adverse reaction to deep tissue treatment on following morning.',
            ]);

        $addendumResponse->assertRedirect();

        $this->assertDatabaseHas('clinical_note_addenda', [
            'tenant_id' => $this->tenant->id,
            'clinical_note_id' => $note->id,
            'reason' => 'Treatment clarification',
            'author_name' => 'Jane Smith, RMT',
            'content' => 'Patient confirmed no adverse reaction to deep tissue treatment on following morning.',
        ]);

        $note->refresh();
        $this->assertSame(ClinicalNote::STATUS_ADDENDED, $note->status);
        $this->assertTrue($note->isAddended());
        // Original note content remains pristine
        $this->assertSame('Original clinical note content', $note->content['subjective_history']);
    }

    public function test_receptionist_cannot_view_phi_clinical_note_body(): void
    {
        $receptionistUser = User::factory()->create(['email' => 'frontdesk@healinghands.test', 'email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $receptionistUser->id,
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)->first();

        $note = ClinicalNote::create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitionerMembership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'massage_therapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective_history' => 'Highly confidential clinical data'],
            'signer_name' => 'Jane Smith, RMT',
            'status' => ClinicalNote::STATUS_FINALIZED,
            'finalized_at' => now(),
            'signed_at' => now(),
        ]);

        $response = $this->actingAs($receptionistUser)
            ->get("http://healinghands.umahz.test/app/notes/{$note->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('ClinicalNotes/Show')
            ->where('note.can_view_body', false)
            ->where('note.content', null)
            ->where('note.schema', null)
        );
    }

    public function test_cross_tenant_isolation_prevents_access_to_clinical_notes(): void
    {
        $otherTenant = Tenant::create([
            'name' => 'Other Clinic',
            'slug' => 'otherclinic',
            'subdomain' => 'otherclinic',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => 'other@clinic.test',
        ]);

        ClinicalNoteTemplate::ensureDefaultsForTenant($this->tenant->id, ['massage_therapy']);
        $template = ClinicalNoteTemplate::where('tenant_id', $this->tenant->id)->first();

        $noteInTenantA = ClinicalNote::create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'staff_membership_id' => $this->practitionerMembership->id,
            'clinical_note_template_id' => $template->id,
            'discipline' => 'massage_therapy',
            'template_name' => $template->name,
            'template_version' => $template->version,
            'schema_snapshot' => $template->schema,
            'content' => ['subjective_history' => 'Clinic A notes'],
            'status' => ClinicalNote::STATUS_DRAFT,
        ]);

        $otherDoctor = User::factory()->create(['email' => 'otherdoc@otherclinic.test', 'email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $otherTenant->id,
            'user_id' => $otherDoctor->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        // Attempting to access Tenant A note while in Tenant B session
        $response = $this->actingAs($otherDoctor)
            ->get("http://otherclinic.umahz.test/app/notes/{$noteInTenantA->id}");

        // Scoped by TenantScope returning 404 or 403
        $this->assertTrue(in_array($response->status(), [403, 404]));
    }
}
