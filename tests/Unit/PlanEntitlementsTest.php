<?php

namespace Tests\Unit;

use App\Models\AddOn;
use App\Models\Appointment;
use App\Models\Feature;
use App\Models\Location;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\PractitionerProfile;
use App\Models\Room;
use App\Models\ScribeAudioChunk;
use App\Models\ScribeSession;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\TenantAddOn;
use App\Models\User;
use App\Services\PlanEntitlements;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class PlanEntitlementsTest extends TestCase
{
    use RefreshDatabase;

    protected PlanEntitlements $entitlements;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
        $this->entitlements = app(PlanEntitlements::class);
    }

    /**
     * Requirement 2: Legacy tenants without plan_id keep FULL access.
     * No new limits apply until migrated. Features with is_implemented = false are flags only.
     */
    public function test_legacy_tenant_keeps_full_access_without_new_limits(): void
    {
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Legacy Clinic',
            'slug' => 'legacy-clinic',
            'plan_tier' => 'practice',
            'plan_id' => null, // Legacy tenant!
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $this->assertTrue($this->entitlements->hasLegacyFullAccess($tenant));

        // Appointments: no limit
        $aptCheck = $this->entitlements->checkAppointmentsLimit($tenant);
        $this->assertTrue($aptCheck['allowed']);
        $this->assertSame('none', $aptCheck['behavior']);

        // Locations: no dynamic limit
        $locCheck = $this->entitlements->checkLocationLimit($tenant);
        $this->assertTrue($locCheck['allowed']);
        $this->assertNull($locCheck['max']);

        // Scribe: unlimited
        $scribeCheck = $this->entitlements->checkScribeAllowance($tenant);
        $this->assertTrue($scribeCheck['allowed']);
        $this->assertTrue($scribeCheck['unlimited']);

        // Features: all return true for legacy
        $this->assertTrue($this->entitlements->isFeatureEnabled($tenant, 'advanced_financial_reporting'));
        $this->assertTrue($this->entitlements->isFeatureEnabled($tenant, 'rooms_resources'));
    }

    /**
     * Requirement 4: Practitioner seats count active practitioners + pending invites.
     * Receptionist/admin roles do not use practitioner seats.
     */
    public function test_practitioner_seats_and_receptionist_exclusion(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Solo Clinic',
            'slug' => 'solo-clinic',
            'plan_id' => $essentialPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $owner = User::factory()->create(['name' => 'Dr Owner']);
        $practitioner = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        // Receptionist: does NOT consume a practitioner seat
        $receptionistUser = User::factory()->create(['name' => 'Front Desk']);
        StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $receptionistUser->id,
            'role' => StaffMembership::ROLE_RECEPTIONIST,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $this->assertSame(1, $this->entitlements->countPractitionerSeats($tenant));

        // Essential plan has max 1 practitioner and allows_extra = false
        // Checking for 1 additional practitioner should be blocked
        $check = $this->entitlements->checkPractitionerSeats($tenant, additional: 1);
        $this->assertFalse($check['allowed']);
        $this->assertSame(1, $check['included_count']);
        $this->assertSame(1, $check['max_count']);

        // Professional plan: allows extra seats
        $proPlan = Plan::where('slug', 'professional')->firstOrFail();
        $tenant->update(['plan_id' => $proPlan->id]);
        $tenant->refresh();

        $checkPro = $this->entitlements->checkPractitionerSeats($tenant, additional: 1);
        $this->assertTrue($checkPro['allowed']);
        $this->assertTrue($checkPro['requires_extra_seat']);
        $this->assertEquals(35.0, $checkPro['extra_seat_price']);
    }

    /**
     * Requirement 5: Appointment limit counted from appointments table current month.
     * warn -> allow; block -> block with friendly patient message or staff upgrade prompt.
     */
    public function test_appointment_limits_warn_vs_block(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail(); // limit: 50, behavior: warn

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Appointment Test Clinic',
            'slug' => 'apt-clinic',
            'plan_id' => $essentialPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
            'timezone' => 'America/Toronto',
        ]);

        $user = User::factory()->create();
        $practitioner = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $client = \App\Models\Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
        ]);

        // Create 50 appointments this month (non-overlapping time slots)
        for ($i = 0; $i < 50; $i++) {
            $day = intdiv($i, 4) + 1;
            $hour = ($i % 4) * 2 + 8;
            $start = Carbon::now('America/Toronto')->startOfMonth()->addDays($day)->setTime($hour, 0);
            $end = $start->copy()->addHour();

            Appointment::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'client_id' => $client->id,
                'staff_membership_id' => $practitioner->id,
                'service_name' => 'Checkup',
                'starts_at' => $start,
                'ends_at' => $end,
                'status' => Appointment::STATUS_SCHEDULED,
            ]);
        }

        // Essential: 50 appointments reached with 'warn' behavior
        // Should still be allowed, but with warn behavior
        $warnCheck = $this->entitlements->checkAppointmentsLimit($tenant);
        $this->assertTrue($warnCheck['allowed']);
        $this->assertSame('warn', $warnCheck['behavior']);

        // Now set plan to 'block' behavior with limit 50
        $essentialPlan->update([
            'appointment_limit_behavior' => 'block',
        ]);
        $tenant->refresh();

        // Staff booking check: blocked with upgrade message
        $blockStaffCheck = $this->entitlements->checkAppointmentsLimit($tenant, isPatientBooking: false);
        $this->assertFalse($blockStaffCheck['allowed']);
        $this->assertStringContainsString('upgrade your clinic subscription plan', $blockStaffCheck['reason']);

        // Patient online booking check: blocked with friendly patient message (never technical)
        $blockPatientCheck = $this->entitlements->checkAppointmentsLimit($tenant, isPatientBooking: true);
        $this->assertFalse($blockPatientCheck['allowed']);
        $this->assertSame('Online booking is currently unavailable. Please contact the clinic directly to schedule your appointment.', $blockPatientCheck['reason']);
    }

    /**
     * Requirement 6: Location limit checked on create only.
     */
    public function test_location_limit_check(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail(); // limit: 1

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Location Test Clinic',
            'slug' => 'loc-clinic',
            'plan_id' => $essentialPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        // 0 locations -> allowed
        $check0 = $this->entitlements->checkLocationLimit($tenant);
        $this->assertTrue($check0['allowed']);

        // Create 1 location
        Location::create([
            'tenant_id' => $tenant->id,
            'name' => 'Downtown Clinic',
            'address_line1' => '123 Main St',
            'city' => 'Toronto',
            'province' => 'ON',
            'postal_code' => 'M5V 2T6',
            'is_active' => true,
        ]);

        // 1 location reached on Essential (limit: 1) -> cannot create second location
        $check1 = $this->entitlements->checkLocationLimit($tenant);
        $this->assertFalse($check1['allowed']);
        $this->assertSame(1, $check1['current']);
        $this->assertSame(1, $check1['max']);
    }

    /**
     * Requirement 7: Scribe allowance minutes.
     * Check only when starting a new session. Never cut off recording already in progress.
     * Scribe+ active -> unlimited.
     */
    public function test_scribe_allowance_and_scribe_plus_bypass(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();
        $essentialPlan->update([
            'scribe_allowance_amount' => 60, // 60 minutes
            'scribe_limit_behavior' => 'block',
            'needs_review' => false,
            'needs_review_fields' => [],
        ]);

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Scribe Test Clinic',
            'slug' => 'scribe-clinic',
            'plan_id' => $essentialPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
            'timezone' => 'America/Toronto',
        ]);

        $user = User::factory()->create();
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        // Before any recordings: 0 mins used, 60 remaining
        $initialCheck = $this->entitlements->checkScribeAllowance($tenant, $membership);
        $this->assertTrue($initialCheck['allowed']);
        $this->assertEquals(60.0, $initialCheck['remaining_minutes']);

        $client = \App\Models\Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Sam',
            'last_name' => 'Taylor',
            'email' => 'sam@example.com',
        ]);

        // Create a completed session with 60 minutes recorded (3,600,000 ms)
        ScribeSession::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $membership->id,
            'created_by_user_id' => $user->id,
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
            'recorded_ms' => 3600000,
        ]);

        // Now allowance reached with 'block' behavior -> start new session should be blocked
        $blockedCheck = $this->entitlements->checkScribeAllowance($tenant, $membership);
        $this->assertFalse($blockedCheck['allowed']);
        $this->assertEquals(0.0, $blockedCheck['remaining_minutes']);

        // Add Scribe+ add-on to clinic
        $scribeAddOn = AddOn::where('slug', 'scribe_plus')->firstOrFail();
        TenantAddOn::create([
            'tenant_id' => $tenant->id,
            'add_on_id' => $scribeAddOn->id,
            'status' => 'active',
            'quantity' => 1,
        ]);

        // With Scribe+, check is now unlimited and allowed!
        $scribePlusCheck = $this->entitlements->checkScribeAllowance($tenant, $membership);
        $this->assertTrue($scribePlusCheck['allowed']);
        $this->assertTrue($scribePlusCheck['unlimited']);
    }

    /**
     * Requirement 3: Read/export always (all non-active states: past_due, restricted_overdue, canceled, suspended-by-billing).
     * canWrite is false for all these states.
     */
    public function test_can_write_restrictions_across_all_non_active_states(): void
    {
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Billing Test Clinic',
            'slug' => 'billing-clinic',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        // Active: write allowed
        $this->assertTrue($this->entitlements->canWrite($tenant)['allowed']);

        // past_due during grace: write is STILL allowed (banner shown)
        $tenant->update(['subscription_status' => Tenant::SUBSCRIPTION_PAST_DUE]);
        $this->assertTrue($this->entitlements->canWrite($tenant)['allowed']);

        // restricted_overdue (after grace): write blocked
        $tenant->update(['subscription_status' => Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE]);
        $checkOverdue = $this->entitlements->canWrite($tenant);
        $this->assertFalse($checkOverdue['allowed']);
        $this->assertSame('restricted_overdue', $checkOverdue['code']);

        // canceled: write blocked
        $tenant->update(['subscription_status' => Tenant::SUBSCRIPTION_CANCELED]);
        $checkCanceled = $this->entitlements->canWrite($tenant);
        $this->assertFalse($checkCanceled['allowed']);
        $this->assertSame('subscription_canceled', $checkCanceled['code']);

        // suspended-by-billing (status = suspended): write blocked
        $tenant->update([
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
            'status' => Tenant::STATUS_SUSPENDED,
        ]);
        $checkSuspended = $this->entitlements->canWrite($tenant);
        $this->assertFalse($checkSuspended['allowed']);
        $this->assertSame('billing_suspended', $checkSuspended['code']);
    }

    /**
     * Requirement 3 & 8: Features with is_implemented = false are flags only and never gated.
     */
    public function test_unimplemented_features_are_never_gated(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Feature Test Clinic',
            'slug' => 'feature-clinic',
            'plan_id' => $essentialPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        // Create an experimental feature with is_implemented = false
        $flagOnlyFeature = Feature::create([
            'key' => 'ai_copilot_experimental',
            'name' => 'AI Copilot (Beta)',
            'category' => 'clinical',
            'is_implemented' => false,
        ]);

        // Even though it is not enabled on Essential plan, isFeatureEnabled returns true
        $this->assertTrue($this->entitlements->isFeatureEnabled($tenant, 'ai_copilot_experimental'));
    }

    public function test_needs_review_limits_enforced_as_warn_only_until_reviewed_and_saved(): void
    {
        $plan = Plan::create([
            'id' => (string) Str::uuid(),
            'name' => 'Review Guard Plan',
            'slug' => 'review-guard',
            'is_active' => true,
            'appointment_limit_monthly' => 10,
            'appointment_limit_behavior' => 'block',
            'location_limit' => 1,
            'scribe_allowance_amount' => 50,
            'scribe_limit_behavior' => 'block',
            'needs_review' => true,
            'needs_review_fields' => [
                'appointment_limit_monthly',
                'location_limit',
                'scribe_allowance_amount',
            ],
        ]);

        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Review Guard Clinic',
            'slug' => 'review-guard-clinic',
            'plan_id' => $plan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $staff = StaffMembership::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'user_id' => User::factory()->create()->id,
            'role' => StaffMembership::ROLE_PRACTITIONER,
            'status' => StaffMembership::STATUS_ACTIVE,
        ]);

        $client = \App\Models\Client::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'first_name' => 'Review',
            'last_name' => 'Tester',
            'email' => 'review@example.com',
        ]);

        // 1. Appointments Limit:
        // 12 appointments (> 10 limit) with behavior = block
        // Under review -> allowed = true, behavior = warn
        for ($i = 0; $i < 12; $i++) {
            $start = now()->copy()->startOfMonth()->addDays($i)->setHour(10)->setMinute(0)->setSecond(0);
            Appointment::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'staff_membership_id' => $staff->id,
                'client_id' => $client->id,
                'service_name' => 'Consultation',
                'duration_minutes' => 60,
                'starts_at' => $start,
                'ends_at' => $start->copy()->addHour(),
                'status' => Appointment::STATUS_SCHEDULED,
            ]);
        }

        $aptCheckUnderReview = $this->entitlements->checkAppointmentsLimit($tenant);
        $this->assertTrue($aptCheckUnderReview['allowed'], 'Must allow when under review');
        $this->assertSame('warn', $aptCheckUnderReview['behavior'], 'Must be warn only when under review');

        // 2. Location Limit:
        // Already at 1 location, adding 1 more exceeds limit.
        // Under review -> allowed = true, behavior = warn
        Location::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'name' => 'Main Loc',
            'is_active' => true,
        ]);
        $locCheckUnderReview = $this->entitlements->checkLocationLimit($tenant, 1);
        $this->assertTrue($locCheckUnderReview['allowed'], 'Must allow location when under review');
        $this->assertSame('warn', $locCheckUnderReview['behavior']);

        // 3. Scribe Allowance:
        // 60 minutes recorded (> 50 allowance)
        $session = ScribeSession::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'staff_membership_id' => $staff->id,
            'status' => ScribeSession::STATUS_TRANSCRIPT_READY,
            'recorded_ms' => 60 * 60 * 1000,
            'created_at' => now(),
        ]);
        $this->entitlements->recordScribeUsage($session);

        $scribeCheckUnderReview = $this->entitlements->checkScribeAllowance($tenant);
        $this->assertTrue($scribeCheckUnderReview['allowed'], 'Must allow scribe when under review');
        $this->assertSame('warn', $scribeCheckUnderReview['behavior']);

        // --- Once admin reviews and saves (clearing needs_review_fields) ---
        $plan->update([
            'needs_review' => false,
            'needs_review_fields' => [],
        ]);
        $tenant->refresh();

        // Configured 'block' behavior now takes effect:
        $aptCheckReviewed = $this->entitlements->checkAppointmentsLimit($tenant);
        $this->assertFalse($aptCheckReviewed['allowed'], 'Must block once reviewed and saved');
        $this->assertSame('block', $aptCheckReviewed['behavior']);

        $locCheckReviewed = $this->entitlements->checkLocationLimit($tenant, 1);
        $this->assertFalse($locCheckReviewed['allowed'], 'Must block once reviewed and saved');

        $scribeCheckReviewed = $this->entitlements->checkScribeAllowance($tenant);
        $this->assertFalse($scribeCheckReviewed['allowed'], 'Must block once reviewed and saved');
        $this->assertSame('block', $scribeCheckReviewed['behavior']);
    }

    /**
     * Room limit: Essential plan allows 1 treatment room, blocks 2nd room.
     * Professional/Signature plans with rooms_resources allow unlimited rooms.
     */
    public function test_room_limit_allows_one_room_on_essential_and_unlimited_on_higher_tiers(): void
    {
        $essentialPlan = Plan::where('slug', 'essential')->firstOrFail();
        $proPlan = Plan::where('slug', 'professional')->firstOrFail();

        $essentialTenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Solo Essential Clinic',
            'slug' => 'solo-essential-clinic',
            'plan_id' => $essentialPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $loc = Location::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $essentialTenant->id,
            'name' => 'Main Office',
            'is_active' => true,
        ]);

        // 0 rooms initially: can add 1 room
        $check0 = $this->entitlements->checkRoomLimit($essentialTenant);
        $this->assertTrue($check0['allowed']);
        $this->assertSame(0, $check0['current']);
        $this->assertSame(1, $check0['limit']);

        // Create 1 active room
        $room1 = Room::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $essentialTenant->id,
            'location_id' => $loc->id,
            'name' => 'Room 1',
            'is_active' => true,
        ]);

        // Attempting to add a second room is blocked
        $check1 = $this->entitlements->checkRoomLimit($essentialTenant, 1);
        $this->assertFalse($check1['allowed']);
        $this->assertSame(1, $check1['current']);
        $this->assertSame(1, $check1['limit']);
        $this->assertStringContainsString('allows 1 treatment room', $check1['reason']);

        // Shared entitlements reflect 1/1 room limit
        $shared = $this->entitlements->getSharedEntitlements($essentialTenant);
        $this->assertSame(1, $shared['limits']['rooms']['current']);
        $this->assertSame(1, $shared['limits']['rooms']['limit']);

        // Deactivating room1 allows adding/reactivating
        $room1->update(['is_active' => false]);
        $checkDeactivated = $this->entitlements->checkRoomLimit($essentialTenant, 1);
        $this->assertTrue($checkDeactivated['allowed']);
        $this->assertSame(0, $checkDeactivated['current']);

        // Professional plan tenant: unlimited rooms
        $proTenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Pro Clinic',
            'slug' => 'pro-clinic',
            'plan_id' => $proPlan->id,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'status' => Tenant::STATUS_APPROVED,
        ]);

        $proLoc = Location::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $proTenant->id,
            'name' => 'Pro Location',
            'is_active' => true,
        ]);

        for ($i = 1; $i <= 3; $i++) {
            Room::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $proTenant->id,
                'location_id' => $proLoc->id,
                'name' => "Pro Room {$i}",
                'is_active' => true,
            ]);
        }

        $checkPro = $this->entitlements->checkRoomLimit($proTenant, 1);
        $this->assertTrue($checkPro['allowed']);
        $this->assertNull($checkPro['limit']);
        $this->assertSame(3, $checkPro['current']);

        $sharedPro = $this->entitlements->getSharedEntitlements($proTenant);
        $this->assertNull($sharedPro['limits']['rooms']['limit']);
    }
}
