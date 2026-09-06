<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Line items for a patient-billing invoice. Amounts are integer minor units.
 * tenant_id is carried for strict tenant scoping / defence in depth.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_line_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained()->cascadeOnDelete();

            $table->string('description');
            // Whole-number quantity (fractional quantities are a later phase).
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedBigInteger('unit_amount');       // per-unit, minor units
            $table->unsignedBigInteger('tax_amount')->default(0);
            $table->unsignedBigInteger('total_amount');      // line total, minor units
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['tenant_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_line_items');
    }
};
