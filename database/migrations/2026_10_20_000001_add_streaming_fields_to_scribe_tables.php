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
        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->boolean('is_streaming')->default(false)->after('transcription_provider');
            $table->unsignedBigInteger('streaming_billed_ms')->default(0)->after('recorded_ms');
            $table->timestamp('streaming_active_token_at')->nullable()->after('streaming_billed_ms');
        });

        Schema::table('scribe_usage_ledgers', function (Blueprint $table) {
            $table->unsignedBigInteger('streaming_billed_ms')->default(0)->after('recorded_ms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scribe_usage_ledgers', function (Blueprint $table) {
            $table->dropColumn('streaming_billed_ms');
        });

        Schema::table('scribe_sessions', function (Blueprint $table) {
            $table->dropColumn(['is_streaming', 'streaming_billed_ms', 'streaming_active_token_at']);
        });
    }
};
