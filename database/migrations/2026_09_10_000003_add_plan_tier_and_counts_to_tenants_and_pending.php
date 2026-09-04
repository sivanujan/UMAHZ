<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('plan_tier')->default('practice')->after('status');
            $table->unsignedInteger('full_time_practitioners_count')->default(1)->after('plan_tier');
            $table->unsignedInteger('part_time_practitioners_count')->default(0)->after('full_time_practitioners_count');
        });

        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->string('plan_tier')->default('practice')->after('subdomain');
            $table->unsignedInteger('full_time_practitioners_count')->default(1)->after('plan_tier');
            $table->unsignedInteger('part_time_practitioners_count')->default(0)->after('full_time_practitioners_count');
        });

        Schema::table('practitioner_profiles', function (Blueprint $table) {
            $table->string('employment_type')->default('full_time')->after('profession');
        });
    }

    public function down(): void
    {
        Schema::table('practitioner_profiles', function (Blueprint $table) {
            $table->dropColumn('employment_type');
        });

        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropColumn([
                'plan_tier',
                'full_time_practitioners_count',
                'part_time_practitioners_count',
            ]);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'plan_tier',
                'full_time_practitioners_count',
                'part_time_practitioners_count',
            ]);
        });
    }
};
