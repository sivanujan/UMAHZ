<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\ProductVariant;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    protected function currentTenant(Request $request): Tenant
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 403, 'Tenant context not set.');

        return Tenant::findOrFail($tenantId);
    }

    /**
     * Display product catalog list with search, category & stock filters.
     */
    public function index(Request $request): Response
    {
        $tenant = $this->currentTenant($request);
        $membership = $request->attributes->get('staffMembership');
        $canManage = in_array($membership?->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_RECEPTIONIST], true);

        $query = Product::where('tenant_id', $tenant->id)
            ->with(['variants' => fn ($q) => $q->orderBy('sort_order')->orderBy('created_at')]);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('category', 'ilike', "%{$search}%")
                    ->orWhereHas('variants', function ($vq) use ($search) {
                        $vq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('sku', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('stock_status') && $request->input('stock_status') !== 'all') {
            $status = $request->input('stock_status');
            if ($status === 'low') {
                $query->where('track_inventory', true)
                    ->where(function ($q) {
                        $q->whereHas('variants', function ($vq) {
                            $vq->whereNotNull('low_stock_threshold')
                                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
                        })->orWhere(function ($sq) {
                            $sq->whereNotNull('low_stock_threshold')
                                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
                        });
                    });
            } elseif ($status === 'out_of_stock') {
                $query->where('track_inventory', true)
                    ->where(function ($q) {
                        $q->whereHas('variants', function ($vq) {
                            $vq->where('stock_quantity', '<=', 0);
                        })->orWhere('stock_quantity', '<=', 0);
                    });
            }
        }

        $products = $query->orderBy('name')
            ->get()
            ->map(function (Product $p) {
                $variants = $p->variants->map(fn (ProductVariant $v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'size_value' => $v->size_value !== null ? (float) $v->size_value : null,
                    'size_unit' => $v->size_unit,
                    'sku' => $v->sku,
                    'unit_price' => $v->unit_price,
                    'price_dollars' => number_format($v->unit_price / 100, 2, '.', ''),
                    'formatted_price' => $v->formattedPrice(),
                    'stock_quantity' => $v->stock_quantity,
                    'low_stock_threshold' => $v->low_stock_threshold,
                    'is_low_stock' => $v->isLowStock(),
                    'is_out_of_stock' => $v->isOutOfStock(),
                    'active' => $v->active,
                    'sort_order' => $v->sort_order,
                ])->values()->all();

                $defaultVariant = $p->variants->first();
                $displayPrice = $defaultVariant ? $defaultVariant->unit_price : $p->unit_price;
                $totalStock = $p->track_inventory ? $p->variants->sum('stock_quantity') : null;

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $defaultVariant?->sku ?? $p->sku,
                    'category' => $p->category,
                    'category_label' => Product::CATEGORIES[$p->category] ?? ucfirst($p->category ?? 'General'),
                    'description' => $p->description,
                    'unit_price' => $displayPrice,
                    'price_dollars' => number_format($displayPrice / 100, 2, '.', ''),
                    'formatted_price' => '$' . number_format($displayPrice / 100, 2),
                    'currency' => strtoupper($p->currency),
                    'taxable' => $p->taxable,
                    'tax_rate' => $p->tax_rate !== null ? (float) $p->tax_rate : null,
                    'track_inventory' => $p->track_inventory,
                    'stock_quantity' => $totalStock,
                    'low_stock_threshold' => $p->low_stock_threshold,
                    'is_low_stock' => $p->isLowStock(),
                    'image_url' => $p->imageUrl(),
                    'active' => $p->active,
                    'has_variants' => count($variants) > 1,
                    'variants_count' => count($variants),
                    'variants' => $variants,
                    'created_at' => $p->created_at?->toIso8601String(),
                ];
            });

        // Aggregate stats
        $allProducts = Product::where('tenant_id', $tenant->id)->with('variants')->get();
        $totalProducts = $allProducts->count();
        $lowStockCount = $allProducts->filter->isLowStock()->count();
        $totalUnits = $allProducts->where('track_inventory', true)->reduce(function ($acc, Product $p) {
            return $acc + $p->variants->sum('stock_quantity');
        }, 0);
        $inventoryValueCents = $allProducts->where('track_inventory', true)->reduce(function ($acc, Product $p) {
            return $acc + $p->variants->reduce(fn ($vAcc, ProductVariant $v) => $vAcc + (($v->stock_quantity ?? 0) * $v->unit_price), 0);
        }, 0);

        // All distinct categories
        $usedCategories = Product::where('tenant_id', $tenant->id)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->toArray();

        $categorySuggestions = array_unique(array_merge(array_keys(Product::CATEGORIES), $usedCategories));

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => $categorySuggestions,
            'categoryMap' => Product::CATEGORIES,
            'sizeUnits' => array_keys(ProductVariant::SIZE_UNITS),
            'canManage' => $canManage,
            'stats' => [
                'total_products' => $totalProducts,
                'low_stock_count' => $lowStockCount,
                'total_units' => $totalUnits,
                'inventory_value' => '$' . number_format($inventoryValueCents / 100, 2),
            ],
            'filters' => [
                'search' => $request->input('search', ''),
                'category' => $request->input('category', 'all'),
                'stock_status' => $request->input('stock_status', 'all'),
            ],
            'currency' => strtoupper($tenant->currency ?? 'CAD'),
        ]);
    }

    /**
     * Search products for invoice creation / quick picker.
     */
    public function search(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $search = trim($request->input('q', ''));

        $query = Product::where('tenant_id', $tenant->id)
            ->where('active', true)
            ->with(['variants' => fn ($q) => $q->where('active', true)->orderBy('sort_order')]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('category', 'ilike', "%{$search}%")
                    ->orWhereHas('variants', function ($vq) use ($search) {
                        $vq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('sku', 'ilike', "%{$search}%");
                    });
            });
        }

        $results = $query->orderBy('name')
            ->limit(30)
            ->get()
            ->map(function (Product $p) {
                $variants = $p->variants->map(fn (ProductVariant $v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'full_name' => $v->fullDisplayName(),
                    'size_value' => $v->size_value !== null ? (float) $v->size_value : null,
                    'size_unit' => $v->size_unit,
                    'sku' => $v->sku,
                    'unit_price' => $v->unit_price,
                    'price_dollars' => number_format($v->unit_price / 100, 2, '.', ''),
                    'formatted_price' => $v->formattedPrice(),
                    'stock_quantity' => $v->stock_quantity,
                    'is_low_stock' => $v->isLowStock(),
                ])->values()->all();

                $defaultVariant = $p->variants->first();
                $displayPrice = $defaultVariant ? $defaultVariant->unit_price : $p->unit_price;

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $defaultVariant?->sku ?? $p->sku,
                    'category' => $p->category,
                    'unit_price' => $displayPrice,
                    'price_dollars' => number_format($displayPrice / 100, 2, '.', ''),
                    'formatted_price' => '$' . number_format($displayPrice / 100, 2),
                    'taxable' => $p->taxable,
                    'tax_rate' => $p->tax_rate !== null ? (float) $p->tax_rate : null,
                    'track_inventory' => $p->track_inventory,
                    'stock_quantity' => $p->track_inventory ? $p->variants->sum('stock_quantity') : null,
                    'is_low_stock' => $p->isLowStock(),
                    'image_url' => $p->imageUrl(),
                    'has_variants' => count($variants) > 1,
                    'variants' => $variants,
                ];
            });

        return response()->json(['products' => $results]);
    }

    /**
     * Create a new product with one or more variants.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'taxable' => ['nullable', 'boolean'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'track_inventory' => ['nullable', 'boolean'],
            'stock_quantity' => ['nullable', 'integer'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'active' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['nullable', 'string', 'max:100'],
            'variants.*.size_value' => ['nullable', 'numeric', 'min:0'],
            'variants.*.size_unit' => ['nullable', 'string', 'max:50'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['nullable', 'integer'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'variants.*.active' => ['nullable', 'boolean'],
            'variants.*.sort_order' => ['nullable', 'integer'],
        ]);

        $trackInventory = (bool) ($validated['track_inventory'] ?? false);
        $taxable = (bool) ($validated['taxable'] ?? false);
        $taxRate = $taxable && isset($validated['tax_rate']) ? (float) $validated['tax_rate'] : null;

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store("products/{$tenant->id}", 'public');
        }

        return DB::transaction(function () use ($tenant, $validated, $trackInventory, $taxable, $taxRate, $imagePath, $request) {
            $product = new Product([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'sku' => $validated['sku'] ?? null,
                'category' => ! empty($validated['category']) ? strtolower(trim($validated['category'])) : null,
                'description' => $validated['description'] ?? null,
                'unit_price' => isset($validated['unit_price']) ? $this->parsePriceToCents($validated['unit_price']) : 0,
                'currency' => strtolower($tenant->currency ?? 'cad'),
                'taxable' => $taxable,
                'tax_rate' => $taxRate,
                'track_inventory' => $trackInventory,
                'stock_quantity' => $trackInventory ? ($validated['stock_quantity'] ?? 0) : null,
                'low_stock_threshold' => $trackInventory ? ($validated['low_stock_threshold'] ?? 5) : null,
                'image_path' => $imagePath,
                'active' => $request->has('active') ? (bool) $validated['active'] : true,
            ]);
            $product->save();

            // Handle variants
            $submittedVariants = $validated['variants'] ?? [];
            if (empty($submittedVariants)) {
                // Simple product: 1 default variant
                $variantPrice = isset($validated['unit_price']) ? $this->parsePriceToCents($validated['unit_price']) : 0;
                $variantStock = $trackInventory ? ($validated['stock_quantity'] ?? 0) : null;
                $variantThreshold = $trackInventory ? ($validated['low_stock_threshold'] ?? 5) : null;

                $defaultVariant = ProductVariant::create([
                    'tenant_id' => $tenant->id,
                    'product_id' => $product->id,
                    'name' => null,
                    'size_value' => null,
                    'size_unit' => null,
                    'sku' => $validated['sku'] ?? null,
                    'unit_price' => $variantPrice,
                    'stock_quantity' => $variantStock,
                    'low_stock_threshold' => $variantThreshold,
                    'active' => true,
                    'sort_order' => 0,
                ]);

                if ($trackInventory && $variantStock !== null && $variantStock != 0) {
                    ProductStockMovement::create([
                        'tenant_id' => $tenant->id,
                        'product_id' => $product->id,
                        'product_variant_id' => $defaultVariant->id,
                        'change' => $variantStock,
                        'new_stock_quantity' => $variantStock,
                        'reason' => ProductStockMovement::REASON_INITIAL,
                        'user_id' => $request->user()->id,
                        'notes' => 'Initial stock on creation',
                    ]);
                }
            } else {
                $totalStock = 0;
                $firstPrice = 0;

                foreach ($submittedVariants as $index => $vData) {
                    $vPrice = isset($vData['unit_price']) ? $this->parsePriceToCents($vData['unit_price']) : 0;
                    if ($index === 0) {
                        $firstPrice = $vPrice;
                    }
                    $vStock = $trackInventory ? ($vData['stock_quantity'] ?? 0) : null;
                    if ($trackInventory && $vStock !== null) {
                        $totalStock += $vStock;
                    }

                    $variant = ProductVariant::create([
                        'tenant_id' => $tenant->id,
                        'product_id' => $product->id,
                        'name' => ! empty($vData['name']) ? trim($vData['name']) : null,
                        'size_value' => isset($vData['size_value']) && $vData['size_value'] !== '' ? (float) $vData['size_value'] : null,
                        'size_unit' => ! empty($vData['size_unit']) ? trim($vData['size_unit']) : null,
                        'sku' => ! empty($vData['sku']) ? trim($vData['sku']) : null,
                        'unit_price' => $vPrice,
                        'stock_quantity' => $vStock,
                        'low_stock_threshold' => $trackInventory ? ($vData['low_stock_threshold'] ?? 5) : null,
                        'active' => isset($vData['active']) ? (bool) $vData['active'] : true,
                        'sort_order' => $vData['sort_order'] ?? $index,
                    ]);

                    if ($trackInventory && $vStock !== null && $vStock != 0) {
                        ProductStockMovement::create([
                            'tenant_id' => $tenant->id,
                            'product_id' => $product->id,
                            'product_variant_id' => $variant->id,
                            'change' => $vStock,
                            'new_stock_quantity' => $vStock,
                            'reason' => ProductStockMovement::REASON_INITIAL,
                            'user_id' => $request->user()->id,
                            'notes' => 'Initial stock for variant: ' . ($variant->name ?? 'Default'),
                        ]);
                    }
                }

                $product->unit_price = $firstPrice;
                $product->stock_quantity = $trackInventory ? $totalStock : null;
                $product->save();
            }

            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()->id,
                'action' => 'product.created',
                'resource_type' => Product::class,
                'resource_id' => $product->id,
                'metadata' => [
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'unit_price' => $product->unit_price,
                ],
                'ip_address' => $request->ip(),
            ]);

            return redirect()->to('/app/products')->with('success', "Product '{$product->name}' created.");
        });
    }

    /**
     * Update an existing product and its variants.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        $tenant = $this->currentTenant($request);
        abort_unless($product->tenant_id === $tenant->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'taxable' => ['nullable', 'boolean'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'track_inventory' => ['nullable', 'boolean'],
            'stock_quantity' => ['nullable', 'integer'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
            'active' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'uuid'],
            'variants.*.name' => ['nullable', 'string', 'max:100'],
            'variants.*.size_value' => ['nullable', 'numeric', 'min:0'],
            'variants.*.size_unit' => ['nullable', 'string', 'max:50'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['nullable', 'integer'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'variants.*.active' => ['nullable', 'boolean'],
            'variants.*.sort_order' => ['nullable', 'integer'],
        ]);

        $trackInventory = (bool) ($validated['track_inventory'] ?? false);
        $taxable = (bool) ($validated['taxable'] ?? false);
        $taxRate = $taxable && isset($validated['tax_rate']) ? (float) $validated['tax_rate'] : null;

        $imagePath = $product->image_path;
        if (! empty($validated['remove_image'])) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            $imagePath = null;
        } elseif ($request->hasFile('image')) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            $imagePath = $request->file('image')->store("products/{$tenant->id}", 'public');
        }

        return DB::transaction(function () use ($product, $tenant, $validated, $trackInventory, $taxable, $taxRate, $imagePath, $request) {
            $product->update([
                'name' => $validated['name'],
                'sku' => $validated['sku'] ?? null,
                'category' => ! empty($validated['category']) ? strtolower(trim($validated['category'])) : null,
                'description' => $validated['description'] ?? null,
                'unit_price' => isset($validated['unit_price']) ? $this->parsePriceToCents($validated['unit_price']) : $product->unit_price,
                'taxable' => $taxable,
                'tax_rate' => $taxRate,
                'track_inventory' => $trackInventory,
                'low_stock_threshold' => $trackInventory ? ($validated['low_stock_threshold'] ?? 5) : null,
                'image_path' => $imagePath,
                'active' => $request->has('active') ? (bool) $validated['active'] : $product->active,
            ]);

            // Sync variants
            $submittedVariants = $validated['variants'] ?? [];
            if (! empty($submittedVariants)) {
                $keptVariantIds = [];

                foreach ($submittedVariants as $index => $vData) {
                    $vPrice = isset($vData['unit_price']) ? $this->parsePriceToCents($vData['unit_price']) : 0;
                    $vStock = $trackInventory ? ($vData['stock_quantity'] ?? 0) : null;
                    $vThreshold = $trackInventory ? ($vData['low_stock_threshold'] ?? 5) : null;

                    if (! empty($vData['id'])) {
                        $variant = ProductVariant::where('tenant_id', $tenant->id)
                            ->where('product_id', $product->id)
                            ->find($vData['id']);

                        if ($variant) {
                            $variant->update([
                                'name' => ! empty($vData['name']) ? trim($vData['name']) : null,
                                'size_value' => isset($vData['size_value']) && $vData['size_value'] !== '' ? (float) $vData['size_value'] : null,
                                'size_unit' => ! empty($vData['size_unit']) ? trim($vData['size_unit']) : null,
                                'sku' => ! empty($vData['sku']) ? trim($vData['sku']) : null,
                                'unit_price' => $vPrice,
                                'stock_quantity' => $vStock,
                                'low_stock_threshold' => $vThreshold,
                                'active' => isset($vData['active']) ? (bool) $vData['active'] : true,
                                'sort_order' => $vData['sort_order'] ?? $index,
                            ]);
                            $keptVariantIds[] = $variant->id;
                        }
                    } else {
                        $newVariant = ProductVariant::create([
                            'tenant_id' => $tenant->id,
                            'product_id' => $product->id,
                            'name' => ! empty($vData['name']) ? trim($vData['name']) : null,
                            'size_value' => isset($vData['size_value']) && $vData['size_value'] !== '' ? (float) $vData['size_value'] : null,
                            'size_unit' => ! empty($vData['size_unit']) ? trim($vData['size_unit']) : null,
                            'sku' => ! empty($vData['sku']) ? trim($vData['sku']) : null,
                            'unit_price' => $vPrice,
                            'stock_quantity' => $vStock,
                            'low_stock_threshold' => $vThreshold,
                            'active' => isset($vData['active']) ? (bool) $vData['active'] : true,
                            'sort_order' => $vData['sort_order'] ?? $index,
                        ]);
                        $keptVariantIds[] = $newVariant->id;
                    }
                }

                // Delete variants not in kept list
                ProductVariant::where('tenant_id', $tenant->id)
                    ->where('product_id', $product->id)
                    ->whereNotIn('id', $keptVariantIds)
                    ->delete();

                // Sync parent aggregate values
                $firstVar = ProductVariant::where('product_id', $product->id)->orderBy('sort_order')->first();
                if ($firstVar) {
                    $product->unit_price = $firstVar->unit_price;
                }
                $product->stock_quantity = $trackInventory
                    ? ProductVariant::where('product_id', $product->id)->sum('stock_quantity')
                    : null;
                $product->save();
            } else {
                // Update default variant
                $defaultVariant = $product->variants()->first();
                $vPrice = isset($validated['unit_price']) ? $this->parsePriceToCents($validated['unit_price']) : $product->unit_price;
                $vStock = $trackInventory ? ($validated['stock_quantity'] ?? 0) : null;

                if ($defaultVariant) {
                    $defaultVariant->update([
                        'sku' => $validated['sku'] ?? $defaultVariant->sku,
                        'unit_price' => $vPrice,
                        'stock_quantity' => $vStock,
                        'low_stock_threshold' => $trackInventory ? ($validated['low_stock_threshold'] ?? 5) : null,
                    ]);
                } else {
                    ProductVariant::create([
                        'tenant_id' => $tenant->id,
                        'product_id' => $product->id,
                        'name' => null,
                        'sku' => $validated['sku'] ?? null,
                        'unit_price' => $vPrice,
                        'stock_quantity' => $vStock,
                        'low_stock_threshold' => $trackInventory ? ($validated['low_stock_threshold'] ?? 5) : null,
                        'active' => true,
                        'sort_order' => 0,
                    ]);
                }

                $product->stock_quantity = $vStock;
                $product->unit_price = $vPrice;
                $product->save();
            }

            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()->id,
                'action' => 'product.updated',
                'resource_type' => Product::class,
                'resource_id' => $product->id,
                'metadata' => [
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'unit_price' => $product->unit_price,
                ],
                'ip_address' => $request->ip(),
            ]);

            return redirect()->to('/app/products')->with('success', "Product '{$product->name}' updated.");
        });
    }

    /**
     * Archive (soft-delete) a product and all its variants.
     */
    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $tenant = $this->currentTenant($request);
        abort_unless($product->tenant_id === $tenant->id, 404);

        $productName = $product->name;
        $product->variants()->delete();
        $product->delete();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'product.archived',
            'resource_type' => Product::class,
            'resource_id' => $product->id,
            'metadata' => ['name' => $productName],
            'ip_address' => $request->ip(),
        ]);

        return redirect()->to('/app/products')->with('success', "Product '{$productName}' archived.");
    }

    /**
     * Adjust product or variant stock level manually.
     */
    public function adjustStock(Request $request, Product $product): JsonResponse|RedirectResponse
    {
        $tenant = $this->currentTenant($request);
        abort_unless($product->tenant_id === $tenant->id, 404);

        $changeInput = $request->input('change') ?? $request->input('adjustment');
        $request->merge(['change' => $changeInput]);

        $validated = $request->validate([
            'change' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'product_variant_id' => ['nullable', 'uuid', Rule::exists('product_variants', 'id')->where('product_id', $product->id)],
        ]);

        $variant = null;
        if (! empty($validated['product_variant_id'])) {
            $variant = ProductVariant::where('product_id', $product->id)->find($validated['product_variant_id']);
        }

        $movement = $this->inventory->recordMovement(
            $product,
            (int) $validated['change'],
            $validated['reason'],
            null,
            $request->user(),
            $validated['notes'] ?? null,
            $variant
        );

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'product.stock_adjusted',
            'resource_type' => Product::class,
            'resource_id' => $product->id,
            'metadata' => [
                'product_variant_id' => $movement->product_variant_id,
                'change' => $movement->change,
                'new_stock_quantity' => $movement->new_stock_quantity,
                'reason' => $movement->reason,
            ],
            'ip_address' => $request->ip(),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'new_stock_quantity' => $movement->new_stock_quantity,
                'variant' => $variant ? [
                    'id' => $variant->id,
                    'stock_quantity' => $variant->fresh()->stock_quantity,
                ] : null,
                'product' => [
                    'id' => $product->id,
                    'stock_quantity' => $product->fresh()->stock_quantity,
                ],
            ]);
        }

        return redirect()->to('/app/products')->with('success', "Stock updated for '{$product->name}'.");
    }

    /**
     * Get stock movement history for a product.
     */
    public function stockHistory(Request $request, Product $product): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        abort_unless($product->tenant_id === $tenant->id, 404);

        $query = ProductStockMovement::where('product_id', $product->id)
            ->with(['variant', 'user', 'invoice'])
            ->latest('created_at');

        if ($request->filled('variant_id')) {
            $query->where('product_variant_id', $request->input('variant_id'));
        }

        $movements = $query->limit(100)->get()->map(fn (ProductStockMovement $m) => [
            'id' => $m->id,
            'product_variant_id' => $m->product_variant_id,
            'variant_name' => $m->variant?->name,
            'change' => $m->change,
            'change_formatted' => ($m->change > 0 ? '+' : '') . $m->change,
            'new_stock_quantity' => $m->new_stock_quantity,
            'reason' => $m->reason,
            'reason_label' => ucfirst(str_replace('_', ' ', $m->reason)),
            'notes' => $m->notes,
            'user_name' => $m->user?->name ?? 'System',
            'invoice_id' => $m->invoice_id,
            'invoice_number' => $m->invoice?->invoice_number,
            'created_at' => $m->created_at?->format('M j, Y g:i A'),
        ]);

        return response()->json(['movements' => $movements]);
    }

    private function parsePriceToCents(mixed $price): int
    {
        if (is_int($price)) {
            return $price;
        }

        $cleaned = (float) filter_var($price, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);

        return (int) round($cleaned * 100);
    }
}
