<?php

namespace Tests\Feature\Insurance;

use App\Insurance\InsuranceProfessions;
use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClientInsurancePolicy;
use App\Models\InsuranceClaim;
use App\Models\InsuranceProvider;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\PatientBilling\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InsurancePhase1Test extends TestCase
{
    use RefreshDatabase;

    private function tenant(string $slug): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($slug),
            'slug' => $slug,
            'subdomain' => $slug,
            'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'requested_disciplines' => ['physiotherapy', 'massage_therapy'],
            'address' => [
                'line1' => '123 Health Ave',
                'city' => 'Toronto',
                'region' => 'ON',
            ],
        ]);
    }

    private function member(Tenant $tenant, string $role, ?string $profession = null, ?string $registrationNumber = null): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        if ($profession) {
            PractitionerProfile::create([
                'staff_membership_id' => $membership->id,
                'profession' => $profession,
                'registration_number' => $registrationNumber,
                'employment_type' => 'full_time',
            ]);
        }

        return [$user, $membership];
    }

    private function client(Tenant $tenant): Client
    {
        return Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.test',
        ]);
    }

    private function url(Tenant $t, string $path): string
    {
        return "http://{$t->subdomain}.umahz.test".$path;
    }

    private function makeInvoice(Tenant $tenant, Client $client, int $amount = 10_000, ?Appointment $appointment = null): Invoice
    {
        $this->app->instance('current_tenant_id', $tenant->id);
        $invoice = app(InvoiceService::class)->create($tenant, [
            'client_id' => $client->id,
            'appointment_id' => $appointment?->id,
            'line_items' => [['description' => 'Treatment', 'quantity' => 1, 'unit_amount' => $amount]],
        ]);
        $this->app->forgetInstance('current_tenant_id');

        return $invoice;
    }

    public function test_starter_reference_insurance_providers_are_seeded(): void
    {
        // 16 Canadian reference providers seeded
        $providers = InsuranceProvider::availableForTenant()->get();
        $this->assertGreaterThanOrEqual(16, $providers->count());

        $manulife = InsuranceProvider::where('code', 'manulife')->first();
        $this->assertNotNull($manulife);
        $this->assertSame('telus_eclaims', $manulife->network);
        $this->assertTrue($manulife->supports_direct_billing);

        $sunlife = InsuranceProvider::where('code', 'sun_life')->first();
        $this->assertNotNull($sunlife);
        $this->assertSame('sun_life', $sunlife->network);

        $albertaBC = InsuranceProvider::where('code', 'alberta_blue_cross')->first();
        $this->assertNotNull($albertaBC);
        $this->assertSame('AB', $albertaBC->province);
        $this->assertSame('blue_cross', $albertaBC->network);
    }

    public function test_tenant_isolation_on_client_insurance_policies(): void
    {
        $lotus = $this->tenant('lotus');
        $cedar = $this->tenant('cedar');

        [$lotusOwner] = $this->member($lotus, StaffMembership::ROLE_CLINIC_OWNER);
        [$cedarOwner] = $this->member($cedar, StaffMembership::ROLE_CLINIC_OWNER);

        $lotusClient = $this->client($lotus);
        $cedarClient = $this->client($cedar);

        $provider = InsuranceProvider::where('code', 'sun_life')->firstOrFail();

        // Create policy in Lotus
        $policy = ClientInsurancePolicy::create([
            'tenant_id' => $lotus->id,
            'client_id' => $lotusClient->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'POL-123456',
            'member_id' => 'MEM-987654',
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ]);

        // Cedar owner querying Lotus client's policies gets 404
        $this->actingAs($cedarOwner)
            ->getJson($this->url($cedar, "/app/clients/{$lotusClient->id}/insurance/policies"))
            ->assertNotFound();

        // Cedar owner trying to mutate Lotus policy gets 404
        $this->actingAs($cedarOwner)
            ->putJson($this->url($cedar, "/app/clients/{$lotusClient->id}/insurance/policies/{$policy->id}"), [
                'insurance_provider_id' => $provider->id,
                'policy_number' => 'HACKED',
                'member_id' => 'HACKED',
                'plan_holder_name' => 'Hacker',
                'relationship_to_patient' => 'self',
                'priority' => 'primary',
            ])
            ->assertNotFound();

        $this->actingAs($cedarOwner)
            ->deleteJson($this->url($cedar, "/app/clients/{$lotusClient->id}/insurance/policies/{$policy->id}"))
            ->assertNotFound();

        $this->actingAs($cedarOwner)
            ->postJson($this->url($cedar, "/app/clients/{$lotusClient->id}/insurance/policies/{$policy->id}/verify"))
            ->assertNotFound();
    }

    public function test_encryption_of_policy_fields_at_rest(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);
        $provider = InsuranceProvider::where('code', 'manulife')->firstOrFail();

        $policyNumber = 'POL-SECRET-9988';
        $groupNumber = 'GRP-SECRET-7766';
        $memberId = 'MEM-SECRET-4433';
        $certId = 'CERT-SECRET-1122';
        $dob = '1988-11-25';

        $this->actingAs($owner)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies"), [
            'insurance_provider_id' => $provider->id,
            'policy_number' => $policyNumber,
            'group_number' => $groupNumber,
            'member_id' => $memberId,
            'certificate_id' => $certId,
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'plan_holder_dob' => $dob,
            'priority' => 'primary',
        ])->assertStatus(201);

        $policy = ClientInsurancePolicy::where('client_id', $client->id)->firstOrFail();

        // 1. Eloquent decrypts automatically on access
        $this->assertSame($policyNumber, $policy->policy_number);
        $this->assertSame($groupNumber, $policy->group_number);
        $this->assertSame($memberId, $policy->member_id);
        $this->assertSame($certId, $policy->certificate_id);
        $this->assertSame($dob, $policy->plan_holder_dob);

        // 2. Direct database query returns encrypted ciphertext, never plaintext!
        $raw = DB::table('client_insurance_policies')->where('id', $policy->id)->first();
        $this->assertNotSame($policyNumber, $raw->policy_number);
        $this->assertNotSame($groupNumber, $raw->group_number);
        $this->assertNotSame($memberId, $raw->member_id);
        $this->assertNotSame($certId, $raw->certificate_id);
        $this->assertNotSame($dob, $raw->plan_holder_dob);

        $this->assertStringNotContainsString('SECRET-9988', $raw->policy_number);
        $this->assertStringNotContainsString('SECRET-7766', $raw->group_number);
        $this->assertStringNotContainsString('SECRET-4433', $raw->member_id);
        $this->assertStringNotContainsString('SECRET-1122', $raw->certificate_id);
        $this->assertStringNotContainsString('1988-11-25', $raw->plan_holder_dob);

        // 3. Masked helpers return masked numbers
        $this->assertSame('••••9988', $policy->maskedPolicyNumber());
        $this->assertSame('••••4433', $policy->maskedMemberId());
    }

    public function test_member_id_reveal_endpoint_and_access_restrictions(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$receptionist] = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST);
        [$practitioner] = $this->member($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);
        $provider = InsuranceProvider::where('code', 'sun_life')->firstOrFail();

        $policyNumber = 'POL-CONFIDENTIAL-1122';
        $groupNumber = 'GRP-CONFIDENTIAL-3344';
        $memberId = 'MEM-CONFIDENTIAL-5566';
        $certId = 'CERT-CONFIDENTIAL-7788';
        $dob = '1990-04-12';

        $policy = ClientInsurancePolicy::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => $policyNumber,
            'group_number' => $groupNumber,
            'member_id' => $memberId,
            'certificate_id' => $certId,
            'plan_holder_name' => 'Jane Doe',
            'relationship_to_patient' => 'self',
            'plan_holder_dob' => $dob,
            'priority' => 'primary',
        ]);

        // 1. Normal index / page props DO NOT return raw unmasked numbers
        $indexResponse = $this->actingAs($owner)
            ->getJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies"))
            ->assertOk();

        $policyData = $indexResponse->json('policies.0');
        $this->assertArrayNotHasKey('policy_number', $policyData);
        $this->assertArrayNotHasKey('group_number', $policyData);
        $this->assertArrayNotHasKey('member_id', $policyData);
        $this->assertArrayNotHasKey('certificate_id', $policyData);
        $this->assertSame('••••1122', $policyData['masked_policy_number']);
        $this->assertSame('••••5566', $policyData['masked_member_id']);

        // 2. Practitioner calling /reveal is forbidden (403)
        $this->actingAs($practitioner)
            ->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policy->id}/reveal"))
            ->assertForbidden();

        // 3. Receptionist calling /reveal gets full numbers and writes audit log
        $recResponse = $this->actingAs($receptionist)
            ->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policy->id}/reveal"))
            ->assertOk();

        $this->assertSame($memberId, $recResponse->json('member_id'));
        $this->assertSame($policyNumber, $recResponse->json('policy_number'));
        $this->assertSame($groupNumber, $recResponse->json('group_number'));
        $this->assertSame($certId, $recResponse->json('certificate_id'));
        $this->assertSame($dob, $recResponse->json('plan_holder_dob'));

        // 4. Clinic owner calling /reveal gets full numbers
        $ownerResponse = $this->actingAs($owner)
            ->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policy->id}/reveal"))
            ->assertOk();
        $this->assertSame($memberId, $ownerResponse->json('member_id'));

        // 5. Audit event written for reveal, with masked numbers only
        $audit = AuditEvent::where('tenant_id', $tenant->id)
            ->where('action', 'insurance.policy.revealed')
            ->where('resource_id', $policy->id)
            ->latest()
            ->first();

        $this->assertNotNull($audit);
        $metadataJson = json_encode($audit->metadata, JSON_UNESCAPED_UNICODE);
        $this->assertStringNotContainsString('CONFIDENTIAL-5566', $metadataJson);
        $this->assertStringNotContainsString('CONFIDENTIAL-1122', $metadataJson);
        $this->assertSame('••••5566', $audit->metadata['masked_member_id']);
        $this->assertSame('••••1122', $audit->metadata['masked_policy_number']);
    }

    public function test_audit_logs_never_contain_full_policy_or_member_numbers(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);
        $provider = InsuranceProvider::where('code', 'manulife')->firstOrFail();

        $policyNumber = 'POL-SUPERSECRET-1234';
        $memberId = 'MEM-SUPERSECRET-5678';

        $this->actingAs($owner)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies"), [
            'insurance_provider_id' => $provider->id,
            'policy_number' => $policyNumber,
            'member_id' => $memberId,
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ])->assertStatus(201);

        $policy = ClientInsurancePolicy::where('client_id', $client->id)->firstOrFail();

        // Mark verified
        $this->actingAs($owner)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policy->id}/verify"))
            ->assertOk();

        // Check AuditEvent entries
        $events = AuditEvent::where('tenant_id', $tenant->id)
            ->where('resource_id', $policy->id)
            ->get();

        $this->assertGreaterThanOrEqual(2, $events->count());

        foreach ($events as $event) {
            $metadataJson = json_encode($event->metadata, JSON_UNESCAPED_UNICODE);
            // Neither full policy number nor full member ID ever appears in audit metadata
            $this->assertStringNotContainsString('SUPERSECRET-1234', $metadataJson);
            $this->assertStringNotContainsString('SUPERSECRET-5678', $metadataJson);
            // Only masked numbers appear
            $this->assertSame('••••1234', $event->metadata['masked_policy_number']);
            $this->assertSame('••••5678', $event->metadata['masked_member_id']);
        }
    }

    public function test_role_access_rules_practitioner_can_view_only_owners_and_receptionists_can_edit(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$receptionist] = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST);
        [$practitioner] = $this->member($tenant, StaffMembership::ROLE_PRACTITIONER);
        $client = $this->client($tenant);
        $provider = InsuranceProvider::where('code', 'greenshield')->firstOrFail();

        // 1. Receptionist CAN create policy
        $response = $this->actingAs($receptionist)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies"), [
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'POL-REC-1111',
            'member_id' => 'MEM-REC-2222',
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ])->assertStatus(201);

        $policyId = $response->json('policy.id');

        // 2. Practitioner CAN view policy list
        $this->actingAs($practitioner)
            ->getJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies"))
            ->assertOk()
            ->assertJsonCount(1, 'policies');

        // 3. Practitioner CANNOT create, update, delete or verify policy (403 Forbidden)
        $this->actingAs($practitioner)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies"), [
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'POL-PRAC-3333',
            'member_id' => 'MEM-PRAC-4444',
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'secondary',
        ])->assertForbidden();

        $this->actingAs($practitioner)->putJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policyId}"), [
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'POL-MODIFIED',
            'member_id' => 'MEM-MODIFIED',
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ])->assertForbidden();

        $this->actingAs($practitioner)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policyId}/verify"))
            ->assertForbidden();

        $this->actingAs($practitioner)->deleteJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policyId}"))
            ->assertForbidden();

        // 4. Owner CAN verify and update policy
        $this->actingAs($owner)->postJson($this->url($tenant, "/app/clients/{$client->id}/insurance/policies/{$policyId}/verify"))
            ->assertOk();

        $policy = ClientInsurancePolicy::findOrFail($policyId);
        $this->assertTrue($policy->isVerified());
        $this->assertSame($owner->id, $policy->verified_by);
    }

    public function test_mapping_of_custom_disciplines_and_standard_disciplines(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        // 1. Verify standard discipline mapping
        $this->assertSame('physiotherapy', $tenant->professionForDiscipline('physiotherapy'));
        $this->assertSame('Physiotherapy', $tenant->professionLabelForDiscipline('physiotherapy'));

        $this->assertSame('massage_therapy', $tenant->professionForDiscipline('massage_therapy'));
        $this->assertSame('Massage Therapy', $tenant->professionLabelForDiscipline('massage_therapy'));

        $this->assertSame('chiropractic', $tenant->professionForDiscipline('chiropractor'));
        $this->assertNull($tenant->professionForDiscipline('nutrition')); // Standard nutrition is null (not insurance billable)
        $this->assertNull($tenant->professionForDiscipline('personal_training'));
        $this->assertNull($tenant->professionForDiscipline('colon_hydrotherapy'));

        // 2. Map custom disciplines in Clinic Settings (including custom dietitian mapping)
        $this->actingAs($owner)->patch($this->url($tenant, '/app/settings/disciplines'), [
            'disciplines' => ['physiotherapy', 'kinesiology', 'sound_bath', 'clinical_nutrition'],
            'custom_disciplines' => [
                [
                    'slug' => 'kinesiology',
                    'label' => 'Kinesiology & Movement',
                    'recognized_profession' => 'physiotherapy',
                ],
                [
                    'slug' => 'sound_bath',
                    'label' => 'Sound Bath Meditation',
                    'recognized_profession' => null, // Not insurance billable
                ],
                [
                    'slug' => 'clinical_nutrition',
                    'label' => 'Clinical Dietetics & Nutrition',
                    'recognized_profession' => 'dietitian', // Clinics can still map custom disciplines to dietitian
                ],
            ],
        ])->assertRedirect();

        $tenant->refresh();

        // Kinesiology maps to Physiotherapy
        $this->assertSame('physiotherapy', $tenant->professionForDiscipline('kinesiology'));
        $this->assertSame('Physiotherapy', $tenant->professionLabelForDiscipline('kinesiology'));

        // Custom clinical nutrition maps to Dietitian
        $this->assertSame('dietitian', $tenant->professionForDiscipline('clinical_nutrition'));
        $this->assertSame('Dietitian', $tenant->professionLabelForDiscipline('clinical_nutrition'));

        // Sound bath is not insurance billable
        $this->assertNull($tenant->professionForDiscipline('sound_bath'));
        $this->assertNull($tenant->professionLabelForDiscipline('sound_bath'));

        // 3. Trying to set an invalid recognized profession triggers validation error
        $this->actingAs($owner)->patch($this->url($tenant, '/app/settings/disciplines'), [
            'disciplines' => ['physiotherapy', 'kinesiology'],
            'custom_disciplines' => [
                [
                    'slug' => 'kinesiology',
                    'label' => 'Kinesiology',
                    'recognized_profession' => 'invalid_profession_xyz',
                ],
            ],
        ])->assertSessionHasErrors('custom_disciplines');
    }

    public function test_manual_insurance_portion_creates_claim_and_correct_patient_balance(): void
    {
        $tenant = $this->tenant('lotus');
        [$receptionist] = $this->member($tenant, StaffMembership::ROLE_RECEPTIONIST);
        $client = $this->client($tenant);
        $provider = InsuranceProvider::where('code', 'sun_life')->firstOrFail();

        $policy = ClientInsurancePolicy::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'SUN-12345',
            'member_id' => 'MBR-98765',
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ]);

        // Invoice for $100.00 (10,000 cents)
        $invoice = $this->makeInvoice($tenant, $client, 10_000);
        $this->assertSame(10_000, $invoice->total_amount);
        $this->assertSame(10_000, $invoice->amountDue());
        $this->assertSame(Invoice::STATUS_OPEN, $invoice->status);

        // 1. Record manual claim with status 'approved' (awaiting insurer payment)
        $response = $this->actingAs($receptionist)->postJson($this->url($tenant, "/app/invoices/{$invoice->id}/insurance-claim"), [
            'client_insurance_policy_id' => $policy->id,
            'amount_approved' => 7_500,
            'external_reference' => 'SUN-EOB-001',
            'notes' => '75% coverage approved, awaiting payment',
            'status' => 'approved',
        ])->assertStatus(201);

        $claim = InsuranceClaim::where('invoice_id', $invoice->id)->firstOrFail();
        $this->assertSame(7_500, $claim->amount_approved);
        $this->assertSame(2_500, $claim->patient_balance);
        $this->assertSame('SUN-EOB-001', $claim->external_reference);
        $this->assertSame('manual', $claim->claim_type);
        $this->assertSame('approved', $claim->status);

        // Claim event created for approved status
        $this->assertDatabaseHas('insurance_claim_events', [
            'claim_id' => $claim->id,
            'status' => 'approved',
        ]);

        // IMPORTANT: Because status is 'approved' (awaiting payment), NO payment is created yet!
        $this->assertDatabaseMissing('payments', [
            'invoice_id' => $invoice->id,
            'method' => Payment::METHOD_INSURANCE,
        ]);

        // Invoice balance is NOT yet reduced
        $invoice->refresh();
        $this->assertSame(0, $invoice->amount_paid);
        $this->assertSame(10_000, $invoice->amountDue());
        $this->assertSame(Invoice::STATUS_OPEN, $invoice->status);

        // 2. Now call "mark payment received" action
        $markPaidResponse = $this->actingAs($receptionist)->postJson($this->url($tenant, "/app/invoices/{$invoice->id}/insurance-claims/{$claim->id}/mark-paid"), [
            'notes' => 'Direct deposit received from Sun Life',
        ])->assertOk();

        $claim->refresh();
        $this->assertSame('paid', $claim->status);

        // Payment record is created upon marking paid
        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'method' => Payment::METHOD_INSURANCE,
            'amount' => 7_500,
            'status' => Payment::STATUS_SUCCEEDED,
        ]);

        // Status event history recorded
        $this->assertDatabaseHas('insurance_claim_events', [
            'claim_id' => $claim->id,
            'status' => 'paid',
        ]);

        // Invoice balance is now reduced by the insurance payment
        $invoice->refresh();
        $this->assertSame(7_500, $invoice->amount_paid);
        $this->assertSame(2_500, $invoice->amountDue());
        $this->assertSame(Invoice::STATUS_OPEN, $invoice->status);

        // Audit event written for payment received
        $this->assertDatabaseHas('audit_events', [
            'action' => 'insurance.claim.payment_received',
            'resource_id' => $claim->id,
        ]);

        // Trying to mark paid again is rejected
        $this->actingAs($receptionist)->postJson($this->url($tenant, "/app/invoices/{$invoice->id}/insurance-claims/{$claim->id}/mark-paid"))
            ->assertStatus(422);

        // 3. Pay remaining patient balance ($25.00) via manual cash payment
        $this->actingAs($receptionist)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'method' => 'cash',
            'amount' => 2_500,
        ])->assertRedirect();

        $invoice->refresh();
        $this->assertSame(10_000, $invoice->amount_paid);
        $this->assertSame(0, $invoice->amountDue());
        $this->assertSame(Invoice::STATUS_PAID, $invoice->status);

        // 4. Test recording directly with status 'paid'
        $invoice2 = $this->makeInvoice($tenant, $client, 5_000);
        $this->actingAs($receptionist)->postJson($this->url($tenant, "/app/invoices/{$invoice2->id}/insurance-claim"), [
            'client_insurance_policy_id' => $policy->id,
            'amount_approved' => 5_000,
            'status' => 'paid',
        ])->assertStatus(201);

        $invoice2->refresh();
        $this->assertSame(5_000, $invoice2->amount_paid);
        $this->assertSame(Invoice::STATUS_PAID, $invoice2->status);
    }

    public function test_insurance_providers_are_global_reference_data_readable_by_all_tenants(): void
    {
        $lotus = $this->tenant('lotus');
        $cedar = $this->tenant('cedar');

        // All reference providers have tenant_id = null
        $referenceProviders = InsuranceProvider::whereNull('tenant_id')->get();
        $this->assertGreaterThanOrEqual(16, $referenceProviders->count());

        foreach ($referenceProviders as $rp) {
            $this->assertNull($rp->tenant_id);
            $this->assertTrue($rp->active);
        }

        // Available to Lotus
        $lotusProviders = InsuranceProvider::availableForTenant($lotus->id)->get();
        $this->assertGreaterThanOrEqual(16, $lotusProviders->count());

        // Available to Cedar
        $cedarProviders = InsuranceProvider::availableForTenant($cedar->id)->get();
        $this->assertGreaterThanOrEqual(16, $cedarProviders->count());

        // Running InsuranceProviderSeeder is idempotent
        $this->seed(\Database\Seeders\InsuranceProviderSeeder::class);
        $this->assertCount($referenceProviders->count(), InsuranceProvider::whereNull('tenant_id')->get());
    }

    public function test_receipt_shows_insurer_masked_member_id_practitioner_profession_registration_and_service_date(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$practitioner, $pracMembership] = $this->member(
            $tenant,
            StaffMembership::ROLE_PRACTITIONER,
            profession: 'massage_therapy',
            registrationNumber: 'RMT-ON-54321'
        );

        $client = $this->client($tenant);
        $provider = InsuranceProvider::where('code', 'canada_life')->firstOrFail();

        $policy = ClientInsurancePolicy::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'CL-GROUP-8899',
            'member_id' => 'CL-CERT-776655',
            'plan_holder_name' => 'John Doe',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ]);

        // Appointment with practitioner (60 min duration)
        $serviceDate = '2026-11-10';
        $appointment = Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $pracMembership->id,
            'service_name' => 'Therapeutic Massage',
            'starts_at' => "{$serviceDate} 10:00:00",
            'ends_at' => "{$serviceDate} 11:00:00",
            'status' => Appointment::STATUS_COMPLETED,
        ]);

        $invoice = $this->makeInvoice($tenant, $client, 12_000, $appointment);

        // Record insurance claim for $100.00
        $this->actingAs($owner)->postJson($this->url($tenant, "/app/invoices/{$invoice->id}/insurance-claim"), [
            'client_insurance_policy_id' => $policy->id,
            'amount_approved' => 10_000,
            'status' => 'paid',
        ])->assertStatus(201);

        // Fetch receipt
        $response = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}/receipt"))
            ->assertOk();

        $pageProps = $response->viewData('page')['props'];
        $receiptDetails = $pageProps['invoice']['receipt_details'];
        $clinic = $pageProps['clinic'];

        $this->assertNotNull($receiptDetails);
        $this->assertSame('Canada Life', $receiptDetails['insurer_name']);
        $this->assertSame('••••6655', $receiptDetails['member_id_masked']);
        $this->assertSame($practitioner->name, $receiptDetails['practitioner_name']);
        $this->assertSame('Massage Therapy', $receiptDetails['profession']);
        $this->assertSame('RMT-ON-54321', $receiptDetails['registration_number']);
        $this->assertTrue($receiptDetails['has_registration_number']);
        // Consistent date format: "Nov 10, 2026"
        $this->assertSame('Nov 10, 2026', $receiptDetails['service_date']);
        $this->assertSame(10_000, $receiptDetails['amount_approved']);
        $this->assertSame(2_000, $receiptDetails['patient_balance']);

        // Clinic address_text under clinic name
        $this->assertSame('123 Health Ave, Toronto, ON', $clinic['address_text']);

        // Appointment duration shown next to service
        $this->assertSame('Therapeutic Massage - 60 min', $receiptDetails['service']);
        $this->assertStringContainsString('60 min', $pageProps['invoice']['line_items'][0]['description']);
    }

    public function test_receipt_unpaid_shows_invoice_and_paid_shows_receipt(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        // 1. Unpaid invoice (amount_paid = 0)
        $invoice = $this->makeInvoice($tenant, $client, 8_000);
        $response = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}/receipt"))
            ->assertOk();

        $invoiceProp = $response->viewData('page')['props']['invoice'];
        $this->assertSame(0, $invoiceProp['amount_paid']);
        $this->assertSame(8_000, $invoiceProp['amount_due']);

        // 2. Paid invoice (amount_paid > 0)
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'method' => 'cash',
            'amount' => 8_000,
        ])->assertRedirect();

        $responsePaid = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}/receipt"))
            ->assertOk();

        $paidInvoiceProp = $responsePaid->viewData('page')['props']['invoice'];
        $this->assertSame(8_000, $paidInvoiceProp['amount_paid']);
        $this->assertSame(0, $paidInvoiceProp['amount_due']);
    }

    public function test_practitioner_registration_number_missing_warning_and_fallback(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$practitioner, $pracMembership] = $this->member(
            $tenant,
            StaffMembership::ROLE_PRACTITIONER,
            profession: 'acupuncture',
            registrationNumber: null // Missing registration number!
        );

        $client = $this->client($tenant);
        $appointment = Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $pracMembership->id,
            'service_name' => 'Acupuncture Initial',
            'starts_at' => '2026-10-15 14:00:00',
            'ends_at' => '2026-10-15 15:00:00',
            'status' => Appointment::STATUS_COMPLETED,
        ]);

        $invoice = $this->makeInvoice($tenant, $client, 9_000, $appointment);

        // 1. Warning on InvoiceShow when registration number is missing
        $showResponse = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}"))
            ->assertOk();

        $invoiceData = $showResponse->viewData('page')['props']['invoice'];
        $this->assertFalse($invoiceData['receipt_details']['has_registration_number']);
        $this->assertSame('Not provided', $invoiceData['receipt_details']['registration_number']);

        // Receipt also always shows the row, with "Not provided"
        $receiptResponse = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}/receipt"))
            ->assertOk();
        $receiptData = $receiptResponse->viewData('page')['props']['invoice']['receipt_details'];
        $this->assertSame('Not provided', $receiptData['registration_number']);

        // 2. Set license_number on PractitionerProfile: fallback correctly reads it!
        $pracMembership->practitionerProfile->update([
            'license_number' => 'ACU-LIC-9988',
        ]);

        $showResponseAfter = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}"))
            ->assertOk();
        $invoiceDataAfter = $showResponseAfter->viewData('page')['props']['invoice'];
        $this->assertTrue($invoiceDataAfter['receipt_details']['has_registration_number']);
        $this->assertSame('ACU-LIC-9988', $invoiceDataAfter['receipt_details']['registration_number']);
    }

    public function test_dates_use_consistent_month_day_year_format(): void
    {
        $tenant = $this->tenant('lotus');
        [$owner, $ownerMembership] = $this->member($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $serviceDate = '2026-10-07';
        $appointment = Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $ownerMembership->id,
            'service_name' => 'Follow-up Acupuncture Session',
            'starts_at' => "{$serviceDate} 09:00:00",
            'ends_at' => "{$serviceDate} 10:00:00",
            'status' => Appointment::STATUS_COMPLETED,
        ]);

        $invoice = $this->makeInvoice($tenant, $client, 7_500, $appointment);
        $invoice->update(['due_date' => '2026-10-21']);

        // Pay invoice
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'method' => 'etransfer',
            'amount' => 7_500,
        ])->assertRedirect();

        $response = $this->actingAs($owner)->get($this->url($tenant, "/app/invoices/{$invoice->id}/receipt"))
            ->assertOk();

        $invoiceProp = $response->viewData('page')['props']['invoice'];
        $details = $invoiceProp['receipt_details'];

        // Consistent "Oct 7, 2026" format (M j, Y)
        $dateRegex = '/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/';

        $this->assertSame('Oct 7, 2026', $details['service_date']);
        $this->assertMatchesRegularExpression($dateRegex, $details['service_date']);
        $this->assertMatchesRegularExpression($dateRegex, $invoiceProp['receipt_date']);
        $this->assertMatchesRegularExpression($dateRegex, $invoiceProp['due_date']);
        $this->assertSame('Oct 21, 2026', $invoiceProp['due_date']);

        $payment = $invoiceProp['payments'][0];
        $this->assertMatchesRegularExpression($dateRegex, $payment['processed_at_formatted']);

        // Ensure duration is shown next to service
        $this->assertSame('Follow-up Acupuncture Session - 60 min', $details['service']);
    }
}
