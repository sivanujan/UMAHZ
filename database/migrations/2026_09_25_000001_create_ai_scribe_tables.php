<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI Scribe — Phase 1 foundation.
 *
 * Provenance is kept from day one: every piece of text Scribe stores carries
 * WHERE it came from and is never merged with text from another source.
 *   - scribe_transcript_segments: machine transcription of the recorded audio.
 *   - scribe_draft_items (empty until Phase 2): one row per draft fragment,
 *     labelled client_reported | practitioner_entered | objective_measurement |
 *     ai_generated, each pointing at its evidence.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Encounter scoping for consents (e.g. a Scribe recording consent is
        // given for ONE appointment). Nullable: existing consents are client-wide.
        Schema::table('consents', function (Blueprint $table) {
            $table->foreignUuid('appointment_id')->nullable()->after('client_id')
                ->constrained('appointments')->nullOnDelete();
        });

        // Clinic-level Scribe configuration (enabled flag + raw-audio retention).
        Schema::table('tenants', function (Blueprint $table) {
            $table->json('scribe_settings')->nullable();
        });

        Schema::create('scribe_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            // The practitioner running the encounter (only they may record).
            $table->foreignUuid('staff_membership_id')->constrained('staff_memberships')->cascadeOnDelete();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();

            // Discipline snapshot at session start — Phase 2 drafts adapt to this.
            $table->string('discipline')->nullable();
            $table->string('discipline_label')->nullable();

            $table->string('status')->default('consent_pending');

            // The signed, immutable Consent record that authorises this recording.
            $table->foreignUuid('consent_id')->nullable()->constrained('consents')->nullOnDelete();

            // Phase 3 seam: the DRAFT clinical note this session was handed to.
            // Scribe never finalizes; the note is reviewed/signed in Clinical Notes.
            $table->foreignUuid('clinical_note_id')->nullable()->constrained('clinical_notes')->nullOnDelete();

            $table->string('transcription_provider')->nullable();
            $table->unsignedInteger('recorded_ms')->default(0);
            $table->text('last_error')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->timestamp('transcript_ready_at')->nullable();
            $table->timestamp('consent_withdrawn_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'client_id']);
            $table->index(['tenant_id', 'appointment_id']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('scribe_audio_chunks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('scribe_session_id')->constrained('scribe_sessions')->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            // Encrypted-at-rest file on the private disk. Nulled once purged.
            $table->string('storage_path')->nullable();
            $table->string('mime_type', 100);
            $table->unsignedInteger('byte_size')->default(0);
            $table->unsignedInteger('duration_ms')->default(0);
            // Offset of this chunk from the start of the recording.
            $table->unsignedInteger('offset_ms')->default(0);
            $table->string('status')->default('pending'); // pending|processing|transcribed|failed|discarded
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('transcribed_at')->nullable();
            $table->timestamp('audio_purged_at')->nullable();
            $table->timestamps();

            $table->unique(['scribe_session_id', 'sequence']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('scribe_transcript_segments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('scribe_session_id')->constrained('scribe_sessions')->cascadeOnDelete();
            $table->foreignUuid('scribe_audio_chunk_id')->nullable()->constrained('scribe_audio_chunks')->nullOnDelete();
            $table->unsignedInteger('sequence');
            $table->longText('text'); // encrypted cast
            $table->unsignedInteger('start_ms')->default(0);
            $table->unsignedInteger('end_ms')->default(0);
            // Provenance: always machine transcription of recorded audio in Phase 1.
            $table->string('source')->default('ai_transcription');
            // Future diarization: client | practitioner | unknown.
            $table->string('speaker_role')->nullable();
            $table->string('provider');
            $table->string('provider_model')->nullable();
            $table->string('language', 16)->nullable();
            $table->timestamps();

            $table->unique(['scribe_session_id', 'sequence']);
        });

        // Phase 2+ (no rows written in Phase 1). Every draft fragment keeps its
        // provenance and evidence; sources are never merged into one blob.
        Schema::create('scribe_draft_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('scribe_session_id')->constrained('scribe_sessions')->cascadeOnDelete();
            $table->unsignedInteger('draft_version')->default(1);
            // Target field in the clinical note template schema (e.g. "subjective").
            $table->string('section_key');
            // client_reported | practitioner_entered | objective_measurement | ai_generated
            $table->string('provenance');
            $table->longText('content'); // encrypted cast
            // Evidence pointers: transcript segment ids, Motion result ids, etc.
            $table->json('evidence')->nullable();
            // For ai_generated: provider, model, prompt/template version.
            $table->json('generator')->nullable();
            // proposed | accepted | edited | rejected — the practitioner decides.
            $table->string('review_status')->default('proposed');
            $table->foreignUuid('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['scribe_session_id', 'draft_version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scribe_draft_items');
        Schema::dropIfExists('scribe_transcript_segments');
        Schema::dropIfExists('scribe_audio_chunks');
        Schema::dropIfExists('scribe_sessions');

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('scribe_settings');
        });

        Schema::table('consents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('appointment_id');
        });
    }
};
