<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payments recorded against a patient-billing invoice: card (via Stripe Connect,
 * settling to the clinic's connected account) or manual (cash / e-transfer /
 * other). Amounts are integer minor units. Stripe is the source of truth for
 * card payments; the unique payment-intent id makes webhook handling idempotent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained()->cascadeOnDelete();

            // card | cash | etransfer | other
            $table->string('method');
            // pending | succeeded | failed | refunded
            $table->string('status')->default('pending');

            $table->unsignedBigInteger('amount');            // minor units
            $table->char('currency', 3);

            // The application (platform) fee actually applied, in minor units.
            // 0 at launch (fee disabled) => 100% to the clinic. Stored so a
            // receipt/audit can prove how the money was split.
            $table->unsignedBigInteger('application_fee_amount')->default(0);

            // Card payments: the connected account the charge settled into, plus
            // Stripe object ids. Null for manual payments.
            $table->string('stripe_connect_account_id')->nullable();
            $table->string('stripe_payment_intent_id')->nullable()->unique();
            $table->string('stripe_charge_id')->nullable();

            $table->text('notes')->nullable();
            $table->foreignUuid('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'invoice_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
