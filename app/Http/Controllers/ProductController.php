<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        protected InventoryService $inventory
    ) {}

    protected function currentTenant(Request $request): Tenant
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 403, 'Tenant context not set.');

        return Tenant::findOrFail($tenantId);
    }

    /**
     * Display a listing of clinic products.
     * Accessible by clinic_owner, receptionist, and practitioner (read-only).
     */
    public function index(Request $request): Response
    {
        $tenant = $this->currentTenant($request);
        $membership = $request->attributes->get('staffMembership');
        $canManage = in_array($membership?->role, [StaffMembership::ROLE_CLINIC_OWNER, StaffMembership::ROLE_RECEPTIONIST], true);

        $query = Product::where('tenant_id', $tenant->id);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('stock_status')) {
            $status = $request->input('stock_status');
            if ($status === 'low') {
                $query->where('track_inventory', true)
                    ->whereNotNull('low_stock_threshold')
                    ->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
            } elseif ($status === 'out_of_stock') {
                $query->where('track_inventory', true)
                    ->where('stock_quantity', '<=', 0);
            }
        }

        $products = $query->orderBy('name')
            ->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'category' => $p->category,
                'category_label' => Product::CATEGORIES[$p->category] ?? ucfirst($p->category ?? 'General'),
                'description' => $p->description,
                'unit_price' => $p->unit_price,
                'price_dollars' => number_format($p->unit_price / 100, 2, '.', ''),
                'formatted_price' => $p->formattedPrice(),
                'currency' => strtoupper($p->currency),
                'taxable' => $p->taxable,
                'tax_rate' => $p->tax_rate !== null ? (float) $p->tax_rate : null,
                'track_inventory' => $p->track_inventory,
                'stock_quantity' => $p->stock_quantity,
                'low_stock_threshold' => $p->low_stock_threshold,
                'is_low_stock' => $p->isLowStock(),
                'image_url' => $p->imageUrl(),
                'active' => $p->active,
                'created_at' => $p->created_at?->toIso8601String(),
            ]);

        // Aggregate stats
        $allProducts = Product::where('tenant_id', $tenant->id)->get();
        $totalProducts = $allProducts->count();
        $lowStockCount = $allProducts->filter->isLowStock()->count();
        $totalUnits = $allProducts->where('track_inventory', true)->sum('stock_quantity');
        $inventoryValueCents = $allProducts->where('track_inventory', true)->reduce(function ($acc, Product $p) {
            return $acc + (($p->stock_quantity ?? 0) * $p->unit_price);
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
            ->where('active', true);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('category', 'ilike', "%{$search}%");
            });
        }

        $results = $query->orderBy('name')
            ->limit(30)
            ->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'category' => $p->category,
                'unit_price' => $p->unit_price,
                'price_dollars' => number_format($p->unit_price / 100, 2, '.', ''),
                'formatted_price' => $p->formattedPrice(),
                'taxable' => $p->taxable,
                'tax_rate' => $p->tax_rate !== null ? (float) $p->tax_rate : null,
                'track_inventory' => $p->track_inventory,
                'stock_quantity' => $p->stock_quantity,
                'low_stock_threshold' => $p->low_stock_threshold,
                'is_low_stock' => $p->isLowStock(),
                'image_url' => $p->imageUrl(),
            ]);

        return response()->json(['products' => $results]);
    }

    /**
     * Create a new product.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->currentTenant($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->where('tenant_id', $tenant->id)->withoutTrashed()],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'unit_price' => ['required', 'numeric', 'min:0'], // can be dollars or cents
            'taxable' => ['nullable', 'boolean'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'track_inventory' => ['nullable', 'boolean'],
            'stock_quantity' => ['nullable', 'integer'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'], // 2MB max
            'active' => ['nullable', 'boolean'],
        ]);

        $unitPriceCents = $this->parsePriceToCents($validated['unit_price']);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store("products/{$tenant->id}", 'public');
        }

        $product = new Product([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'sku' => $validated['sku'] ?? null,
            'category' => ! empty($validated['category']) ? strtolower(trim($validated['category'])) : null,
            'description' => $validated['description'] ?? null,
            'unit_price' => $unitPriceCents,
            'currency' => strtolower($tenant->currency ?? 'cad'),
            'taxable' => (bool) ($validated['taxable'] ?? false),
            'tax_rate' => ! empty($validated['taxable']) && isset($validated['tax_rate']) ? (float) $validated['tax_rate'] : null,
            'track_inventory' => (bool) ($validated['track_inventory'] ?? false),
            'stock_quantity' => (bool) ($validated['track_inventory'] ?? false) ? ($validated['stock_quantity'] ?? 0) : null,
            'low_stock_threshold' => (bool) ($validated['track_inventory'] ?? false) ? ($validated['low_stock_threshold'] ?? 5) : null,
            'image_path' => $imagePath,
            'active' => $request->has('active') ? (bool) $validated['active'] : true,
        ]);
        $product->save();

        if ($product->track_inventory && $product->stock_quantity !== null && $product->stock_quantity != 0) {
            ProductStockMovement::create([
                'tenant_id' => $tenant->id,
                'product_id' => $product->id,
                'change' => $product->stock_quantity,
                'new_stock_quantity' => $product->stock_quantity,
                'reason' => ProductStockMovement::REASON_INITIAL,
                'user_id' => $request->user()->id,
                'notes' => 'Initial stock on creation',
            ]);
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
    }

    /**
     * Update an existing product.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        $tenant = $this->currentTenant($request);
        abort_unless($product->tenant_id === $tenant->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products', 'sku')->where('tenant_id', $tenant->id)->ignore($product->id)->withoutTrashed(),
            ],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'taxable' => ['nullable', 'boolean'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'track_inventory' => ['nullable', 'boolean'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'], // 2MB max
            'remove_image' => ['nullable', 'boolean'],
            'active' => ['nullable', 'boolean'],
        ]);

        $unitPriceCents = $this->parsePriceToCents($validated['unit_price']);

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

        $trackInventory = (bool) ($validated['track_inventory'] ?? false);

        $product->update([
            'name' => $validated['name'],
            'sku' => $validated['sku'] ?? null,
            'category' => ! empty($validated['category']) ? strtolower(trim($validated['category'])) : null,
            'description' => $validated['description'] ?? null,
            'unit_price' => $unitPriceCents,
            'taxable' => (bool) ($validated['taxable'] ?? false),
            'tax_rate' => ! empty($validated['taxable']) && isset($validated['tax_rate']) ? (float) $validated['tax_rate'] : null,
            'track_inventory' => $trackInventory,
            'low_stock_threshold' => $trackInventory ? ($validated['low_stock_threshold'] ?? 5) : null,
            'image_path' => $imagePath,
            'active' => $request->has('active') ? (bool) $validated['active'] : $product->active,
        ]);

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
    }

    /**
     * Archive (soft-delete) a product.
     */
    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $tenant = $this->currentTenant($request);
        abort_unless($product->tenant_id === $tenant->id, 404);

        $productName = $product->name;
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
     * Adjust product stock level manually.
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
        ]);

        $movement = $this->inventory->recordMovement(
            $product,
            (int) $validated['change'],
            $validated['reason'],
            null,
            $request->user(),
            $validated['notes'] ?? null
        );

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'product.stock_adjusted',
            'resource_type' => Product::class,
            'resource_id' => $product->id,
            'metadata' => [
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
                'product' => [
                    'id' => $product->id,
                    'stock_quantity' => $product->fresh()->stock_quantity,
                ],
            ]);
        }

        return redirect()->to('/app/products')->with('success', "Stock updated for '{$product->name}'.");
    }

    /**
     * Convert decimal or integer input to minor units (cents).
     * If user enters 25.50 -> 2550. If 25 -> 2500. If 2500 -> 2500 depending on decimal point.
     */
    protected function parsePriceToCents(mixed $price): int
    {
        if (is_int($price)) {
            return $price;
        }

        $str = (string) $price;
        if (str_contains($str, '.')) {
            return (int) round(((float) $str) * 100);
        }

        // If integer string without decimal:
        // If greater than 1000 and looks like cents? Or treat as dollars?
        // Standard user input in currency form field is dollars: e.g. "25" means $25.00 => 2500 cents.
        return (int) round(((float) $str) * 100);
    }
}
