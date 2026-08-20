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
        Schema::table('practitioner_profiles', function (Blueprint $table) {
            // pending, verified, rejected
            $table->string('verification_status')->default('pending')->after('profession');
            $table->string('license_number')->nullable()->after('verification_status');
            $table->string('licensing_body')->nullable()->after('license_number');
            // stored on the private "local" disk (storage/app/private), never public —
            // served to super admins only via a signed, expiring route
            $table->string('license_document_path')->nullable()->after('licensing_body');
            $table->string('license_document_original_name')->nullable()->after('license_document_path');
            $table->string('license_document_mime')->nullable()->after('license_document_original_name');
            // true only for the practitioner submitted with the clinic's own application;
            // false for practitioners added later through the secondary verification queue
            $table->boolean('is_primary_contact')->default(false)->after('license_document_mime');
            $table->timestamp('reviewed_at')->nullable()->after('is_primary_contact');
            $table->foreignUuid('reviewed_by')->nullable()->after('reviewed_at')->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable()->after('reviewed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('practitioner_profiles', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn([
                'verification_status', 'license_number', 'licensing_body',
                'license_document_path', 'license_document_original_name', 'license_document_mime',
                'is_primary_contact', 'reviewed_at', 'reviewed_by', 'review_note',
            ]);
        });
    }
};
