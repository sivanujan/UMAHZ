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
        Schema::create('assessment_tests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index(); // null = platform library, set = clinic's own test
            $table->string('body_region', 50)->index();
            $table->string('name', 255)->index();
            $table->json('aliases')->nullable();
            $table->text('purpose');
            $table->text('procedure');
            $table->text('positive_finding');
            $table->text('interpretation_notes')->nullable();
            $table->json('disciplines')->nullable();
            $table->string('image_path', 500)->nullable();
            $table->string('video_url', 500)->nullable();
            $table->text('references')->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft | reviewed | archived
            $table->uuid('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['tenant_id', 'status']);
            $table->index(['body_region', 'status']);
        });

        Schema::create('clinical_note_test_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('clinical_note_id')->index();
            $table->uuid('assessment_test_id')->nullable()->index();
            $table->string('test_name_snapshot', 255);
            $table->string('body_region_snapshot', 50);
            $table->string('side', 20)->default('n/a'); // left | right | bilateral | n/a
            $table->string('result', 20)->default('not_tested'); // positive | negative | inconclusive | not_tested
            $table->boolean('pain_reproduced')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('recorded_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('clinical_note_id')->references('id')->on('clinical_notes')->cascadeOnDelete();
            $table->foreign('assessment_test_id')->references('id')->on('assessment_tests')->nullOnDelete();
            $table->foreign('recorded_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['tenant_id', 'clinical_note_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_note_test_results');
        Schema::dropIfExists('assessment_tests');
    }
};
