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
            $table->jsonb('business_hours')->nullable()->after('address');
            $table->string('brand_color')->nullable()->after('logo_url');
            $table->timestamp('onboarding_completed_at')->nullable()->after('brand_color');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['business_hours', 'brand_color', 'onboarding_completed_at']);
        });
    }
};
