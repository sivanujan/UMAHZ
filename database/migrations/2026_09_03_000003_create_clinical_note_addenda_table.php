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
        Schema::create('clinical_note_addenda', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('clinical_note_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('staff_membership_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('author_name');
            $table->string('author_role');
            $table->string('reason');
            $table->text('content');
            $table->timestamp('signed_at');
            $table->timestamps();

            $table->index(['tenant_id', 'clinical_note_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_note_addenda');
    }
};
