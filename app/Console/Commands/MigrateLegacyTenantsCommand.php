<?php

namespace App\Console\Commands;

use App\Billing\PlatformBilling;
use App\Models\AuditEvent;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MigrateLegacyTenantsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:migrate-legacy-tenants {--dry-run : Simulate the migration and display changes without writing to database or Stripe}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate legacy clinic tenants and pending registrations to dynamic plans and prices.';

    /**
     * Execute the console command.
     */
    public function handle(PlatformBilling $billingGateway): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $this->info($dryRun ? '=== Simulating Legacy Tenants Migration (--dry-run) ===' : '=== Executing Legacy Tenants Migration ===');

        // 1. Fetch target plans and prices
        $professionalPlan = Plan::where('slug', 'professional')->first();
        $signaturePlan = Plan::where('slug', 'signature')->first();
        $essentialPlan = Plan::where('slug', 'essential')->first();

        if (! $professionalPlan || ! $signaturePlan) {
            $this->error('Target plans (Professional / Signature) not found. Please run "php artisan db:seed --class=SubscriptionPlansSeeder" first.');
            return Command::FAILURE;
        }

        $professionalMonthly = $professionalPlan->activePriceForInterval('month');
        $signatureMonthly = $signaturePlan->activePriceForInterval('month');
        $essentialMonthly = $essentialPlan?->activePriceForInterval('month');

        if (! $professionalMonthly || ! $signatureMonthly) {
            $this->error('Active monthly prices missing for target plans. Please verify plan_prices table.');
            return Command::FAILURE;
        }

        $migratedCount = 0;
        $skippedCount = 0;
        $unresolvedTenants = [];

        // 2. Process Pending Registrations (e.g. Summit Performance Studio, Lotus)
        $this->info("\n--- Checking Pending Registrations ---");
        $pendingList = PendingRegistration::all();

        foreach ($pendingList as $pending) {
            $name = $pending->payload['clinic_name'] ?? $pending->subdomain;
            $sub = Str::lower($pending->subdomain ?? '');

            // Target mapping: Lotus, Summit, or practice -> Professional monthly
            $targetPlan = $professionalPlan;
            $targetPrice = $professionalMonthly;

            if ($pending->plan_id === $targetPlan->id && $pending->billing_interval === 'month') {
                $this->line("  [Pending] {$name} ({$sub}): Already mapped to {$targetPlan->name} (monthly).");
                $skippedCount++;
                continue;
            }

            $this->warn("  [Pending] {$name} ({$sub}): -> {$targetPlan->name} (monthly, \$" . number_format($targetPrice->base_price, 2) . ")");

            if (! $dryRun) {
                $pending->update([
                    'plan_id' => $targetPlan->id,
                    'plan_tier' => $targetPlan->slug,
                    'billing_interval' => 'month',
                ]);
            }
            $migratedCount++;
        }

        // 3. Process Tenants
        $this->info("\n--- Checking Tenants ---");
        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            $sub = Str::lower($tenant->subdomain ?? $tenant->slug ?? '');
            $name = Str::lower($tenant->name ?? '');

            $targetPlan = null;
            $targetPrice = null;
            $stripeAction = 'none';

            // Specific Target A: Astrogenapp (active on legacy balance price) -> Signature monthly, swap test subscription without proration
            if (Str::contains($sub, 'astrogen') || Str::contains($name, 'astrogen')) {
                $targetPlan = $signaturePlan;
                $targetPrice = $signatureMonthly;
                $stripeAction = 'swap_no_prorate';
            }
            // Specific Target B: yaalstore (approved, no subscription) -> Professional monthly, no Stripe changes
            elseif (Str::contains($sub, 'yaalstore') || Str::contains($name, 'yaalstore')) {
                $targetPlan = $professionalPlan;
                $targetPrice = $professionalMonthly;
                $stripeAction = 'none';
            }
            // Specific Target C: Lotus Wellness Clinic, Summit Performance Studio -> Professional monthly
            elseif (Str::contains($sub, 'lotus') || Str::contains($name, 'lotus') || Str::contains($sub, 'summit') || Str::contains($name, 'summit')) {
                $targetPlan = $professionalPlan;
                $targetPrice = $professionalMonthly;
                $stripeAction = ($tenant->subscription_status === Tenant::SUBSCRIPTION_ACTIVE) ? 'sync' : 'none';
            }
            // Fallback: If already has plan_id, check if price assigned
            elseif ($tenant->plan_id) {
                if (! $tenant->plan_price_id && $tenant->plan) {
                    $targetPlan = $tenant->plan;
                    $targetPrice = $targetPlan->activePriceForInterval($tenant->billing_interval ?: 'month');
                    $stripeAction = 'none';
                } else {
                    $this->line("  [Tenant] {$tenant->name} ({$tenant->subdomain}): Already mapped to {$tenant->plan?->name} [plan_id: {$tenant->plan_id}].");
                    $skippedCount++;
                    continue;
                }
            }
            // Fallback: Map by legacy plan_tier
            elseif ($tenant->plan_tier === 'balance') {
                $targetPlan = $essentialPlan ?? $professionalPlan;
                $targetPrice = $targetPlan->activePriceForInterval('month');
                $stripeAction = ($tenant->subscription_status === Tenant::SUBSCRIPTION_ACTIVE) ? 'sync' : 'none';
            }
            elseif ($tenant->plan_tier === 'practice') {
                $targetPlan = $professionalPlan;
                $targetPrice = $professionalMonthly;
                $stripeAction = ($tenant->subscription_status === Tenant::SUBSCRIPTION_ACTIVE) ? 'sync' : 'none';
            }
            elseif ($tenant->plan_tier === 'thrive') {
                $targetPlan = $signaturePlan;
                $targetPrice = $signatureMonthly;
                $stripeAction = ($tenant->subscription_status === Tenant::SUBSCRIPTION_ACTIVE) ? 'sync' : 'none';
            }

            // If still no target plan could be determined, report it and do NOT guess
            if (! $targetPlan || ! $targetPrice) {
                $unresolvedTenants[] = [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'subdomain' => $tenant->subdomain,
                    'status' => $tenant->status,
                    'plan_tier' => $tenant->plan_tier ?? 'null',
                ];
                continue;
            }

            // Already on this plan and price?
            if ($tenant->plan_id === $targetPlan->id && $tenant->plan_price_id === $targetPrice->id) {
                $this->line("  [Tenant] {$tenant->name} ({$tenant->subdomain}): Up to date ({$targetPlan->name}).");
                $skippedCount++;
                continue;
            }

            $actionDescription = "-> {$targetPlan->name} (monthly, \${$targetPrice->base_price}/mo)";
            if ($stripeAction === 'swap_no_prorate') {
                $actionDescription .= " [Stripe: Swap to Signature monthly WITHOUT proration]";
            } elseif ($stripeAction === 'sync') {
                $actionDescription .= " [Stripe: Sync subscription]";
            }

            $this->warn("  [Tenant] {$tenant->name} ({$tenant->subdomain}) {$actionDescription}");

            if (! $dryRun) {
                DB::transaction(function () use ($tenant, $targetPlan, $targetPrice, $stripeAction, $billingGateway) {
                    $oldTier = $tenant->plan_tier;
                    $oldPlanId = $tenant->plan_id;

                    $tenant->update([
                        'plan_id' => $targetPlan->id,
                        'plan_tier' => $targetPlan->slug,
                        'billing_interval' => 'month',
                        'plan_price_id' => $targetPrice->id,
                    ]);

                    // Perform Stripe operations if applicable
                    if ($stripeAction === 'swap_no_prorate') {
                        try {
                            $billingGateway->swapSubscriptionWithoutProration($tenant);
                        } catch (\Throwable $e) {
                            $this->error("    Stripe swap failed for {$tenant->name}: {$e->getMessage()}");
                        }
                    } elseif ($stripeAction === 'sync') {
                        try {
                            $billingGateway->syncSubscriptionQuantities($tenant);
                        } catch (\Throwable $e) {
                            $this->error("    Stripe sync failed for {$tenant->name}: {$e->getMessage()}");
                        }
                    }

                    AuditEvent::create([
                        'tenant_id' => $tenant->id,
                        'action' => 'tenant.migrated_to_dynamic_plan',
                        'resource_type' => Tenant::class,
                        'resource_id' => $tenant->id,
                        'metadata' => [
                            'old_tier' => $oldTier,
                            'old_plan_id' => $oldPlanId,
                            'new_plan_id' => $targetPlan->id,
                            'new_plan_slug' => $targetPlan->slug,
                            'new_price_id' => $targetPrice->id,
                            'stripe_action' => $stripeAction,
                        ],
                    ]);
                });
            }

            $migratedCount++;
        }

        // 4. Report Unresolved Tenants
        if (! empty($unresolvedTenants)) {
            $this->newLine();
            $this->error("WARNING: " . count($unresolvedTenants) . " tenant(s) could NOT be resolved to a plan automatically (not guessed):");
            $this->table(['ID', 'Name', 'Subdomain', 'Status', 'Legacy Plan Tier'], $unresolvedTenants);
        }

        // Summary
        $this->newLine();
        $this->info("Migration Summary: {$migratedCount} migrated, {$skippedCount} up to date, " . count($unresolvedTenants) . " unresolved.");

        return count($unresolvedTenants) > 0 ? Command::INVALID : Command::SUCCESS;
    }
}
