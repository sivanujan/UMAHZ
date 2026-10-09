<?php

namespace Tests\Feature\Billing;

use App\Billing\FakePlatformBilling;
use App\Billing\PlatformBilling;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MigrateLegacyTenantsCommandTest extends TestCase
{
    use RefreshDatabase;

    private FakePlatformBilling $billing;
    private Plan $essentialPlan;
    private Plan $professionalPlan;
    private Plan $signaturePlan;
    private PlanPrice $professionalMonthly;
    private PlanPrice $signatureMonthly;

    protected function setUp(): void
    {
        parent::setUp();

        $this->billing = new FakePlatformBilling();
        $this->app->instance(PlatformBilling::class, $this->billing);

        $this->essentialPlan = Plan::create([
            'name' => 'Essential',
            'slug' => 'essential',
            'included_practitioners' => 1,
            'is_active' => true,
        ]);
        $this->essentialPlan->prices()->create([
            'interval' => 'month',
            'currency' => 'CAD',
            'base_price' => 39.00,
            'is_active' => true,
        ]);

        $this->professionalPlan = Plan::create([
            'name' => 'Professional',
            'slug' => 'professional',
            'included_practitioners' => 1,
            'is_active' => true,
        ]);
        $this->professionalMonthly = $this->professionalPlan->prices()->create([
            'interval' => 'month',
            'currency' => 'CAD',
            'base_price' => 69.00,
            'is_active' => true,
        ]);

        $this->signaturePlan = Plan::create([
            'name' => 'Signature',
            'slug' => 'signature',
            'included_practitioners' => 3,
            'is_active' => true,
        ]);
        $this->signatureMonthly = $this->signaturePlan->prices()->create([
            'interval' => 'month',
            'currency' => 'CAD',
            'base_price' => 90.00,
            'is_active' => true,
        ]);
    }

    public function test_dry_run_simulates_without_modifying_database(): void
    {
        $lotusPending = PendingRegistration::create([
            'email' => 'lotus@test.ca',
            'subdomain' => 'lotus-wellness',
            'plan_tier' => 'practice',
            'payload' => ['clinic_name' => 'Lotus Wellness Clinic'],
            'expires_at' => now()->addHour(),
        ]);

        $astrogen = Tenant::create([
            'name' => 'Astrogenapp Medical',
            'slug' => 'astrogenapp',
            'subdomain' => 'astrogenapp',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'balance',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
        ]);

        $this->artisan('billing:migrate-legacy-tenants', ['--dry-run' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('Simulating Legacy Tenants Migration (--dry-run)')
            ->expectsOutputToContain('Lotus Wellness Clinic')
            ->expectsOutputToContain('Astrogenapp Medical');

        // Records untouched
        $lotusPending->refresh();
        $this->assertNull($lotusPending->plan_id);

        $astrogen->refresh();
        $this->assertNull($astrogen->plan_id);
        $this->assertNull($astrogen->plan_price_id);
    }

    public function test_real_migration_maps_specific_and_legacy_tenants_and_is_idempotent(): void
    {
        // 1. Pending registrations: Lotus Wellness Clinic, Summit Performance Studio
        $lotusPending = PendingRegistration::create([
            'email' => 'lotus@test.ca',
            'subdomain' => 'lotus-wellness',
            'payload' => ['clinic_name' => 'Lotus Wellness Clinic'],
            'expires_at' => now()->addHour(),
        ]);

        $summitPending = PendingRegistration::create([
            'email' => 'summit@test.ca',
            'subdomain' => 'summit-performance',
            'payload' => ['clinic_name' => 'Summit Performance Studio'],
            'expires_at' => now()->addHour(),
        ]);

        // 2. yaalstore (approved, no subscription) -> Professional monthly, no Stripe changes
        $yaalstore = Tenant::create([
            'name' => 'Yaal Store Clinic',
            'slug' => 'yaalstore',
            'subdomain' => 'yaalstore',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'practice',
            'subscription_status' => Tenant::SUBSCRIPTION_NONE,
        ]);

        // 3. Astrogenapp (active on legacy balance price) -> Signature monthly, swap without proration
        $astrogen = Tenant::create([
            'name' => 'Astrogenapp Inc',
            'slug' => 'astrogenapp',
            'subdomain' => 'astrogenapp',
            'status' => Tenant::STATUS_APPROVED,
            'plan_tier' => 'balance',
            'subscription_status' => Tenant::SUBSCRIPTION_ACTIVE,
            'stripe_id' => 'cus_astrogen_123',
            'stripe_subscription_id' => 'sub_astrogen_123',
        ]);

        // Execute migration
        $this->artisan('billing:migrate-legacy-tenants')
            ->assertSuccessful()
            ->expectsOutputToContain('Migration Summary: 4 migrated, 0 up to date, 0 unresolved.');

        // Verify Pending
        $lotusPending->refresh();
        $this->assertSame($this->professionalPlan->id, $lotusPending->plan_id);
        $this->assertSame('professional', $lotusPending->plan_tier);
        $this->assertSame('month', $lotusPending->billing_interval);

        $summitPending->refresh();
        $this->assertSame($this->professionalPlan->id, $summitPending->plan_id);

        // Verify yaalstore
        $yaalstore->refresh();
        $this->assertSame($this->professionalPlan->id, $yaalstore->plan_id);
        $this->assertSame($this->professionalMonthly->id, $yaalstore->plan_price_id);
        $this->assertSame('month', $yaalstore->billing_interval);

        // Verify Astrogenapp
        $astrogen->refresh();
        $this->assertSame($this->signaturePlan->id, $astrogen->plan_id);
        $this->assertSame($this->signatureMonthly->id, $astrogen->plan_price_id);
        $this->assertSame('month', $astrogen->billing_interval);

        // Verify AuditEvent logged
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $astrogen->id,
            'action' => 'tenant.migrated_to_dynamic_plan',
        ]);

        // Idempotency: run second time
        $this->artisan('billing:migrate-legacy-tenants')
            ->assertSuccessful()
            ->expectsOutputToContain('Migration Summary: 0 migrated, 4 up to date, 0 unresolved.');
    }
}
