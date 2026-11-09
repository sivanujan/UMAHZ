<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    public const SIZE_UNITS = [
        'ml' => 'ml',
        'L' => 'L',
        'g' => 'g',
        'kg' => 'kg',
        'pcs' => 'pcs',
        'capsules' => 'capsules',
        'tablets' => 'tablets',
        'other' => 'other',
    ];

    protected $fillable = [
        'tenant_id',
        'product_id',
        'name',
        'size_value',
        'size_unit',
        'sku',
        'unit_price',
        'stock_quantity',
        'low_stock_threshold',
        'active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'size_value' => 'decimal:2',
            'unit_price' => 'integer',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(ProductStockMovement::class, 'product_variant_id');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class, 'product_variant_id');
    }

    /**
     * Display label for invoice line, picker, and receipt.
     */
    public function fullDisplayName(): string
    {
        $baseName = $this->product?->name ?? 'Product';
        if (empty($this->name)) {
            return $baseName;
        }

        return "{$baseName} - {$this->name}";
    }

    public function formattedPrice(): string
    {
        $amount = number_format($this->unit_price / 100, 2);
        $curr = strtoupper($this->product?->currency ?? 'CAD');

        return "\${$amount} {$curr}";
    }

    public function isLowStock(): bool
    {
        $track = $this->product ? (bool) $this->product->track_inventory : true;
        if (! $track || $this->low_stock_threshold === null || $this->stock_quantity === null) {
            return false;
        }

        return $this->stock_quantity <= $this->low_stock_threshold;
    }

    public function isOutOfStock(): bool
    {
        $track = $this->product ? (bool) $this->product->track_inventory : true;
        if (! $track || $this->stock_quantity === null) {
            return false;
        }

        return $this->stock_quantity <= 0;
    }
}

