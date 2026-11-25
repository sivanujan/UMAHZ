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
        Schema::table('assessment_tests', function (Blueprint $table) {
            $table->string('reviewer_name')->nullable()->after('reviewed_by');
            $table->string('reviewer_credential')->nullable()->after('reviewer_name');
        });

        Schema::table('clinical_note_test_results', function (Blueprint $table) {
            $table->uuid('addendum_id')->nullable()->after('clinical_note_id')->index();
            $table->foreign('addendum_id')->references('id')->on('clinical_note_addenda')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinical_note_test_results', function (Blueprint $table) {
            $table->dropForeign(['addendum_id']);
            $table->dropColumn('addendum_id');
        });

        Schema::table('assessment_tests', function (Blueprint $table) {
            $table->dropColumn(['reviewer_name', 'reviewer_credential']);
        });
    }
};
