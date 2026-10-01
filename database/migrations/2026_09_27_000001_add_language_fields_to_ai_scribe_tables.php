<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->string('language', 16)->default('en')->after('discipline_label');
            $table->boolean('is_translated')->default(false)->after('draft_template_snapshot');
            $table->timestamp('translated_at')->nullable()->after('is_translated');
            $table->string('translation_provider')->nullable()->after('translated_at');
        });

        Schema::table('scribe_transcript_segments', function (Blueprint $table) {
            $table->longText('translated_text')->nullable()->after('text');
        });
    }

    public function down(): void
    {
        Schema::table('scribe_transcript_segments', function (Blueprint $table) {
            $table->dropColumn('translated_text');
        });

        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->dropColumn(['language', 'is_translated', 'translated_at', 'translation_provider']);
        });
    }
};
