<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanPrice extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'plan_id',
        'interval',
        'currency',
        'base_price',
        'extra_practitioner_price',
        'stripe_base_price_id',
        'stripe_extra_seat_price_id',
        'is_active',
        'is_grandfathered',
        'needs_review',
        'needs_review_fields',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'extra_practitioner_price' => 'decimal:2',
        'is_active' => 'boolean',
        'is_grandfathered' => 'boolean',
        'needs_review' => 'boolean',
        'needs_review_fields' => 'array',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
