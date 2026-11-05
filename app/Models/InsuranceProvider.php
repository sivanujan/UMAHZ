<?php

namespace App\Models;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InsuranceProvider extends Model
{
    use HasFactory, HasUuids;

    public const NETWORK_TELUS_ECLAIMS = 'telus_eclaims';
    public const NETWORK_SUN_LIFE = 'sun_life';
    public const NETWORK_GREENSHIELD = 'greenshield';
    public const NETWORK_BLUE_CROSS = 'blue_cross';
    public const NETWORK_OTHER = 'other';
    public const NETWORK_NONE = 'none';

    public const NETWORKS = [
        self::NETWORK_TELUS_ECLAIMS => 'TELUS eClaims',
        self::NETWORK_SUN_LIFE => 'Sun Life Financial',
        self::NETWORK_GREENSHIELD => 'GreenShield Canada',
        self::NETWORK_BLUE_CROSS => 'Blue Cross',
        self::NETWORK_OTHER => 'Other Network',
        self::NETWORK_NONE => 'None / Direct Patient',
    ];

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'province',
        'network',
        'supports_direct_billing',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'supports_direct_billing' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function policies(): HasMany
    {
        return $this->hasMany(ClientInsurancePolicy::class);
    }

    public function isNational(): bool
    {
        return $this->province === null;
    }

    /**
     * Scope to providers available to a given tenant (system reference providers + tenant's custom providers).
     */
    public function scopeAvailableForTenant(Builder $query, ?string $tenantId = null): Builder
    {
        $tenantId = $tenantId ?? TenantScope::getTenantId();

        return $query->where(function (Builder $q) use ($tenantId) {
            $q->whereNull('tenant_id');
            if ($tenantId) {
                $q->orWhere('tenant_id', $tenantId);
            }
        });
    }

    /**
     * Scope to active providers.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }
}

