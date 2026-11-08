<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Track draft versions per session
        if (! Schema::hasTable('scribe_draft_versions')) {
            Schema::create('scribe_draft_versions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('scribe_session_id')->constrained('scribe_sessions')->cascadeOnDelete();
                $table->unsignedInteger('version');
                $table->foreignUuid('clinical_note_template_id')->nullable()->constrained('clinical_note_templates')->nullOnDelete();
                $table->string('template_name')->nullable();
                $table->json('template_snapshot')->nullable();
                $table->string('draft_status')->default('ready');
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('discarded_at')->nullable();
                $table->foreignUuid('discarded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['scribe_session_id', 'version']);
                $table->index(['tenant_id', 'scribe_session_id']);
            });
        }

        // 2. Add discard columns to scribe_draft_items
        if (Schema::hasTable('scribe_draft_items') && ! Schema::hasColumn('scribe_draft_items', 'discarded_at')) {
            Schema::table('scribe_draft_items', function (Blueprint $table) {
                $table->timestamp('discarded_at')->nullable()->after('reviewed_at');
                $table->foreignUuid('discarded_by')->nullable()->after('discarded_at')->constrained('users')->nullOnDelete();
            });
        }

        // 3. Link clinical note back to scribe session directly
        if (Schema::hasTable('clinical_notes') && ! Schema::hasColumn('clinical_notes', 'scribe_session_id')) {
            Schema::table('clinical_notes', function (Blueprint $table) {
                $table->foreignUuid('scribe_session_id')->nullable()->after('appointment_id')->constrained('scribe_sessions')->nullOnDelete();
            });
        }

        // 4. Backfill existing draft versions
        $distinctVersions = DB::table('scribe_draft_items')
            ->select('scribe_session_id', 'draft_version', DB::raw('MIN(created_at) as first_created_at'))
            ->groupBy('scribe_session_id', 'draft_version')
            ->get();

        foreach ($distinctVersions as $row) {
            $session = DB::table('scribe_sessions')->where('id', $row->scribe_session_id)->first();
            if (! $session) {
                continue;
            }

            $alreadyExists = DB::table('scribe_draft_versions')
                ->where('scribe_session_id', $session->id)
                ->where('version', $row->draft_version)
                ->exists();
            if ($alreadyExists) {
                continue;
            }

            $snapshot = $session->draft_template_snapshot ? json_decode($session->draft_template_snapshot, true) : null;
            $templateName = $snapshot
                ? ($snapshot['name'] ?? 'Template').' (v'.($snapshot['version'] ?? 1).')'
                : null;

            DB::table('scribe_draft_versions')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => $session->tenant_id,
                'scribe_session_id' => $session->id,
                'version' => $row->draft_version,
                'clinical_note_template_id' => $session->clinical_note_template_id,
                'template_name' => $templateName,
                'template_snapshot' => $session->draft_template_snapshot,
                'draft_status' => $session->draft_status ?? 'ready',
                'generated_at' => $session->draft_generated_at ?? $row->first_created_at ?? now(),
                'discarded_at' => null,
                'discarded_by' => null,
                'created_at' => $row->first_created_at ?? now(),
                'updated_at' => now(),
            ]);
        }

        // 5. Backfill clinical_notes.scribe_session_id from existing scribe_sessions
        $handedOffSessions = DB::table('scribe_sessions')
            ->whereNotNull('clinical_note_id')
            ->get(['id', 'clinical_note_id']);

        foreach ($handedOffSessions as $session) {
            DB::table('clinical_notes')
                ->where('id', $session->clinical_note_id)
                ->whereNull('scribe_session_id')
                ->update(['scribe_session_id' => $session->id]);
        }
    }

    public function down(): void
    {
        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('scribe_session_id');
        });

        Schema::table('scribe_draft_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('discarded_by');
            $table->dropColumn('discarded_at');
        });

        Schema::dropIfExists('scribe_draft_versions');
    }
};
