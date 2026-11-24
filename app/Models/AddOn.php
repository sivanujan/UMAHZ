<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AddOn extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'billing_type',
        'pricing_type',
        'price_monthly',
        'price_annual',
        'stripe_product_id',
        'stripe_price_monthly_id',
        'stripe_price_annual_id',
        'config',
        'is_active',
        'needs_review',
        'needs_review_fields',
    ];

    protected $appends = [
        'pricing_type',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'price_annual' => 'decimal:2',
        'config' => 'array',
        'is_active' => 'boolean',
        'needs_review' => 'boolean',
        'needs_review_fields' => 'array',
    ];

    public function getPricingTypeAttribute(): string
    {
        return $this->attributes['billing_type'] ?? 'per_seat';
    }

    public function setPricingTypeAttribute(?string $value): void
    {
        $this->attributes['billing_type'] = $value;
    }

    public function tenantAddOns(): HasMany
    {
        return $this->hasMany(TenantAddOn::class);
    }
}
