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
            $table->foreignUuid('scheduled_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->string('scheduled_billing_interval', 20)->nullable();
            $table->unsignedInteger('scheduled_extra_seats')->nullable();
            $table->timestamp('scheduled_change_at')->nullable();
        });

        Schema::table('staff_memberships', function (Blueprint $table) {
            $table->boolean('has_scribe_plus')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('staff_memberships', function (Blueprint $table) {
            $table->dropColumn('has_scribe_plus');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('scheduled_plan_id');
            $table->dropColumn([
                'scheduled_billing_interval',
                'scheduled_extra_seats',
                'scheduled_change_at',
            ]);
        });
    }
};
