<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Tenant extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_NEEDS_MORE_INFO = 'needs_more_info';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_SUSPENDED = 'suspended';

    protected $fillable = [
        'name',
        'slug',
        'subdomain',
        'timezone',
        'currency',
        'tax_settings',
        'phone',
        'email',
        'address',
        'logo_url',
        'business_hours',
        'brand_color',
        'onboarding_completed_at',
        'status',
        'business_registration_number',
        'primary_contact_name',
        'primary_contact_email',
        'primary_contact_phone',
        'requested_disciplines',
        'estimated_practitioner_count',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'review_note',
    ];

    protected function casts(): array
    {
        return [
            'tax_settings' => 'array',
            'address' => 'array',
            'business_hours' => 'array',
            'onboarding_completed_at' => 'datetime',
            'requested_disciplines' => 'array',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function hasCompletedOnboarding(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * The clinic's staff subdomain host, e.g. "lotus.umahz.com".
     */
    public function subdomainHost(): string
    {
        return \App\Support\Tenancy::hostFor($this->subdomain);
    }

    /**
     * An absolute URL into this clinic's staff workspace, e.g.
     * "https://lotus.umahz.com/app/dashboard".
     */
    public function appUrl(string $path = ''): string
    {
        return \App\Support\Tenancy::urlFor($this->subdomain, $path);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function staffMemberships(): HasMany
    {
        return $this->hasMany(StaffMembership::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'staff_memberships')
            ->withPivot('role', 'status', 'permissions', 'invited_at', 'joined_at')
            ->withTimestamps();
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(AuditEvent::class);
    }
}
