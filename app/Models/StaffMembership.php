<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StaffMembership extends Model
{
    use HasFactory, HasUuids;

    public const ROLE_PLATFORM_ADMIN = 'platform_admin';
    public const ROLE_CLINIC_OWNER = 'clinic_owner';
    public const ROLE_PRACTITIONER = 'practitioner';
    public const ROLE_RECEPTIONIST = 'receptionist';
    public const ROLE_CLIENT = 'client';

    public const STATUS_INVITED = 'invited';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_DEACTIVATED = 'deactivated';

    protected $fillable = [
        'user_id',
        'tenant_id',
        'role',
        'permissions',
        'status',
        'invited_at',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'invited_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function practitionerProfile(): HasOne
    {
        return $this->hasOne(PractitionerProfile::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function isWorkspaceRole(): bool
    {
        return in_array($this->role, [
            self::ROLE_CLINIC_OWNER,
            self::ROLE_PRACTITIONER,
            self::ROLE_RECEPTIONIST,
        ], true);
    }
}
