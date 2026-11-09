<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    public const CATEGORIES = [
        'herbs' => 'Herbs & Formulas',
        'oils' => 'Massage Oils & Lotions',
        'tape' => 'Kinesiology Tape',
        'equipment' => 'Clinical & Rehab Equipment',
        'apparel' => 'Apparel & Uniforms',
        'supplements' => 'Nutritional Supplements',
        'other' => 'Other Supplies',
    ];

    protected $fillable = [
        'tenant_id',
        'name',
        'sku',
        'category',
        'description',
        'unit_price',
        'currency',
        'taxable',
        'tax_rate',
        'track_inventory',
        'stock_quantity',
        'low_stock_threshold',
        'image_path',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'integer',
            'taxable' => 'boolean',
            'tax_rate' => 'decimal:2',
            'track_inventory' => 'boolean',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(ProductStockMovement::class)->latest('created_at');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class);
    }

    public function isLowStock(): bool
    {
        if (! $this->track_inventory || $this->stock_quantity === null || $this->low_stock_threshold === null) {
            return false;
        }

        return $this->stock_quantity <= $this->low_stock_threshold;
    }

    public function calculateTax(int $quantity = 1): int
    {
        if (! $this->taxable || ! $this->tax_rate || $this->tax_rate <= 0) {
            return 0;
        }

        $baseAmount = $this->unit_price * max(1, $quantity);

        return (int) round($baseAmount * ((float) $this->tax_rate / 100));
    }

    public function formattedPrice(): string
    {
        $dollars = number_format($this->unit_price / 100, 2);
        return '$' . $dollars;
    }

    public function imageUrl(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        return asset('storage/' . $this->image_path);
    }
}

