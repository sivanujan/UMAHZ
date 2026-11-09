<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
                $table->string('name')->nullable();
                $table->decimal('size_value', 10, 2)->nullable();
                $table->string('size_unit', 50)->nullable();
                $table->string('sku')->nullable();
                $table->unsignedInteger('unit_price'); // integer minor units (cents)
                $table->integer('stock_quantity')->nullable();
                $table->integer('low_stock_threshold')->nullable();
                $table->boolean('active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['tenant_id', 'product_id']);
                $table->index(['tenant_id', 'active']);
                $table->index(['tenant_id', 'sku']);
            });
        }

        if (Schema::hasTable('product_stock_movements')) {
            Schema::table('product_stock_movements', function (Blueprint $table) {
                if (! Schema::hasColumn('product_stock_movements', 'product_variant_id')) {
                    $table->foreignUuid('product_variant_id')
                        ->nullable()
                        ->after('product_id')
                        ->constrained('product_variants')
                        ->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('invoice_line_items')) {
            Schema::table('invoice_line_items', function (Blueprint $table) {
                if (! Schema::hasColumn('invoice_line_items', 'product_variant_id')) {
                    $table->foreignUuid('product_variant_id')
                        ->nullable()
                        ->after('product_id')
                        ->constrained('product_variants')
                        ->nullOnDelete();
                }
                if (! Schema::hasColumn('invoice_line_items', 'variant_name_snapshot')) {
                    $table->string('variant_name_snapshot')
                        ->nullable()
                        ->after('product_name_snapshot');
                }
            });
        }

        // Idempotent Backfill: Create one default variant for every existing product lacking variants
        if (Schema::hasTable('products') && Schema::hasTable('product_variants')) {
            $productsWithoutVariants = DB::table('products')
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('product_variants')
                        ->whereColumn('product_variants.product_id', 'products.id');
                })
                ->get();

            foreach ($productsWithoutVariants as $product) {
                $variantId = (string) Str::uuid();
                DB::table('product_variants')->insert([
                    'id' => $variantId,
                    'tenant_id' => $product->tenant_id,
                    'product_id' => $product->id,
                    'name' => null,
                    'size_value' => null,
                    'size_unit' => null,
                    'sku' => $product->sku,
                    'unit_price' => $product->unit_price,
                    'stock_quantity' => $product->stock_quantity,
                    'low_stock_threshold' => $product->low_stock_threshold,
                    'active' => $product->active,
                    'sort_order' => 0,
                    'created_at' => $product->created_at ?? now(),
                    'updated_at' => $product->updated_at ?? now(),
                ]);

                // Backfill stock movements for this product to point to the newly created default variant
                if (Schema::hasColumn('product_stock_movements', 'product_variant_id')) {
                    DB::table('product_stock_movements')
                        ->where('product_id', $product->id)
                        ->whereNull('product_variant_id')
                        ->update(['product_variant_id' => $variantId]);
                }

                // Backfill invoice line items for this product to point to the newly created default variant
                if (Schema::hasColumn('invoice_line_items', 'product_variant_id')) {
                    DB::table('invoice_line_items')
                        ->where('product_id', $product->id)
                        ->whereNull('product_variant_id')
                        ->update(['product_variant_id' => $variantId]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('invoice_line_items')) {
            Schema::table('invoice_line_items', function (Blueprint $table) {
                if (Schema::hasColumn('invoice_line_items', 'variant_name_snapshot')) {
                    $table->dropColumn('variant_name_snapshot');
                }
                if (Schema::hasColumn('invoice_line_items', 'product_variant_id')) {
                    $table->dropForeign(['product_variant_id']);
                    $table->dropColumn('product_variant_id');
                }
            });
        }

        if (Schema::hasTable('product_stock_movements')) {
            Schema::table('product_stock_movements', function (Blueprint $table) {
                if (Schema::hasColumn('product_stock_movements', 'product_variant_id')) {
                    $table->dropForeign(['product_variant_id']);
                    $table->dropColumn('product_variant_id');
                }
            });
        }

        Schema::dropIfExists('product_variants');
    }
};

