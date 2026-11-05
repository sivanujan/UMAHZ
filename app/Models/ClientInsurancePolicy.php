<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientInsurancePolicy extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const PRIORITY_PRIMARY = 'primary';
    public const PRIORITY_SECONDARY = 'secondary';

    public const RELATIONSHIP_SELF = 'self';
    public const RELATIONSHIP_SPOUSE = 'spouse';
    public const RELATIONSHIP_CHILD = 'child';
    public const RELATIONSHIP_PARENT = 'parent';
    public const RELATIONSHIP_OTHER = 'other';

    public const RELATIONSHIPS = [
        self::RELATIONSHIP_SELF => 'Self (Patient)',
        self::RELATIONSHIP_SPOUSE => 'Spouse',
        self::RELATIONSHIP_CHILD => 'Child / Dependant',
        self::RELATIONSHIP_PARENT => 'Parent',
        self::RELATIONSHIP_OTHER => 'Other',
    ];

    protected $fillable = [
        'tenant_id',
        'client_id',
        'insurance_provider_id',
        'policy_number',
        'group_number',
        'member_id',
        'certificate_id',
        'plan_holder_name',
        'relationship_to_patient',
        'plan_holder_dob',
        'coverage_start_date',
        'coverage_end_date',
        'priority',
        'notes',
        'verified_at',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            // Laravel encrypted casts store ciphertext at rest and decrypt on access
            'policy_number' => 'encrypted',
            'group_number' => 'encrypted',
            'member_id' => 'encrypted',
            'certificate_id' => 'encrypted',
            'plan_holder_dob' => 'encrypted',
            'coverage_start_date' => 'date',
            'coverage_end_date' => 'date',
            'verified_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class, 'insurance_provider_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function claims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class);
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function isPrimary(): bool
    {
        return $this->priority === self::PRIORITY_PRIMARY;
    }

    /**
     * Check if policy is currently active based on coverage dates.
     */
    public function isActive(): bool
    {
        $today = now()->toDateString();

        if ($this->coverage_start_date && $this->coverage_start_date->toDateString() > $today) {
            return false;
        }

        if ($this->coverage_end_date && $this->coverage_end_date->toDateString() < $today) {
            return false;
        }

        return true;
    }

    /**
     * Mask a number string except the last 4 characters.
     */
    public static function mask(?string $value): string
    {
        if (! $value) {
            return '—';
        }

        $length = mb_strlen($value);
        if ($length <= 4) {
            return str_repeat('•', max(0, $length - 1)) . mb_substr($value, -1);
        }

        return str_repeat('•', 4) . mb_substr($value, -4);
    }

    /**
     * Masked member / certificate ID for safe display and logging.
     */
    public function maskedMemberId(): string
    {
        return self::mask($this->member_id);
    }

    /**
     * Masked policy / group number for safe display and logging.
     */
    public function maskedPolicyNumber(): string
    {
        return self::mask($this->policy_number);
    }

    public function scopePrimary(Builder $query): Builder
    {
        return $query->where('priority', self::PRIORITY_PRIMARY);
    }

    public function scopeSecondary(Builder $query): Builder
    {
        return $query->where('priority', self::PRIORITY_SECONDARY);
    }
}

