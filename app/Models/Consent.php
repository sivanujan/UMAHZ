<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use DomainException;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consent extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_WITHDRAWN = 'withdrawn';

    protected $fillable = [
        'tenant_id',
        'client_id',
        'consent_type_id',
        'consent_type_name',
        'consent_body',
        'signer_name',
        'signature_type',
        'signature_data',
        'witnessed_by_user_id',
        'agreed_at',
        'status',
        'withdrawn_at',
        'withdrawn_by_user_id',
        'withdrawal_reason',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'agreed_at' => 'datetime',
            'withdrawn_at' => 'datetime',
        ];
    }

    /**
     * Enforce strict legal immutability: once signed and stored,
     * the core consent text, signature, and timestamp cannot be altered.
     */
    protected static function booted(): void
    {
        static::updating(function (Consent $consent) {
            $immutableAttributes = [
                'tenant_id',
                'client_id',
                'consent_type_name',
                'consent_body',
                'signer_name',
                'signature_type',
                'signature_data',
                'agreed_at',
            ];

            foreach ($immutableAttributes as $field) {
                if ($consent->isDirty($field)) {
                    throw new DomainException("Signed consent documents are immutable. \"{$field}\" cannot be modified.");
                }
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function consentType(): BelongsTo
    {
        return $this->belongsTo(ConsentType::class);
    }

    public function witnessedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'witnessed_by_user_id');
    }

    public function withdrawnBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'withdrawn_by_user_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isWithdrawn(): bool
    {
        return $this->status === self::STATUS_WITHDRAWN;
    }
}
