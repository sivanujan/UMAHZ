<?php

use App\Models\SubscriptionTierConfig;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subscription_tier_configs', function (Blueprint $table) {
            $table->string('tier')->primary(); // 'balance', 'practice', 'thrive'
            $table->string('name');
            $table->string('tagline')->nullable();
            $table->decimal('base_price', 8, 2);
            $table->unsignedInteger('included_full_time')->default(1);
            $table->unsignedInteger('max_practitioners')->nullable(); // null = unlimited
            $table->unsignedInteger('max_appointments_per_month')->nullable(); // null = unlimited
            $table->boolean('allows_addons')->default(false);
            $table->decimal('addon_price_ft', 8, 2)->default(0);
            $table->decimal('addon_price_pt', 8, 2)->default(0);
            $table->string('stripe_price_id')->nullable();
            $table->string('stripe_addon_price_ft_id')->nullable();
            $table->string('stripe_addon_price_pt_id')->nullable();
            $table->json('features')->nullable();
            $table->string('badge')->nullable();
            $table->timestamps();
        });

        // Seed initial values from config/billing.php
        $tiers = config('billing.tiers', []);
        foreach ($tiers as $tierKey => $def) {
            DB::table('subscription_tier_configs')->insert([
                'tier' => $tierKey,
                'name' => $def['name'] ?? ucfirst($tierKey),
                'tagline' => $def['tagline'] ?? '',
                'base_price' => $def['base_price'] ?? 0.0,
                'included_full_time' => $def['included_full_time'] ?? 1,
                'max_practitioners' => $def['max_practitioners'] ?? null,
                'max_appointments_per_month' => $def['max_appointments_per_month'] ?? null,
                'allows_addons' => $def['allows_addons'] ?? false,
                'addon_price_ft' => $def['addon_price_ft'] ?? 0.0,
                'addon_price_pt' => $def['addon_price_pt'] ?? 0.0,
                'stripe_price_id' => $def['stripe_price_id'] ?? null,
                'stripe_addon_price_ft_id' => $def['stripe_addon_price_ft_id'] ?? null,
                'stripe_addon_price_pt_id' => $def['stripe_addon_price_pt_id'] ?? null,
                'features' => json_encode($def['features'] ?? []),
                'badge' => match ($tierKey) {
                    'balance' => 'Solo Practitioner',
                    'practice' => 'Most Popular',
                    'thrive' => 'Full Featured',
                    default => 'Plan',
                },
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_tier_configs');
    }
};
