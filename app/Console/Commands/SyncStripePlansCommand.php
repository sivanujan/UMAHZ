<?php

namespace App\Console\Commands;

use App\Models\AddOn;
use App\Models\Plan;
use App\Models\PromoCode;
use App\Services\StripeSubscriptionSyncService;
use Illuminate\Console\Command;

class SyncStripePlansCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:sync-stripe {--dry-run : Preview synchronization without making Stripe or DB changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Idempotently synchronize confirmed plans, prices, add-ons, and promo codes to Stripe.';

    /**
     * Execute the console command.
     */
    public function handle(StripeSubscriptionSyncService $syncService): int
    {
        $isDryRun = (bool) $this->option('dry-run');

        $this->info($isDryRun ? '=== [DRY-RUN] Stripe Plans & Billing Synchronization ===' : '=== Starting Stripe Plans & Billing Synchronization ===');

        $plans = Plan::where('is_active', true)->with('activePrices')->orderBy('display_order')->get();
        $this->info("Found {$plans->count()} active plan(s).");

        foreach ($plans as $plan) {
            $this->newLine();
            $this->line("<comment>Plan: {$plan->name} ({$plan->slug})</comment>");
            $this->line("  Product ID: " . ($plan->stripe_product_id ?: ($isDryRun ? '[DRY-RUN] Would create Stripe product' : 'Pending creation')));

            foreach ($plan->activePrices as $price) {
                // Base price
                $isBasePricePlaceholder = (float) $price->base_price <= 0
                    || (! empty($price->needs_review_fields) && in_array('base_price', $price->needs_review_fields, true))
                    || ($price->needs_review && empty($price->needs_review_fields));

                if ($isBasePricePlaceholder) {
                    $this->warn("  [SKIPPED] Base Price ({$price->interval}): Marked as needs_review (Placeholder: \${$price->base_price}). Admin review required.");
                } else {
                    $lookupKey = "plan_{$plan->slug}_{$price->interval}";
                    $existing = $price->stripe_base_price_id;
                    $status = $existing ? "Existing ({$existing})" : ($isDryRun ? "[DRY-RUN] Would create price" : "Will create");
                    $this->line("  [READY] Base Price ({$price->interval}): \${$price->base_price} CAD | Lookup Key: <info>{$lookupKey}</info> | {$status}");
                }

                // Extra practitioner seat price
                if ($plan->allows_extra_practitioners) {
                    $isSeatPlaceholder = ! empty($price->needs_review_fields) && in_array('extra_practitioner_price', $price->needs_review_fields, true);
                    if ($isSeatPlaceholder || (float) $price->extra_practitioner_price <= 0) {
                        $this->warn("  [SKIPPED] Extra Seat ({$price->interval}): Marked as needs_review (Placeholder: \${$price->extra_practitioner_price}). Admin review required.");
                    } else {
                        $seatLookupKey = "plan_{$plan->slug}_seat_{$price->interval}";
                        $existingSeat = $price->stripe_extra_seat_price_id;
                        $seatStatus = $existingSeat ? "Existing ({$existingSeat})" : ($isDryRun ? "[DRY-RUN] Would create price" : "Will create");
                        $this->line("  [READY] Extra Seat ({$price->interval}): \${$price->extra_practitioner_price} CAD/seat | Lookup Key: <info>{$seatLookupKey}</info> | {$seatStatus}");
                    }
                }
            }

            if (! $isDryRun) {
                $syncService->syncPlan($plan);
                $this->info("  -> Plan synchronized successfully.");
            }
        }

        // Add-ons
        $addOns = AddOn::where('is_active', true)->get();
        $this->newLine();
        $this->info("Found {$addOns->count()} active add-on(s).");

        foreach ($addOns as $addOn) {
            $this->line("<comment>Add-on: {$addOn->name} ({$addOn->slug})</comment>");
            $this->line("  Product ID: " . ($addOn->stripe_product_id ?: ($isDryRun ? '[DRY-RUN] Would create Stripe product' : 'Pending creation')));

            // Monthly
            $isMonthlyPlaceholder = $addOn->needs_review && in_array('price_monthly', $addOn->needs_review_fields ?? [], true);
            if ($isMonthlyPlaceholder || (float) $addOn->price_monthly <= 0) {
                $this->warn("  [SKIPPED] Monthly: Marked as needs_review (Placeholder). Admin review required.");
            } else {
                $lookup = "addon_{$addOn->slug}_month";
                $this->line("  [READY] Monthly: \${$addOn->price_monthly} CAD | Lookup Key: <info>{$lookup}</info>");
            }

            // Annual
            $isAnnualPlaceholder = $addOn->needs_review && in_array('price_annual', $addOn->needs_review_fields ?? [], true);
            if ($isAnnualPlaceholder || (float) $addOn->price_annual <= 0) {
                $this->warn("  [SKIPPED] Annual: Marked as needs_review (Placeholder). Admin review required.");
            } else {
                $lookup = "addon_{$addOn->slug}_year";
                $this->line("  [READY] Annual: \${$addOn->price_annual} CAD | Lookup Key: <info>{$lookup}</info>");
            }

            if (! $isDryRun) {
                $syncService->syncAddOn($addOn);
                $this->info("  -> Add-on synchronized successfully.");
            }
        }

        // Promo codes
        $promos = PromoCode::where('is_active', true)->get();
        $this->newLine();
        $this->info("Found {$promos->count()} active promo code(s).");

        foreach ($promos as $promo) {
            $this->line("  Promo Code: <info>{$promo->code}</info> ({$promo->discount_type}: {$promo->discount_value})");
            if (! $isDryRun) {
                $syncService->syncPromoCode($promo);
                $this->info("  -> Promo code synchronized successfully.");
            }
        }

        $this->newLine();
        if ($isDryRun) {
            $this->info("[DRY-RUN COMPLETE] No changes were made to Stripe or the database.");
        } else {
            $this->info("[SYNC COMPLETE] All confirmed resources successfully synchronized to Stripe.");
        }

        return Command::SUCCESS;
    }
}
