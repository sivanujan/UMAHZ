<?php

namespace Tests\Feature\Billing;

use App\Billing\FakePlatformBilling;
use App\Billing\PlanPricing;
use App\Billing\PlatformBilling;
use App\Models\PendingRegistration;
use App\Models\PractitionerProfile;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ClinicSubscriptionService;
use App\Support\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TieredRegistrationPricingTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;

    protected function setUp(): void
    {
        parent::setUp();
        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);
        Storage::fake('local');

        config([
            'billing.tiers.balance.stripe_price_id' => 'price_balance_base_test',
            'billing.tiers.practice.stripe_price_id' => 'price_practice_base_test',
            'billing.tiers.practice.stripe_addon_price_ft_id' => 'price_practice_ft_test',
            'billing.tiers.practice.stripe_addon_price_pt_id' => 'price_practice_pt_test',
            'billing.tiers.thrive.stripe_price_id' => 'price_thrive_base_test',
            'billing.tiers.thrive.stripe_addon_price_ft_id' => 'price_thrive_ft_test',
            'billing.tiers.thrive.stripe_addon_price_pt_id' => 'price_thrive_pt_test',
        ]);
    }

    public function test_pricing_calculation_for_all_tiers(): void
    {
        // 1. Balance: $54 base, 1 practitioner only, no add-ons
        $balance = PlanPricing::calculateBreakdown(PlanPricing::TIER_BALANCE, 1, 0);
        $this->assertSame(54.00, $balance['total_monthly']);
        $this->assertSame(0, $balance['additional_ft_count']);
        $this->assertSame(0, $balance['additional_pt_count']);

        // 2. Practice: $79 base, +$35/extra FT, +$17.50/PT
        $practiceSolo = PlanPricing::calculateBreakdown(PlanPricing::TIER_PRACTICE, 1, 0);
        $this->assertSame(79.00, $practiceSolo['total_monthly']);

        $practiceTeam = PlanPricing::calculateBreakdown(PlanPricing::TIER_PRACTICE, 3, 2);
        // Base: $79 + (2 * 35) + (2 * 17.50) = 79 + 70 + 35 = 184.00
        $this->assertSame(184.00, $practiceTeam['total_monthly']);
        $this->assertSame(2, $practiceTeam['additional_ft_count']);
        $this->assertSame(2, $practiceTeam['additional_pt_count']);
        $this->assertSame(70.00, $practiceTeam['additional_ft_cost']);
        $this->assertSame(35.00, $practiceTeam['additional_pt_cost']);

        // 3. Thrive: $99 base, +$40/extra FT, +$20/PT
        $thriveTeam = PlanPricing::calculateBreakdown(PlanPricing::TIER_THRIVE, 2, 3);
        // Base: $99 + (1 * 40) + (3 * 20) = 99 + 40 + 60 = 199.00
        $this->assertSame(199.00, $thriveTeam['total_monthly']);
        $this->assertSame(1, $thriveTeam['additional_ft_count']);
        $this->assertSame(3, $thriveTeam['additional_pt_count']);
        $this->assertSame(40.00, $thriveTeam['additional_ft_cost']);
        $this->assertSame(60.00, $thriveTeam['additional_pt_cost']);
    }

    public function test_build_subscription_items_returns_correct_stripe_prices_and_quantities(): void
    {
        // Balance: base price only
        $balanceItems = PlanPricing::buildSubscriptionItems(PlanPricing::TIER_BALANCE, 1, 0);
        $this->assertCount(1, $balanceItems);
        $this->assertSame('price_balance_base_test', $balanceItems[0]['price']);
        $this->assertSame(1, $balanceItems[0]['quantity']);

        // Practice with 3 FT and 2 PT: Base (qty 1), FT Addon (qty 2), PT Addon (qty 2)
        $practiceItems = PlanPricing::buildSubscriptionItems(PlanPricing::TIER_PRACTICE, 3, 2);
        $this->assertCount(3, $practiceItems);
        $this->assertSame(['price' => 'price_practice_base_test', 'quantity' => 1], $practiceItems[0]);
        $this->assertSame(['price' => 'price_practice_ft_test', 'quantity' => 2], $practiceItems[1]);
        $this->assertSame(['price' => 'price_practice_pt_test', 'quantity' => 2], $practiceItems[2]);

        // Thrive with 1 FT and 0 PT: Base only
        $thriveItems = PlanPricing::buildSubscriptionItems(PlanPricing::TIER_THRIVE, 1, 0);
        $this->assertCount(1, $thriveItems);
        $this->assertSame('price_thrive_base_test', $thriveItems[0]['price']);
    }

    public function test_prepare_registration_stores_tier_and_practitioner_counts(): void
    {
        if (! extension_loaded('fileinfo')) {
            $this->markTestSkipped('ext-fileinfo required for file uploads.');
        }

        $email = 'dr.jane@lotus.ca';
        EmailVerificationCode::verify($email, EmailVerificationCode::generate($email));

        $payload = [
            'name' => 'Dr. Jane Smith',
            'email' => $email,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'clinic_name' => 'Lotus Health',
            'subdomain' => 'lotus-health',
            'primary_contact_name' => 'Dr. Jane Smith',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '+1 555 123 4567',
            'requested_disciplines' => ['acupuncture_tcm'],
            'plan_tier' => 'practice',
            'full_time_practitioners_count' => 3,
            'part_time_practitioners_count' => 2,
            'license_number' => 'ACU-999',
            'licensing_body' => 'CTCMPAO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 50, 'application/pdf'),
        ];

        $response = $this->postJson('http://umahz.test/clinics/register/prepare', $payload);

        $response->assertOk()
            ->assertJsonStructure(['pending_id', 'client_secret']);

        $pending = PendingRegistration::where('email', $email)->first();
        $this->assertNotNull($pending);
        $this->assertSame('practice', $pending->plan_tier);
        $this->assertSame(3, $pending->full_time_practitioners_count);
        $this->assertSame(2, $pending->part_time_practitioners_count);
    }

    public function test_balance_plan_rejects_more_than_one_practitioner_at_registration(): void
    {
        if (! extension_loaded('fileinfo')) {
            $this->markTestSkipped('ext-fileinfo required for file uploads.');
        }

        $email = 'solo@balance.ca';
        EmailVerificationCode::verify($email, EmailVerificationCode::generate($email));

        $payload = [
            'name' => 'Solo Practitioner',
            'email' => $email,
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'clinic_name' => 'Solo Clinic',
            'subdomain' => 'solo-clinic',
            'primary_contact_name' => 'Solo Practitioner',
            'primary_contact_email' => $email,
            'primary_contact_phone' => '+1 555 111 2222',
            'requested_disciplines' => ['massage_therapy'],
            'plan_tier' => 'balance',
            'full_time_practitioners_count' => 2, // Invalid for Balance!
            'part_time_practitioners_count' => 0,
            'license_number' => 'RMT-100',
            'licensing_body' => 'CMTO',
            'license_document' => UploadedFile::fake()->create('license.pdf', 50, 'application/pdf'),
        ];

        $response = $this->postJson('http://umahz.test/clinics/register/prepare', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('plan_tier');
    }

    public function test_finalize_creates_tenant_with_correct_tier_and_counts(): void
    {
        Storage::disk('local')->put('pending-licenses/lic.pdf', 'fake-pdf');

        $pending = PendingRegistration::create([
            'email' => 'owner@thrive.ca',
            'subdomain' => 'thrive-wellness',
            'plan_tier' => 'thrive',
            'full_time_practitioners_count' => 2,
            'part_time_practitioners_count' => 3,
            'ip_address' => '127.0.0.1',
            'payload' => [
                'name' => 'Thrive Owner',
                'email' => 'owner@thrive.ca',
                'password' => Hash::make('secretpassword'),
                'clinic_name' => 'Thrive Wellness',
                'subdomain' => 'thrive-wellness',
                'plan_tier' => 'thrive',
                'full_time_practitioners_count' => 2,
                'part_time_practitioners_count' => 3,
                'primary_contact_name' => 'Thrive Owner',
                'primary_contact_email' => 'owner@thrive.ca',
                'primary_contact_phone' => '+1 555 777 8888',
                'requested_disciplines' => ['nutrition'],
                'custom_disciplines' => [],
                'primary_discipline' => 'nutrition',
                'estimated_practitioner_count' => 5,
                'license_number' => 'NUT-555',
                'licensing_body' => 'College of Dietitians',
            ],
            'license_document_path' => 'pending-licenses/lic.pdf',
            'license_document_original_name' => 'lic.pdf',
            'license_document_mime' => 'application/pdf',
            'stripe_customer_id' => 'cus_thrive_123',
            'stripe_setup_intent_id' => 'seti_thrive_123',
            'expires_at' => now()->addMinutes(30),
        ]);

        $this->billing->paymentMethodToReturn = 'pm_thrive_card';

        $response = $this->post('http://umahz.test/clinics/register', ['pending_id' => $pending->id]);
        $response->assertSessionHasNoErrors();

        $tenant = Tenant::where('subdomain', 'thrive-wellness')->first();
        $this->assertNotNull($tenant);
        $this->assertSame('thrive', $tenant->plan_tier);
        $this->assertSame(2, $tenant->full_time_practitioners_count);
        $this->assertSame(3, $tenant->part_time_practitioners_count);
        $this->assertSame('cus_thrive_123', $tenant->stripe_id);
        $this->assertSame('pm_thrive_card', $tenant->stripe_pm_id);
        $this->assertSame(Tenant::SUBSCRIPTION_NONE, $tenant->subscription_status);
        $this->assertFalse($this->billing->charged($tenant), 'Must not charge before approval.');
    }

    public function test_admin_approve_starts_tiered_subscription_with_correct_quantities_and_charges(): void
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

        $clinic = Tenant::create([
            'name' => 'Apex Health',
            'slug' => 'apex',
            'subdomain' => 'apex',
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'plan_tier' => 'practice',
            'full_time_practitioners_count' => 3, // Base includes 1 FT -> 2 extra FT
            'part_time_practitioners_count' => 2, // 2 extra PT
            'requested_disciplines' => ['massage_therapy'],
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ]);
        $clinic->forceFill(['stripe_id' => 'cus_apex', 'stripe_pm_id' => 'pm_apex_card'])->save();

        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($admin)->post("http://umahz.test/admin/clinics/{$clinic->id}/approve");
        $response->assertSessionHasNoErrors();

        $this->assertTrue($this->billing->charged($clinic), 'First charge must trigger on approval.');
        $sub = $this->billing->subscriptionFor($clinic);
        $this->assertNotNull($sub);
        $this->assertSame('practice', $sub['tier']);
        $this->assertSame(184.00, $sub['total_monthly']); // 79 + (2*35) + (2*17.50)

        $clinic->refresh();
        $this->assertSame(Tenant::STATUS_APPROVED, $clinic->status);
        $this->assertSame(Tenant::SUBSCRIPTION_ACTIVE, $clinic->subscription_status);
    }

    public function test_admin_reject_never_charges_and_discards_payment_method(): void
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

        $clinic = Tenant::create([
            'name' => 'Declined Clinic',
            'slug' => 'declined',
            'subdomain' => 'declined',
            'status' => Tenant::STATUS_PENDING_REVIEW,
            'plan_tier' => 'thrive',
            'requested_disciplines' => ['nutrition'],
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ]);
        $clinic->forceFill(['stripe_id' => 'cus_declined', 'stripe_pm_id' => 'pm_declined_card'])->save();

        $owner = User::factory()->create(['email_verified_at' => now()]);
        StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($admin)->post("http://umahz.test/admin/clinics/{$clinic->id}/reject", [
            'note' => 'Invalid credentials submitted.',
        ]);
        $response->assertSessionHasNoErrors();

        $this->assertFalse($this->billing->charged($clinic), 'Rejected clinic must never be charged.');
        $this->assertCount(1, $this->billing->discarded);
        $this->assertSame('cus_declined', $this->billing->discarded[0]['customer']);

        $clinic->refresh();
        $this->assertSame(Tenant::STATUS_REJECTED, $clinic->status);
        $this->assertSame(Tenant::SUBSCRIPTION_NONE, $clinic->subscription_status);
        $this->assertNull($clinic->stripe_pm_id);
    }

    public function test_balance_tier_blocks_inviting_additional_practitioner(): void
    {
        $clinic = Tenant::create([
            'name' => 'Solo Massage',
            'slug' => 'solo-massage',
            'subdomain' => 'solo-massage',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'balance',
            'full_time_practitioners_count' => 1,
            'part_time_practitioners_count' => 0,
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'requested_disciplines' => ['massage_therapy'],
        ]);

        $owner = User::factory()->create(['email_verified_at' => now()]);
        $ownerMembership = StaffMembership::create([
            'tenant_id' => $clinic->id,
            'user_id' => $owner->id,
            'role' => StaffMembership::ROLE_CLINIC_OWNER,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        PractitionerProfile::create([
            'staff_membership_id' => $ownerMembership->id,
            'profession' => 'massage_therapy',
            'verification_status' => PractitionerProfile::VERIFICATION_VERIFIED,
            'is_primary_contact' => true,
        ]);

        // Attempt to invite a 2nd practitioner to a Balance clinic on its subdomain
        $response = $this->actingAs($owner)
            ->post('http://solo-massage.umahz.test/settings/staff/invite', [
                'email' => 'colleague@solo.ca',
                'role' => StaffMembership::ROLE_PRACTITIONER,
            ]);

        $response->assertSessionHasErrors('role');
        $this->assertDatabaseMissing('staff_memberships', ['tenant_id' => $clinic->id, 'role' => StaffMembership::ROLE_PRACTITIONER]);
    }
}
