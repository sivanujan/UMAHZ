<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_PENDING = 'pending';
    public const STATUS_QUALIFIED = 'qualified';
    public const STATUS_REWARDED = 'rewarded';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'referrer_tenant_id',
        'referred_tenant_id',
        'referral_code',
        'status',
        'reward_mode',
        'reward_amount',
        'stripe_coupon_id',
        'stripe_balance_txn_id',
        'rewarded_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'reward_amount' => 'decimal:2',
        'rewarded_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'referrer_tenant_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'referred_tenant_id');
    }
}

