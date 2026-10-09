<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Feature;
use App\Models\Location;
use App\Models\PlatformSetting;
use App\Models\Room;
use App\Models\ScribeSession;
use App\Models\ScribeUsageLedger;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\TenantAddOn;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PlanEntitlements
{
    /**
     * Requirement 2: Tenants that don't have a plan_id yet (legacy, before Phase 6 migration)
     * must keep FULL access exactly as today. No new limits apply to them until migrated.
     *
     * @deprecated Kept during rollout until all tenants have a plan_id assigned via billing:migrate-legacy-tenants.
     */
    public function hasLegacyFullAccess(Tenant $tenant): bool
    {
        return empty($tenant->plan_id);
    }

    /**
     * Requirement 3: Read/export always for all non-active states (past_due, restricted_overdue, canceled, suspended).
     * Only creating new records is restricted.
     * Platform admin manual abuse suspension fully blocks all access.
     *
     * @return array{allowed: bool, reason: ?string, code: ?string}
     */
    public function canWrite(Tenant $tenant): array
    {
        // 1. Explicit platform-admin suspension for abuse -> strictly blocked from everything
        if ($tenant->is_manually_suspended) {
            return [
                'allowed' => false,
                'reason' => 'This clinic workspace has been suspended by platform administration.',
                'code' => 'manually_suspended',
            ];
        }

        // 2. Unapproved clinic mid-review
        if (! in_array($tenant->status, [Tenant::STATUS_APPROVED, Tenant::STATUS_SUSPENDED], true)) {
            return [
                'allowed' => false,
                'reason' => 'Your clinic application is currently pending review.',
                'code' => 'pending_review',
            ];
        }

        // 3. Subscription status checks
        $subStatus = $tenant->subscription_status ?? Tenant::SUBSCRIPTION_NONE;
        $platformSub = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);

        if ($subStatus === Tenant::SUBSCRIPTION_CANCELED || ($platformSub && $platformSub->canceled() && ! $platformSub->onGracePeriod())) {
            return [
                'allowed' => false,
                'reason' => 'Your clinic subscription has ended and workspace access is locked. All clinic data will be permanently removed within 30 days unless reactivated. Please reactivate your subscription to restore access.',
                'code' => 'subscription_canceled',
            ];
        }

        if ($subStatus === Tenant::SUBSCRIPTION_ACTIVE) {
            return ['allowed' => true, 'reason' => null, 'code' => null];
        }

        if ($subStatus === Tenant::SUBSCRIPTION_PAST_DUE) {
            // In grace period: writing is still permitted, banner informs clinic
            $graceDays = (int) PlatformSetting::get('billing.past_due_grace_days', 14);
            $failedAt = $tenant->payment_failed_at ?: $tenant->updated_at;
            $isOverdueGrace = $failedAt && $failedAt->diffInDays(now()) >= $graceDays;

            if ($isOverdueGrace) {
                return [
                    'allowed' => false,
                    'reason' => 'Your subscription payment is overdue beyond the grace period. Please update your payment method to create new records.',
                    'code' => 'restricted_overdue',
                ];
            }

            return ['allowed' => true, 'reason' => null, 'code' => null];
        }

        if ($subStatus === Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE) {
            return [
                'allowed' => false,
                'reason' => 'Your clinic has restricted write access due to an overdue payment. Please update your payment method to create new records.',
                'code' => 'restricted_overdue',
            ];
        }

        if ($tenant->status === Tenant::STATUS_SUSPENDED) {
            return [
                'allowed' => false,
                'reason' => 'Your clinic write access is suspended. Please update your payment method to restore write access.',
                'code' => 'billing_suspended',
            ];
        }

        return ['allowed' => true, 'reason' => null, 'code' => null];
    }

    /**
     * Requirement 4: Practitioner seats check.
     * Counts active practitioners + pending practitioner invites.
     * Receptionists / admins do not consume practitioner seats.
     *
     * @return array{
     *     allowed: bool,
     *     requires_extra_seat: bool,
     *     extra_seat_price: float,
     *     current_count: int,
     *     included_count: int,
     *     max_count: ?int,
     *     reason: ?string
     * }
     */
    public function checkPractitionerSeats(Tenant $tenant, int $additional = 1): array
    {
        $currentCount = $this->countPractitionerSeats($tenant);

        if ($this->hasLegacyFullAccess($tenant)) {
            // Legacy solo balance check
            if ($tenant->isBalancePlan()) {
                $max = 1;
                $allowed = ($currentCount + $additional) <= $max;
                return [
                    'allowed' => $allowed,
                    'requires_extra_seat' => false,
                    'extra_seat_price' => 0.0,
                    'current_count' => $currentCount,
                    'included_count' => 1,
                    'max_count' => 1,
                    'reason' => $allowed ? null : 'Your current plan (Balance) is limited to 1 practitioner. Please upgrade to add more practitioners.',
                ];
            }

            return [
                'allowed' => true,
                'requires_extra_seat' => false,
                'extra_seat_price' => 0.0,
                'current_count' => $currentCount,
                'included_count' => 999,
                'max_count' => null,
                'reason' => null,
            ];
        }

        $plan = $tenant->plan;
        $included = $plan->included_practitioners ?? 1;
        $max = $plan->max_practitioners;
        $extraPrice = $this->getExtraSeatPrice($tenant);
        $totalProjected = $currentCount + $additional;

        // Above max -> block with upgrade message
        if ($max !== null && $totalProjected > $max) {
            return [
                'allowed' => false,
                'requires_extra_seat' => false,
                'extra_seat_price' => $extraPrice,
                'current_count' => $currentCount,
                'included_count' => $included,
                'max_count' => $max,
                'reason' => "Your current plan ({$plan->name}) is limited to {$max} practitioner(s). Please upgrade your clinic subscription plan to add more practitioners.",
            ];
        }

        // Above included seats
        if ($totalProjected > $included) {
            if ($plan->allows_extra_practitioners) {
                return [
                    'allowed' => true,
                    'requires_extra_seat' => true,
                    'extra_seat_price' => $extraPrice,
                    'current_count' => $currentCount,
                    'included_count' => $included,
                    'max_count' => $max,
                    'reason' => null,
                ];
            }

            return [
                'allowed' => false,
                'requires_extra_seat' => false,
                'extra_seat_price' => $extraPrice,
                'current_count' => $currentCount,
                'included_count' => $included,
                'max_count' => $included,
                'reason' => "Your plan ({$plan->name}) does not allow additional practitioner seats. Please upgrade your plan to add more practitioners.",
            ];
        }

        return [
            'allowed' => true,
            'requires_extra_seat' => false,
            'extra_seat_price' => $extraPrice,
            'current_count' => $currentCount,
            'included_count' => $included,
            'max_count' => $max,
            'reason' => null,
        ];
    }

    /**
     * Count active practitioners + pending practitioner invites.
     */
    public function countPractitionerSeats(Tenant $tenant): int
    {
        return StaffMembership::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->where('role', StaffMembership::ROLE_PRACTITIONER)
                    ->orWhereHas('practitionerProfile');
            })
            ->whereIn('status', [
                StaffMembership::STATUS_ACTIVE,
                StaffMembership::STATUS_INVITED,
            ])
            ->count();
    }

    /**
     * Requirement 5: Appointment limit.
     * Count from appointments table, current calendar month in the clinic's timezone, excluding cancelled.
     *
     * @return array{
     *     allowed: bool,
     *     behavior: string,
     *     current_count: int,
     *     limit: ?int,
     *     reason: ?string
     * }
     */
    public function checkAppointmentsLimit(Tenant $tenant, bool $isPatientBooking = false): array
    {
        $currentCount = $this->countMonthlyAppointments($tenant);

        if ($this->hasLegacyFullAccess($tenant)) {
            $limit = $tenant->maxMonthlyAppointments();
            if ($limit !== null && $currentCount >= $limit) {
                $reason = $isPatientBooking
                    ? 'Online booking is currently unavailable. Please contact the clinic directly to schedule your appointment.'
                    : "Monthly appointment limit reached ({$limit} appointments/month on the {$tenant->planName()} plan). Please upgrade your clinic subscription plan to book more appointments.";

                return [
                    'allowed' => false,
                    'behavior' => 'block',
                    'current_count' => $currentCount,
                    'limit' => $limit,
                    'reason' => $reason,
                ];
            }

            return [
                'allowed' => true,
                'behavior' => 'none',
                'current_count' => $currentCount,
                'limit' => $limit,
                'reason' => null,
            ];
        }

        $limit = $tenant->plan?->appointment_limit_monthly;

        if ($limit === null) {
            return [
                'allowed' => true,
                'behavior' => 'none',
                'current_count' => $currentCount,
                'limit' => null,
                'reason' => null,
            ];
        }

        if ($currentCount >= $limit) {
            $isUnderReview = $tenant->plan?->isFieldUnderReview('appointment_limit_monthly');
            $behavior = $isUnderReview ? 'warn' : ($tenant->plan->appointment_limit_behavior ?: 'warn');

            if ($behavior === 'block') {
                $reason = $isPatientBooking
                    ? 'Online booking is currently unavailable. Please contact the clinic directly to schedule your appointment.'
                    : "Monthly appointment limit reached ({$limit} appointments/month on {$tenant->plan->name}). Please upgrade your clinic subscription plan to book more appointments.";

                return [
                    'allowed' => false,
                    'behavior' => 'block',
                    'current_count' => $currentCount,
                    'limit' => $limit,
                    'reason' => $reason,
                ];
            }

            // Warn behavior: allowed = true, notify owner/system
            $reason = $isUnderReview
                ? "Clinic has reached its monthly appointment limit ({$currentCount}/{$limit}). (Warn only while under review)"
                : "Clinic has reached its monthly appointment limit ({$currentCount}/{$limit}).";

            return [
                'allowed' => true,
                'behavior' => 'warn',
                'current_count' => $currentCount,
                'limit' => $limit,
                'reason' => $reason,
            ];
        }

        return [
            'allowed' => true,
            'behavior' => 'none',
            'current_count' => $currentCount,
            'limit' => $limit,
            'reason' => null,
        ];
    }

    /**
     * Count non-cancelled appointments in current calendar month in clinic timezone.
     */
    public function countMonthlyAppointments(Tenant $tenant): int
    {
        $tz = $tenant->timezone ?: 'America/Toronto';
        $now = Carbon::now($tz);
        $startOfMonth = $now->copy()->startOfMonth()->utc();
        $endOfMonth = $now->copy()->endOfMonth()->utc();

        return Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('starts_at', [$startOfMonth, $endOfMonth])
            ->whereNotIn('status', [Appointment::STATUS_CANCELLED])
            ->count();
    }

    /**
     * Requirement 6: Location limit check on create only.
     *
     * @return array{allowed: bool, current_count: int, limit: ?int, reason: ?string}
     */
    public function checkLocationLimit(Tenant $tenant, int $additional = 1): array
    {
        $currentCount = Location::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->count();

        if ($this->hasLegacyFullAccess($tenant)) {
            return [
                'allowed' => true,
                'current' => $currentCount,
                'current_count' => $currentCount,
                'limit' => null,
                'max' => null,
                'reason' => null,
            ];
        }

        $limit = $tenant->plan?->location_limit;

        if ($limit === null) {
            return [
                'allowed' => true,
                'current' => $currentCount,
                'current_count' => $currentCount,
                'limit' => null,
                'max' => null,
                'reason' => null,
            ];
        }

        if (($currentCount + $additional) > $limit) {
            $isUnderReview = $tenant->plan?->isFieldUnderReview('location_limit');
            if ($isUnderReview) {
                return [
                    'allowed' => true,
                    'behavior' => 'warn',
                    'current' => $currentCount,
                    'current_count' => $currentCount,
                    'limit' => $limit,
                    'max' => $limit,
                    'reason' => "Clinic has reached its location limit ({$currentCount}/{$limit}). (Warn only while under review)",
                ];
            }

            return [
                'allowed' => false,
                'behavior' => 'block',
                'current' => $currentCount,
                'current_count' => $currentCount,
                'limit' => $limit,
                'max' => $limit,
                'reason' => "Your current plan ({$tenant->plan->name}) is limited to {$limit} location(s). Please upgrade to add more locations.",
            ];
        }

        return [
            'allowed' => true,
            'current' => $currentCount,
            'current_count' => $currentCount,
            'limit' => $limit,
            'max' => $limit,
            'reason' => null,
        ];
    }

    /**
     * Requirement: Room limit check.
     * Essential (basic) plan allows 1 treatment room so solo practitioners can accept bookings.
     * Higher tiers (Professional & Signature) with rooms_resources feature allow unlimited rooms.
     *
     * @return array{
     *     allowed: bool,
     *     current: int,
     *     current_count: int,
     *     limit: ?int,
     *     reason: ?string
     * }
     */
    public function checkRoomLimit(Tenant $tenant, int $additional = 1): array
    {
        $currentCount = Room::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->count();

        if ($this->hasLegacyFullAccess($tenant) || $this->isFeatureEnabled($tenant, 'rooms_resources')) {
            return [
                'allowed' => true,
                'current' => $currentCount,
                'current_count' => $currentCount,
                'limit' => null,
                'reason' => null,
            ];
        }

        $limit = 1;

        if (($currentCount + $additional) > $limit) {
            $planName = $tenant->plan?->name ?? 'Essential';

            return [
                'allowed' => false,
                'current' => $currentCount,
                'current_count' => $currentCount,
                'limit' => $limit,
                'reason' => "Your current plan ({$planName}) allows {$limit} treatment room. Upgrade to Professional for unlimited rooms and multi-room scheduling.",
            ];
        }

        return [
            'allowed' => true,
            'current' => $currentCount,
            'current_count' => $currentCount,
            'limit' => $limit,
            'reason' => null,
        ];
    }

    /**
     * Requirement 7: Scribe allowance (minutes).
     * Check only when starting a new session. Never cut off a recording already in progress.
     * Scribe+ active for that practitioner -> unlimited bypass.
     *
     * @return array{
     *     allowed: bool,
     *     unlimited: bool,
     *     behavior: string,
     *     used_minutes: float,
     *     allowance_minutes: ?float,
     *     remaining_minutes: ?float,
     *     reason: ?string
     * }
     */
    public function checkScribeAllowance(Tenant $tenant, StaffMembership|string|null $practitioner = null): array
    {
        if (is_string($practitioner)) {
            $practitioner = StaffMembership::find($practitioner);
        }

        if ($this->hasLegacyFullAccess($tenant)) {
            return [
                'allowed' => true,
                'unlimited' => true,
                'behavior' => 'none',
                'used_minutes' => 0.0,
                'allowance_minutes' => null,
                'remaining_minutes' => null,
                'reason' => null,
            ];
        }

        // Check if tenant has active Scribe+ add-on and if practitioner is assigned
        $tenantHasScribePlus = TenantAddOn::where('tenant_id', $tenant->id)
            ->whereHas('addOn', fn ($q) => $q->where('slug', 'scribe_plus'))
            ->where('status', 'active')
            ->where('quantity', '>', 0)
            ->exists();

        $practitionerHasScribePlus = false;
        if ($tenantHasScribePlus) {
            if (! $practitioner) {
                $practitionerHasScribePlus = true;
            } else {
                $membership = $practitioner->staffMembership;
                if ($membership && $membership->has_scribe_plus) {
                    $practitionerHasScribePlus = true;
                } elseif (! $membership) {
                    $practitionerHasScribePlus = true;
                }
            }
        }

        $usedMinutes = $this->calculateScribeUsageMinutes($tenant, $practitioner);

        if ($practitionerHasScribePlus) {
            return [
                'allowed' => true,
                'unlimited' => true,
                'behavior' => 'none',
                'used_minutes' => $usedMinutes,
                'allowance_minutes' => null,
                'remaining_minutes' => null,
                'reason' => null,
            ];
        }

        $allowanceMinutes = (float) ($tenant->plan?->scribe_allowance_amount ?? 60.0);
        $remainingMinutes = max(0.0, round($allowanceMinutes - $usedMinutes, 1));
        $isUnderReview = $tenant->plan?->isFieldUnderReview('scribe_allowance_amount');
        $behavior = $isUnderReview ? 'warn' : ($tenant->plan?->scribe_limit_behavior ?: 'warn');

        if ($usedMinutes >= $allowanceMinutes) {
            if ($behavior === 'block') {
                return [
                    'allowed' => false,
                    'unlimited' => false,
                    'behavior' => 'block',
                    'used_minutes' => $usedMinutes,
                    'allowance_minutes' => $allowanceMinutes,
                    'remaining_minutes' => 0.0,
                    'reason' => "You have reached your monthly AI Scribe allowance ({$allowanceMinutes} mins) on {$tenant->plan->name}. Please upgrade to Scribe+ for unlimited minutes.",
                ];
            }

            return [
                'allowed' => true,
                'unlimited' => false,
                'behavior' => 'warn',
                'used_minutes' => $usedMinutes,
                'allowance_minutes' => $allowanceMinutes,
                'remaining_minutes' => 0.0,
                'reason' => $isUnderReview
                    ? "You have exceeded your monthly AI Scribe allowance ({$usedMinutes}/{$allowanceMinutes} mins). (Warn only while under review)"
                    : "You have exceeded your monthly AI Scribe allowance ({$usedMinutes}/{$allowanceMinutes} mins).",
            ];
        }

        return [
            'allowed' => true,
            'unlimited' => false,
            'behavior' => 'none',
            'used_minutes' => $usedMinutes,
            'allowance_minutes' => $allowanceMinutes,
            'remaining_minutes' => $remainingMinutes,
            'reason' => null,
        ];
    }

    /**
     * Calculate Scribe recorded minutes for the current calendar month.
     */
    public function calculateScribeUsageMinutes(Tenant $tenant, StaffMembership|string|null $practitioner = null): float
    {
        $tz = $tenant->timezone ?: 'America/Toronto';
        $now = Carbon::now($tz);
        $startOfMonth = $now->copy()->startOfMonth()->utc();
        $endOfMonth = $now->copy()->endOfMonth()->utc();

        $practitionerId = is_string($practitioner)
            ? $practitioner
            : ($practitioner instanceof StaffMembership ? $practitioner->id : null);

        $query = ScribeSession::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth]);

        if ($practitionerId) {
            $query->where('staff_membership_id', $practitionerId);
        }

        $totalMs = (int) $query->sum('recorded_ms');

        return round($totalMs / 60000, 1);
    }

    /**
     * Record recorded_ms to ScribeUsageLedger upon session completion.
     */
    public function recordScribeUsage(ScribeSession $session): void
    {
        if ($session->recorded_ms <= 0) {
            return;
        }

        $tz = $session->tenant?->timezone ?: 'America/Toronto';
        $now = Carbon::now($tz);
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();

        $ledger = ScribeUsageLedger::firstOrCreate(
            [
                'tenant_id' => $session->tenant_id,
                'staff_membership_id' => $session->staff_membership_id,
                'period_start' => $startOfMonth,
                'period_end' => $endOfMonth,
            ],
            [
                'recorded_ms' => 0,
                'session_count' => 0,
            ]
        );

        $ledger->increment('recorded_ms', (int) $session->recorded_ms);
        $ledger->increment('session_count', 1);
    }

    /**
     * Requirement 2 & 8: Feature flag checking.
     * Features with is_implemented = false are flags only; never gate any existing route behind them.
     */
    public function isFeatureEnabled(Tenant $tenant, string $featureKey): bool
    {
        if ($this->hasLegacyFullAccess($tenant)) {
            return true;
        }

        $feature = Feature::where('key', $featureKey)->first();

        // If not found or NOT marked as implemented, never gate existing functionality
        if (! $feature || ! $feature->is_implemented) {
            return true;
        }

        // Custom clinic override
        $customFeatures = $tenant->custom_limits['features'] ?? [];
        if (array_key_exists($featureKey, $customFeatures)) {
            return (bool) $customFeatures[$featureKey];
        }

        // Check PlanFeature attachment
        if ($tenant->plan) {
            $planFeature = $tenant->plan->features()->where('features.id', $feature->id)->first();
            if ($planFeature) {
                return (bool) $planFeature->pivot->is_enabled;
            }
        }

        return false;
    }

    /**
     * Requirement 8: Share full entitlements payload with frontend via Inertia.
     */
    public function getSharedEntitlements(Tenant $tenant, ?StaffMembership $membership = null): array
    {
        $canWrite = $this->canWrite($tenant);
        $isLegacy = $this->hasLegacyFullAccess($tenant);

        // Banner computation
        $banner = null;
        $subStatus = $tenant->subscription_status ?? Tenant::SUBSCRIPTION_NONE;

        if ($tenant->is_manually_suspended) {
            $banner = [
                'show' => true,
                'type' => 'error',
                'message' => 'This clinic workspace has been suspended by platform administration.',
                'action_url' => null,
                'action_label' => null,
            ];
        } elseif ($subStatus === Tenant::SUBSCRIPTION_PAST_DUE) {
            $graceDays = (int) PlatformSetting::get('billing.past_due_grace_days', 14);
            $failedAt = $tenant->payment_failed_at ?: $tenant->updated_at;
            $daysLeft = max(0, $graceDays - ($failedAt ? $failedAt->diffInDays(now()) : 0));

            $banner = [
                'show' => true,
                'type' => 'warning',
                'message' => "Your subscription payment is overdue. Please update your payment method within {$daysLeft} day(s) to avoid write restriction.",
                'action_url' => '/app/billing',
                'action_label' => 'Update Payment Method',
            ];
        } elseif ($subStatus === Tenant::SUBSCRIPTION_CANCELED || ($tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION)?->canceled() && ! $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION)?->onGracePeriod())) {
            $banner = [
                'show' => true,
                'type' => 'error',
                'message' => 'Clinic workspace is locked following subscription cancellation. All clinic records will be permanently removed in 30 days unless reactivated.',
                'action_url' => '/app/billing',
                'action_label' => 'Reactivate Plan',
            ];
        } elseif (in_array($subStatus, [Tenant::SUBSCRIPTION_RESTRICTED_OVERDUE], true) || $tenant->status === Tenant::STATUS_SUSPENDED) {
            $banner = [
                'show' => true,
                'type' => 'error',
                'message' => 'Clinic write access is restricted due to payment status. Existing records can still be viewed and exported.',
                'action_url' => '/app/billing',
                'action_label' => 'Update Payment Method',
            ];
        }

        // Feature lock mapping
        $featuresMap = [];
        $lockedFeatures = [];
        $features = Feature::where('is_implemented', true)->get();

        foreach ($features as $f) {
            $enabled = $this->isFeatureEnabled($tenant, $f->key);
            $featuresMap[$f->key] = $enabled;
            if (! $enabled) {
                $lockedFeatures[$f->key] = match ($f->key) {
                    'advanced_roles', 'advanced_analytics', 'enhanced_website', 'priority_onboarding', 'data_migration' => 'Signature',
                    default => 'Professional or Signature',
                };
            }
        }

        // Scribe allowance
        $scribeInfo = $this->checkScribeAllowance($tenant, $membership);

        return [
            'is_legacy' => $isLegacy,
            'can_write' => $canWrite['allowed'],
            'write_block_reason' => $canWrite['reason'],
            'write_block_code' => $canWrite['code'],
            'banner' => $banner,
            'subscription_state' => [
                'status' => $tenant->subscription_status,
                'payment_failed_at' => $tenant->payment_failed_at?->toIso8601String(),
                'is_manually_suspended' => (bool) $tenant->is_manually_suspended,
            ],
            'plan' => [
                'name' => $isLegacy ? ($tenant->planName() ?: 'Legacy Plan') : ($tenant->plan?->name ?? 'Standard'),
                'slug' => $isLegacy ? ($tenant->plan_tier ?? 'legacy') : ($tenant->plan?->slug ?? 'standard'),
                'badge' => $tenant->plan?->badge,
            ],
            'limits' => [
                'appointments' => [
                    'current' => $this->countMonthlyAppointments($tenant),
                    'limit' => $isLegacy ? $tenant->maxMonthlyAppointments() : $tenant->plan?->appointment_limit_monthly,
                    'behavior' => $tenant->plan?->appointment_limit_behavior ?: 'warn',
                ],
                'practitioners' => [
                    'current' => $this->countPractitionerSeats($tenant),
                    'included' => $isLegacy ? 1 : ($tenant->plan?->included_practitioners ?? 1),
                    'max' => $isLegacy ? $tenant->maxPractitioners() : $tenant->plan?->max_practitioners,
                    'allows_extra' => $isLegacy ? (! $tenant->isBalancePlan()) : (bool) $tenant->plan?->allows_extra_practitioners,
                ],
                'locations' => [
                    'current' => Location::withoutGlobalScopes()->where('tenant_id', $tenant->id)->where('is_active', true)->count(),
                    'limit' => $isLegacy ? null : $tenant->plan?->location_limit,
                ],
                'rooms' => [
                    'current' => Room::withoutGlobalScopes()->where('tenant_id', $tenant->id)->where('is_active', true)->count(),
                    'limit' => ($isLegacy || $this->isFeatureEnabled($tenant, 'rooms_resources')) ? null : 1,
                ],
                'scribe' => [
                    'used_minutes' => $scribeInfo['used_minutes'],
                    'allowance_minutes' => $scribeInfo['allowance_minutes'],
                    'remaining_minutes' => $scribeInfo['remaining_minutes'],
                    'unlimited' => $scribeInfo['unlimited'],
                    'behavior' => $scribeInfo['behavior'],
                ],
            ],
            'features' => $featuresMap,
            'locked_features' => $lockedFeatures,
        ];
    }

    /**
     * Requirement 9: Logging blocked actions for admin debugging.
     */
    public function recordBlockedAction(
        Tenant $tenant,
        mixed $arg2 = null,
        mixed $arg3 = null,
        mixed $arg4 = null,
        array $arg5 = []
    ): void {
        $user = null;
        $checkType = '';
        $reason = '';
        $meta = [];

        if ($arg2 instanceof User || ($arg2 === null && is_string($arg3))) {
            // Style: ($tenant, $user, $checkType, $reason, $context)
            $user = $arg2 ?? auth()->user();
            $checkType = (string) $arg3;
            $reason = is_string($arg4) ? $arg4 : '';
            $meta = is_array($arg4) ? $arg4 : $arg5;
        } else {
            // Style: ($tenant, $checkType, $reasonOrContext, $context)
            $user = auth()->user();
            $checkType = (string) $arg2;
            if (is_array($arg3)) {
                $meta = $arg3;
                $reason = (string) ($meta['reason'] ?? $checkType);
            } else {
                $reason = is_string($arg3) ? $arg3 : '';
                $meta = is_array($arg4) ? $arg4 : [];
            }
        }

        Log::warning("[PlanEntitlement Blocked] Tenant: {$tenant->id} ({$tenant->slug}), Check: {$checkType}, Reason: {$reason}", $meta);

        try {
            AuditEvent::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user?->id,
                'action' => 'entitlement.blocked',
                'resource_type' => 'App\\Models\\Plan',
                'resource_id' => $tenant->plan_id,
                'reason' => $reason ?: $checkType,
                'metadata' => array_merge([
                    'check_type' => $checkType,
                    'tenant_slug' => $tenant->slug,
                    'plan_id' => $tenant->plan_id,
                    'subscription_status' => $tenant->subscription_status,
                ], $meta),
                'ip_address' => request()->ip(),
            ]);
        } catch (\Throwable $e) {
            // Do not break execution if audit event insert fails
        }
    }

    private function getExtraSeatPrice(Tenant $tenant): float
    {
        $price = $tenant->planPrice;
        if ($price && (float) $price->extra_practitioner_price > 0) {
            return (float) $price->extra_practitioner_price;
        }

        $activePrice = $tenant->plan?->activePrices()->where('interval', $tenant->billing_interval ?: 'month')->first();

        return (float) ($activePrice?->extra_practitioner_price ?? 35.0);
    }
}
