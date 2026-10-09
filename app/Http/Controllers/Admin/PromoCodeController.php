<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Plan;
use App\Models\PromoCode;
use App\Services\StripeSubscriptionSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PromoCodeController extends Controller
{
    public function __construct(private readonly StripeSubscriptionSyncService $syncService)
    {
    }

    public function index(Request $request): Response
    {
        $promoCodes = PromoCode::with('plans')
            ->withCount('tenants')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PromoCode $promo) => [
                'id' => $promo->id,
                'code' => $promo->code,
                'stripe_coupon_id' => $promo->stripe_coupon_id,
                'stripe_promo_code_id' => $promo->stripe_promo_code_id,
                'discount_type' => $promo->discount_type,
                'discount_value' => (float) $promo->discount_value,
                'duration' => $promo->duration,
                'duration_in_months' => $promo->duration_in_months,
                'max_redemptions' => $promo->max_redemptions,
                'times_redeemed' => $promo->times_redeemed,
                'tenant_count' => $promo->tenants_count,
                'expires_at' => $promo->expires_at?->toIso8601String(),
                'is_active' => (bool) $promo->is_active,
                'is_expired' => $promo->expires_at ? $promo->expires_at->isPast() : false,
                'applicable_plans' => $promo->plans->map(fn ($p) => ['id' => $p->id, 'name' => $p->name]),
            ]);

        $plans = Plan::where('is_active', true)->orderBy('display_order')->get(['id', 'name']);

        return Inertia::render('Admin/PromoCodes/Index', [
            'promoCodes' => $promoCodes,
            'plans' => $plans,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_num', 'unique:promo_codes,code'],
            'discount_type' => ['required', 'string', 'in:percent,fixed_amount'],
            'discount_value' => ['required', 'numeric', 'min:0.01'],
            'duration' => ['required', 'string', 'in:once,repeating,forever'],
            'duration_in_months' => ['nullable', 'required_if:duration,repeating', 'integer', 'min:1', 'max:24'],
            'max_redemptions' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'plan_ids' => ['nullable', 'array'],
            'plan_ids.*' => ['string', 'exists:plans,id'],
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        $promoCode = PromoCode::create([
            'code' => $validated['code'],
            'discount_type' => $validated['discount_type'],
            'discount_value' => $validated['discount_value'],
            'duration' => $validated['duration'],
            'duration_in_months' => $validated['duration'] === 'repeating' ? ($validated['duration_in_months'] ?? null) : null,
            'max_redemptions' => $validated['max_redemptions'] ?? null,
            'expires_at' => $validated['expires_at'] ?? null,
            'is_active' => true,
        ]);

        if (! empty($validated['plan_ids'])) {
            $promoCode->plans()->sync($validated['plan_ids']);
        }

        try {
            $this->syncService->syncPromoCode($promoCode);
        } catch (\Throwable $e) {
            report($e);
        }

        AuditEvent::create([
            'user_id' => $request->user()?->id,
            'action' => 'promo_code.created',
            'resource_type' => PromoCode::class,
            'resource_id' => $promoCode->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'code' => $promoCode->code,
                'discount' => "{$promoCode->discount_value} ({$promoCode->discount_type})",
                'duration' => $promoCode->duration,
            ],
        ]);

        return back()->with('success', "Promo code {$promoCode->code} created successfully.");
    }

    public function deactivate(Request $request, PromoCode $promoCode): RedirectResponse
    {
        $promoCode->update(['is_active' => false]);

        try {
            $this->syncService->syncPromoCode($promoCode);
        } catch (\Throwable $e) {
            report($e);
        }

        AuditEvent::create([
            'user_id' => $request->user()?->id,
            'action' => 'promo_code.deactivated',
            'resource_type' => PromoCode::class,
            'resource_id' => $promoCode->id,
            'ip_address' => $request->ip(),
            'metadata' => ['code' => $promoCode->code],
        ]);

        return back()->with('success', "Promo code {$promoCode->code} deactivated.");
    }

    public function redemptions(PromoCode $promoCode): Response
    {
        $redemptions = $promoCode->tenants()
            ->with(['plan'])
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'subdomain' => $t->subdomain,
                'status' => $t->status,
                'subscription_status' => $t->subscription_status,
                'plan_name' => $t->plan?->name ?? 'Custom',
                'billing_interval' => $t->billing_interval,
                'joined_at' => $t->created_at?->format('M j, Y'),
            ]);

        return Inertia::render('Admin/PromoCodes/Redemptions', [
            'promoCode' => [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'discount_type' => $promoCode->discount_type,
                'discount_value' => (float) $promoCode->discount_value,
                'duration' => $promoCode->duration,
                'duration_in_months' => $promoCode->duration_in_months,
                'times_redeemed' => $promoCode->times_redeemed,
            ],
            'redemptions' => $redemptions,
        ]);
    }
}
