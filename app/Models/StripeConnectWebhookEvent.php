<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Idempotency ledger for the Stripe Connect webhook endpoint. One row per Stripe
 * event id; re-delivered events are ignored. Not tenant-scoped (a platform-level
 * record keyed only by Stripe's event id).
 */
class StripeConnectWebhookEvent extends Model
{
    use HasUuids;

    protected $fillable = [
        'event_id',
        'type',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
        ];
    }
}
