<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A payment recorded against a patient-billing invoice. Card payments settle to
 * the clinic's connected Stripe account (Connect); manual payments (cash /
 * e-transfer / other) are recorded by staff for walk-ins. Amounts are integer
 * minor units. Strictly tenant-scoped.
 */
class Payment extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const METHOD_CARD = 'card';

    public const METHOD_CASH = 'cash';

    public const METHOD_ETRANSFER = 'etransfer';

    public const METHOD_OTHER = 'other';

    public const MANUAL_METHODS = [
        self::METHOD_CASH,
        self::METHOD_ETRANSFER,
        self::METHOD_OTHER,
    ];

    public const STATUS_PENDING = 'pending';

    public const STATUS_SUCCEEDED = 'succeeded';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'method',
        'status',
        'amount',
        'currency',
        'application_fee_amount',
        'stripe_connect_account_id',
        'stripe_payment_intent_id',
        'stripe_charge_id',
        'notes',
        'recorded_by',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'application_fee_amount' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function isCard(): bool
    {
        return $this->method === self::METHOD_CARD;
    }

    public function isSucceeded(): bool
    {
        return $this->status === self::STATUS_SUCCEEDED;
    }
}
