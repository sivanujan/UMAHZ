<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScribeUsageLedger extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'staff_membership_id',
        'period_start',
        'period_end',
        'recorded_ms',
        'session_count',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'recorded_ms' => 'integer',
        'session_count' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function staffMembership(): BelongsTo
    {
        return $this->belongsTo(StaffMembership::class);
    }

    public function getRecordedMinutesAttribute(): int
    {
        return (int) ceil($this->recorded_ms / 60000);
    }
}
