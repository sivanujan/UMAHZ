<?php

namespace Tests\Feature;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\IntakeFormTemplate;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Support\ClinicOptions;
use App\Support\Disciplines;
use App\Support\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RegistersClinics;
use Tests\TestCase;

class DefaultDisciplinesTest extends TestCase
{
    use RefreshDatabase, RegistersClinics;

    protected function setUp(): void
    {
        parent::setUp();
        config(['tenancy.central_domains' => ['umahz.test']]);
    }

    private function clinic(string $sub, array $overrides = []): Tenant
    {
        return Tenant::create(array_merge([
            'name' => 'Clinic '.ucfirst($sub),
            'subdomain' => $sub,
            'slug' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}.com",
            'requested_disciplines' => ['physiotherapy', 'chiropractor'],
            'custom_disciplines' => [],
        ], $overrides));
    }

    private function member(Tenant $tenant, string $role = StaffMembership::ROLE_CLINIC_OWNER): User
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return $user;
    }

    private function verifyEmail(string $email): void
    {
        $code = EmailVerificationCode::generate($email);
        EmailVerificationCode::verify($email, $code);
    }

    public function test_default_disciplines_are_defined_in_constants_and_support_helpers(): void
    {
        $this->assertSame('physiotherapy', PractitionerProfile::PROFESSION_PHYSIOTHERAPY);
        $this->assertSame('chiropractor', PractitionerProfile::PROFESSION_CHIROPRACTOR);

        $disciplines = ClinicRegistrationController::DISCIPLINES;
        $this->assertContains('physiotherapy', $disciplines);
        $this->assertContains('chiropractor', $disciplines);
        $this->assertCount(7, $disciplines);

        $this->assertSame($disciplines, ClinicOptions::disciplines());
        $this->assertSame($disciplines, Disciplines::fixedCodes());

        $labels = Disciplines::fixedLabels();
        $this->assertEquals('Physiotherapy', $labels['physiotherapy']);
        $this->assertEquals('Chiropractor', $labels['chiropractor']);
        $this->assertTrue(Disciplines::isFixed('physiotherapy'));
        $this->assertTrue(Disciplines::isFixed('chiropractor'));

        // Existing 5 still intact
        $this->assertTrue(Disciplines::isFixed('massage_therapy'));
        $this->assertTrue(Disciplines::isFixed('acupuncture_tcm'));
        $this->assertTrue(Disciplines::isFixed('personal_training'));
        $this->assertTrue(Disciplines::isFixed('nutrition'));
        $this->assertTrue(Disciplines::isFixed('colon_hydrotherapy'));
    }

    public function test_registration_with_physiotherapy_and_chiropractor_succeeds_and_seeds_starter_templates(): void
    {
        Storage::fake('local');

        $email = 'dr.physio@wellness.com';
        $this->verifyEmail($email);

        $payload = [
            'email' => $email,
            'name' => 'Dr. Physio',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
            'clinic_name' => 'Integrative Motion Clinic',
            'subdomain' => 'motionclinic',
            'primary_contact_name' => 'Dr. Physio',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '4165551234',
            'requested_disciplines' => ['physiotherapy', 'chiropractor', 'massage_therapy'],
            'plan_tier' => 'practice',
            'full_time_practitioners_count' => 3,
            'part_time_practitioners_count' => 1,
            'estimated_practitioner_count' => 4,
            'license_number' => 'PT-12345',
            'licensing_body' => 'College of Physiotherapists of Ontario',
            'license_document' => UploadedFile::fake()->create('license.pdf', 500, 'application/pdf'),
        ];

        $response = $this->registerClinicThroughPayment($payload);
        $response->assertRedirect('http://motionclinic.umahz.test/clinic/status');

        $tenant = Tenant::where('subdomain', 'motionclinic')->first();
        $this->assertNotNull($tenant);
        $this->assertEquals(['physiotherapy', 'chiropractor', 'massage_therapy'], $tenant->requested_disciplines);

        // Owner profession set to primary discipline (physiotherapy)
        $ownerProfile = PractitionerProfile::whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->where('is_primary_contact', true)
            ->first();
        $this->assertNotNull($ownerProfile);
        $this->assertEquals('physiotherapy', $ownerProfile->profession);
        $this->assertEquals('Physiotherapy', $ownerProfile->professionLabel());

        // Intake templates seeded with structured starter schemas for both new disciplines
        $physioIntake = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'physiotherapy')->first();
        $this->assertNotNull($physioIntake);
        $this->assertEquals('Physiotherapy Health History & Intake', $physioIntake->name);
        $this->assertNotEmpty($physioIntake->schema['sections']);

        $chiroIntake = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'chiropractor')->first();
        $this->assertNotNull($chiroIntake);
        $this->assertEquals('Chiropractic Health History & Intake', $chiroIntake->name);
        $this->assertNotEmpty($chiroIntake->schema['sections']);

        $massageIntake = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'massage_therapy')->first();
        $this->assertNotNull($massageIntake);
        $this->assertNotEmpty($massageIntake->schema['sections']);
    }

    public function test_clinic_settings_can_update_offered_disciplines_to_new_defaults(): void
    {
        $tenant = $this->clinic('settingstest', [
            'requested_disciplines' => ['massage_therapy'],
        ]);
        $owner = $this->member($tenant);

        $url = 'http://settingstest.umahz.test/app/settings/disciplines';
        $response = $this->actingAs($owner)->patch($url, [
            'disciplines' => ['massage_therapy', 'physiotherapy', 'chiropractor'],
        ]);
        $response->assertRedirect();

        $tenant->refresh();
        $this->assertEqualsCanonicalizing(['massage_therapy', 'physiotherapy', 'chiropractor'], $tenant->requested_disciplines);

        // Verify label mapping
        $this->assertEquals('Physiotherapy', $tenant->disciplineLabel('physiotherapy'));
        $this->assertEquals('Chiropractor', $tenant->disciplineLabel('chiropractor'));
        $offeredLabels = $tenant->offeredDisciplineLabels();
        $this->assertEquals('Physiotherapy', $offeredLabels['physiotherapy']);
        $this->assertEquals('Chiropractor', $offeredLabels['chiropractor']);
    }

    public function test_invited_practitioner_can_select_physiotherapy_and_chiropractor(): void
    {
        Storage::fake('local');

        $tenant = $this->clinic('invitetest', [
            'requested_disciplines' => ['physiotherapy', 'chiropractor'],
        ]);

        $inviteUser = User::factory()->create(['email' => 'practitioner@clinic.com']);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $inviteUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_INVITED,
            'invited_at' => now(),
        ]);

        // Visit accept invite page via signed route
        $signedUrl = \Illuminate\Support\Facades\URL::signedRoute('invite.accept', ['staffMembership' => $membership->id]);
        $visit = $this->get($signedUrl);
        $visit->assertOk();
        $visit->assertInertia(fn ($page) => $page
            ->component('Auth/AcceptInvite')
            ->where('disciplines', ['physiotherapy', 'chiropractor'])
            ->where('disciplineLabels.physiotherapy', 'Physiotherapy')
            ->where('disciplineLabels.chiropractor', 'Chiropractor')
        );

        // Accept invite with chiropractor discipline
        $response = $this->post($signedUrl, [
            'name' => 'Dr. Spine',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
            'discipline' => 'chiropractor',
            'employment_type' => 'full_time',
            'license_number' => 'CHIRO-999',
            'licensing_body' => 'CCO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 100, 'application/pdf'),
        ]);
        $this->assertTrue(in_array($response->getStatusCode(), [302, 409]));

        $profile = PractitionerProfile::where('staff_membership_id', $membership->id)->first();
        $this->assertNotNull($profile);
        $this->assertEquals('chiropractor', $profile->profession);
        $this->assertEquals('Chiropractor', $profile->professionLabel());
    }

    public function test_clinical_note_starter_templates_are_seeded_for_physiotherapy_and_chiropractor(): void
    {
        $tenant = $this->clinic('notesclinic', [
            'requested_disciplines' => ['physiotherapy', 'chiropractor'],
        ]);

        ClinicalNoteTemplate::ensureDefaultsForTenant($tenant->id, ['physiotherapy', 'chiropractor']);

        $physioNoteTemplate = ClinicalNoteTemplate::where('tenant_id', $tenant->id)
            ->where('discipline', 'physiotherapy')
            ->first();
        $this->assertNotNull($physioNoteTemplate);
        $this->assertEquals('Physiotherapy Clinical SOAP Note', $physioNoteTemplate->name);
        $this->assertNotEmpty($physioNoteTemplate->schema['sections']);

        // Check SOAP sections present
        $sectionIds = array_column($physioNoteTemplate->schema['sections'], 'id');
        $this->assertContains('subjective', $sectionIds);
        $this->assertContains('objective', $sectionIds);
        $this->assertContains('assessment', $sectionIds);
        $this->assertContains('plan', $sectionIds);

        $chiroNoteTemplate = ClinicalNoteTemplate::where('tenant_id', $tenant->id)
            ->where('discipline', 'chiropractor')
            ->first();
        $this->assertNotNull($chiroNoteTemplate);
        $this->assertEquals('Chiropractic Clinical SOAP Note', $chiroNoteTemplate->name);
        $this->assertNotEmpty($chiroNoteTemplate->schema['sections']);

        $chiroSectionIds = array_column($chiroNoteTemplate->schema['sections'], 'id');
        $this->assertContains('subjective', $chiroSectionIds);
        $this->assertContains('objective', $chiroSectionIds);
        $this->assertContains('assessment', $chiroSectionIds);
        $this->assertContains('plan', $chiroSectionIds);
    }
}
