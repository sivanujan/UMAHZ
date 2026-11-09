<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryService
{
    /**
     * Record a stock movement for a product and update its stock level.
     */
    public function recordMovement(
        Product $product,
        int $change,
        string $reason,
        ?Invoice $invoice = null,
        ?User $actor = null,
        ?string $notes = null
    ): ProductStockMovement {
        return DB::transaction(function () use ($product, $change, $reason, $invoice, $actor, $notes) {
            $lockedProduct = Product::withoutGlobalScopes()
                ->whereKey($product->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $currentStock = $lockedProduct->stock_quantity ?? 0;
            $newStock = $currentStock + $change;

            if ($newStock < 0) {
                Log::warning("Inventory for product [{$lockedProduct->id}] '{$lockedProduct->name}' fell below zero to [{$newStock}] (reason: {$reason}, invoice: " . ($invoice?->id ?? 'none') . ").");
            }

            $lockedProduct->stock_quantity = $newStock;
            $lockedProduct->save();

            $movement = new ProductStockMovement([
                'tenant_id' => $lockedProduct->tenant_id,
                'product_id' => $lockedProduct->id,
                'change' => $change,
                'new_stock_quantity' => $newStock,
                'reason' => $reason,
                'invoice_id' => $invoice?->id,
                'user_id' => $actor?->id,
                'notes' => $notes,
            ]);
            $movement->save();

            return $movement;
        });
    }

    /**
     * Deduct inventory when an invoice is marked paid.
     * Idempotent: will not deduct multiple times for the same invoice.
     */
    public function deductForInvoice(Invoice $invoice, ?User $actor = null): void
    {
        DB::transaction(function () use ($invoice, $actor) {
            $alreadyDeducted = ProductStockMovement::withoutGlobalScopes()
                ->where('tenant_id', $invoice->tenant_id)
                ->where('invoice_id', $invoice->id)
                ->where('reason', ProductStockMovement::REASON_INVOICE_PAID)
                ->exists();

            if ($alreadyDeducted) {
                return;
            }

            $lineItems = $invoice->lineItems()
                ->whereNotNull('product_id')
                ->get();

            foreach ($lineItems as $item) {
                $product = Product::withoutGlobalScopes()
                    ->where('tenant_id', $invoice->tenant_id)
                    ->whereKey($item->product_id)
                    ->first();

                if ($product && $product->track_inventory) {
                    $change = -1 * (int) max(1, $item->quantity);
                    $this->recordMovement(
                        $product,
                        $change,
                        ProductStockMovement::REASON_INVOICE_PAID,
                        $invoice,
                        $actor
                    );
                }
            }
        });
    }

    /**
     * Restore inventory when an invoice is voided.
     * Only restores if stock was previously deducted upon payment.
     * Idempotent: will not restore multiple times.
     */
    public function restoreForInvoice(Invoice $invoice, ?User $actor = null): void
    {
        DB::transaction(function () use ($invoice, $actor) {
            $hadDeduction = ProductStockMovement::withoutGlobalScopes()
                ->where('tenant_id', $invoice->tenant_id)
                ->where('invoice_id', $invoice->id)
                ->where('reason', ProductStockMovement::REASON_INVOICE_PAID)
                ->exists();

            if (! $hadDeduction) {
                return;
            }

            $alreadyRestored = ProductStockMovement::withoutGlobalScopes()
                ->where('tenant_id', $invoice->tenant_id)
                ->where('invoice_id', $invoice->id)
                ->where('reason', ProductStockMovement::REASON_INVOICE_VOIDED)
                ->exists();

            if ($alreadyRestored) {
                return;
            }

            $lineItems = $invoice->lineItems()
                ->whereNotNull('product_id')
                ->get();

            foreach ($lineItems as $item) {
                $product = Product::withoutGlobalScopes()
                    ->where('tenant_id', $invoice->tenant_id)
                    ->whereKey($item->product_id)
                    ->first();

                if ($product && $product->track_inventory) {
                    $change = (int) max(1, $item->quantity);
                    $this->recordMovement(
                        $product,
                        $change,
                        ProductStockMovement::REASON_INVOICE_VOIDED,
                        $invoice,
                        $actor,
                        'Restored on invoice void'
                    );
                }
            }
        });
    }
}

