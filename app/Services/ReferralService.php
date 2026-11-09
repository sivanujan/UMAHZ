<?php

namespace App\Services;

use App\Billing\PlatformBilling;
use App\Models\AuditEvent;
use App\Models\Plan;
use App\Models\PlatformSetting;
use App\Models\Referral;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class ReferralService
{
    public function __construct(private readonly PlatformBilling $billing)
    {
    }

    public function isEnabled(): bool
    {
        return (bool) PlatformSetting::get('referrals.enabled', true);
    }

    public function getNewClinicDiscountPercent(): int
    {
        return (int) PlatformSetting::get('referrals.new_clinic_discount_percent', 50);
    }

    public function getReferrerRewardMode(): string
    {
        $mode = (string) PlatformSetting::get('referrals.referrer_reward_mode', 'fixed');
        return in_array($mode, ['fixed', 'plan_price'], true) ? $mode : 'fixed';
    }

    public function getReferrerFixedAmount(): float
    {
        return (float) PlatformSetting::get('referrals.referrer_fixed_amount', 35.00);
    }

    public function findReferrerByCode(?string $code): ?Tenant
    {
        if (empty($code)) {
            return null;
        }

        $clean = strtoupper(trim($code));

        return Tenant::whereRaw('UPPER(referral_code) = ?', [$clean])->first();
    }

    public function isSelfReferral(Tenant|string $referrer, Tenant|string $candidate): bool
    {
        $referrerId = $referrer instanceof Tenant ? $referrer->id : $referrer;
        $candidateId = $candidate instanceof Tenant ? $candidate->id : $candidate;

        return ! empty($referrerId) && $referrerId === $candidateId;
    }

    /**
     * Create (or return existing) Stripe discount coupon for new clinic referral checkout.
     * Monthly: 50% off first invoice (duration = once).
     * Annual: One-time fixed amount equal to 50% of ONE month's base price.
     */
    public function createReferralDiscountCoupon(Plan $plan, string $interval = 'month'): ?string
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $percent = $this->getNewClinicDiscountPercent();
        if ($percent <= 0) {
            return null;
        }

        // Test/local fallback
        if (app()->environment('local', 'testing') && (empty(config('cashier.secret')) || str_contains((string) config('cashier.secret'), 'placeholder'))) {
            return 'coupon_test_ref_' . substr(md5("{$plan->id}_{$interval}_{$percent}"), 0, 10);
        }

        try {
            if ($interval === 'month') {
                $couponId = "ref_welcome_pct_{$percent}_once";
                try {
                    $existing = Cashier::stripe()->coupons->retrieve($couponId);
                    if ($existing && $existing->valid) {
                        return $existing->id;
                    }
                } catch (\Throwable) {
                    // Create below
                }

                $created = Cashier::stripe()->coupons->create([
                    'id' => $couponId,
                    'name' => "Referral Welcome ({$percent}% off first month)",
                    'percent_off' => $percent,
                    'duration' => 'once',
                    'metadata' => [
                        'platform' => 'umahz',
                        'type' => 'referral_welcome',
                    ],
                ]);

                return $created->id;
            } else {
                // Annual: fixed CAD amount equal to 50% of ONE month's base price
                $monthlyBase = (float) ($plan->monthlyPrice?->base_price ?? 35.0);
                $discountDollars = round(($monthlyBase * ($percent / 100)), 2);
                $amountOffCents = (int) round($discountDollars * 100);

                $couponId = "ref_welcome_fixed_{$amountOffCents}_once";
                try {
                    $existing = Cashier::stripe()->coupons->retrieve($couponId);
                    if ($existing && $existing->valid) {
                        return $existing->id;
                    }
                } catch (\Throwable) {
                    // Create below
                }

                $created = Cashier::stripe()->coupons->create([
                    'id' => $couponId,
                    'name' => "Referral Welcome (\${$discountDollars} CAD off first month)",
                    'amount_off' => $amountOffCents,
                    'currency' => 'cad',
                    'duration' => 'once',
                    'metadata' => [
                        'platform' => 'umahz',
                        'type' => 'referral_welcome_annual',
                    ],
                ]);

                return $created->id;
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to create Stripe referral coupon: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Record a pending referral for a newly registered tenant.
     */
    public function recordSignupReferral(Tenant $newTenant, ?string $referralCode): ?Referral
    {
        if (! $this->isEnabled() || empty($referralCode)) {
            return null;
        }

        $referrer = $this->findReferrerByCode($referralCode);
        if (! $referrer || $this->isSelfReferral($referrer, $newTenant)) {
            return null;
        }

        // Avoid duplicate referral for the same tenant
        $existing = Referral::where('referred_tenant_id', $newTenant->id)->first();
        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($referrer, $newTenant, $referralCode) {
            $newTenant->update(['referred_by_tenant_id' => $referrer->id]);

            $referral = Referral::create([
                'referrer_tenant_id' => $referrer->id,
                'referred_tenant_id' => $newTenant->id,
                'referral_code' => strtoupper(trim($referralCode)),
                'status' => Referral::STATUS_PENDING,
                'reward_mode' => $this->getReferrerRewardMode(),
            ]);

            AuditEvent::create([
                'tenant_id' => $newTenant->id,
                'action' => 'referral.created',
                'resource_type' => Referral::class,
                'resource_id' => $referral->id,
                'metadata' => [
                    'referrer_id' => $referrer->id,
                    'referrer_name' => $referrer->name,
                    'referral_code' => $referral->referral_code,
                ],
            ]);

            return $referral;
        });
    }

    /**
     * Qualify referral and grant reward credit to referring clinic.
     * Fully idempotent — duplicate invocations will not grant double credit.
     */
    public function qualifyAndRewardReferral(Tenant $referredTenant, ?string $invoiceId = null): ?Referral
    {
        return DB::transaction(function () use ($referredTenant, $invoiceId) {
            /** @var Referral|null $referral */
            $referral = Referral::where('referred_tenant_id', $referredTenant->id)
                ->lockForUpdate()
                ->first();

            if (! $referral) {
                return null;
            }

            // Already rewarded or cancelled -> idempotent early exit
            if (in_array($referral->status, [Referral::STATUS_REWARDED, Referral::STATUS_CANCELLED], true)) {
                return $referral;
            }

            $referrer = $referral->referrer;
            if (! $referrer) {
                $referral->update(['status' => Referral::STATUS_CANCELLED, 'cancellation_reason' => 'Referrer clinic not found']);
                return $referral;
            }

            // Calculate reward amount
            $mode = $referral->reward_mode ?: $this->getReferrerRewardMode();
            if ($mode === 'plan_price') {
                $amount = (float) ($referrer->planPrice?->base_price ?? $referrer->plan?->monthlyPrice?->base_price ?? 35.00);
            } else {
                $amount = $this->getReferrerFixedAmount();
            }

            $balanceTxnId = null;

            // Apply Stripe customer balance credit if referrer is set up and not a demo subscription
            if ($this->canCreditStripeCustomer($referrer)) {
                try {
                    $amountCents = (int) round($amount * 100);
                    // In Stripe, negative customer balance represents a CREDIT towards future invoices
                    $txn = Cashier::stripe()->customers->createBalanceTransaction($referrer->stripe_id, [
                        'amount' => -$amountCents,
                        'currency' => 'cad',
                        'description' => "UMAHZ Referral Reward: {$referredTenant->name} first invoice paid",
                        'metadata' => [
                            'referral_id' => $referral->id,
                            'referred_tenant_id' => $referredTenant->id,
                            'platform' => 'umahz',
                        ],
                    ]);
                    $balanceTxnId = $txn->id;
                } catch (\Throwable $e) {
                    Log::error("Failed to grant Stripe referral credit to customer {$referrer->stripe_id}: {$e->getMessage()}", [
                        'exception' => $e,
                        'referral_id' => $referral->id,
                    ]);
                }
            } elseif ($this->isDemoSubscription($referrer)) {
                $balanceTxnId = 'txn_demo_' . substr(md5(uniqid()), 0, 12);
            }

            $referral->update([
                'status' => Referral::STATUS_REWARDED,
                'reward_mode' => $mode,
                'reward_amount' => $amount,
                'stripe_balance_txn_id' => $balanceTxnId,
                'rewarded_at' => now(),
            ]);

            AuditEvent::create([
                'tenant_id' => $referrer->id,
                'action' => 'referral.rewarded',
                'resource_type' => Referral::class,
                'resource_id' => $referral->id,
                'metadata' => [
                    'referred_tenant_id' => $referredTenant->id,
                    'referred_tenant_name' => $referredTenant->name,
                    'reward_amount' => $amount,
                    'reward_mode' => $mode,
                    'stripe_invoice_id' => $invoiceId,
                    'stripe_balance_txn_id' => $balanceTxnId,
                ],
            ]);

            return $referral;
        });
    }

    /**
     * Cancel a referral (e.g. by platform admin or fraud detection).
     */
    public function cancelReferral(Referral $referral, string $reason = 'Cancelled by administrator'): void
    {
        $referral->update([
            'status' => Referral::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);

        AuditEvent::create([
            'tenant_id' => $referral->referrer_tenant_id,
            'action' => 'referral.cancelled',
            'resource_type' => Referral::class,
            'resource_id' => $referral->id,
            'metadata' => [
                'reason' => $reason,
            ],
        ]);
    }

    public function isDemoSubscription(?Tenant $tenant): bool
    {
        if (! $tenant) {
            return false;
        }

        $sub = $tenant->subscription(Tenant::PLATFORM_SUBSCRIPTION);
        $subId = (string) ($sub?->stripe_id ?? '');
        $cusId = (string) ($tenant->stripe_id ?? '');

        return str_starts_with($subId, 'sub_demo_')
            || str_starts_with($subId, 'demo_')
            || str_starts_with($cusId, 'cus_demo_')
            || str_starts_with($cusId, 'cus_fake_')
            || str_starts_with($cusId, 'cus_mock_')
            || str_starts_with($cusId, 'demo_');
    }

    private function canCreditStripeCustomer(Tenant $tenant): bool
    {
        if (empty($tenant->stripe_id)) {
            return false;
        }

        if ($this->isDemoSubscription($tenant)) {
            return false;
        }

        if (empty(config('cashier.secret')) || str_contains((string) config('cashier.secret'), 'placeholder')) {
            return false;
        }

        return true;
    }
}

