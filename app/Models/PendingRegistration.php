<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A clinic registration awaiting a saved card. Holds the validated wizard
 * payload and reserves the chosen subdomain until it either becomes a real
 * Tenant (card confirmed) or expires and is pruned. NOT tenant-scoped — it
 * exists before any tenant does, on the central domain only.
 */
class PendingRegistration extends Model
{
    use HasUuids;

    protected $fillable = [
        'email',
        'subdomain',
        'plan_tier',
        'full_time_practitioners_count',
        'part_time_practitioners_count',
        'ip_address',
        'payload',
        'license_document_path',
        'license_document_original_name',
        'license_document_mime',
        'stripe_customer_id',
        'stripe_setup_intent_id',
        'stripe_payment_method_id',
        'card_saved_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'card_saved_at' => 'datetime',
            'expires_at' => 'datetime',
            'full_time_practitioners_count' => 'integer',
            'part_time_practitioners_count' => 'integer',
        ];
    }

    /** Rows that are still within their reservation window. */
    public function scopeLive(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }

    /** Rows whose reservation has lapsed and should be pruned. */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<=', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function hasCardSaved(): bool
    {
        return $this->stripe_payment_method_id !== null && $this->card_saved_at !== null;
    }
}
