<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Alters audit_events.resource_id from UUID to string (varchar 255)
     * in a PostgreSQL-safe manner preserving existing data, allowing polymorphic
     * models with integer IDs (e.g. ScribeLanguage) as well as UUIDs.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE audit_events ALTER COLUMN resource_id TYPE VARCHAR(255) USING resource_id::text');
        } else {
            Schema::table('audit_events', function (Blueprint $table) {
                $table->string('resource_id', 255)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE audit_events ALTER COLUMN resource_id TYPE UUID USING resource_id::uuid');
        } else {
            Schema::table('audit_events', function (Blueprint $table) {
                $table->uuid('resource_id')->nullable()->change();
            });
        }
    }
};
