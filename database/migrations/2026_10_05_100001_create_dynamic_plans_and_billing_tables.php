<?php

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
        // 1. Dynamic Plans Table
        Schema::create('plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug', 64)->unique();
            $table->string('name', 100);
            $table->string('tagline', 255)->nullable();
            $table->text('description')->nullable();
            $table->string('badge', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->unsignedInteger('trial_days')->default(0);

            // Practitioner Seat Configuration
            $table->unsignedInteger('included_practitioners')->default(1);
            $table->unsignedInteger('max_practitioners')->nullable(); // null = unlimited
            $table->boolean('allows_extra_practitioners')->default(false);

            // Resource Limits (null = unlimited)
            $table->unsignedInteger('appointment_limit_monthly')->nullable();
            $table->string('appointment_limit_behavior', 20)->default('warn'); // 'warn' | 'block'
            $table->unsignedInteger('location_limit')->nullable();

            // Scribe Allowance (default = minutes)
            $table->string('scribe_allowance_unit', 20)->default('minutes'); // 'minutes' | 'sessions'
            $table->unsignedInteger('scribe_allowance_amount')->default(0);
            $table->string('scribe_limit_behavior', 20)->default('warn'); // 'warn' | 'block'

            // Stripe & Review
            $table->string('stripe_product_id', 255)->nullable();
            $table->boolean('needs_review')->default(false);
            $table->json('needs_review_fields')->nullable();

            $table->timestamps();
        });

        // 2. Plan Prices Table (Monthly & Annual, Immutable Stripe Sync)
        Schema::create('plan_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->string('interval', 20); // 'month' | 'year'
            $table->string('currency', 3)->default('CAD');
            $table->decimal('base_price', 10, 2);
            $table->decimal('extra_practitioner_price', 10, 2)->default(0.00);

            $table->string('stripe_base_price_id', 255)->nullable();
            $table->string('stripe_extra_seat_price_id', 255)->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('is_grandfathered')->default(false);
            $table->boolean('needs_review')->default(false);
            $table->json('needs_review_fields')->nullable();

            $table->timestamps();
        });

        // Partial unique index: only ONE active price per (plan_id, interval)
        $isSqlite = DB::getDriverName() === 'sqlite';
        $condition = $isSqlite ? 'is_active = 1' : 'is_active = true';
        DB::statement("CREATE UNIQUE INDEX plan_prices_plan_interval_active_unique ON plan_prices (plan_id, \"interval\") WHERE {$condition}");

        // 3. Features Registry Table
        Schema::create('features', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 64)->unique();
            $table->string('name', 100);
            $table->string('category', 50)->default('general');
            $table->text('description')->nullable();
            $table->boolean('is_implemented')->default(true);
            $table->timestamps();
        });

        // 4. Plan Features Matrix Table
        Schema::create('plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->foreignUuid('feature_id')->constrained('features')->cascadeOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['plan_id', 'feature_id']);
        });

        // 5. Add-ons Table (e.g. Scribe+)
        Schema::create('add_ons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug', 64)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('billing_type', 20)->default('per_seat'); // 'per_seat' | 'flat'
            $table->decimal('price_monthly', 10, 2);
            $table->decimal('price_annual', 10, 2)->nullable();
            $table->string('stripe_product_id', 255)->nullable();
            $table->string('stripe_price_monthly_id', 255)->nullable();
            $table->string('stripe_price_annual_id', 255)->nullable();
            $table->json('config')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('needs_review')->default(false);
            $table->json('needs_review_fields')->nullable();
            $table->timestamps();
        });

        // 6. Tenant Add-ons Table
        Schema::create('tenant_add_ons', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('add_on_id')->constrained('add_ons')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('stripe_subscription_item_id', 255)->nullable();
            $table->string('status', 20)->default('active'); // 'active' | 'canceled'
            $table->timestamps();

            $table->unique(['tenant_id', 'add_on_id']);
        });

        // 7. Promo Codes Table
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('stripe_coupon_id', 255)->nullable();
            $table->string('stripe_promo_code_id', 255)->nullable();
            $table->string('discount_type', 20); // 'percent' | 'fixed_amount'
            $table->decimal('discount_value', 10, 2);
            $table->string('duration', 20)->default('once'); // 'once' | 'repeating' | 'forever'
            $table->unsignedInteger('duration_in_months')->nullable();
            $table->unsignedInteger('max_redemptions')->nullable();
            $table->unsignedInteger('times_redeemed')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 8. Plan Promo Codes Mapping Table
        Schema::create('plan_promo_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('promo_code_id')->constrained('promo_codes')->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['promo_code_id', 'plan_id']);
        });

        // 9. Scribe Usage Ledgers Table
        Schema::create('scribe_usage_ledgers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('staff_membership_id')->nullable()->constrained('staff_memberships')->nullOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedBigInteger('recorded_ms')->default(0);
            $table->unsignedInteger('session_count')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'staff_membership_id', 'period_start'], 'scribe_ledger_period_unique');
        });

        // 10. Update tenants table
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignUuid('plan_id')->nullable()->after('plan_tier')->constrained('plans')->nullOnDelete();
            $table->string('billing_interval', 10)->default('month')->after('plan_id'); // 'month' | 'year'
            $table->foreignUuid('promo_code_id')->nullable()->after('billing_interval')->constrained('promo_codes')->nullOnDelete();
            $table->string('applied_promo_code', 50)->nullable()->after('promo_code_id');
            $table->boolean('is_manually_suspended')->default(false)->after('subscription_status');
            $table->text('manual_suspension_reason')->nullable()->after('is_manually_suspended');
        });

        // 11. Update pending_registrations table
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->foreignUuid('plan_id')->nullable()->after('plan_tier')->constrained('plans')->nullOnDelete();
            $table->string('billing_interval', 10)->default('month')->after('plan_id');
            $table->foreignUuid('promo_code_id')->nullable()->after('billing_interval')->constrained('promo_codes')->nullOnDelete();
            $table->string('applied_promo_code', 50)->nullable()->after('promo_code_id');
        });

        // 12. Seed default Stripe Automatic Tax platform setting (default OFF)
        if (Schema::hasTable('platform_settings')) {
            DB::table('platform_settings')->updateOrInsert(
                ['key' => 'billing.stripe_automatic_tax'],
                [
                    'value' => json_encode(['enabled' => false]),
                    'group' => 'billing',
                    'description' => 'Whether Stripe Automatic Tax is enabled for clinic platform subscriptions.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropForeign(['promo_code_id']);
            $table->dropForeign(['plan_id']);
            $table->dropColumn(['plan_id', 'billing_interval', 'promo_code_id', 'applied_promo_code']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['promo_code_id']);
            $table->dropForeign(['plan_id']);
            $table->dropColumn([
                'plan_id', 'billing_interval', 'promo_code_id', 'applied_promo_code',
                'is_manually_suspended', 'manual_suspension_reason'
            ]);
        });

        Schema::dropIfExists('scribe_usage_ledgers');
        Schema::dropIfExists('plan_promo_codes');
        Schema::dropIfExists('promo_codes');
        Schema::dropIfExists('tenant_add_ons');
        Schema::dropIfExists('add_ons');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('features');
        Schema::dropIfExists('plan_prices');
        Schema::dropIfExists('plans');

        if (Schema::hasTable('platform_settings')) {
            DB::table('platform_settings')->where('key', 'billing.stripe_automatic_tax')->delete();
        }
    }
};
