<?php

namespace Tests\Feature\Consent;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConsentPdfManagementTest extends TestCase
{
    use RefreshDatabase;

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub).' Wellness Clinic',
            'slug' => $sub,
            'subdomain' => $sub,
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'timezone' => 'America/Toronto',
            'email' => "contact@{$sub}.com",
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

    public function test_clinic_owner_can_create_and_configure_pdf_based_consent_type(): void
    {
        Storage::fake('local');
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);

        $file = UploadedFile::fake()->create('standard_consent_2026.pdf', 500, 'application/pdf');

        $response = $this->actingAs($owner)
            ->post('http://lotus.umahz.test/app/settings/consents', [
                'name' => 'General Clinical PDF Consent',
                'description' => 'Official clinic onboarding document.',
                'agreement_source' => 'pdf',
                'pdf_file' => $file,
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $type = ConsentType::where('tenant_id', $clinic->id)->where('name', 'General Clinical PDF Consent')->first();
        $this->assertNotNull($type);
        $this->assertSame(ConsentType::SOURCE_PDF, $type->agreement_source);
        $this->assertNotNull($type->pdf_path);
        $this->assertSame('standard_consent_2026.pdf', $type->pdf_original_name);
        $this->assertSame(1, $type->version);
        $this->assertTrue($type->isConfigured());
        $this->assertTrue(Storage::disk('local')->exists($type->pdf_path));
    }

    public function test_cannot_record_consent_when_pdf_consent_type_has_no_file_uploaded(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'Unconfigured PDF Consent',
            'code' => 'unconfigured_pdf',
            'agreement_source' => 'pdf',
            'pdf_path' => null, // Unconfigured
            'is_active' => true,
        ]);

        $this->assertFalse($type->isConfigured());

        $response = $this->actingAs($staff)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/consents", [
                'consent_type_id' => $type->id,
                'signer_name' => 'Alice Walker',
                'signature_type' => 'draw',
                'signature_data' => 'data:image/png;base64,mockSignature',
            ]);

        $response->assertSessionHasErrors('consent_type_id');
        $this->assertSame(0, Consent::where('tenant_id', $clinic->id)->count());
    }

    public function test_staff_can_record_consent_for_pdf_based_type_and_pdf_is_snapshotted(): void
    {
        Storage::fake('local');
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Bob', 'last_name' => 'Smith']);

        // Set up PDF template
        $templatePath = "consents/types/{$clinic->id}/original_agreement.pdf";
        Storage::disk('local')->put($templatePath, '%PDF-1.4 Mock agreement document content');

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'Informed Surgery & Needling PDF',
            'code' => 'needling_pdf',
            'agreement_source' => 'pdf',
            'pdf_path' => $templatePath,
            'pdf_original_name' => 'needling_policy_v1.pdf',
            'pdf_file_size' => 1024,
            'version' => 1,
            'is_active' => true,
        ]);

        $response = $this->actingAs($staff)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/consents", [
                'consent_type_id' => $type->id,
                'signer_name' => 'Bob Smith',
                'signature_type' => 'draw',
                'signature_data' => 'data:image/png;base64,bobSignature',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $consent = Consent::where('client_id', $client->id)->first();
        $this->assertNotNull($consent);
        $this->assertSame(Consent::SOURCE_PDF, $consent->agreement_source);
        $this->assertSame(1, $consent->consent_version);
        $this->assertSame('needling_policy_v1.pdf', $consent->signed_pdf_original_name);
        $this->assertNotNull($consent->signed_pdf_path);
        $this->assertNotSame($templatePath, $consent->signed_pdf_path); // Must be an independent snapshot copy!

        // Verify the snapshotted copy exists on disk
        $this->assertTrue(Storage::disk('local')->exists($consent->signed_pdf_path));
        $this->assertSame('%PDF-1.4 Mock agreement document content', Storage::disk('local')->get($consent->signed_pdf_path));

        // Audit Event created with PDF metadata
        $audit = AuditEvent::where('resource_id', $consent->id)
            ->where('action', 'consent.recorded')
            ->first();
        $this->assertNotNull($audit);
        $this->assertSame(Consent::SOURCE_PDF, $audit->metadata['agreement_source']);
        $this->assertTrue($audit->metadata['has_signed_pdf']);
    }

    public function test_replacing_consent_type_pdf_creates_new_version_without_altering_past_records(): void
    {
        Storage::fake('local');
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Charlie', 'last_name' => 'Brown']);

        // Version 1 Template
        $v1Path = "consents/types/{$clinic->id}/v1.pdf";
        Storage::disk('local')->put($v1Path, 'VERSION 1 CONTENT');

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'Massage Policy',
            'code' => 'massage_policy',
            'agreement_source' => 'pdf',
            'pdf_path' => $v1Path,
            'pdf_original_name' => 'massage_v1.pdf',
            'pdf_file_size' => 500,
            'version' => 1,
            'is_active' => true,
        ]);

        // Charlie signs Version 1
        $this->actingAs($owner)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/consents", [
                'consent_type_id' => $type->id,
                'signer_name' => 'Charlie Brown',
                'signature_type' => 'typed',
                'signature_data' => 'TYPED_ACKNOWLEDGMENT: Charlie Brown',
            ])->assertSessionHasNoErrors();

        $consent = Consent::where('client_id', $client->id)->first();
        $this->assertSame(1, $consent->consent_version);
        $this->assertSame('massage_v1.pdf', $consent->signed_pdf_original_name);
        $signedV1Path = $consent->signed_pdf_path;
        $this->assertSame('VERSION 1 CONTENT', Storage::disk('local')->get($signedV1Path));

        // Clinic owner replaces the PDF with Version 2
        $newFile = UploadedFile::fake()->create('massage_v2_updated.pdf', 600, 'application/pdf');

        $updateResponse = $this->actingAs($owner)
            ->post("http://lotus.umahz.test/app/settings/consents/{$type->id}", [
                'name' => 'Massage Policy',
                'description' => 'Updated 2026 policy.',
                'agreement_source' => 'pdf',
                'pdf_file' => $newFile,
                'is_active' => true,
            ]);

        $updateResponse->assertSessionHasNoErrors();

        $type->refresh();
        $this->assertSame(2, $type->version);
        $this->assertSame('massage_v2_updated.pdf', $type->pdf_original_name);

        // Crucial Check: Charlie's signed record MUST still point to Version 1 snapshot!
        $consent->refresh();
        $this->assertSame(1, $consent->consent_version);
        $this->assertSame('massage_v1.pdf', $consent->signed_pdf_original_name);
        $this->assertSame($signedV1Path, $consent->signed_pdf_path);
        $this->assertSame('VERSION 1 CONTENT', Storage::disk('local')->get($consent->signed_pdf_path));
    }

    public function test_staff_can_stream_template_and_signed_consent_documents(): void
    {
        Storage::fake('local');
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Diana', 'last_name' => 'Prince']);

        $templatePath = "consents/types/{$clinic->id}/template.pdf";
        $signedPath = "consents/signed/{$clinic->id}/signed.pdf";
        Storage::disk('local')->put($templatePath, '%PDF-template');
        Storage::disk('local')->put($signedPath, '%PDF-signed');

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'Acupuncture Agreement',
            'code' => 'acupuncture',
            'agreement_source' => 'pdf',
            'pdf_path' => $templatePath,
            'pdf_original_name' => 'acu_template.pdf',
            'version' => 1,
            'is_active' => true,
        ]);

        $consent = Consent::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'consent_type_id' => $type->id,
            'consent_type_name' => $type->name,
            'agreement_source' => 'pdf',
            'consent_body' => '[PDF Agreement: acu_template.pdf (v1)]',
            'signed_pdf_path' => $signedPath,
            'signed_pdf_original_name' => 'acu_signed.pdf',
            'consent_version' => 1,
            'signer_name' => 'Diana Prince',
            'signature_type' => 'draw',
            'signature_data' => 'mockData',
            'witnessed_by_user_id' => $staff->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        // Stream template PDF
        $templateResponse = $this->actingAs($staff)
            ->get("http://lotus.umahz.test/app/consent-types/{$type->id}/document");
        $templateResponse->assertOk();
        $templateResponse->assertHeader('Content-Type', 'application/pdf');

        // Stream signed PDF
        $signedResponse = $this->actingAs($staff)
            ->get("http://lotus.umahz.test/app/consents/{$consent->id}/document");
        $signedResponse->assertOk();
        $signedResponse->assertHeader('Content-Type', 'application/pdf');

        // Audit events logged
        $this->assertTrue(AuditEvent::where('action', 'consent_type.document_viewed')->where('resource_id', $type->id)->exists());
        $this->assertTrue(AuditEvent::where('action', 'consent.document_viewed')->where('resource_id', $consent->id)->exists());
    }

    public function test_cross_tenant_access_to_consent_pdf_is_blocked(): void
    {
        Storage::fake('local');
        $clinicA = $this->clinic('clinic-a');
        $clinicB = $this->clinic('clinic-b');

        [$staffA] = $this->staff($clinicA);
        [$staffB] = $this->staff($clinicB);

        $clientA = Client::create(['tenant_id' => $clinicA->id, 'first_name' => 'Eve', 'last_name' => 'Polastri']);

        $pathA = "consents/signed/{$clinicA->id}/signed_a.pdf";
        Storage::disk('local')->put($pathA, 'CONFIDENTIAL CLINIC A PDF');

        $consentA = Consent::create([
            'tenant_id' => $clinicA->id,
            'client_id' => $clientA->id,
            'consent_type_name' => 'Confidential Treatment',
            'agreement_source' => 'pdf',
            'consent_body' => '[PDF Document]',
            'signed_pdf_path' => $pathA,
            'signed_pdf_original_name' => 'confidential.pdf',
            'consent_version' => 1,
            'signer_name' => 'Eve Polastri',
            'signature_type' => 'draw',
            'signature_data' => 'mockData',
            'witnessed_by_user_id' => $staffA->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        // Staff from Clinic B attempts to stream Clinic A's signed PDF document
        $response = $this->actingAs($staffB)
            ->get("http://clinic-b.umahz.test/app/consents/{$consentA->id}/document");

        $this->assertTrue(in_array($response->getStatusCode(), [403, 404], true));
    }

    public function test_signed_pdf_attributes_are_strictly_immutable(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Frank', 'last_name' => 'Castle']);

        $consent = Consent::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'consent_type_name' => 'General Treatment Consent',
            'agreement_source' => 'pdf',
            'consent_body' => '[PDF Document]',
            'signed_pdf_path' => "consents/signed/{$clinic->id}/original.pdf",
            'signed_pdf_original_name' => 'original.pdf',
            'consent_version' => 1,
            'signer_name' => 'Frank Castle',
            'signature_type' => 'draw',
            'signature_data' => 'data:image/png;base64,original',
            'witnessed_by_user_id' => $staff->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        $this->expectException(DomainException::class);
        $consent->update(['signed_pdf_path' => "consents/signed/{$clinic->id}/tampered.pdf"]);
    }

    public function test_consent_pdf_signer_appends_execution_certificate_page(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Grace', 'last_name' => 'Hopper']);

        // Generate a valid minimal PDF
        $tempSource = tempnam(sys_get_temp_dir(), 'umahz_src_') . '.pdf';
        $tempOut = tempnam(sys_get_temp_dir(), 'umahz_out_') . '.pdf';

        // Minimal valid PDF structure
        $minimalPdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n";
        file_put_contents($tempSource, $minimalPdf);

        $consent = Consent::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'consent_type_name' => 'Acupuncture & Needling Agreement',
            'agreement_source' => 'pdf',
            'consent_body' => '[PDF Document]',
            'signed_pdf_path' => 'dummy_path.pdf',
            'signed_pdf_original_name' => 'needling.pdf',
            'consent_version' => 1,
            'signer_name' => 'Grace Hopper',
            'signature_type' => 'typed',
            'signature_data' => 'TYPED_ACKNOWLEDGMENT: Grace Hopper',
            'witnessed_by_user_id' => $staff->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        $success = \App\Services\ConsentPdfSigner::sign($consent, $tempSource, $tempOut);
        $this->assertTrue($success);
        $this->assertFileExists($tempOut);

        $outContent = file_get_contents($tempOut);
        $this->assertStringStartsWith('%PDF-', $outContent);
        $this->assertStringContainsString('%%EOF', $outContent);
        $this->assertGreaterThan(filesize($tempSource), filesize($tempOut));

        // Test idempotency: running again should succeed without issue
        $secondSuccess = \App\Services\ConsentPdfSigner::sign($consent, $tempOut, $tempOut);
        $this->assertTrue($secondSuccess);

        @unlink($tempSource);
        @unlink($tempOut);
    }
}
