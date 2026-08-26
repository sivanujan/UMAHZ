<?php

namespace App\Models;

use App\Notifications\VerifyEmailNotification;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasUuids, Notifiable, HasApiTokens, HasRoles, Billable, MustVerifyEmailTrait;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'tos_accepted_version',
        'tos_accepted_at',
        'marketing_opt_in',
        'marketing_opt_in_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted',
            'tos_accepted_at' => 'datetime',
            'marketing_opt_in' => 'boolean',
            'marketing_opt_in_at' => 'datetime',
        ];
    }

    /**
     * Send the UMAHZ-branded email verification notification instead of the
     * framework default.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification());
    }

    public function staffMemberships(): HasMany
    {
        return $this->hasMany(StaffMembership::class);
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'staff_memberships')
            ->withPivot('role', 'status', 'permissions', 'invited_at', 'joined_at')
            ->withTimestamps();
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(AuditEvent::class);
    }

    /**
     * All active (non-invited, non-suspended, non-deactivated) staff memberships.
     */
    public function activeStaffMemberships(): HasMany
    {
        return $this->staffMemberships()->where('status', StaffMembership::STATUS_ACTIVE);
    }

    /**
     * Whether this user holds an active platform_admin staff membership at any tenant.
     */
    public function isPlatformAdmin(): bool
    {
        return $this->activeStaffMemberships()
            ->where('role', StaffMembership::ROLE_PLATFORM_ADMIN)
            ->exists();
    }

    /**
     * Active staff memberships that grant access to a tenant's /app workspace
     * (i.e. everything except the platform_admin role, which is platform-wide).
     */
    public function activeWorkspaceMemberships(): HasMany
    {
        return $this->activeStaffMemberships()
            ->whereIn('role', [
                StaffMembership::ROLE_CLINIC_OWNER,
                StaffMembership::ROLE_PRACTITIONER,
                StaffMembership::ROLE_RECEPTIONIST,
            ]);
    }
}
