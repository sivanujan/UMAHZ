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
        Schema::table('users', function (Blueprint $table) {
            $table->string('tos_accepted_version')->nullable()->after('two_factor_recovery_codes');
            $table->timestamp('tos_accepted_at')->nullable()->after('tos_accepted_version');
            $table->boolean('marketing_opt_in')->default(false)->after('tos_accepted_at');
            $table->timestamp('marketing_opt_in_at')->nullable()->after('marketing_opt_in');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tos_accepted_version', 'tos_accepted_at', 'marketing_opt_in', 'marketing_opt_in_at']);
        });
    }
};
