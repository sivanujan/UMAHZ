<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI Scribe — Phase 2: profession-specific AI draft.
 *
 * The draft itself lives in scribe_draft_items (one row per fragment, each
 * with its own provenance + evidence). These columns track the generation
 * lifecycle and snapshot the ClinicalNoteTemplate the draft was written for,
 * so a later template edit can never silently change what a draft means.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scribe_sessions', function (Blueprint $table) {
            // null (never requested) | generating | ready | failed
            $table->string('draft_status')->nullable()->after('clinical_note_id');
            $table->text('draft_error')->nullable()->after('draft_status');
            $table->unsignedInteger('draft_version')->default(0)->after('draft_error');
            $table->timestamp('draft_generated_at')->nullable()->after('draft_version');
            $table->foreignUuid('clinical_note_template_id')->nullable()->after('draft_generated_at')
                ->constrained('clinical_note_templates')->nullOnDelete();
            $table->json('draft_template_snapshot')->nullable()->after('clinical_note_template_id');
        });
    }

    public function down(): void
    {
        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('clinical_note_template_id');
            $table->dropColumn(['draft_status', 'draft_error', 'draft_version', 'draft_generated_at', 'draft_template_snapshot']);
        });
    }
};
