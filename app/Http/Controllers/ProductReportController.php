<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Product;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductReportController extends Controller
{
    protected function currentTenant(Request $request): Tenant
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 403, 'Tenant context not set.');

        return Tenant::findOrFail($tenantId);
    }

    public function index(Request $request): Response
    {
        $tenant = $this->currentTenant($request);
        $membership = $request->attributes->get('staffMembership');
        $isOwnerOrReceptionist = in_array($membership?->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_RECEPTIONIST], true);
        abort_unless($isOwnerOrReceptionist, 403);

        // Date range handling
        $preset = $request->input('preset', 'month');
        $now = Carbon::now($tenant->timezone ?? 'UTC');

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
        } else {
            [$startDate, $endDate] = match ($preset) {
                '7d' => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
                'last_month' => [
                    $now->copy()->subMonth()->startOfMonth()->startOfDay(),
                    $now->copy()->subMonth()->endOfMonth()->endOfDay(),
                ],
                'ytd' => [$now->copy()->startOfYear()->startOfDay(), $now->copy()->endOfDay()],
                'all' => [Carbon::create(2020, 1, 1), $now->copy()->endOfDay()],
                default => [$now->copy()->startOfMonth()->startOfDay(), $now->copy()->endOfDay()], // 'month'
            };
        }

        // Fetch paid invoice line items with products in this tenant and date range
        $salesQuery = InvoiceLineItem::query()
            ->join('invoices', 'invoices.id', '=', 'invoice_line_items.invoice_id')
            ->where('invoice_line_items.tenant_id', $tenant->id)
            ->whereNotNull('invoice_line_items.product_id')
            ->where('invoices.status', Invoice::STATUS_PAID)
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('invoices.paid_at', [$startDate, $endDate])
                    ->orWhere(function ($fallbackQ) use ($startDate, $endDate) {
                        $fallbackQ->whereNull('invoices.paid_at')
                            ->whereBetween('invoices.issued_at', [$startDate, $endDate]);
                    });
            });

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $category = $request->input('category');
            $salesQuery->whereHas('product', function ($pq) use ($category) {
                $pq->where('category', $category);
            });
        }

        $salesData = $salesQuery->select(
            'invoice_line_items.product_id',
            'invoice_line_items.product_name_snapshot',
            'invoice_line_items.quantity',
            'invoice_line_items.total_amount',
            'invoice_line_items.tax_amount'
        )->get();

        // Group sales by product
        $groupedSales = $salesData->groupBy('product_id');

        // Fetch all products (including trashed if they were sold, or active products)
        $products = Product::withTrashed()
            ->where('tenant_id', $tenant->id)
            ->get()
            ->keyBy('id');

        $rows = [];
        $totalUnitsSold = 0;
        $totalRevenueCents = 0;
        $totalTaxCents = 0;

        foreach ($products as $id => $product) {
            $productSales = $groupedSales->get($id, collect());
            $units = (int) $productSales->sum('quantity');
            $revenue = (int) $productSales->sum('total_amount');
            $tax = (int) $productSales->sum('tax_amount');

            // Skip products with 0 sales if filtering and requested
            if ($request->input('only_sold') === 'true' && $units === 0) {
                continue;
            }

            if ($request->filled('category') && $request->input('category') !== 'all' && $product->category !== $request->input('category')) {
                continue;
            }

            $totalUnitsSold += $units;
            $totalRevenueCents += $revenue;
            $totalTaxCents += $tax;

            $rows[] = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category,
                'category_label' => Product::CATEGORIES[$product->category] ?? ucfirst($product->category ?? 'General'),
                'unit_price' => $product->unit_price,
                'formatted_price' => $product->formattedPrice(),
                'track_inventory' => $product->track_inventory,
                'current_stock' => $product->track_inventory ? $product->stock_quantity : null,
                'is_low_stock' => $product->isLowStock(),
                'units_sold' => $units,
                'revenue_cents' => $revenue,
                'revenue_formatted' => '$' . number_format($revenue / 100, 2),
                'tax_cents' => $tax,
                'tax_formatted' => '$' . number_format($tax / 100, 2),
            ];
        }

        // Sort by revenue descending by default, then name
        usort($rows, fn ($a, $b) => $b['revenue_cents'] <=> $a['revenue_cents'] ?: strcmp($a['name'], $b['name']));

        // Inventory totals across all active products
        $activeProducts = $products->whereNull('deleted_at');
        $currentStockUnits = $activeProducts->where('track_inventory', true)->sum('stock_quantity');
        $lowStockCount = $activeProducts->filter->isLowStock()->count();

        // Used categories
        $usedCategories = $activeProducts->whereNotNull('category')->pluck('category')->unique()->values()->all();

        return Inertia::render('Reports/Products', [
            'rows' => $rows,
            'summary' => [
                'total_units_sold' => $totalUnitsSold,
                'total_revenue_cents' => $totalRevenueCents,
                'total_revenue_formatted' => '$' . number_format($totalRevenueCents / 100, 2),
                'total_tax_cents' => $totalTaxCents,
                'total_tax_formatted' => '$' . number_format($totalTaxCents / 100, 2),
                'current_stock_units' => $currentStockUnits,
                'low_stock_count' => $lowStockCount,
            ],
            'filters' => [
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'preset' => $preset,
                'category' => $request->input('category', 'all'),
                'only_sold' => $request->input('only_sold', 'false'),
            ],
            'categories' => $usedCategories,
            'currency' => strtoupper($tenant->currency ?? 'CAD'),
            'canManage' => $isOwnerOrReceptionist,
        ]);
    }
}
