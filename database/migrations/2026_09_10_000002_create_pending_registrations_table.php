<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A clinic registration that has NOT yet been submitted to the admin, because a
 * valid card has not been saved. It temporarily holds the wizard payload and
 * reserves the chosen subdomain. Rows expire (default 30 min) and are pruned,
 * releasing the subdomain — so abandoned/junk attempts never create a real
 * tenant, charge a card, or block a subdomain. The real Tenant is created only
 * when a card is confirmed (see ClinicRegistrationController::store).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->index();
            $table->string('subdomain')->index();
            $table->string('ip_address')->nullable();

            // Validated wizard data (password already hashed; no raw card data).
            $table->json('payload');
            // The uploaded license file, stored to disk now and moved into the
            // tenant's own path on finalize.
            $table->string('license_document_path')->nullable();
            $table->string('license_document_original_name')->nullable();
            $table->string('license_document_mime')->nullable();

            // Stripe references for the pre-charge card capture. NO raw card data
            // is ever stored — Stripe holds the card; we keep only opaque ids.
            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_setup_intent_id')->nullable();
            $table->string('stripe_payment_method_id')->nullable();
            $table->timestamp('card_saved_at')->nullable();

            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
