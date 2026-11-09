<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PlatformSetting;
use App\Models\Referral;
use App\Services\ReferralService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReferralController extends Controller
{
    public function __construct(private readonly ReferralService $referralService)
    {
    }

    /**
     * Display all referrals with filters and platform referral settings.
     */
    public function index(Request $request): Response
    {
        $statusFilter = $request->query('status', 'all');

        $query = Referral::with(['referrer', 'referred'])
            ->orderByDesc('created_at');

        if ($statusFilter !== 'all' && in_array($statusFilter, [
            Referral::STATUS_PENDING,
            Referral::STATUS_QUALIFIED,
            Referral::STATUS_REWARDED,
            Referral::STATUS_CANCELLED,
        ], true)) {
            $query->where('status', $statusFilter);
        }

        $referrals = $query->paginate(25)->through(fn (Referral $r) => [
            'id' => $r->id,
            'referral_code' => $r->referral_code,
            'status' => $r->status,
            'status_label' => match ($r->status) {
                Referral::STATUS_PENDING => 'Pending First Invoice',
                Referral::STATUS_QUALIFIED => 'Qualified (Processing)',
                Referral::STATUS_REWARDED => 'Rewarded',
                Referral::STATUS_CANCELLED => 'Cancelled',
                default => ucfirst($r->status),
            },
            'referrer' => $r->referrer ? [
                'id' => $r->referrer->id,
                'name' => $r->referrer->name,
                'subdomain' => $r->referrer->subdomain,
            ] : null,
            'referred' => $r->referred ? [
                'id' => $r->referred->id,
                'name' => $r->referred->name,
                'subdomain' => $r->referred->subdomain,
            ] : null,
            'reward_mode' => $r->reward_mode,
            'reward_amount' => $r->reward_amount ? (float) $r->reward_amount : null,
            'reward_amount_formatted' => $r->reward_amount ? '$' . number_format($r->reward_amount, 2) . ' CAD' : null,
            'stripe_balance_txn_id' => $r->stripe_balance_txn_id,
            'cancellation_reason' => $r->cancellation_reason,
            'created_at' => $r->created_at?->format('M j, Y H:i'),
            'rewarded_at' => $r->rewarded_at?->format('M j, Y H:i'),
            'cancelled_at' => $r->cancelled_at?->format('M j, Y H:i'),
        ]);

        $stats = [
            'total' => Referral::count(),
            'pending' => Referral::where('status', Referral::STATUS_PENDING)->count(),
            'qualified' => Referral::where('status', Referral::STATUS_QUALIFIED)->count(),
            'rewarded' => Referral::where('status', Referral::STATUS_REWARDED)->count(),
            'cancelled' => Referral::where('status', Referral::STATUS_CANCELLED)->count(),
            'total_rewarded_cad' => '$' . number_format((float) Referral::where('status', Referral::STATUS_REWARDED)->sum('reward_amount'), 2) . ' CAD',
        ];

        $settings = [
            'enabled' => $this->referralService->isEnabled(),
            'new_clinic_discount_percent' => $this->referralService->getNewClinicDiscountPercent(),
            'referrer_reward_mode' => $this->referralService->getReferrerRewardMode(),
            'referrer_fixed_amount' => $this->referralService->getReferrerFixedAmount(),
        ];

        return Inertia::render('Admin/Referrals/Index', [
            'referrals' => $referrals,
            'stats' => $stats,
            'settings' => $settings,
            'filters' => [
                'status' => $statusFilter,
            ],
        ]);
    }

    /**
     * Manually mark a referral qualified and grant reward credit to referrer.
     */
    public function reward(Request $request, Referral $referral): RedirectResponse
    {
        if (! $referral->referred) {
            return back()->with('error', 'Referred clinic record not found.');
        }

        if ($referral->status === Referral::STATUS_REWARDED) {
            return back()->with('info', 'This referral has already been rewarded.');
        }

        $rewarded = $this->referralService->qualifyAndRewardReferral($referral->referred, 'admin_manual_' . $request->user()->id);

        if ($rewarded && $rewarded->status === Referral::STATUS_REWARDED) {
            AuditEvent::create([
                'user_id' => $request->user()->id,
                'tenant_id' => $referral->referrer_tenant_id,
                'action' => 'referral.admin_manual_reward',
                'resource_type' => Referral::class,
                'resource_id' => $referral->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'admin_id' => $request->user()->id,
                    'reward_amount' => $rewarded->reward_amount,
                ],
            ]);

            return back()->with('success', 'Referral reward credit granted successfully.');
        }

        return back()->with('error', 'Failed to grant referral reward.');
    }

    /**
     * Cancel a referral with a recorded reason.
     */
    public function cancel(Request $request, Referral $referral): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $reason = $validated['reason'] ?? 'Cancelled by platform admin';

        $this->referralService->cancelReferral($referral, $reason);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'tenant_id' => $referral->referrer_tenant_id,
            'action' => 'referral.admin_cancelled',
            'resource_type' => Referral::class,
            'resource_id' => $referral->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'admin_id' => $request->user()->id,
                'reason' => $reason,
            ],
        ]);

        return back()->with('success', 'Referral has been cancelled.');
    }

    /**
     * Update global referral program configuration settings.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'new_clinic_discount_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'referrer_reward_mode' => ['required', 'string', 'in:fixed,plan_price'],
            'referrer_fixed_amount' => ['required', 'numeric', 'min:0', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $request) {
            PlatformSetting::set('referrals.enabled', $validated['enabled'], 'billing');
            PlatformSetting::set('referrals.new_clinic_discount_percent', $validated['new_clinic_discount_percent'], 'billing');
            PlatformSetting::set('referrals.referrer_reward_mode', $validated['referrer_reward_mode'], 'billing');
            PlatformSetting::set('referrals.referrer_fixed_amount', (float) $validated['referrer_fixed_amount'], 'billing');

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'action' => 'platform_settings.referrals_updated',
                'resource_type' => PlatformSetting::class,
                'resource_id' => 'referrals',
                'ip_address' => $request->ip(),
                'metadata' => $validated,
            ]);
        });

        PlatformSetting::clearCache();

        return back()->with('success', 'Referral program settings saved successfully.');
    }
}

