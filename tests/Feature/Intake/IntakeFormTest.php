<?php

namespace Tests\Feature\Intake;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClientIntake;
use App\Models\IntakeFormTemplate;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ClientIntakeLinkNotification;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class IntakeFormTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub).' Integrative Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}.com",
            'requested_disciplines' => [
                IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
                IntakeFormTemplate::DISCIPLINE_ACUPUNCTURE_TCM,
            ],
            'business_hours' => collect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
                ->mapWithKeys(fn ($d) => [$d => ['closed' => false, 'open' => '08:00', 'close' => '18:00']])->all(),
        ]);
    }

    private function staff(Tenant $tenant, string $role = StaffMembership::ROLE_CLINIC_OWNER): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$user, $membership];
    }

    private function client(Tenant $tenant): Client
    {
        return Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Sarah',
            'last_name' => 'Connor',
            'email' => 'sarah@example.com',
            'phone' => '416-555-0199',
            'active' => true,
        ]);
    }

    public function test_starter_templates_are_seeded_with_regulatory_disclaimer_and_contraindication_definitions(): void
    {
        $clinic = $this->clinic('lotus');

        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);

        $templates = IntakeFormTemplate::where('tenant_id', $clinic->id)->get();
        $this->assertCount(2, $templates);

        $massageTemplate = $templates->firstWhere('discipline', IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY);
        $this->assertNotNull($massageTemplate);
        $this->assertStringContainsString('Massage Therapy', $massageTemplate->name);
        $this->assertNotEmpty($massageTemplate->schema['disclaimer']);
        $this->assertStringContainsString('starter questionnaire provided as a template placeholder', $massageTemplate->schema['disclaimer']);

        // Verify contraindication fields are present
        $bloodClotField = null;
        foreach ($massageTemplate->schema['sections'] as $sec) {
            foreach ($sec['fields'] as $f) {
                if (($f['id'] ?? '') === 'has_blood_clots') {
                    $bloodClotField = $f;
                    break 2;
                }
            }
        }

        $this->assertNotNull($bloodClotField);
        $this->assertTrue($bloodClotField['is_contraindication']);
        $this->assertSame('yes', $bloodClotField['flag_trigger']);
        $this->assertNotEmpty($bloodClotField['flag_warning']);
    }

    public function test_clinic_owner_can_view_and_update_intake_templates(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);

        $response = $this->actingAs($owner)
            ->get("http://lotus.umahz.test/app/settings/intake-forms");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/IntakeForms')
            ->has('templates')
            ->has('offeredDisciplines')
        );

        $template = IntakeFormTemplate::where('tenant_id', $clinic->id)
            ->where('discipline', IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY)
            ->firstOrFail();

        $updatedSchema = $template->schema;
        $updatedSchema['sections'][0]['title'] = 'Updated Intake Section Title';

        $updateResponse = $this->actingAs($owner)
            ->patch("http://lotus.umahz.test/app/settings/intake-forms/{$template->id}", [
                'name' => 'Custom Massage Intake Title',
                'description' => 'Custom description',
                'schema' => $updatedSchema,
                'is_active' => true,
            ]);

        $updateResponse->assertRedirect();
        $template->refresh();
        $this->assertSame('Custom Massage Intake Title', $template->name);
        $this->assertSame('Updated Intake Section Title', $template->schema['sections'][0]['title']);

        // Verify audit event
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $clinic->id,
            'action' => 'intake_template.updated',
            'resource_id' => $template->id,
        ]);
    }

    public function test_staff_can_generate_intake_link_and_send_notification(): void
    {
        Notification::fake();

        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($clinic);

        $response = $this->actingAs($staff)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/intakes/link", [
                'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
                'send_email' => true,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('generated_intake_link');

        $intake = ClientIntake::where('tenant_id', $clinic->id)
            ->where('client_id', $client->id)
            ->first();

        $this->assertNotNull($intake);
        $this->assertSame(ClientIntake::STATUS_PENDING, $intake->status);
        $this->assertSame(ClientIntake::SUBMISSION_PATIENT_LINK, $intake->submission_type);
        $this->assertSame(64, strlen($intake->token));
        $this->assertTrue($intake->expires_at->isFuture());

        Notification::assertSentTo($client, ClientIntakeLinkNotification::class);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $clinic->id,
            'action' => 'intake.link_generated',
            'resource_id' => $intake->id,
        ]);
    }

    public function test_patient_can_view_public_intake_form_and_submit_responses(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        $client = $this->client($clinic);

        $token = ClientIntake::makeToken();
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        // 1. Patient opens public form (unauthenticated)
        $showResponse = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("/intake/{$token}");

        $showResponse->assertOk();
        $showResponse->assertInertia(fn ($page) => $page
            ->component('Public/IntakeForm')
            ->where('state', 'active')
            ->where('clientFirstName', 'Sarah')
            ->where('token', $token)
        );

        // 2. Patient submits benign answers without contraindications
        $responses = [
            'chief_complaint' => 'Tight shoulders from desk work',
            'pain_severity' => '4-6 (Moderate)',
            'pressure_preference' => 'Medium Pressure',
            'has_blood_clots' => 'no',
            'is_pregnant' => 'no',
            'contagious_skin_condition' => 'no',
            'uncontrolled_blood_pressure' => 'no',
        ];

        $submitResponse = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->post("/intake/{$token}", [
                'responses' => $responses,
            ]);

        $submitResponse->assertRedirect("/intake/{$token}");

        $intake->refresh();
        $this->assertSame(ClientIntake::STATUS_COMPLETED, $intake->status);
        $this->assertEmpty($intake->contraindication_flags);
        $this->assertNotNull($intake->submitted_at);
        $this->assertSame('Tight shoulders from desk work', $intake->responses['chief_complaint']);

        // 3. Opening link again shows already completed state
        $reopenedResponse = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("/intake/{$token}");

        $reopenedResponse->assertOk();
        $reopenedResponse->assertInertia(fn ($page) => $page
            ->component('Public/IntakeForm')
            ->where('state', 'already_completed')
        );
    }

    public function test_patient_submitting_contraindication_triggers_warning_flags_and_status(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        $client = $this->client($clinic);

        $token = ClientIntake::makeToken();
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        // Submit with a "yes" to blood clots (DVT flag)
        $responses = [
            'chief_complaint' => 'Calf pain',
            'pain_severity' => '7-8 (Severe)',
            'pressure_preference' => 'Light Pressure',
            'has_blood_clots' => 'yes',
            'is_pregnant' => 'no',
            'contagious_skin_condition' => 'no',
            'uncontrolled_blood_pressure' => 'no',
        ];

        $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->post("/intake/{$token}", [
                'responses' => $responses,
            ]);

        $intake->refresh();
        $this->assertSame(ClientIntake::STATUS_FLAGGED, $intake->status);
        $this->assertCount(1, $intake->contraindication_flags);
        $this->assertSame('has_blood_clots', $intake->contraindication_flags[0]['field_id']);
        $this->assertStringContainsString('Blood Clot / DVT history reported', $intake->contraindication_flags[0]['warning']);

        // Verify audit event logged for flagging
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $clinic->id,
            'action' => 'intake.flagged',
            'resource_id' => $intake->id,
        ]);
    }

    public function test_staff_can_record_intake_in_person(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        [$practitioner] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($clinic);

        $responses = [
            'chief_complaint' => 'Lower back tightness',
            'pain_severity' => '4-6 (Moderate)',
            'pressure_preference' => 'Firm / Deep Tissue',
            'has_blood_clots' => 'no',
            'is_pregnant' => 'no',
            'contagious_skin_condition' => 'no',
            'uncontrolled_blood_pressure' => 'no',
        ];

        $response = $this->actingAs($practitioner)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/intakes/staff", [
                'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
                'responses' => $responses,
            ]);

        $response->assertRedirect();

        $intake = ClientIntake::where('tenant_id', $clinic->id)
            ->where('client_id', $client->id)
            ->where('submission_type', ClientIntake::SUBMISSION_STAFF_RECORDED)
            ->first();

        $this->assertNotNull($intake);
        $this->assertSame(ClientIntake::STATUS_COMPLETED, $intake->status);
        $this->assertSame($practitioner->id, $intake->submitted_by_user_id);
        $this->assertNotNull($intake->submitted_at);
        $this->assertNotEmpty($intake->schema_snapshot);

        // Verify audit event
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $clinic->id,
            'action' => 'intake.submitted',
            'user_id' => $practitioner->id,
            'resource_id' => $intake->id,
        ]);
    }

    public function test_completed_intake_records_are_legally_immutable(): void
    {
        $clinic = $this->clinic('lotus');
        $client = $this->client($clinic);

        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'schema_snapshot' => ['sections' => []],
            'responses' => ['chief_complaint' => 'Initial complaint'],
            'status' => ClientIntake::STATUS_COMPLETED,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => ClientIntake::makeToken(),
            'submitted_at' => now(),
        ]);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Completed intake records are legally immutable healthcare documents');

        // Attempt to tamper with submitted responses
        $intake->update([
            'responses' => ['chief_complaint' => 'Tampered complaint text'],
        ]);
    }

    public function test_staff_can_delete_pending_intake_link_but_not_completed_record(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, 'clinic_owner');
        $client = $this->client($clinic);

        $pendingIntake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => ClientIntake::makeToken(),
            'expires_at' => now()->addDays(7),
        ]);

        // Staff can delete pending intake link
        $response = $this->actingAs($owner)
            ->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->delete("http://lotus.umahz.test/app/clients/{$client->id}/intakes/{$pendingIntake->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('client_intakes', ['id' => $pendingIntake->id]);
    }

    public function test_client_sex_can_be_stored_and_edited(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, 'clinic_owner');

        $response = $this->actingAs($owner)
            ->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->post('http://lotus.umahz.test/app/clients', [
                'first_name' => 'John',
                'last_name' => 'Smith',
                'email' => 'john.smith@example.com',
                'sex' => 'male',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('clients', [
            'first_name' => 'John',
            'last_name' => 'Smith',
            'sex' => 'male',
            'tenant_id' => $clinic->id,
        ]);
    }

    public function test_female_client_sees_pregnancy_question(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        $femaleClient = $this->client($clinic);
        $femaleClient->update(['sex' => 'female']);

        $token = ClientIntake::makeToken();
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $femaleClient->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("/intake/{$token}");

        $response->assertOk();
        $response->assertInertia(function ($page) {
            $page->component('Public/IntakeForm');
            $schema = $page->toArray()['props']['schema'];
            $allFieldIds = collect($schema['sections'])->flatMap(fn ($s) => collect($s['fields'])->pluck('id'))->all();
            $this->assertContains('is_pregnant', $allFieldIds);
        });
    }

    public function test_male_client_does_not_see_pregnancy_question(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        $maleClient = $this->client($clinic);
        $maleClient->update(['sex' => 'male']);

        $token = ClientIntake::makeToken();
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $maleClient->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("/intake/{$token}");

        $response->assertOk();
        $response->assertInertia(function ($page) {
            $page->component('Public/IntakeForm');
            $schema = $page->toArray()['props']['schema'];
            $allFieldIds = collect($schema['sections'])->flatMap(fn ($s) => collect($s['fields'])->pluck('id'))->all();
            $this->assertNotContains('is_pregnant', $allFieldIds);
        });
    }

    public function test_unset_sex_client_sees_all_questions_fail_open(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        $client = $this->client($clinic);
        $client->update(['sex' => null]);

        $token = ClientIntake::makeToken();
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("/intake/{$token}");

        $response->assertOk();
        $response->assertInertia(function ($page) {
            $page->component('Public/IntakeForm');
            $schema = $page->toArray()['props']['schema'];
            $allFieldIds = collect($schema['sections'])->flatMap(fn ($s) => collect($s['fields'])->pluck('id'))->all();
            $this->assertContains('is_pregnant', $allFieldIds);
        });
    }

    public function test_submitting_intake_for_male_client_snapshots_only_shown_questions(): void
    {
        $clinic = $this->clinic('lotus');
        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id);
        $maleClient = $this->client($clinic);
        $maleClient->update(['sex' => 'male']);

        $token = ClientIntake::makeToken();
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $maleClient->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $responses = [
            'chief_complaint' => 'Upper neck tension',
            'pain_severity' => '4-6 (Moderate)',
            'pressure_preference' => 'Medium Pressure',
            'has_blood_clots' => 'no',
            'contagious_skin_condition' => 'no',
            'uncontrolled_blood_pressure' => 'no',
        ];

        $response = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->post("/intake/{$token}", [
                'responses' => $responses,
            ]);

        $response->assertRedirect("/intake/{$token}");

        $intake->refresh();
        $this->assertSame(ClientIntake::STATUS_COMPLETED, $intake->status);

        $snapshot = $intake->schema_snapshot;
        $snapshotFieldIds = collect($snapshot['sections'])->flatMap(fn ($s) => collect($s['fields'])->pluck('id'))->all();

        $this->assertNotContains('is_pregnant', $snapshotFieldIds);
        $this->assertContains('has_blood_clots', $snapshotFieldIds);
    }

    public function test_patient_can_submit_intake_with_uploaded_image_and_staff_can_view_file(): void
    {
        Storage::fake('local');

        $clinic = $this->clinic('lotus');
        [$staffUser] = $this->staff($clinic);
        $client = $this->client($clinic);

        IntakeFormTemplate::ensureDefaultsForTenant($clinic->id, $clinic->requested_disciplines);
        $template = IntakeFormTemplate::where('tenant_id', $clinic->id)
            ->where('discipline', IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY)
            ->firstOrFail();

        $schema = $template->schema;
        $schema['sections'][0]['fields'][] = [
            'id' => 'skin_photo',
            'type' => 'image',
            'label' => 'Photo of Affected Skin / Injury',
            'required' => false,
        ];
        $template->update(['schema' => $schema]);

        $token = 'test-token-img-'.bin2hex(random_bytes(8));
        $intake = ClientIntake::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'discipline' => IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            'template_name' => 'Massage Intake',
            'status' => ClientIntake::STATUS_PENDING,
            'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $fakeImage = UploadedFile::fake()->create('rash_photo.jpg', 100, 'image/jpeg');

        $responses = [
            'chief_complaint' => 'Skin irritation on left shoulder',
            'pain_severity' => '1-3 (Mild)',
            'pressure_preference' => 'Light Pressure',
            'has_blood_clots' => 'no',
            'contagious_skin_condition' => 'no',
            'uncontrolled_blood_pressure' => 'no',
            'skin_photo' => $fakeImage,
        ];

        $response = $this->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->post("/intake/{$token}", [
                'responses' => $responses,
            ]);

        $response->assertRedirect("/intake/{$token}");

        $intake->refresh();
        $this->assertSame(ClientIntake::STATUS_COMPLETED, $intake->status);
        $this->assertIsArray($intake->responses['skin_photo']);
        $this->assertSame('image', $intake->responses['skin_photo']['type']);
        $this->assertSame('rash_photo.jpg', $intake->responses['skin_photo']['original_name']);

        $storedPath = $intake->responses['skin_photo']['path'];
        Storage::disk('local')->assertExists($storedPath);

        // Staff inspects the intake record JSON
        $showResponse = $this->actingAs($staffUser)
            ->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("http://lotus.umahz.test/app/clients/{$client->id}/intakes/{$intake->id}");

        $showResponse->assertOk();
        $fileUrl = $showResponse->json('intake.responses.skin_photo.url');
        $this->assertNotNull($fileUrl);
        $this->assertStringContainsString('/files/skin_photo', $fileUrl);

        // Staff views the file stream
        $fileResponse = $this->actingAs($staffUser)
            ->withServerVariables(['HTTP_HOST' => 'lotus.umahz.test'])
            ->get("http://lotus.umahz.test/app/clients/{$client->id}/intakes/{$intake->id}/files/skin_photo");

        $fileResponse->assertOk();
        $this->assertStringContainsString('image/jpeg', $fileResponse->headers->get('Content-Type'));

        // Cross-tenant check: Staff from clinic B cannot access clinic A's patient photo
        $clinicB = $this->clinic('aurora');
        [$staffB] = $this->staff($clinicB);

        $crossResponse = $this->actingAs($staffB)
            ->withServerVariables(['HTTP_HOST' => 'aurora.umahz.test'])
            ->get("http://aurora.umahz.test/app/clients/{$client->id}/intakes/{$intake->id}/files/skin_photo");

        $crossResponse->assertNotFound();
    }
}
