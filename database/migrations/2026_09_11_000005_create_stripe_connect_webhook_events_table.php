<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotency ledger for the SEPARATE Stripe Connect webhook endpoint. Every
 * event id is recorded once; a re-delivered event is a no-op. Kept apart from
 * the Cashier/platform-subscription webhook, which has its own handling.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stripe_connect_webhook_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_id')->unique(); // Stripe "evt_..."
            $table->string('type');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_connect_webhook_events');
    }
};
