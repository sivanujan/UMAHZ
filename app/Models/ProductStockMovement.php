<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductStockMovement extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const REASON_INITIAL = 'initial';
    public const REASON_RESTOCK = 'restock';
    public const REASON_MANUAL_ADJUSTMENT = 'manual_adjustment';
    public const REASON_INVOICE_PAID = 'invoice_paid';
    public const REASON_INVOICE_VOIDED = 'invoice_voided';

    protected $fillable = [
        'tenant_id',
        'product_id',
        'change',
        'new_stock_quantity',
        'reason',
        'invoice_id',
        'user_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'change' => 'integer',
            'new_stock_quantity' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

