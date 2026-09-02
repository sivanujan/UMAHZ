<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientIntake;
use App\Models\IntakeFormTemplate;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Disciplines;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CustomDisciplinesTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub, array $overrides = []): Tenant
    {
        return Tenant::create(array_merge([
            'name' => ucfirst($sub).' Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}.com",
            'requested_disciplines' => ['massage_therapy'],
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
        $code = \App\Support\EmailVerificationCode::generate($email);
        \App\Support\EmailVerificationCode::verify($email, $code);
    }

    public function test_can_register_clinic_with_custom_disciplines(): void
    {
        Storage::fake('local');

        $email = 'dr.smith@wellness.com';
        $this->verifyEmail($email);

        $payload = [
            'email' => $email,
            'name' => 'Dr. Smith',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
            'clinic_name' => 'Apex Wellness',
            'subdomain' => 'apexwellness',
            'primary_contact_name' => 'Dr. Smith',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '4165551234',
            'custom_disciplines' => [
                ['label' => 'Physiotherapy'],
                ['label' => 'Reiki Energy Therapy'],
            ],
            'requested_disciplines' => ['physiotherapy', 'reiki_energy_therapy', 'massage_therapy'],
            'estimated_practitioner_count' => 5,
            'license_number' => 'PT-98765',
            'licensing_body' => 'College of Physiotherapists',
            'license_document' => UploadedFile::fake()->create('license.pdf', 500, 'application/pdf'),
        ];

        $response = $this->post('http://umahz.test/clinics/register', $payload);
        $response->assertRedirect('http://apexwellness.umahz.test/clinic/status');

        $tenant = Tenant::where('subdomain', 'apexwellness')->first();
        $this->assertNotNull($tenant);

        // Check custom_disciplines stored
        $this->assertCount(2, $tenant->custom_disciplines);
        $this->assertEquals('physiotherapy', $tenant->custom_disciplines[0]['slug']);
        $this->assertEquals('Physiotherapy', $tenant->custom_disciplines[0]['label']);
        $this->assertEquals('reiki_energy_therapy', $tenant->custom_disciplines[1]['slug']);

        // Check requested_disciplines stored
        $this->assertEquals(['physiotherapy', 'reiki_energy_therapy', 'massage_therapy'], $tenant->requested_disciplines);

        // Check primary practitioner profession
        $primaryProfile = PractitionerProfile::whereHas('staffMembership', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->where('is_primary_contact', true)
            ->first();
        $this->assertNotNull($primaryProfile);
        $this->assertEquals('physiotherapy', $primaryProfile->profession);
        $this->assertEquals('Physiotherapy', $primaryProfile->professionLabel());

        // Check templates seeded: massage_therapy has starter questions, custom disciplines have empty schema
        $massageTemplate = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'massage_therapy')->first();
        $this->assertNotNull($massageTemplate);
        $this->assertNotEmpty($massageTemplate->schema['sections']);

        $ptTemplate = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'physiotherapy')->first();
        $this->assertNotNull($ptTemplate);
        $this->assertEquals('Physiotherapy Health History & Intake', $ptTemplate->name);
        $this->assertEquals(['sections' => []], $ptTemplate->schema);
    }

    public function test_registration_rejects_custom_discipline_colliding_with_fixed_5(): void
    {
        Storage::fake('local');
        $email = 'colliding@test.com';
        $this->verifyEmail($email);

        $payload = [
            'email' => $email,
            'name' => 'Dr. Jones',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
            'clinic_name' => 'Collision Clinic',
            'subdomain' => 'collisionclinic',
            'primary_contact_name' => 'Dr. Jones',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '4165551234',
            'custom_disciplines' => [
                ['label' => 'Massage Therapy'], // Standard platform discipline
            ],
            'requested_disciplines' => ['massage_therapy'],
            'estimated_practitioner_count' => 2,
            'license_number' => 'MT-12345',
            'licensing_body' => 'CMTO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 500, 'application/pdf'),
        ];

        $response = $this->from('http://umahz.test/clinics/register')
            ->post('http://umahz.test/clinics/register', $payload);
        $response->assertSessionHasErrors('custom_disciplines');
    }

    public function test_registration_rejects_custom_discipline_exceeding_length(): void
    {
        Storage::fake('local');
        $email = 'toolong@test.com';
        $this->verifyEmail($email);

        $payload = [
            'email' => $email,
            'name' => 'Dr. Jones',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
            'clinic_name' => 'Too Long Clinic',
            'subdomain' => 'toolongclinic',
            'primary_contact_name' => 'Dr. Jones',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '4165551234',
            'custom_disciplines' => [
                ['label' => str_repeat('A', 55)],
            ],
            'requested_disciplines' => ['massage_therapy'],
            'estimated_practitioner_count' => 2,
            'license_number' => 'MT-12345',
            'licensing_body' => 'CMTO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 500, 'application/pdf'),
        ];

        $response = $this->from('http://umahz.test/clinics/register')
            ->post('http://umahz.test/clinics/register', $payload);
        $response->assertSessionHasErrors('custom_disciplines');
    }

    public function test_clinic_owner_can_manage_custom_disciplines_in_settings(): void
    {
        $tenant = $this->clinic('bloom', [
            'custom_disciplines' => [],
            'requested_disciplines' => ['massage_therapy'],
        ]);
        $owner = $this->member($tenant);

        // Add custom discipline via settings
        $url = 'http://bloom.umahz.test/app/settings/disciplines';
        $response = $this->actingAs($owner)->patch($url, [
            'disciplines' => ['massage_therapy', 'chiropractic'],
            'custom_disciplines' => [
                ['label' => 'Chiropractic'],
            ],
        ]);
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $tenant->refresh();
        $this->assertEquals(['massage_therapy', 'chiropractic'], $tenant->requested_disciplines);
        $this->assertCount(1, $tenant->custom_disciplines);
        $this->assertEquals('chiropractic', $tenant->custom_disciplines[0]['slug']);
        $this->assertEquals('Chiropractic', $tenant->custom_disciplines[0]['label']);

        // Check empty template seeded
        $chiroTemplate = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'chiropractic')->first();
        $this->assertNotNull($chiroTemplate);
        $this->assertEquals(['sections' => []], $chiroTemplate->schema);
    }

    public function test_tenant_isolation_prevents_clinic_b_from_using_clinic_a_custom_discipline(): void
    {
        $clinicA = $this->clinic('clinica', [
            'custom_disciplines' => [
                ['slug' => 'reiki_therapy', 'label' => 'Reiki Therapy'],
            ],
            'requested_disciplines' => ['reiki_therapy'],
        ]);

        $clinicB = $this->clinic('clinicb', [
            'custom_disciplines' => [],
            'requested_disciplines' => ['massage_therapy'],
        ]);
        $ownerB = $this->member($clinicB);

        // Clinic B attempts to offer Clinic A's custom discipline without defining it
        $url = 'http://clinicb.umahz.test/app/settings/disciplines';
        $response = $this->actingAs($ownerB)->patch($url, [
            'disciplines' => ['massage_therapy', 'reiki_therapy'],
        ]);

        $response->assertSessionHasErrors('disciplines');

        $clinicB->refresh();
        $this->assertEquals(['massage_therapy'], $clinicB->requested_disciplines);
    }

    public function test_label_resolution_resolves_fixed_and_custom_labels(): void
    {
        $tenant = $this->clinic('labeltest', [
            'custom_disciplines' => [
                ['slug' => 'kinesiology', 'label' => 'Registered Kinesiology'],
            ],
            'requested_disciplines' => ['massage_therapy', 'kinesiology'],
        ]);

        $this->assertEquals('Massage Therapy', $tenant->disciplineLabel('massage_therapy'));
        $this->assertEquals('Registered Kinesiology', $tenant->disciplineLabel('kinesiology'));

        // Fallback for unconfigured code
        $this->assertEquals('Unknown Therapy', $tenant->disciplineLabel('unknown_therapy'));

        // offeredDisciplineLabels
        $labels = $tenant->offeredDisciplineLabels();
        $this->assertEquals('Massage Therapy', $labels['massage_therapy']);
        $this->assertEquals('Registered Kinesiology', $labels['kinesiology']);
    }

    public function test_custom_discipline_intake_magic_link_generation_and_submission(): void
    {
        $tenant = $this->clinic('intaketest', [
            'custom_disciplines' => [
                ['slug' => 'physiotherapy', 'label' => 'Physiotherapy'],
            ],
            'requested_disciplines' => ['physiotherapy'],
        ]);
        $owner = $this->member($tenant);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Alice',
            'last_name' => 'Wonderland',
            'email' => 'alice@example.com',
            'phone' => '4165559999',
            'sex' => 'female',
        ]);

        // Generate magic link
        $url = "http://intaketest.umahz.test/app/clients/{$client->id}/intakes/link";
        $response = $this->actingAs($owner)->post($url, [
            'discipline' => 'physiotherapy',
        ]);
        $response->assertRedirect();

        $intake = ClientIntake::where('client_id', $client->id)->first();
        $this->assertNotNull($intake);
        $this->assertEquals('physiotherapy', $intake->discipline);
        $this->assertEquals('Physiotherapy Health History & Intake', $intake->template_name);

        // Public patient visits link (should render successfully with empty schema without 500)
        $publicUrl = "/intake/{$intake->token}";
        $visit = $this->get($publicUrl);
        $visit->assertOk();

        // Submit responses
        $submit = $this->post("/intake/{$intake->token}", [
            'responses' => [
                'chief_complaint' => 'Shoulder pain after tennis',
            ],
        ]);
        $submit->assertRedirect($publicUrl);

        $intake->refresh();
        $this->assertTrue($intake->isCompleted());
        $this->assertEquals('Shoulder pain after tennis', $intake->responses['chief_complaint']);

        // Staff views intake details JSON
        $viewUrl = "http://intaketest.umahz.test/app/clients/{$client->id}/intakes/{$intake->id}";
        $viewRes = $this->actingAs($owner)->getJson($viewUrl);
        $viewRes->assertOk();
        $viewRes->assertJsonPath('intake.discipline_label', 'Physiotherapy');
        $this->assertNotEquals('unknown', strtolower($viewRes->json('intake.discipline_label')));
    }

    public function test_custom_discipline_cannot_be_reset_to_default(): void
    {
        $tenant = $this->clinic('resettest', [
            'custom_disciplines' => [
                ['slug' => 'naturopathy', 'label' => 'Naturopathic Medicine'],
            ],
            'requested_disciplines' => ['naturopathy'],
        ]);
        $owner = $this->member($tenant);

        IntakeFormTemplate::ensureDefaultsForTenant($tenant->id, ['naturopathy']);
        $template = IntakeFormTemplate::where('tenant_id', $tenant->id)->where('discipline', 'naturopathy')->first();
        $this->assertNotNull($template);

        $url = "http://resettest.umahz.test/app/settings/intake-forms/{$template->id}/reset";
        $response = $this->actingAs($owner)->post($url);
        $response->assertRedirect();
        $response->assertSessionHas('warning');
    }

    public function test_accept_invite_validates_against_clinic_offered_custom_disciplines(): void
    {
        $tenant = $this->clinic('invitetest', [
            'custom_disciplines' => [
                ['slug' => 'osteopathy', 'label' => 'Osteopathy'],
            ],
            'requested_disciplines' => ['osteopathy'],
        ]);

        $user = User::factory()->create([
            'password' => 'temporary',
        ]);

        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_INVITED,
        ]);

        // Accept invite with osteopathy via signed route
        $signedUrl = URL::signedRoute('invite.accept', ['staffMembership' => $membership->id]);
        $response = $this->post($signedUrl, [
            'name' => 'Dr. Osteo',
            'password' => 'Password123!@#',
            'password_confirmation' => 'Password123!@#',
            'discipline' => 'osteopathy',
            'license_number' => 'OST-1234',
            'licensing_body' => 'Osteopathy Association',
            'license_document' => UploadedFile::fake()->create('doc.pdf', 200, 'application/pdf'),
        ]);

        $this->assertTrue(in_array($response->getStatusCode(), [302, 409]));

        $profile = PractitionerProfile::where('staff_membership_id', $membership->id)->first();
        $this->assertNotNull($profile);
        $this->assertEquals('osteopathy', $profile->profession);
        $this->assertEquals('Osteopathy', $profile->professionLabel());
    }

    public function test_admin_clinic_review_shows_custom_discipline_and_profession_labels(): void
    {
        $hq = Tenant::create(['name' => 'HQ', 'slug' => 'hq', 'subdomain' => 'hq', 'status' => Tenant::STATUS_APPROVED]);
        $admin = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $hq->id,
            'user_id' => $admin->id,
            'role' => StaffMembership::ROLE_PLATFORM_ADMIN,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $clinic = $this->clinic('aurora', [
            'custom_disciplines' => [
                ['slug' => 'sound_healing', 'label' => 'Sound Healing Therapy'],
            ],
            'requested_disciplines' => ['sound_healing', 'massage_therapy'],
        ]);

        $owner = User::factory()->create();
        $membership = StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
        PractitionerProfile::create([
            'staff_membership_id' => $membership->id,
            'profession' => 'sound_healing',
            'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
            'license_number' => 'SND-100',
            'licensing_body' => 'Sound Therapy Council',
            'license_document_path' => 'licenses/test.pdf',
            'license_document_original_name' => 'test.pdf',
            'license_document_mime' => 'application/pdf',
            'is_primary_contact' => true,
        ]);

        $response = $this->actingAs($admin)->get("http://umahz.test/admin/clinics/{$clinic->id}");
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Clinics/Show')
            ->where('tenant.discipline_labels.sound_healing', 'Sound Healing Therapy')
            ->where('primaryPractitioner.profession_label', 'Sound Healing Therapy')
        );

        $staffUser = User::factory()->create();
        $staffMember = StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $staffUser->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);
        PractitionerProfile::create([
            'staff_membership_id' => $staffMember->id,
            'profession' => 'sound_healing',
            'verification_status' => PractitionerProfile::VERIFICATION_PENDING,
            'license_number' => 'SND-101',
            'licensing_body' => 'Sound Therapy Council',
            'license_document_path' => 'licenses/test2.pdf',
            'license_document_original_name' => 'test2.pdf',
            'license_document_mime' => 'application/pdf',
            'is_primary_contact' => false,
        ]);

        $practitionerRes = $this->actingAs($admin)->get('http://umahz.test/admin/practitioners');
        $practitionerRes->assertOk();
        $practitionerRes->assertInertia(fn ($page) => $page
            ->component('Admin/Practitioners/Index')
            ->where('practitioners.0.profession_label', 'Sound Healing Therapy')
        );
    }
}
