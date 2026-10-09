<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Languages registry table
        Schema::create('scribe_languages', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16)->unique();
            $table->string('label', 100);
            $table->string('native_name', 100);
            $table->string('provider', 50)->default('assemblyai');
            $table->string('provider_code', 32);
            $table->boolean('supports_transcription')->default(true);
            $table->boolean('supports_note_output')->default(false);
            $table->string('status', 20)->default('active'); // active, beta, hidden
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed default languages (English, Mandarin, French). Cantonese is intentionally omitted.
        DB::table('scribe_languages')->insert([
            [
                'code' => 'en',
                'label' => 'English',
                'native_name' => 'English',
                'provider' => 'assemblyai',
                'provider_code' => 'en',
                'supports_transcription' => true,
                'supports_note_output' => true,
                'status' => 'active',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'zh',
                'label' => 'Mandarin (Chinese)',
                'native_name' => '中文 (普通话)',
                'provider' => 'assemblyai',
                'provider_code' => 'zh',
                'supports_transcription' => true,
                'supports_note_output' => false,
                'status' => 'active',
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'fr',
                'label' => 'French',
                'native_name' => 'Français',
                'provider' => 'assemblyai',
                'provider_code' => 'fr',
                'supports_transcription' => true,
                'supports_note_output' => true,
                'status' => 'active',
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 2. Add note output and provider/translation tracking to scribe_sessions
        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->string('note_output_language', 16)->default('en')->after('language');
            $table->string('provider_model', 100)->nullable()->after('transcription_provider');
            $table->string('translation_status', 32)->nullable()->after('is_translated');
            $table->text('translation_error')->nullable()->after('translation_status');
        });

        // 3. Add detected language and translation status to transcript segments
        Schema::table('scribe_transcript_segments', function (Blueprint $table) {
            $table->string('detected_language', 16)->nullable()->after('language');
            $table->string('translation_status', 32)->nullable()->after('translated_text');
        });

        // Backfill existing sessions safely
        DB::table('scribe_sessions')
            ->whereNull('note_output_language')
            ->update(['note_output_language' => 'en']);

        DB::table('scribe_sessions')
            ->whereNull('transcription_provider')
            ->update(['transcription_provider' => 'assemblyai']);
    }

    public function down(): void
    {
        Schema::table('scribe_transcript_segments', function (Blueprint $table) {
            $table->dropColumn(['detected_language', 'translation_status']);
        });

        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'note_output_language',
                'provider_model',
                'translation_status',
                'translation_error',
            ]);
        });

        Schema::dropIfExists('scribe_languages');
    }
};
