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
        Schema::create('blocked_emails', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->text('reason');
            $table->foreignUuid('blocked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('business_registration_number')->nullable()->index();
            $table->string('phone')->nullable()->index();
            $table->timestamps();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->unsignedSmallInteger('reapply_count')->default(1)->after('status');
            $table->json('rejection_sections')->nullable()->after('review_note');
            $table->json('rejection_history')->nullable()->after('rejection_sections');
            $table->boolean('is_permanently_rejected')->default(false)->after('rejection_history');
            $table->timestamp('rejected_at')->nullable()->after('reviewed_at');
            $table->timestamp('subdomain_released_at')->nullable()->after('rejected_at');
            $table->timestamp('documents_purged_at')->nullable()->after('subdomain_released_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'reapply_count',
                'rejection_sections',
                'rejection_history',
                'is_permanently_rejected',
                'rejected_at',
                'subdomain_released_at',
                'documents_purged_at',
            ]);
        });

        Schema::dropIfExists('blocked_emails');
    }
};
