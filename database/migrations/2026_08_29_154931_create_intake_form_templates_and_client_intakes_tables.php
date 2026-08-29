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
        Schema::create('intake_form_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('discipline'); // massage_therapy, acupuncture_tcm, personal_training, nutrition, colon_hydrotherapy
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('schema'); // sections, questions, types, contraindication flag settings
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'discipline']);
            $table->index('tenant_id');
        });

        Schema::create('client_intakes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignUuid('intake_form_template_id')->nullable()->constrained('intake_form_templates')->nullOnDelete();
            $table->string('discipline');
            $table->string('template_name');
            $table->json('schema_snapshot')->nullable(); // Immutable snapshot of questions at time of submission
            $table->json('responses')->nullable(); // Client answers key-value
            $table->json('contraindication_flags')->nullable(); // Array of triggered warning flags
            $table->string('status')->default('pending'); // pending, completed, flagged
            $table->string('submission_type')->default('patient_link'); // patient_link, staff_recorded
            $table->string('token', 64)->nullable()->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignUuid('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'client_id']);
            $table->index('token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_intakes');
        Schema::dropIfExists('intake_form_templates');
    }
};
