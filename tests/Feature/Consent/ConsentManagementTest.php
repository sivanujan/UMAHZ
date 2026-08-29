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
use Tests\TestCase;

class ConsentManagementTest extends TestCase
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

    public function test_default_consent_types_are_ensured_with_null_body_placeholder(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic);

        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        // Visiting client profile triggers ensureDefaultsForTenant
        $response = $this->actingAs($owner)->get("http://lotus.umahz.test/app/clients/{$client->id}");
        $response->assertOk();

        // Defaults exist
        $types = ConsentType::where('tenant_id', $clinic->id)->get();
        $this->assertCount(2, $types);

        $general = $types->firstWhere('code', ConsentType::CODE_GENERAL_TREATMENT);
        $sensitive = $types->firstWhere('code', ConsentType::CODE_SENSITIVE_AREA);

        $this->assertNotNull($general);
        $this->assertNotNull($sensitive);

        // Body must NOT be fabricated; it must be null until clinic supplies it
        $this->assertNull($general->body);
        $this->assertNull($sensitive->body);
    }

    public function test_cannot_record_consent_when_clinic_has_not_configured_text(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic, StaffMembership::ROLE_RECEPTIONIST);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'General Treatment Consent',
            'code' => 'general_treatment',
            'body' => null, // Not configured
            'is_active' => true,
        ]);

        $response = $this->actingAs($staff)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/consents", [
                'consent_type_id' => $type->id,
                'signer_name' => 'Alice Walker',
                'signature_type' => 'draw',
                'signature_data' => 'data:image/png;base64,mockSignatureData',
            ]);

        $response->assertSessionHasErrors('consent_type_id');
        $this->assertSame(0, Consent::where('tenant_id', $clinic->id)->count());
    }

    public function test_staff_can_record_consent_with_configured_text(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic, StaffMembership::ROLE_PRACTITIONER);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $consentText = "I consent to receive assessment and treatment by Lotus Wellness staff.\nRisks and alternatives have been discussed.";

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'General Treatment Consent',
            'code' => 'general_treatment',
            'body' => $consentText,
            'is_active' => true,
        ]);

        $response = $this->actingAs($staff)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/consents", [
                'consent_type_id' => $type->id,
                'signer_name' => 'Alice Walker',
                'signature_type' => 'draw',
                'signature_data' => 'data:image/png;base64,mockSignatureImage',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $consent = Consent::where('client_id', $client->id)->first();
        $this->assertNotNull($consent);
        $this->assertSame($clinic->id, $consent->tenant_id);
        $this->assertSame('General Treatment Consent', $consent->consent_type_name);
        $this->assertSame($consentText, $consent->consent_body);
        $this->assertSame('Alice Walker', $consent->signer_name);
        $this->assertSame('draw', $consent->signature_type);
        $this->assertSame('data:image/png;base64,mockSignatureImage', $consent->signature_data);
        $this->assertSame($staff->id, $consent->witnessed_by_user_id);
        $this->assertSame(Consent::STATUS_ACTIVE, $consent->status);

        // Audit Event created
        $audit = AuditEvent::where('resource_id', $consent->id)
            ->where('action', 'consent.recorded')
            ->first();
        $this->assertNotNull($audit);
        $this->assertSame($staff->id, $audit->user_id);
    }

    public function test_signed_consent_is_immutable_and_cannot_be_altered(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $consent = Consent::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'consent_type_name' => 'General Treatment Consent',
            'consent_body' => 'Original agreed text',
            'signer_name' => 'Alice Walker',
            'signature_type' => 'draw',
            'signature_data' => 'data:image/png;base64,original',
            'witnessed_by_user_id' => $staff->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        $this->expectException(DomainException::class);
        $consent->update(['consent_body' => 'Tampered text']);
    }

    public function test_staff_can_withdraw_a_consent_and_history_is_preserved(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $consent = Consent::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'consent_type_name' => 'Sensitive-Area Consent',
            'consent_body' => 'Sensitive area treatment terms...',
            'signer_name' => 'Alice Walker',
            'signature_type' => 'typed',
            'signature_data' => 'TYPED_ACKNOWLEDGMENT: Alice Walker',
            'witnessed_by_user_id' => $staff->id,
            'agreed_at' => now()->subDays(5),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        $response = $this->actingAs($staff)
            ->patch("http://lotus.umahz.test/app/consents/{$consent->id}/withdraw", [
                'reason' => 'Patient requested revocation of sensitive area consent.',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $consent->refresh();
        $this->assertSame(Consent::STATUS_WITHDRAWN, $consent->status);
        $this->assertNotNull($consent->withdrawn_at);
        $this->assertSame($staff->id, $consent->withdrawn_by_user_id);
        $this->assertSame('Patient requested revocation of sensitive area consent.', $consent->withdrawal_reason);

        // Record still exists (not deleted)
        $this->assertSame(1, Consent::where('client_id', $client->id)->count());

        // Audit Event created
        $audit = AuditEvent::where('resource_id', $consent->id)
            ->where('action', 'consent.withdrawn')
            ->first();
        $this->assertNotNull($audit);
        $this->assertSame('Patient requested revocation of sensitive area consent.', $audit->reason);
    }

    public function test_cross_tenant_access_to_consent_is_blocked(): void
    {
        $clinicA = $this->clinic('clinic-a');
        $clinicB = $this->clinic('clinic-b');

        [$staffA] = $this->staff($clinicA);
        [$staffB] = $this->staff($clinicB);

        $clientA = Client::create(['tenant_id' => $clinicA->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $consentA = Consent::create([
            'tenant_id' => $clinicA->id,
            'client_id' => $clientA->id,
            'consent_type_name' => 'General Consent',
            'consent_body' => 'Clinic A text',
            'signer_name' => 'Alice Walker',
            'signature_type' => 'draw',
            'signature_data' => 'mockSig',
            'witnessed_by_user_id' => $staffA->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        // Staff from Clinic B tries to view Clinic A's consent on Clinic B's subdomain
        $response = $this->actingAs($staffB)
            ->get("http://clinic-b.umahz.test/app/consents/{$consentA->id}");

        // Scoped query fails with 404 or 403
        $this->assertTrue(in_array($response->getStatusCode(), [403, 404], true));

        // Staff from Clinic B tries to withdraw Clinic A's consent on Clinic B's subdomain
        $withdrawResponse = $this->actingAs($staffB)
            ->patch("http://clinic-b.umahz.test/app/consents/{$consentA->id}/withdraw", [
                'reason' => 'Unauthorized attempt',
            ]);

        $this->assertTrue(in_array($withdrawResponse->getStatusCode(), [403, 404], true));
    }

    public function test_viewing_signed_consent_creates_audit_event(): void
    {
        $clinic = $this->clinic('lotus');
        [$staff] = $this->staff($clinic);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $consent = Consent::create([
            'tenant_id' => $clinic->id,
            'client_id' => $client->id,
            'consent_type_name' => 'General Treatment Consent',
            'consent_body' => 'Approved treatment terms.',
            'signer_name' => 'Alice Walker',
            'signature_type' => 'draw',
            'signature_data' => 'mockSig',
            'witnessed_by_user_id' => $staff->id,
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        $response = $this->actingAs($staff)
            ->getJson("http://lotus.umahz.test/app/consents/{$consent->id}");

        $response->assertOk();
        $response->assertJsonPath('consent.signer_name', 'Alice Walker');

        $audit = AuditEvent::where('resource_id', $consent->id)
            ->where('action', 'consent.viewed')
            ->first();
        $this->assertNotNull($audit);
    }

    public function test_clinic_owner_can_configure_consent_type_text_and_add_types(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);

        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'General Treatment Consent',
            'code' => 'general_treatment',
            'body' => null,
            'is_active' => true,
        ]);

        // Owner configures consent agreement text
        $updateResponse = $this->actingAs($owner)
            ->patch("http://lotus.umahz.test/app/settings/consents/{$type->id}", [
                'name' => 'General Treatment Consent',
                'description' => 'Required for all new patients.',
                'body' => "Official clinic consent text.\nAll care must be agreed upon.",
                'is_active' => true,
            ]);

        $updateResponse->assertSessionHasNoErrors();
        $this->assertSame("Official clinic consent text.\nAll care must be agreed upon.", $type->fresh()->body);

        // Owner creates a new custom consent type
        $createResponse = $this->actingAs($owner)
            ->post('http://lotus.umahz.test/app/settings/consents', [
                'name' => 'Dry Needling Consent',
                'description' => 'Required for acupuncture and trigger-point needling.',
                'body' => 'Needling specific agreement terms...',
            ]);

        $createResponse->assertSessionHasNoErrors();
        $this->assertTrue(ConsentType::where('tenant_id', $clinic->id)->where('name', 'Dry Needling Consent')->exists());
    }

    public function test_updating_consent_type_text_does_not_alter_past_signed_consents(): void
    {
        $clinic = $this->clinic('lotus');
        [$owner] = $this->staff($clinic, StaffMembership::ROLE_CLINIC_OWNER);
        $client = Client::create(['tenant_id' => $clinic->id, 'first_name' => 'Alice', 'last_name' => 'Walker']);

        $originalWording = 'Version 1.0 Terms: Initial Assessment Consent.';
        $type = ConsentType::create([
            'tenant_id' => $clinic->id,
            'name' => 'General Treatment Consent',
            'code' => 'general_treatment',
            'body' => $originalWording,
            'is_active' => true,
        ]);

        // Client signs Version 1.0
        $this->actingAs($owner)
            ->post("http://lotus.umahz.test/app/clients/{$client->id}/consents", [
                'consent_type_id' => $type->id,
                'signer_name' => 'Alice Walker',
                'signature_type' => 'draw',
                'signature_data' => 'data:image/png;base64,sampleSig',
            ])->assertSessionHasNoErrors();

        $consent = Consent::where('client_id', $client->id)->first();
        $this->assertSame($originalWording, $consent->consent_body);

        // Later, clinic updates the consent type to Version 2.0
        $updatedWording = 'Version 2.0 Terms: Updated Clinic Protocol and Disclosures.';
        $this->actingAs($owner)
            ->patch("http://lotus.umahz.test/app/settings/consents/{$type->id}", [
                'name' => 'General Treatment Consent',
                'description' => 'Updated protocol.',
                'body' => $updatedWording,
                'is_active' => true,
            ])->assertSessionHasNoErrors();

        // The signed consent record must remain strictly on the Version 1.0 snapshot!
        $this->assertSame($originalWording, $consent->fresh()->consent_body);
        $this->assertNotSame($updatedWording, $consent->fresh()->consent_body);
    }
}
