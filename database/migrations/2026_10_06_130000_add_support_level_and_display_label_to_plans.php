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
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'support_level')) {
                $table->string('support_level', 100)->nullable()->after('location_limit');
            }
        });

        Schema::table('plan_features', function (Blueprint $table) {
            if (! Schema::hasColumn('plan_features', 'display_label')) {
                $table->string('display_label', 100)->nullable()->after('is_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'support_level')) {
                $table->dropColumn('support_level');
            }
        });

        Schema::table('plan_features', function (Blueprint $table) {
            if (Schema::hasColumn('plan_features', 'display_label')) {
                $table->dropColumn('display_label');
            }
        });
    }
};
