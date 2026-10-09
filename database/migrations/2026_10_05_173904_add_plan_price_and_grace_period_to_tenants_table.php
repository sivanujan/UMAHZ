<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignUuid('plan_price_id')->nullable()->after('plan_id')->constrained('plan_prices')->nullOnDelete();
            $table->timestamp('grace_period_ends_at')->nullable()->after('payment_failed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['plan_price_id']);
            $table->dropColumn(['plan_price_id', 'grace_period_ends_at']);
        });
    }
};
