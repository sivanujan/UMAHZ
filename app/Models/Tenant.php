<?php

namespace App\Models;

use App\Support\Disciplines;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Laravel\Cashier\Billable;

class Tenant extends Model
{
    use HasFactory, HasUuids, SoftDeletes, Billable;

    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_NEEDS_MORE_INFO = 'needs_more_info';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_SUSPENDED = 'suspended';

    // Tier constants
    public const PLAN_BALANCE = 'balance';
    public const PLAN_PRACTICE = 'practice';
    public const PLAN_THRIVE = 'thrive';

    public const TIER_BALANCE = self::PLAN_BALANCE;
    public const TIER_PRACTICE = self::PLAN_PRACTICE;
    public const TIER_THRIVE = self::PLAN_THRIVE;

    // Coarse mirror of the CLINIC -> UMAHZ platform subscription (Stripe is the
    // source of truth; kept in sync by the approve flow + webhooks).
    public const SUBSCRIPTION_NONE = 'none';
    public const SUBSCRIPTION_ACTIVE = 'active';
    public const SUBSCRIPTION_PAST_DUE = 'past_due';
    public const SUBSCRIPTION_CANCELED = 'canceled';

    /** Cashier subscription "type" for the platform plan. */
    public const PLATFORM_SUBSCRIPTION = 'platform';

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
        'plan_tier',
        'full_time_practitioners_count',
        'part_time_practitioners_count',
        'business_registration_number',
        'primary_contact_name',
        'primary_contact_email',
        'primary_contact_phone',
        'requested_disciplines',
        'custom_disciplines',
        'estimated_practitioner_count',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'review_note',
        'subscription_status',
        'payment_failed_at',
        'stripe_pm_id',
    ];

    protected function casts(): array
    {
        return [
            'tax_settings' => 'array',
            'address' => 'array',
            'business_hours' => 'array',
            'onboarding_completed_at' => 'datetime',
            'requested_disciplines' => 'array',
            'custom_disciplines' => 'array',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'payment_failed_at' => 'datetime',
            'full_time_practitioners_count' => 'integer',
            'part_time_practitioners_count' => 'integer',
        ];
    }

    public function isBalancePlan(): bool
    {
        return ($this->plan_tier ?? self::PLAN_PRACTICE) === self::PLAN_BALANCE;
    }

    public function isPracticePlan(): bool
    {
        return ($this->plan_tier ?? self::PLAN_PRACTICE) === self::PLAN_PRACTICE;
    }

    public function isThrivePlan(): bool
    {
        return ($this->plan_tier ?? self::PLAN_PRACTICE) === self::PLAN_THRIVE;
    }

    public function planName(): string
    {
        return config("billing.tiers.{$this->plan_tier}.name", ucfirst($this->plan_tier ?? 'practice'));
    }

    public function totalPractitionersCount(): int
    {
        return ($this->full_time_practitioners_count ?? 1) + ($this->part_time_practitioners_count ?? 0);
    }

    public function monthlyBillableBreakdown(): array
    {
        return \App\Billing\PlanPricing::calculateBreakdown(
            $this->plan_tier ?? self::PLAN_PRACTICE,
            $this->full_time_practitioners_count ?? 1,
            $this->part_time_practitioners_count ?? 0
        );
    }

    public function monthlyBillableTotal(): float
    {
        return $this->monthlyBillableBreakdown()['total_monthly'];
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
     * Get the active subscription tier definition for this clinic.
     */
    public function tierConfig(): array
    {
        return \App\Models\SubscriptionTierConfig::getTier($this->plan_tier ?? self::PLAN_PRACTICE) ?? [];
    }

    /**
     * Maximum allowed practitioners under current plan tier (null = unlimited).
     */
    public function maxPractitioners(): ?int
    {
        $config = $this->tierConfig();
        if (array_key_exists('max_practitioners', $config)) {
            return $config['max_practitioners'];
        }

        return $this->isBalancePlan() ? 1 : null;
    }

    /**
     * Maximum allowed appointments per calendar month (null = unlimited).
     */
    public function maxMonthlyAppointments(): ?int
    {
        $config = $this->tierConfig();
        if (array_key_exists('max_appointments_per_month', $config)) {
            return $config['max_appointments_per_month'];
        }

        return $this->isBalancePlan() ? 20 : null;
    }

    /**
     * Total non-cancelled appointments scheduled for the current calendar month.
     */
    public function currentMonthAppointmentsCount(): int
    {
        return \App\Models\Appointment::withoutGlobalScopes()
            ->where('tenant_id', $this->id)
            ->whereYear('starts_at', now()->year)
            ->whereMonth('starts_at', now()->month)
            ->whereNotIn('status', [\App\Models\Appointment::STATUS_CANCELLED])
            ->count();
    }

    /**
     * Check if clinic can book another appointment this month under their plan.
     */
    public function canBookAppointment(): bool
    {
        $max = $this->maxMonthlyAppointments();
        if ($max === null) {
            return true;
        }

        return $this->currentMonthAppointmentsCount() < $max;
    }

    /**
     * Current count of active or invited practitioners at the clinic.
     */
    public function currentPractitionersCount(): int
    {
        return \App\Models\StaffMembership::withoutGlobalScopes()
            ->where('tenant_id', $this->id)
            ->where('role', \App\Models\StaffMembership::ROLE_PRACTITIONER)
            ->whereIn('status', [
                \App\Models\StaffMembership::STATUS_ACTIVE,
                \App\Models\StaffMembership::STATUS_INVITED,
            ])
            ->count();
    }

    /**
     * Check if clinic can invite or add another practitioner under their plan.
     */
    public function canAddPractitioner(): bool
    {
        $max = $this->maxPractitioners();
        if ($max === null) {
            return true;
        }

        return $this->currentPractitionersCount() < $max;
    }

    /**
     * Whether the clinic's platform subscription is in good standing. past_due
     * counts as "in grace" (Stripe is still retrying) so access is retained;
     * only a canceled/never-started subscription is out.
     */
    public function hasActivePlatformSubscription(): bool
    {
        return in_array($this->subscription_status, [
            self::SUBSCRIPTION_ACTIVE,
            self::SUBSCRIPTION_PAST_DUE,
        ], true);
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

    /**
     * Normalized list of custom disciplines: [['slug' => '...', 'label' => '...'], ...]
     *
     * @return array<int, array{slug: string, label: string}>
     */
    public function customDisciplinesList(): array
    {
        $raw = $this->custom_disciplines ?? [];
        $list = [];

        if (is_array($raw)) {
            foreach ($raw as $key => $val) {
                if (is_array($val) && isset($val['slug'], $val['label'])) {
                    $list[] = [
                        'slug' => (string) $val['slug'],
                        'label' => (string) $val['label'],
                    ];
                } elseif (is_string($key) && is_string($val)) {
                    $list[] = [
                        'slug' => $key,
                        'label' => $val,
                    ];
                } elseif (is_string($val)) {
                    $list[] = [
                        'slug' => Disciplines::slugify($val),
                        'label' => Disciplines::sanitizeLabel($val),
                    ];
                }
            }
        }

        return $list;
    }

    /**
     * Key-value map of slug => display label for custom disciplines.
     *
     * @return array<string, string>
     */
    public function customDisciplinesMap(): array
    {
        $map = [];
        foreach ($this->customDisciplinesList() as $item) {
            $map[$item['slug']] = $item['label'];
        }

        return $map;
    }

    /**
     * Combined map of code => display label for all disciplines (fixed 5 + custom).
     *
     * @return array<string, string>
     */
    public function allDisciplineLabels(): array
    {
        return array_merge(Disciplines::fixedLabels(), $this->customDisciplinesMap());
    }

    /**
     * Combined map of code => display label for disciplines currently offered by this clinic.
     *
     * @return array<string, string>
     */
    public function offeredDisciplineLabels(): array
    {
        $all = $this->allDisciplineLabels();
        $offered = $this->requested_disciplines ?: Disciplines::fixedCodes();
        $result = [];

        foreach ($offered as $code) {
            $result[$code] = $all[$code] ?? Disciplines::FIXED_LABELS[$code] ?? Str::headline($code);
        }

        return $result;
    }

    /**
     * Resolve a discipline code to its proper display label for this tenant.
     * Never returns a raw snake_case code or "unknown".
     */
    public function disciplineLabel(?string $code): string
    {
        if (! $code) {
            return '—';
        }

        $all = $this->allDisciplineLabels();
        if (isset($all[$code])) {
            return $all[$code];
        }

        return Disciplines::FIXED_LABELS[$code] ?? Str::headline($code);
    }

    /**
     * Array of all valid discipline codes available to this tenant (fixed 5 + custom).
     *
     * @return array<int, string>
     */
    public function availableDisciplineCodes(): array
    {
        return array_values(array_unique(array_merge(
            Disciplines::fixedCodes(),
            array_keys($this->customDisciplinesMap())
        )));
    }

    /**
     * Array of discipline codes currently offered by this clinic.
     *
     * @return array<int, string>
     */
    public function offeredDisciplineCodes(): array
    {
        return $this->requested_disciplines ?: Disciplines::fixedCodes();
    }

    /**
     * Alias for offeredDisciplineCodes().
     *
     * @return array<int, string>
     */
    public function allOfferedDisciplines(): array
    {
        return $this->offeredDisciplineCodes();
    }

    /**
     * Alias for allDisciplineLabels().
     *
     * @return array<string, string>
     */
    public function allDisciplinesMap(): array
    {
        return $this->allDisciplineLabels();
    }
}
