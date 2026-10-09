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
            $table->integer('extra_practitioner_seats')->default(0)->after('applied_promo_code');
        });

        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->integer('extra_practitioner_seats')->default(0)->after('applied_promo_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropColumn('extra_practitioner_seats');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('extra_practitioner_seats');
        });
    }
};
