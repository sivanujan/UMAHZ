<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteTemplate;
use App\Models\Consent;
use App\Models\ConsentType;
use App\Models\Invoice;
use App\Models\Location;
use App\Models\Plan;
use App\Models\PlatformSetting;
use App\Models\Room;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class EntitlementsEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
    }

    protected function createTenant(string $subdomain, array $attributes = []): Tenant
    {
        return Tenant::create(array_merge([
            'id' => (string) Str::uuid(),
            'name' => ucfirst($subdomain) . ' Health',
            'slug' => $subdomain,
            'subdomain' => $subdomain,
            'status' => Tenant::STATUS_APPROVED,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'currency' => 'cad',
            'timezone' => 'America/Toronto',
            'onboarding_completed_at' => now(),
            'business_hours' => [
                'monday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'tuesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'wednesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'thursday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'friday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'saturday' => ['closed' => true, 'open' => '09:00', 'close' => '17:00'],
                'sunday' => ['closed' => true, 'open' => '09:00', 'close' => '17:00'],
            ],
        ], $attributes));
    }

    protected function createStaff(Tenant $tenant, string $role = StaffMembership::ROLE_CLINIC_OWNER): array
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

    protected function url(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.umahz.test" . $path;
    }

    /**
     * Requirement 3: Read/export always (all non-active states: past_due, restricted_overdue, canceled, suspended-by-billing).
     * Staff can always log in, view, search and export clients, notes, reports.
     * Only create/store actions are blocked.
     */
    public function test_read_and_export_works_in_non_active_states_while_write_is_blocked(): void
    {
        $nonActiveStates = [
            Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE,
            Tenant::SUBSCRIPTION_CANCELED,
        ];

        foreach ($nonActiveStates as $state) {
            $subdomain = 'clinic-' . str_replace('_', '-', $state);
            $tenant = $this->createTenant($subdomain, [
                'subscription_status' => $state,
            ]);

            [$user] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

            $client = Client::create([
                'tenant_id' => $tenant->id,
                'first_name' => 'Alice',
                'last_name' => 'Smith',
                'email' => "alice-{$subdomain}@example.com",
            ]);

            // 1. READ: Can view clients index
            $response = $this->actingAs($user)
                ->get($this->url($tenant, '/app/clients'));
            $response->assertStatus(200);

            // 2. READ: Can view individual client
            $response = $this->actingAs($user)
                ->get($this->url($tenant, "/app/clients/{$client->id}"));
            $response->assertStatus(200);

            // 3. EXPORT: Can export appointments report
            $response = $this->actingAs($user)
                ->get($this->url($tenant, '/app/reports/appointments/export'));
            $response->assertStatus(200);

            // 4. WRITE: Creating a new client is blocked by subscription.write middleware
            $writeResponse = $this->actingAs($user)
                ->post($this->url($tenant, '/app/clients'), [
                    'first_name' => 'Bob',
                    'last_name' => 'Jones',
                    'email' => "bob-{$subdomain}@example.com",
                ]);
            $writeResponse->assertSessionHasErrors(['subscription']);

            // 5. JSON WRITE: API receives 403 with requires_payment_update
            $jsonWrite = $this->actingAs($user)
                ->postJson($this->url($tenant, '/app/clients'), [
                    'first_name' => 'Bob',
                    'last_name' => 'Jones',
                    'email' => "bobj-{$subdomain}@example.com",
                ]);
            $jsonWrite->assertStatus(403);
            $jsonWrite->assertJsonPath('requires_payment_update', true);

            // 6. CARE DOCUMENTATION FOR EXISTING CLIENTS IS ALLOWED:
            // Notes for existing client:
            $noteResponse = $this->actingAs($user)
                ->post($this->url($tenant, "/app/clients/{$client->id}/notes"), [
                    'subjective' => 'Existing patient check-up details',
                ]);
            $this->assertFalse($noteResponse->isForbidden(), "Notes store should not be blocked for existing client");

            // Invoices for existing client:
            $invoiceResponse = $this->actingAs($user)
                ->post($this->url($tenant, '/app/invoices'), [
                    'client_id' => $client->id,
                    'items' => [
                        ['description' => 'Follow up visit', 'unit_amount' => 5000, 'quantity' => 1],
                    ],
                ]);
            $this->assertFalse($invoiceResponse->isForbidden(), "Invoices store should not be blocked");

            // Consents for existing client:
            $consentResponse = $this->actingAs($user)
                ->post($this->url($tenant, "/app/clients/{$client->id}/consents"), [
                    'consent_type' => 'gdpr',
                    'signature' => 'data:image/png;base64,sample',
                ]);
            $this->assertFalse($consentResponse->isForbidden(), "Consents store should not be blocked");

            // Intakes for existing client:
            $intakeLinkResponse = $this->actingAs($user)
                ->post($this->url($tenant, "/app/clients/{$client->id}/intakes/link"));
            $this->assertFalse($intakeLinkResponse->isForbidden(), "Intake link store should not be blocked");

            // 7. GROWTH ACTIONS ARE BLOCKED:
            // Appointments store:
            $aptResponse = $this->actingAs($user)
                ->post($this->url($tenant, '/app/appointments'), []);
            $aptResponse->assertSessionHasErrors(['subscription']);

            // Staff invite:
            $staffResponse = $this->actingAs($user)
                ->post($this->url($tenant, '/app/staff'), ['email' => 'newstaff@example.com', 'role' => 'practitioner']);
            $staffResponse->assertSessionHasErrors(['subscription']);

            // Scribe new session:
            $scribeResponse = $this->actingAs($user)
                ->postJson($this->url($tenant, '/app/scribe/sessions'), []);
            $scribeResponse->assertStatus(403);
        }
    }

    /**
     * Requirement 2: Patient friendly message when clinic has restricted write access.
     */
    public function test_write_restricted_patient_gets_friendly_message(): void
    {
        $tenant = $this->createTenant('patient-sub-check', [
            'subscription_status' => Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE,
        ]);

        $patientUser = User::factory()->create();

        // Direct request through middleware with patient user
        app()->instance('current_tenant_id', $tenant->id);
        $request = \Illuminate\Http\Request::create('/portal/appointments', 'POST');
        $request->setUserResolver(fn () => $patientUser);
        $request->setLaravelSession(session()->driver());

        $middleware = app(\App\Http\Middleware\EnsureSubscriptionWriteAccess::class);
        $response = $middleware->handle($request, fn () => response('OK'));

        $this->assertEquals(302, $response->getStatusCode());
        $this->assertTrue(session()->has('errors'));
        $this->assertSame(
            'Online booking is temporarily unavailable. Please contact the clinic directly to schedule your appointment.',
            session('errors')->first('subscription')
        );

        // JSON response test
        $jsonRequest = \Illuminate\Http\Request::create('/portal/appointments', 'POST');
        $jsonRequest->headers->set('Accept', 'application/json');
        $jsonRequest->setUserResolver(fn () => $patientUser);
        $jsonResponse = $middleware->handle($jsonRequest, fn () => response()->json(['OK']));
        $this->assertEquals(403, $jsonResponse->getStatusCode());
        $data = json_decode($jsonResponse->getContent(), true);
        $this->assertSame(
            'Online booking is temporarily unavailable. Please contact the clinic directly to schedule your appointment.',
            $data['message']
        );
        $this->assertFalse($data['requires_payment_update']);
        $this->assertNull($data['action_url']);
    }

    /**
     * Requirement 3: Platform admin abuse suspension (is_manually_suspended = true)
     * STILL completely blocks all access and redirects to status.
     */
    public function test_platform_admin_abuse_suspension_blocks_all_access(): void
    {
        $tenant = $this->createTenant('abuse-clinic', [
            'status' => Tenant::STATUS_SUSPENDED,
            'is_manually_suspended' => true,
        ]);

        [$user] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        // Even read requests are redirected to /clinic/status because of abuse suspension
        $response = $this->actingAs($user)->get($this->url($tenant, '/app/clients'));
        $response->assertRedirect($this->url($tenant, '/clinic/status'));
    }

    /**
     * Requirement 7: Scribe recording in progress is never cut off.
     * Only starting a new session recording checks the allowance.
     */
    public function test_scribe_recording_in_progress_is_not_cut_off(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();
        $essentialPlan->update([
            'scribe_allowance_amount' => 10, // 10 minutes limit
            'scribe_limit_behavior' => 'block',
            'needs_review' => false,
            'needs_review_fields' => [],
        ]);

        $tenant = $this->createTenant('scribe-live', [
            'plan_id' => $essentialPlan->id,
            'scribe_settings' => ['enabled' => true],
        ]);

        [$user, $membership] = $this->createStaff($tenant, StaffMembership::ROLE_PRACTITIONER);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
        ]);

        // Create an existing session that already used up all 10 minutes (600,000 ms)
        ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'created_by_user_id' => $user->id,
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
            'recorded_ms' => 600000,
        ]);

        // Attempting to OPEN a new session is blocked because allowance is exceeded
        $openResponse = $this->actingAs($user)
            ->postJson($this->url($tenant, '/app/scribe/sessions'), [
                'client_id' => $client->id,
            ]);
        $openResponse->assertStatus(403);
        $openResponse->assertJsonPath('code', 'scribe_allowance_exceeded');

        // However, a session that was ALREADY IN PROGRESS (status = recording)
        // is NEVER cut off: pause, resume, stop still work!
        $consentType = ConsentType::firstOrCreate(
            ['tenant_id' => $tenant->id, 'code' => ConsentType::CODE_AI_SCRIBE_RECORDING],
            ['name' => 'AI Scribe Recording Consent', 'is_active' => true]
        );

        $consent = Consent::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'consent_type_id' => $consentType->id,
            'consent_type_name' => 'AI Scribe Recording Consent',
            'signer_name' => 'John Doe',
            'signature_type' => 'typed',
            'signature_data' => 'John Doe',
            'agreed_at' => now(),
            'status' => Consent::STATUS_ACTIVE,
        ]);

        $inProgressSession = ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'created_by_user_id' => $user->id,
            'consent_id' => $consent->id,
            'status' => ScribeSession::STATUS_RECORDING,
            'recorded_ms' => 120000,
        ]);

        // Pause should succeed
        $pauseResponse = $this->actingAs($user)
            ->postJson($this->url($tenant, "/app/scribe/sessions/{$inProgressSession->id}/pause"));
        $pauseResponse->assertStatus(200);

        // Resume should succeed
        $resumeResponse = $this->actingAs($user)
            ->postJson($this->url($tenant, "/app/scribe/sessions/{$inProgressSession->id}/resume"));
        $resumeResponse->assertStatus(200);

        // Stop should succeed and record usage
        $stopResponse = $this->actingAs($user)
            ->postJson($this->url($tenant, "/app/scribe/sessions/{$inProgressSession->id}/stop"));
        $stopResponse->assertStatus(200);
    }

    /**
     * Requirement 3: Grace period and scheduled command billing:check-overdue.
     * Grace period default 14 days. past_due -> restricted_overdue after grace.
     */
    public function test_scheduled_command_transitions_past_due_after_grace_period(): void
    {
        PlatformSetting::set('billing.past_due_grace_days', 14);

        // Clinic within grace: 5 days ago
        $clinicRecent = $this->createTenant('recent-past-due', [
            'subscription_status' => Tenant::SUBSCRIPTION_PAST_DUE,
            'payment_failed_at' => Carbon::now()->subDays(5),
        ]);

        // Clinic past grace: 15 days ago
        $clinicOverdue = $this->createTenant('expired-past-due', [
            'subscription_status' => Tenant::SUBSCRIPTION_PAST_DUE,
            'payment_failed_at' => Carbon::now()->subDays(15),
        ]);

        $this->artisan('billing:check-overdue')
            ->expectsOutputToContain('Completed check. 1 clinic(s) transitioned to restricted_overdue.')
            ->assertSuccessful();

        $this->assertSame(Tenant::SUBSCRIPTION_PAST_DUE, $clinicRecent->fresh()->subscription_status);
        $this->assertSame(Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE, $clinicOverdue->fresh()->subscription_status);
    }

    /**
     * Requirement 8: Feature gating middleware EnsureFeatureEnabled.
     */
    public function test_feature_gate_middleware_enforcement(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();
        $proPlan = Plan::where('slug', 'professional')->firstOrFail();

        $essentialTenant = $this->createTenant('essential-clinic', [
            'plan_id' => $essentialPlan->id,
        ]);

        [$owner] = $this->createStaff($essentialTenant, StaffMembership::ROLE_CLINIC_OWNER);

        // Essential does NOT have advanced_financial_reporting -> 403
        $res = $this->actingAs($owner)->get($this->url($essentialTenant, '/app/reports/revenue'));
        $res->assertStatus(403);

        // Upgrade tenant to Professional (which has advanced_financial_reporting) -> 200
        $essentialTenant->update(['plan_id' => $proPlan->id]);

        $resPro = $this->actingAs($owner)->get($this->url($essentialTenant, '/app/reports/revenue'));
        $resPro->assertStatus(200);
    }

    /**
     * Requirement 3 / Fix 2: Write-restricted states (past_due, restricted_overdue, canceled)
     * MUST NOT block:
     * - Finalizing existing draft clinical notes and adding addenda
     * - Cancelling/rescheduling existing appointments, marking status
     * - Recording payments against existing invoices
     * - Billing pages, payment method update, invoice downloads
     */
    public function test_write_restricted_states_allow_essential_operations(): void
    {
        $tenant = $this->createTenant('overdue-clinic', [
            'subscription_status' => Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE,
        ]);

        [$owner, $membership] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'email' => 'jane@example.com',
        ]);

        // 1. Appointment status update / cancel on existing appointment is NOT blocked
        $appointment = Appointment::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'service_name' => 'Consultation',
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addHours(2),
            'status' => Appointment::STATUS_SCHEDULED,
        ]);

        $statusResponse = $this->actingAs($owner)->patch(
            $this->url($tenant, "/app/appointments/{$appointment->id}/status"),
            ['status' => Appointment::STATUS_CHECKED_IN]
        );
        $statusResponse->assertSessionHasNoErrors();
        $this->assertSame(Appointment::STATUS_CHECKED_IN, $appointment->fresh()->status);

        // 2. Finalizing an existing draft note is NOT blocked
        $note = ClinicalNote::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'discipline' => 'massage_therapy',
            'status' => ClinicalNote::STATUS_DRAFT,
            'content' => ['subjective' => 'Patient reports tension.'],
        ]);

        $finalizeResponse = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/notes/{$note->id}/finalize"),
            [
                'signer_name' => 'Dr. Owner',
                'signer_credentials' => 'RMT',
                'attestation_text' => 'I hereby certify this clinical record.',
                'content' => ['subjective' => 'Patient reports tension.'],
            ]
        );
        $finalizeResponse->assertSessionHasNoErrors();
        $this->assertSame(ClinicalNote::STATUS_FINALIZED, $note->fresh()->status);

        // Adding an addendum to the finalized note is NOT blocked
        $addendumResponse = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/notes/{$note->id}/addenda"),
            [
                'reason' => 'Patient called with update',
                'content' => 'Follow-up phone call conducted.',
                'author_name' => 'Dr. Owner',
            ]
        );
        $addendumResponse->assertSessionHasNoErrors();

        // 3. Recording payment against an existing open invoice is NOT blocked
        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'invoice_number' => 1001,
            'status' => Invoice::STATUS_OPEN,
            'currency' => 'CAD',
            'subtotal_amount' => 10000,
            'tax_amount' => 0,
            'total_amount' => 10000,
            'balance_due_amount' => 10000,
        ]);

        $paymentResponse = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"),
            [
                'method' => 'cash',
                'amount' => 10000,
            ]
        );
        $paymentResponse->assertSessionHasNoErrors();
        $this->assertSame(Invoice::STATUS_PAID, $invoice->fresh()->status);

        // 4. Accessing billing page is NOT blocked
        $billingResponse = $this->actingAs($owner)->get($this->url($tenant, '/app/billing'));
        $billingResponse->assertStatus(200);

        // 5. Creating care documentation for an EXISTING client is NOT blocked
        $template = ClinicalNoteTemplate::create([
            'tenant_id' => $tenant->id,
            'discipline' => 'massage_therapy',
            'name' => 'Initial Assessment',
            'schema' => ['sections' => []],
            'version' => 1,
            'is_active' => true,
        ]);

        $newNoteResponse = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/clients/{$client->id}/notes"),
            [
                'discipline' => 'massage_therapy',
                'clinical_note_template_id' => $template->id,
            ]
        );
        $newNoteResponse->assertSessionHasNoErrors();

        // 6. Creating a new invoice for care already given is NOT blocked
        $newInvoiceResponse = $this->actingAs($owner)->post(
            $this->url($tenant, '/app/invoices'),
            [
                'client_id' => $client->id,
                'line_items' => [
                    ['description' => 'Physiotherapy Treatment', 'unit_amount' => 12000, 'quantity' => 1],
                ],
            ]
        );
        $newInvoiceResponse->assertSessionHasNoErrors();

        // 7. Growth & Cost actions ARE blocked:
        // - Creating a brand new client IS blocked
        $createClientResponse = $this->actingAs($owner)->postJson(
            $this->url($tenant, '/app/clients'),
            ['first_name' => 'Blocked', 'last_name' => 'User', 'email' => 'blocked@example.com']
        );
        $createClientResponse->assertStatus(403);
        $createClientResponse->assertJsonPath('code', 'restricted_overdue');

        // - Booking a new appointment IS blocked
        $bookApptResponse = $this->actingAs($owner)->postJson(
            $this->url($tenant, '/app/appointments'),
            [
                'client_id' => $client->id,
                'staff_membership_id' => $membership->id,
                'service_name' => 'Massage',
                'date' => now()->addDays(2)->format('Y-m-d'),
                'start_time' => '10:00',
                'duration_minutes' => 60,
            ]
        );
        $bookApptResponse->assertStatus(403);
        $bookApptResponse->assertJsonPath('code', 'restricted_overdue');

        // - Staff invite IS blocked
        $inviteStaffResponse = $this->actingAs($owner)->postJson(
            $this->url($tenant, '/app/staff'),
            ['name' => 'New Practitioner', 'email' => 'practitioner@example.com', 'role' => 'practitioner']
        );
        $inviteStaffResponse->assertStatus(403);
        $inviteStaffResponse->assertJsonPath('code', 'restricted_overdue');

        // - Creating a new location IS blocked
        $createLocationResponse = $this->actingAs($owner)->postJson(
            $this->url($tenant, '/app/locations'),
            ['name' => 'Second Clinic Location']
        );
        $createLocationResponse->assertStatus(403);
        $createLocationResponse->assertJsonPath('code', 'restricted_overdue');
    }

    /**
     * Requirement: Essential plan allows creating 1 treatment room.
     * Attempting to create more than 1 room on Essential is blocked.
     * Professional plan allows multiple rooms.
     */
    public function test_essential_plan_allows_creating_one_room_and_blocks_second_room(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();
        $proPlan = Plan::where('slug', 'professional')->firstOrFail();

        $tenant = $this->createTenant('solo-rooms-clinic', [
            'plan_id' => $essentialPlan->id,
        ]);

        [$owner] = $this->createStaff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $location = Location::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'name' => 'Main Clinic Location',
            'is_active' => true,
        ]);

        // 1. First room creation SUCCEEDS on Essential plan
        $response1 = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/locations/{$location->id}/rooms"),
            ['name' => 'Treatment Room 1', 'description' => 'Acupuncture table']
        );
        $response1->assertRedirect();
        $response1->assertSessionHas('success');
        $this->assertDatabaseHas('rooms', [
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Treatment Room 1',
            'is_active' => true,
        ]);

        // 2. Second room creation is BLOCKED on Essential plan
        $response2 = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/locations/{$location->id}/rooms"),
            ['name' => 'Treatment Room 2', 'description' => 'Second table']
        );
        $response2->assertSessionHasErrors(['room']);
        $this->assertDatabaseMissing('rooms', [
            'tenant_id' => $tenant->id,
            'name' => 'Treatment Room 2',
        ]);

        // 3. Reactivating another room when already at 1 active room is blocked
        $secondRoom = Room::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'location_id' => $location->id,
            'name' => 'Inactive Room 2',
            'is_active' => false,
        ]);

        $toggleResponse = $this->actingAs($owner)->patch(
            $this->url($tenant, "/app/rooms/{$secondRoom->id}/toggle")
        );
        $toggleResponse->assertSessionHasErrors(['room']);
        $this->assertFalse($secondRoom->fresh()->is_active);

        // 4. Upgrade to Professional plan allows creating more rooms
        $tenant->update(['plan_id' => $proPlan->id]);

        $response3 = $this->actingAs($owner)->post(
            $this->url($tenant, "/app/locations/{$location->id}/rooms"),
            ['name' => 'Treatment Room 3', 'description' => 'Pro suite']
        );
        $response3->assertRedirect();
        $response3->assertSessionHas('success');
        $this->assertDatabaseHas('rooms', [
            'tenant_id' => $tenant->id,
            'name' => 'Treatment Room 3',
        ]);
    }
}
