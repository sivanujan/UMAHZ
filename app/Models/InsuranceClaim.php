<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InsuranceClaim extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PARTIALLY_APPROVED = 'partially_approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_PAID = 'paid';
    public const STATUS_CANCELLED = 'cancelled';

    public const TYPE_MANUAL = 'manual';
    public const TYPE_ELECTRONIC = 'electronic';

    protected $fillable = [
        'tenant_id',
        'client_id',
        'appointment_id',
        'invoice_id',
        'client_insurance_policy_id',
        'claim_type',
        'status',
        'amount_claimed',
        'amount_approved',
        'patient_balance',
        'external_reference',
        'response_payload',
        'rejection_reason',
        'submitted_at',
        'responded_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_claimed' => 'integer',
            'amount_approved' => 'integer',
            'patient_balance' => 'integer',
            'response_payload' => 'array',
            'submitted_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(ClientInsurancePolicy::class, 'client_insurance_policy_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(InsuranceClaimEvent::class, 'claim_id')->orderBy('created_at');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isApproved(): bool
    {
        return in_array($this->status, [self::STATUS_APPROVED, self::STATUS_PAID], true);
    }
}

