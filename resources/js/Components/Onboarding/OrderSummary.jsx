import React from 'react';
import {
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

/**
 * Format promo code discount description (e.g. "FOUNDING20 (−20% for 12 months)")
 */
function formatPromoLabel(appliedPromo) {
    if (!appliedPromo?.promo) return 'Promo discount';
    const p = appliedPromo.promo;
    const discountStr = p.discount_type === 'percentage'
        ? `−${Math.round(p.discount_value)}%`
        : `−$${Number(p.discount_value).toFixed(2)}`;

    let durationStr = '';
    if (p.duration === 'repeating' && p.duration_in_months) {
        durationStr = ` for ${p.duration_in_months} months`;
    } else if (p.duration === 'once') {
        durationStr = ' (1st cycle)';
    }

    return `${p.code} (${discountStr}${durationStr})`;
}

/**
 * Shared high-contrast Order Summary panel for Onboarding Plan and Payment steps.
 */
export default function OrderSummary({
    planName = 'Essential',
    billingInterval = 'month',
    basePrice = 0,
    extraSeats = 0,
    extraCost = 0,
    showExtraSeatPrice = true,
    trialDays = 0,
    subtotal = 0,
    totalDue = 0,
    showPromoInput = false,
    promoInput = '',
    onPromoInputChange,
    onApplyPromo,
    onRemovePromo,
    validatingPromo = false,
    promoError = null,
    appliedPromo = null,
    className = '',
}) {
    const isAnnual = billingInterval === 'year';
    const discountAmount = appliedPromo?.breakdown?.discount_amount || 0;
    const formattedPlanName = planName ? (planName.charAt(0).toUpperCase() + planName.slice(1)) : 'Essential';
    const cleanPlanName = formattedPlanName.toLowerCase().endsWith('plan') ? formattedPlanName : `${formattedPlanName} plan`;

    // Standard recurring amount after discounts/promos expire
    const recurringAmount = appliedPromo?.promo?.duration === 'forever' ? totalDue : subtotal;

    return (
        <div
            className={`rounded-2xl border border-slate-800 bg-[#0D1B2A] dark:bg-slate-900 text-white p-5 sm:p-6 space-y-4 shadow-xl shadow-slate-950/20 ${className}`}
        >
            {/* 1. Header: Single line with Pill (no wrapping) */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white tracking-wide whitespace-nowrap">
                    Order summary
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 whitespace-nowrap">
                    {isAnnual ? 'Annual' : 'Monthly'}
                </span>
            </div>

            {/* 2. Line Items */}
            <div className="space-y-2.5 text-xs">
                {/* Base Plan Line */}
                <div className="flex items-baseline justify-between gap-3 text-slate-200">
                    <span className="font-medium text-slate-200">
                        {cleanPlanName} — {isAnnual ? 'Annual' : 'Monthly'}
                    </span>
                    <span className="font-semibold text-white tabular-nums shrink-0 text-right">
                        ${Number(basePrice).toFixed(2)}
                    </span>
                </div>

                {/* Extra Practitioners Line (only when applicable) */}
                {extraSeats > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-slate-300">
                            <span>
                                +{extraSeats} Additional {extraSeats === 1 ? 'practitioner' : 'practitioners'}
                            </span>
                            {showExtraSeatPrice ? (
                                <span className="font-semibold text-white tabular-nums shrink-0 text-right">
                                    +${Number(extraCost).toFixed(2)}
                                </span>
                            ) : (
                                <span className="text-[11px] font-semibold text-amber-400 shrink-0 text-right">
                                    Pending review
                                </span>
                            )}
                        </div>
                        {!showExtraSeatPrice && (
                            <p className="text-[10.5px] text-amber-300/90 leading-tight">
                                Additional practitioner pricing will be confirmed before you're charged
                            </p>
                        )}
                    </div>
                )}

                {/* Promo Discount Line (only when applied) */}
                {appliedPromo && discountAmount > 0 && (
                    <div className="flex items-baseline justify-between gap-3 text-emerald-300 font-medium">
                        <span>{formatPromoLabel(appliedPromo)}</span>
                        <span className="font-semibold text-emerald-300 tabular-nums shrink-0 text-right">
                            −${Number(discountAmount).toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {/* 3. Promo Code Input & Status */}
            {showPromoInput && (
                <div className="pt-1">
                    {!appliedPromo ? (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={promoInput}
                                    onChange={(e) => onPromoInputChange && onPromoInputChange(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!validatingPromo && promoInput.trim() && onApplyPromo) {
                                                onApplyPromo(e);
                                            }
                                        }
                                    }}
                                    placeholder="Promo code"
                                    aria-label="Promo code"
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-400 uppercase tracking-wider outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!validatingPromo && promoInput.trim() && onApplyPromo) {
                                            onApplyPromo(e);
                                        }
                                    }}
                                    disabled={validatingPromo || !promoInput.trim()}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shrink-0 cursor-pointer shadow-sm disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {validatingPromo ? 'Applying...' : 'Apply'}
                                </button>
                            </div>
                            {promoError && (
                                <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 pt-0.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                                    <span>{promoError}</span>
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            <div className="flex items-center gap-2 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Code <strong>{appliedPromo.promo?.code || promoInput}</strong> applied</span>
                            </div>
                            {onRemovePromo && (
                                <button
                                    type="button"
                                    onClick={onRemovePromo}
                                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-2"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 4. Divider */}
            <div className="border-t border-slate-800" />

            {/* 5. Two Clear Rows (Due today & First charge after approval) */}
            <div className="space-y-3">
                {/* Row 1: Due Today */}
                <div className="flex items-baseline justify-between gap-3 text-xs text-slate-300">
                    <span className="font-medium text-slate-300">Due today</span>
                    <span className="font-semibold text-slate-100 tabular-nums text-right">
                        $0.00 <span className="text-[11px] text-slate-400 font-normal">CAD</span>
                    </span>
                </div>

                {/* Row 2: First charge after approval */}
                <div>
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-bold text-white">
                            First charge after approval
                        </span>
                        <span className="text-lg font-bold text-white tabular-nums tracking-tight whitespace-nowrap text-right">
                            ${Number(totalDue).toFixed(2)}{' '}
                            <span className="text-xs font-semibold text-slate-300">CAD</span>
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                        Then ${Number(recurringAmount).toFixed(2)} CAD every {isAnnual ? 'year' : 'month'}
                        {trialDays > 0 ? ` (after ${trialDays}-day trial)` : ''}
                    </p>
                </div>
            </div>

            {/* 6. Short Reassuring Notice (1 icon, 2 lines max) */}
            <div className="rounded-xl p-3 bg-slate-800/40 border border-slate-700/60 text-slate-300 text-xs leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-slate-300 leading-snug">
                    You won't be charged today. We'll only charge your card if your clinic is approved.
                </p>
            </div>
        </div>
    );
}
