<?php

namespace App\Console\Commands;

use App\Billing\PlatformBilling;
use App\Models\AuditEvent;
use App\Models\Plan;
use App\Models\PlanPrice;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CreatePlanPriceCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'plans:create-price
        {plan : Plan slug or alias (e.g. basic, essential, professional, signature)}
        {amount_cents : Recurring price in cents (e.g. 3500 for $35.00 CAD)}
        {--interval=month : Billing cadence (month or year)}
        {--launch-badge=Launch price : Launch badge text to show on marketing/signup cards}
        {--crossed-out= : Previous crossed-out price in CAD (defaults to previous active price, e.g. 39.00)}
        {--no-launch-badge : Do not enable launch badge or crossed-out price}
        {--extra-seat-cents=0 : Extra practitioner seat price in cents}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely create an immutable recurring Stripe price and point new signups to it without affecting existing subscribers.';

    public function handle(PlatformBilling $billing): int
    {
        $planInput = strtolower(trim($this->argument('plan')));
        $slug = $planInput === 'basic' ? 'essential' : $planInput;

        $plan = Plan::where('slug', $slug)->first();
        if (! $plan) {
            $this->error("Plan [{$planInput}] not found (checked slug [{$slug}]).");
            return self::FAILURE;
        }

        $interval = strtolower(trim($this->option('interval')));
        if (! in_array($interval, ['month', 'year'], true)) {
            $this->error("Invalid interval [{$interval}]. Must be 'month' or 'year'.");
            return self::FAILURE;
        }

        $amountCents = (int) $this->argument('amount_cents');
        if ($amountCents <= 0) {
            $this->error("Price [{$amountCents}] must be positive integer cents.");
            return self::FAILURE;
        }

        $newBase = round($amountCents / 100, 2);
        $extraSeatCents = (int) $this->option('extra-seat-cents');
        $extraSeatAmount = round($extraSeatCents / 100, 2);

        $this->info("=== Creating new {$interval} price for {$plan->name} ({$plan->slug}) ===");
        $this->line("  New Base Price: \${$newBase} CAD/{$interval}");

        // 1. Ensure Stripe Product exists
        if (empty($plan->stripe_product_id)) {
            $productId = $billing->createStripeProduct(
                "UMAHZ {$plan->name}",
                $plan->tagline,
                [
                    'plan_id' => $plan->id,
                    'slug' => $plan->slug,
                ]
            );
            $plan->update(['stripe_product_id' => $productId]);
            $plan->stripe_product_id = $productId;
            $this->info("  Created Stripe Product: {$productId}");
        } else {
            $this->line("  Using existing Stripe Product: {$plan->stripe_product_id}");
        }

        // 2. Create new Price in Stripe
        $lookupKey = "plan_{$plan->slug}_{$interval}_{$amountCents}";
        try {
            $stripePriceId = $billing->createStripePrice(
                $plan->stripe_product_id,
                $newBase,
                'CAD',
                $interval,
                [
                    'kind' => 'base',
                    'plan_id' => $plan->id,
                    'interval' => $interval,
                ],
                $lookupKey
            );
            $this->info("  Stripe recurring price created: {$stripePriceId} (Lookup: {$lookupKey})");
        } catch (\Throwable $e) {
            if (app()->environment('local', 'testing') && (empty(config('cashier.secret')) || str_contains($e->getMessage(), 'Invalid API Key') || str_contains($e->getMessage(), 'test_placeholder'))) {
                $stripePriceId = 'price_test_' . substr(md5(uniqid()), 0, 14);
                $this->warn("  Stripe API unavailable in local/testing; generated test price ID: {$stripePriceId}");
            } else {
                $this->error("Failed to create Stripe Price: {$e->getMessage()}");
                return self::FAILURE;
            }
        }

        // Extra seat price if applicable
        $extraSeatPriceId = null;
        if ($plan->allows_extra_practitioners && $extraSeatAmount > 0) {
            $seatLookup = "plan_{$plan->slug}_seat_{$interval}_{$extraSeatCents}";
            try {
                $extraSeatPriceId = $billing->createStripePrice(
                    $plan->stripe_product_id,
                    $extraSeatAmount,
                    'CAD',
                    $interval,
                    [
                        'kind' => 'extra_practitioner_seat',
                        'plan_id' => $plan->id,
                        'interval' => $interval,
                    ],
                    $seatLookup
                );
            } catch (\Throwable $e) {
                if (app()->environment('local', 'testing')) {
                    $extraSeatPriceId = 'price_test_seat_' . substr(md5(uniqid()), 0, 12);
                } else {
                    $this->error("Failed to create extra seat price: {$e->getMessage()}");
                    return self::FAILURE;
                }
            }
        }

        // 3. Database transaction: Grandfather old price, insert new price, update launch badge
        $oldPrice = $plan->prices()
            ->where('interval', $interval)
            ->where('is_active', true)
            ->first();

        $previousBase = $oldPrice ? (float) $oldPrice->base_price : null;

        DB::transaction(function () use (
            $plan,
            $interval,
            $newBase,
            $extraSeatAmount,
            $stripePriceId,
            $extraSeatPriceId,
            $oldPrice,
            $previousBase
        ) {
            // Keep old price in Stripe active (do NOT archive it), but mark inactive & grandfathered in DB
            if ($oldPrice) {
                $oldPrice->update([
                    'is_active' => false,
                    'is_grandfathered' => true,
                ]);
            }

            // Create new active price
            PlanPrice::create([
                'plan_id' => $plan->id,
                'interval' => $interval,
                'currency' => 'CAD',
                'base_price' => $newBase,
                'extra_practitioner_price' => $extraSeatAmount,
                'stripe_base_price_id' => $stripePriceId,
                'stripe_extra_seat_price_id' => $extraSeatPriceId,
                'is_active' => true,
                'is_grandfathered' => false,
                'needs_review' => false,
                'needs_review_fields' => null,
            ]);

            // Launch badge configuration
            if (! $this->option('no-launch-badge')) {
                $crossedOut = $this->option('crossed-out') !== null
                    ? (float) $this->option('crossed-out')
                    : ($previousBase ?: ($interval === 'year' ? 390.00 : 39.00));

                $badgeText = $this->option('launch-badge') ?: 'Launch price';

                $planUpdates = [
                    'show_launch_price' => true,
                    'launch_badge_text' => $badgeText,
                ];

                if ($interval === 'month') {
                    $planUpdates['original_price_monthly'] = $crossedOut;
                } else {
                    $planUpdates['original_price_annual'] = $crossedOut;
                }

                $plan->update($planUpdates);
            }

            AuditEvent::create([
                'action' => 'plan.price_created',
                'resource_type' => Plan::class,
                'resource_id' => $plan->id,
                'metadata' => [
                    'plan' => $plan->slug,
                    'interval' => $interval,
                    'new_base_price' => $newBase,
                    'old_base_price' => $previousBase,
                    'stripe_base_price_id' => $stripePriceId,
                    'show_launch_price' => ! $this->option('no-launch-badge'),
                ],
            ]);
        });

        $this->newLine();
        $this->info("✓ Success! New {$interval} price of \${$newBase} CAD activated for {$plan->name}.");
        $this->line("  - New signups will receive \${$newBase} CAD/{$interval}.");
        if ($oldPrice) {
            $this->line("  - Existing subscribers remain grandfathered at \${$previousBase} CAD/{$interval} (Stripe price active).");
        }
        if (! $this->option('no-launch-badge')) {
            $crossed = $interval === 'month' ? $plan->fresh()->original_price_monthly : $plan->fresh()->original_price_annual;
            $this->line("  - Launch badge enabled: '{$plan->fresh()->launch_badge_text}' (Crossed out: \${$crossed}).");
        }

        return self::SUCCESS;
    }
}

