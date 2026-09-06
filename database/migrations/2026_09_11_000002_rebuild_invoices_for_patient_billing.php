<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rebuild the `invoices` table into the real patient-billing invoice (spec §15):
 * money in integer MINOR UNITS, sequential per-tenant numbering, line items,
 * and a draft/open/paid/void lifecycle where posted invoices are never deleted
 * (voids keep a reason).
 *
 * The previous `invoices` table was a decimal-amount stub used only by the
 * dashboard/seeder; it carried no production data, so we replace it outright.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('invoices');

        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained()->nullOnDelete();

            // Human-facing, gap-free sequence PER TENANT (never a global/DB id).
            $table->unsignedBigInteger('invoice_number');

            // draft | open | paid | void
            $table->string('status')->default('draft');

            $table->char('currency', 3);

            // All amounts are integer minor units (e.g. cents). No floats.
            $table->unsignedBigInteger('subtotal_amount')->default(0);
            $table->unsignedBigInteger('tax_amount')->default(0);
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('total_amount')->default(0);
            // Running total of succeeded payments applied to this invoice.
            $table->unsignedBigInteger('amount_paid')->default(0);

            $table->text('notes')->nullable();

            $table->date('due_date')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Numbering is unique + sequential within a tenant.
            $table->unique(['tenant_id', 'invoice_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'client_id']);
        });

        // Per-tenant monotonic counter for invoice numbers. A dedicated row we
        // lock (SELECT ... FOR UPDATE) guarantees gap-free, unique allocation
        // even under concurrent invoice creation.
        Schema::create('tenant_invoice_sequences', function (Blueprint $table) {
            $table->foreignUuid('tenant_id')->primary()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('next_number')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_invoice_sequences');
        Schema::dropIfExists('invoices');

        // Restore the previous stub shape so the migration is reversible.
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->string('status')->default('due');
            $table->date('due_date')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });
    }
};
