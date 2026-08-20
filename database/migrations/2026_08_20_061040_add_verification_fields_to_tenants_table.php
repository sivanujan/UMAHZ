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
            // pending_review, needs_more_info, approved, rejected, suspended
            $table->string('status')->default('pending_review')->after('slug');
            $table->string('business_registration_number')->nullable()->after('status');
            $table->string('primary_contact_name')->nullable()->after('business_registration_number');
            $table->string('primary_contact_email')->nullable()->after('primary_contact_name');
            $table->string('primary_contact_phone')->nullable()->after('primary_contact_email');
            // subset of PractitionerProfile::PROFESSION_* the clinic applied with
            $table->jsonb('requested_disciplines')->nullable()->after('primary_contact_phone');
            $table->unsignedInteger('estimated_practitioner_count')->nullable()->after('requested_disciplines');
            $table->timestamp('submitted_at')->nullable()->after('estimated_practitioner_count');
            $table->timestamp('reviewed_at')->nullable()->after('submitted_at');
            $table->foreignUuid('reviewed_by')->nullable()->after('reviewed_at')->constrained('users')->nullOnDelete();
            // rejection reason when rejected, or requested changes when needs_more_info —
            // the two states never coexist, so one column covers both without duplication
            $table->text('review_note')->nullable()->after('reviewed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn([
                'status', 'business_registration_number', 'primary_contact_name',
                'primary_contact_email', 'primary_contact_phone', 'requested_disciplines',
                'estimated_practitioner_count', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_note',
            ]);
        });
    }
};
