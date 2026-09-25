<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI Scribe — Phase 3: hand the reviewed-to-be draft to Clinical Notes.
 *
 * Scribe pre-fills a DRAFT ClinicalNote (never finalized). These columns record
 * who handed it over, when, and exactly which note fields were pre-filled from
 * which draft version, so the editor can label them and the trail survives
 * after the practitioner signs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->timestamp('handed_off_at')->nullable()->after('draft_template_snapshot');
            $table->foreignUuid('handed_off_by_user_id')->nullable()->after('handed_off_at')
                ->constrained('users')->nullOnDelete();
            // { draft_version: int, filled: [field ids], skipped: [field ids already typed by the practitioner] }
            $table->json('handoff_fields')->nullable()->after('handed_off_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('handed_off_by_user_id');
            $table->dropColumn(['handed_off_at', 'handoff_fields']);
        });
    }
};
