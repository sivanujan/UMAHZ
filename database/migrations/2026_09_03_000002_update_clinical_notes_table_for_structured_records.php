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
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'pgsql') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE clinical_notes ALTER COLUMN content TYPE json USING (CASE WHEN content IS NULL OR content = '' THEN '{}'::json WHEN content ~ '^\s*[\{\[]' THEN content::json ELSE json_build_object('notes', content)::json END)");
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE clinical_notes ALTER COLUMN content DROP NOT NULL');
        }

        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->foreignUuid('clinical_note_template_id')->nullable()->after('appointment_id')->constrained()->nullOnDelete();
            $table->string('discipline')->nullable()->after('clinical_note_template_id');
            $table->string('template_name')->nullable()->after('discipline');
            $table->unsignedInteger('template_version')->default(1)->after('template_name');
            $table->json('schema_snapshot')->nullable()->after('template_version');
            if (\Illuminate\Support\Facades\DB::getDriverName() !== 'pgsql') {
                $table->json('content')->nullable()->change();
            }
            $table->string('signer_name')->nullable()->after('status');
            $table->string('signer_credentials')->nullable()->after('signer_name');
            $table->text('attestation_text')->nullable()->after('signer_credentials');
            $table->timestamp('finalized_at')->nullable()->after('signed_at');
            $table->foreignUuid('finalized_by_user_id')->nullable()->after('finalized_at')->constrained('users')->nullOnDelete();
            $table->string('pdf_path')->nullable()->after('finalized_by_user_id');

            $table->index(['tenant_id', 'client_id', 'status']);
            $table->index(['tenant_id', 'discipline']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->dropForeign(['clinical_note_template_id']);
            $table->dropForeign(['finalized_by_user_id']);
            $table->dropColumn([
                'clinical_note_template_id',
                'discipline',
                'template_name',
                'template_version',
                'schema_snapshot',
                'signer_name',
                'signer_credentials',
                'attestation_text',
                'finalized_at',
                'finalized_by_user_id',
                'pdf_path',
            ]);
        });
    }
};
