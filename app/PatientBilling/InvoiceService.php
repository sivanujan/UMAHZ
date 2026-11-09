<?php

namespace App\PatientBilling;

use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Creates and transitions patient-billing invoices. All money is integer minor
 * units; all totals are computed server-side (never trusted from the client)
 * with pure integer arithmetic. Writes run in a DB transaction.
 */
class InvoiceService
{
    /**
     * Create an invoice with line items for a client.
     *
     * @param  array{
     *   client_id: string,
     *   appointment_id?: string|null,
     *   currency?: string,
     *   discount_amount?: int,
     *   notes?: string|null,
     *   due_date?: string|null,
     *   status?: string,
     *   line_items: array<int, array{description: string, quantity: int, unit_amount: int, tax_amount?: int}>
     * }  $data
     */
    public function create(Tenant $tenant, array $data, ?User $creator = null): Invoice
    {
        $lineItems = $data['line_items'] ?? [];
        if (empty($lineItems)) {
            throw new RuntimeException('An invoice requires at least one line item.');
        }

        $currency = strtolower($data['currency'] ?? $tenant->currency ?? config('patient_billing.default_currency'));
        $discount = max(0, (int) ($data['discount_amount'] ?? 0));

        return DB::transaction(function () use ($tenant, $data, $lineItems, $currency, $discount, $creator) {
            $subtotal = 0;
            $taxTotal = 0;
            $normalizedItems = [];

            foreach ($lineItems as $index => $item) {
                $quantity = max(1, (int) ($item['quantity'] ?? 1));
                $unit = max(0, (int) $item['unit_amount']);
                $lineTax = max(0, (int) ($item['tax_amount'] ?? 0));
                $lineTotal = $quantity * $unit;

                $subtotal += $lineTotal;
                $taxTotal += $lineTax;

                $productId = $item['product_id'] ?? null;
                $variantId = $item['product_variant_id'] ?? null;
                $productNameSnapshot = null;
                $variantNameSnapshot = null;
                $productTaxRateSnapshot = null;
                $description = (string) $item['description'];

                if (! empty($productId)) {
                    $product = \App\Models\Product::withoutGlobalScopes()
                        ->where('tenant_id', $tenant->id)
                        ->find($productId);

                    if ($product) {
                        $productNameSnapshot = $product->name;
                        $productTaxRateSnapshot = $product->taxable ? $product->tax_rate : null;

                        $variant = null;
                        if (! empty($variantId)) {
                            $variant = \App\Models\ProductVariant::withoutGlobalScopes()
                                ->where('tenant_id', $tenant->id)
                                ->where('product_id', $product->id)
                                ->find($variantId);
                        }

                        if (! $variant) {
                            $variant = $product->defaultVariant();
                        }

                        if ($variant) {
                            $variantId = $variant->id;
                            $variantNameSnapshot = $variant->name;
                            if (! empty($variantNameSnapshot) && ! str_contains($description, $variantNameSnapshot)) {
                                $description = "{$productNameSnapshot} - {$variantNameSnapshot}";
                            }
                        }
                    } else {
                        $productId = null;
                        $variantId = null;
                    }
                }

                $normalizedItems[] = [
                    'tenant_id' => $tenant->id,
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'product_name_snapshot' => $productNameSnapshot,
                    'variant_name_snapshot' => $variantNameSnapshot,
                    'product_tax_rate_snapshot' => $productTaxRateSnapshot,
                    'description' => $description,
                    'quantity' => $quantity,
                    'unit_amount' => $unit,
                    'tax_amount' => $lineTax,
                    'total_amount' => $lineTotal,
                    'sort_order' => $index,
                ];
            }

            // total = subtotal + tax - discount, never below zero.
            $total = max(0, $subtotal + $taxTotal - $discount);

            $status = ($data['status'] ?? Invoice::STATUS_OPEN) === Invoice::STATUS_DRAFT
                ? Invoice::STATUS_DRAFT
                : Invoice::STATUS_OPEN;

            $number = InvoiceNumberAllocator::next($tenant->id);

            $invoice = new Invoice([
                'client_id' => $data['client_id'],
                'appointment_id' => $data['appointment_id'] ?? null,
                'invoice_number' => $number,
                'status' => $status,
                'currency' => $currency,
                'subtotal_amount' => $subtotal,
                'tax_amount' => $taxTotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'amount_paid' => 0,
                'notes' => $data['notes'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'issued_at' => $status === Invoice::STATUS_OPEN ? now() : null,
                'created_by' => $creator?->id,
            ]);
            $invoice->tenant_id = $tenant->id;
            $invoice->save();

            $invoice->lineItems()->createMany($normalizedItems);

            return $invoice->load('lineItems');
        });
    }

    /**
     * Void an invoice, keeping the reason. Paid invoices cannot be voided
     * (a refund is a separate, later-phase flow). Posted invoices are never
     * deleted — voiding is the only way to cancel them.
     */
    public function void(Invoice $invoice, string $reason, ?User $actor = null): Invoice
    {
        if ($invoice->isVoid()) {
            return $invoice;
        }

        $invoice->forceFill([
            'status' => Invoice::STATUS_VOID,
            'voided_at' => now(),
            'void_reason' => $reason,
        ])->save();

        app(\App\Services\InventoryService::class)->restoreForInvoice($invoice, $actor);

        return $invoice;
    }

    /** Transition a draft to open (issued). */
    public function issue(Invoice $invoice): Invoice
    {
        if ($invoice->isDraft()) {
            $invoice->forceFill([
                'status' => Invoice::STATUS_OPEN,
                'issued_at' => now(),
            ])->save();
        }

        return $invoice;
    }
}
