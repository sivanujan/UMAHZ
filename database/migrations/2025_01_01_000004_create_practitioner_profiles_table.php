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
        Schema::create('practitioner_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('staff_membership_id')->constrained()->cascadeOnDelete();
            // profession: massage_therapy, acupuncture_tcm, personal_training, nutrition, colon_hydrotherapy
            $table->string('profession');
            $table->string('credentials')->nullable();
            $table->string('registration_number')->nullable();
            $table->text('biography')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('calendar_color')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('practitioner_profiles');
    }
};
