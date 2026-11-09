<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->string('name');
                $table->string('sku')->nullable();
                $table->string('category')->nullable();
                $table->text('description')->nullable();
                $table->unsignedInteger('unit_price'); // integer minor units (cents)
                $table->string('currency', 3)->default('cad');
                $table->boolean('taxable')->default(false);
                $table->decimal('tax_rate', 5, 2)->nullable();
                $table->boolean('track_inventory')->default(false);
                $table->integer('stock_quantity')->nullable();
                $table->integer('low_stock_threshold')->nullable();
                $table->string('image_path')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['tenant_id', 'active']);
                $table->index(['tenant_id', 'category']);
                $table->index(['tenant_id', 'sku']);
            });
        }

        if (! Schema::hasTable('product_stock_movements')) {
            Schema::create('product_stock_movements', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
                $table->integer('change'); // signed: -quantity for sales, +quantity for restock/void
                $table->integer('new_stock_quantity');
                $table->string('reason'); // 'invoice_paid', 'invoice_voided', 'manual_adjustment', 'restock', 'initial'
                $table->foreignUuid('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
                $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'product_id']);
                $table->index(['tenant_id', 'invoice_id']);
            });
        }

        if (Schema::hasTable('invoice_line_items')) {
            Schema::table('invoice_line_items', function (Blueprint $table) {
                if (! Schema::hasColumn('invoice_line_items', 'product_id')) {
                    $table->foreignUuid('product_id')->nullable()->after('invoice_id')->constrained('products')->nullOnDelete();
                }
                if (! Schema::hasColumn('invoice_line_items', 'product_name_snapshot')) {
                    $table->string('product_name_snapshot')->nullable()->after('product_id');
                }
                if (! Schema::hasColumn('invoice_line_items', 'product_tax_rate_snapshot')) {
                    $table->decimal('product_tax_rate_snapshot', 5, 2)->nullable()->after('product_name_snapshot');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('invoice_line_items')) {
            Schema::table('invoice_line_items', function (Blueprint $table) {
                if (Schema::hasColumn('invoice_line_items', 'product_tax_rate_snapshot')) {
                    $table->dropColumn('product_tax_rate_snapshot');
                }
                if (Schema::hasColumn('invoice_line_items', 'product_name_snapshot')) {
                    $table->dropColumn('product_name_snapshot');
                }
                if (Schema::hasColumn('invoice_line_items', 'product_id')) {
                    $table->dropForeign(['product_id']);
                    $table->dropColumn('product_id');
                }
            });
        }

        Schema::dropIfExists('product_stock_movements');
        Schema::dropIfExists('products');
    }
};

