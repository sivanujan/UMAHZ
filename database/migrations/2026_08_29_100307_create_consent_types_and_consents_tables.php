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
        Schema::create('consent_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->text('description')->nullable();
            $table->longText('body')->nullable(); // Clinic-provided consent wording (null if not yet set)
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('consents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('consent_type_id')->nullable()->constrained('consent_types')->nullOnDelete();
            $table->string('consent_type_name');
            $table->longText('consent_body'); // Immutable snapshot of agreement text at time of signing
            $table->string('signer_name');
            $table->string('signature_type')->default('draw'); // 'draw' or 'typed'
            $table->longText('signature_data'); // Data URL / signature image or typed acknowledgment
            $table->foreignUuid('witnessed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('agreed_at');
            $table->string('status')->default('active'); // 'active' or 'withdrawn'
            $table->timestamp('withdrawn_at')->nullable();
            $table->foreignUuid('withdrawn_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('withdrawal_reason')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'client_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('consents');
        Schema::dropIfExists('consent_types');
    }
};
