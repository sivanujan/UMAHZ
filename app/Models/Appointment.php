<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CHECKED_IN = 'checked_in';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_NO_SHOW = 'no_show';

    public const STATUS_REQUESTED = 'requested';

    public const STATUS_DECLINED = 'declined';

    protected $fillable = [
        'tenant_id',
        'client_id',
        'staff_membership_id',
        'location_id',
        'room_id',
        'clinic_service_id',
        'service_name',
        'starts_at',
        'ends_at',
        'status',
        'booking_source',
        'notes',
        'cancelled_at',
        'cancellation_reason',
        'public_manage_token_hash',
        'client_contact_diff',
        'reminder_sent_at',
        'declined_reason',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'client_contact_diff' => 'array',
            'reminder_sent_at' => 'datetime',
        ];
    }

    public function clinicService(): BelongsTo
    {
        return $this->belongsTo(ClinicService::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function staffMembership(): BelongsTo
    {
        return $this->belongsTo(StaffMembership::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function insuranceClaims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class)->latest('created_at');
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Duration of the appointment in minutes based on starts_at and ends_at.
     */
    public function durationMinutes(): ?int
    {
        if (! $this->starts_at || ! $this->ends_at) {
            return null;
        }

        return (int) $this->starts_at->diffInMinutes($this->ends_at);
    }
}
