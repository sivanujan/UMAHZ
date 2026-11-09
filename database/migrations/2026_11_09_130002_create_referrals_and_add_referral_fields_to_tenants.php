<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (! Schema::hasColumn('tenants', 'referral_code')) {
                $table->string('referral_code', 16)->nullable()->unique()->after('subdomain');
            }
            if (! Schema::hasColumn('tenants', 'referred_by_tenant_id')) {
                $table->uuid('referred_by_tenant_id')->nullable()->after('referral_code');
                $table->foreign('referred_by_tenant_id')
                    ->references('id')
                    ->on('tenants')
                    ->nullOnDelete();
            }
        });

        if (! Schema::hasTable('referrals')) {
            Schema::create('referrals', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('referrer_tenant_id');
                $table->uuid('referred_tenant_id')->unique();
                $table->string('referral_code', 16);
                $table->string('status', 30)->default('pending')->index(); // pending, qualified, rewarded, cancelled
                $table->string('reward_mode', 30)->nullable(); // fixed, plan_price
                $table->decimal('reward_amount', 10, 2)->nullable();
                $table->string('stripe_coupon_id', 255)->nullable();
                $table->string('stripe_balance_txn_id', 255)->nullable();
                $table->timestamp('rewarded_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->string('cancellation_reason', 500)->nullable();
                $table->timestamps();

                $table->foreign('referrer_tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->foreign('referred_tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->index(['referrer_tenant_id', 'status']);
            });
        }

        // Backfill readable referral codes for all existing tenants
        $tenants = DB::table('tenants')->whereNull('referral_code')->get();
        foreach ($tenants as $t) {
            $code = self::generateUniqueReferralCode($t->slug ?? $t->name ?? '');
            DB::table('tenants')->where('id', $t->id)->update(['referral_code' => $code]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referrals');

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'referred_by_tenant_id')) {
                $table->dropForeign(['referred_by_tenant_id']);
                $table->dropColumn('referred_by_tenant_id');
            }
            if (Schema::hasColumn('tenants', 'referral_code')) {
                $table->dropColumn('referral_code');
            }
        });
    }

    /**
     * Generate a short, readable referral code (e.g. ASTRO7K2).
     */
    public static function generateUniqueReferralCode(?string $seed = ''): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', (string) $seed), 0, 4));
        if (strlen($prefix) < 3) {
            $prefix = 'CLINIC';
        }

        $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        $maxAttempts = 100;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $suffix = '';
            for ($j = 0; $j < 4; $j++) {
                $suffix .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $candidate = substr($prefix, 0, 4) . $suffix;
            if (! DB::table('tenants')->where('referral_code', $candidate)->exists()) {
                return $candidate;
            }
        }

        return strtoupper(Str::random(8));
    }
};

