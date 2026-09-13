import React from 'react';
import { Check, Sparkles, Zap, Shield, Users, Plus, Minus, Info, CheckCircle2 } from 'lucide-react';

const BLUE = '#2563EB';
const FONT_MANROPE = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const TIERS = {
    balance: {
        id: 'balance',
        name: 'Balance',
        tagline: 'For solo practitioners starting out',
        basePrice: 54,
        includedFt: 1,
        maxPractitioners: 1,
        maxAppointments: 20,
        extraFtPrice: 0,
        extraPtPrice: 0,
        badge: 'Solo',
        badgeIcon: Shield,
        badgeColor: {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200/90',
            icon: 'text-slate-500',
        },
        features: [
            '1 practitioner seat (capped)',
            'Up to 20 appointments / month',
            'Online booking & client calendar',
            'SOAP charting & intake forms',
            'Patient billing & invoicing',
        ],
        extraPricingNote: 'Solo practitioner only (no add-on seats)',
    },
    practice: {
        id: 'practice',
        name: 'Practice',
        tagline: 'For growing multi-practitioner clinics',
        basePrice: 79,
        includedFt: 1,
        maxPractitioners: null,
        maxAppointments: null,
        extraFtPrice: 35.0,
        extraPtPrice: 17.5,
        badge: 'Clinic',
        badgeIcon: Sparkles,
        badgeColor: {
            bg: 'bg-blue-50',
            text: 'text-[#2563EB]',
            border: 'border-blue-200/80',
            icon: 'text-[#2563EB]',
        },
        isPopular: true,
        features: [
            'Includes 1 full-time practitioner',
            'Unlimited appointments & clients',
            'Custom disciplines & intake forms',
            'Multi-practitioner room scheduling',
            'Unified client records & consent audit',
        ],
        extraPricingNote: 'Extra seats: +$35/mo FT · +$17.50/mo PT',
    },
    thrive: {
        id: 'thrive',
        name: 'Thrive',
        tagline: 'For high-volume practices & clinics',
        basePrice: 99,
        includedFt: 1,
        maxPractitioners: null,
        maxAppointments: null,
        extraFtPrice: 40.0,
        extraPtPrice: 20.0,
        badge: 'Full',
        badgeIcon: Zap,
        badgeColor: {
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200/80',
            icon: 'text-purple-600',
        },
        features: [
            'Includes 1 full-time practitioner',
            'Unlimited appointments & clients',
            'Priority clinical support & analytics',
            'Custom clinic branding & templates',
            'Advanced reporting & financial export',
        ],
        extraPricingNote: 'Extra seats: +$40/mo FT · +$20/mo PT',
    },
};

export function normalizeTiers(rawTiers = {}) {
    const result = { ...TIERS };
    if (!rawTiers || typeof rawTiers !== 'object') return result;

    Object.entries(rawTiers).forEach(([key, val]) => {
        if (!val) return;
        const defaultTier = TIERS[key] || TIERS.practice;

        // Clean feature list: separate benefit bullets from add-on seat pricing
        const rawFeatures = Array.isArray(val.features) ? val.features : defaultTier.features;
        const benefitFeatures = rawFeatures.filter(
            (f) => typeof f === 'string' && !f.trim().startsWith('+$') && !f.toLowerCase().includes('per extra')
        );

        const extraFtPrice = val.addon_price_ft !== undefined ? parseFloat(val.addon_price_ft) : (val.extraFtPrice || defaultTier.extraFtPrice);
        const extraPtPrice = val.addon_price_pt !== undefined ? parseFloat(val.addon_price_pt) : (val.extraPtPrice || defaultTier.extraPtPrice);

        let extraPricingNote = defaultTier.extraPricingNote;
        if (key === 'balance') {
            extraPricingNote = 'Solo practitioner only (no add-on seats)';
        } else if (extraFtPrice || extraPtPrice) {
            extraPricingNote = `Extra seats: +$${extraFtPrice.toFixed(2)}/mo FT · +$${extraPtPrice.toFixed(2)}/mo PT`;
        }

        result[key] = {
            id: key,
            name: val.name || defaultTier.name,
            tagline: val.tagline !== undefined ? val.tagline : defaultTier.tagline,
            basePrice: val.base_price !== undefined ? parseFloat(val.base_price) : (val.basePrice || defaultTier.basePrice),
            includedFt: val.included_full_time !== undefined ? parseInt(val.included_full_time, 10) : (val.includedFt || defaultTier.includedFt),
            maxPractitioners: val.max_practitioners !== undefined ? val.max_practitioners : defaultTier.maxPractitioners,
            maxAppointments: val.max_appointments_per_month !== undefined ? val.max_appointments_per_month : defaultTier.maxAppointments,
            extraFtPrice,
            extraPtPrice,
            badge: key === 'balance' ? 'Solo' : key === 'practice' ? 'Clinic' : 'Full',
            badgeIcon: defaultTier.badgeIcon || Sparkles,
            badgeColor: defaultTier.badgeColor,
            isPopular: key === 'practice',
            features: benefitFeatures.length > 0 ? benefitFeatures : defaultTier.features,
            extraPricingNote,
        };
    });

    return result;
}

export function calculateMonthlyTotal(tierId, fullTimeCount = 1, partTimeCount = 0, customTiers = null) {
    const tiers = customTiers ? normalizeTiers(customTiers) : TIERS;
    const tier = tiers[tierId] || tiers.practice;
    const ft = Math.max(1, parseInt(fullTimeCount, 10) || 1);
    const pt = Math.max(0, parseInt(partTimeCount, 10) || 0);

    if (tierId === 'balance') {
        return {
            basePrice: tier.basePrice,
            extraFtCount: 0,
            extraPtCount: 0,
            extraFtCost: 0,
            extraPtCost: 0,
            total: tier.basePrice,
            totalPractitioners: 1,
        };
    }

    const extraFtCount = Math.max(0, ft - tier.includedFt);
    const extraPtCount = pt;
    const extraFtCost = extraFtCount * tier.extraFtPrice;
    const extraPtCost = extraPtCount * tier.extraPtPrice;
    const total = tier.basePrice + extraFtCost + extraPtCost;

    return {
        basePrice: tier.basePrice,
        extraFtCount,
        extraPtCount,
        extraFtCost,
        extraPtCost,
        total,
        totalPractitioners: ft + pt,
    };
}

export default function PlanStep({
    selectedTier,
    onSelectTier,
    ftCount,
    onChangeFt,
    ptCount,
    onChangePt,
    error,
    tiers: rawTiers,
}) {
    const activeTiers = normalizeTiers(rawTiers);
    const currentTier = selectedTier || 'practice';
    const breakdown = calculateMonthlyTotal(currentTier, ftCount, ptCount, activeTiers);

    const handleTierChange = (tierId) => {
        onSelectTier(tierId);
        if (tierId === 'balance') {
            onChangeFt(1);
            onChangePt(0);
        }
    };

    const extraFtCost = breakdown.extraFtCost;
    const extraPtCost = breakdown.extraPtCost;

    return (
        <div className="space-y-6 sm:space-y-7" style={{ fontFamily: FONT_MANROPE }}>
            {/* Step Header */}
            <div>
                <h3 className="text-base font-bold text-[#0D1B2A] tracking-tight mb-1">
                    Select your clinic subscription plan
                </h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                    All plans are billed monthly in CAD after platform review. Card is verified now, but nothing is charged today.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-[13px] text-rose-700 font-medium flex items-center gap-2.5 shadow-xs"
                >
                    <Info className="w-4 h-4 text-rose-500 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* 3 Subscription Plan Cards Grid */}
            <div
                role="radiogroup"
                aria-label="Subscription Plans"
                className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-stretch pt-3 sm:pt-4"
            >
                {Object.values(activeTiers).map((tier) => {
                    const isSelected = currentTier === tier.id;
                    const isRecommended = tier.isPopular || tier.id === 'practice';
                    const BadgeIcon = tier.badgeIcon || Sparkles;
                    const badgeColors = tier.badgeColor || {
                        bg: 'bg-slate-100',
                        text: 'text-slate-700',
                        border: 'border-slate-200/80',
                        icon: 'text-slate-500',
                    };

                    return (
                        <div
                            key={tier.id}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onClick={() => handleTierChange(tier.id)}
                            onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    handleTierChange(tier.id);
                                }
                            }}
                            className={`group relative rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between p-5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                                isRecommended
                                    ? 'md:-translate-y-2.5 shadow-md shadow-blue-900/5'
                                    : 'hover:shadow-md'
                            } ${
                                isSelected
                                    ? isRecommended
                                        ? 'bg-blue-50/40 border-2 border-[#2563EB] shadow-lg shadow-blue-500/15'
                                        : 'bg-blue-50/40 border-2 border-[#2563EB] shadow-md shadow-blue-500/10'
                                    : isRecommended
                                    ? 'bg-white border-2 border-[#2563EB] hover:shadow-lg'
                                    : 'bg-white border border-slate-200/90 hover:border-slate-300'
                            } motion-reduce:transform-none`}
                        >
                            {/* "Most Popular" Ribbon Badge Centered on Top Edge */}
                            {isRecommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                    <span className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm shadow-blue-600/30 whitespace-nowrap">
                                        <Sparkles className="w-3 h-3 text-white" aria-hidden="true" />
                                        <span>Most Popular</span>
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col flex-1">
                                {/* Row 1: Consistent Badge on Left, Selection Radio Indicator on Right */}
                                <div className="h-7 flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${badgeColors.bg} ${badgeColors.text} ${badgeColors.border}`}
                                    >
                                        <BadgeIcon
                                            className={`w-3 h-3 flex-shrink-0 ${badgeColors.icon}`}
                                            aria-hidden="true"
                                        />
                                        <span>{tier.badge}</span>
                                    </span>

                                    {/* Selection Radio Circle Indicator */}
                                    <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-[#2563EB] text-white shadow-xs'
                                                : 'border-2 border-slate-300 bg-white group-hover:border-slate-400'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </span>
                                </div>

                                {/* Row 2: Plan Name */}
                                <div className="h-7 mt-3 flex items-center">
                                    <h4 className="text-lg font-bold text-[#0D1B2A] tracking-tight leading-tight">
                                        {tier.name}
                                    </h4>
                                </div>

                                {/* Row 3: Description / Tagline (Equal Min-Height) */}
                                <div className="min-h-[38px] mt-1 flex items-start">
                                    <p className="text-[12.5px] text-slate-500 leading-snug">
                                        {tier.tagline}
                                    </p>
                                </div>

                                {/* Row 4: Price Block (Equal Vertical Baseline Across All Cards) */}
                                <div className="mt-3 mb-4 pb-3.5 border-b border-slate-100">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-[32px] font-extrabold text-[#0D1B2A] tracking-tight leading-none">
                                            ${tier.basePrice}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">
                                            CAD / mo
                                        </span>
                                    </div>
                                    <p className="text-[11.5px] text-slate-500 font-medium mt-1.5 min-h-[18px] flex items-center">
                                        {tier.id === 'balance'
                                            ? '1 practitioner included (capped)'
                                            : 'Includes 1 full-time practitioner'}
                                    </p>
                                </div>

                                {/* Row 5: Clean Feature Benefits Checklist */}
                                <ul className="space-y-2.5 flex-1">
                                    {(tier.features || []).map((feat, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2.5 text-[12.5px] text-slate-600 leading-snug"
                                        >
                                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-emerald-100">
                                                <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                                            </div>
                                            <span className="flex-1">{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Row 6: Dedicated Muted Helper Line for Extra Practitioner Pricing */}
                                <div className="pt-3 mt-4 border-t border-slate-100 min-h-[28px] flex items-center">
                                    <p className="text-[11px] text-slate-400 font-medium leading-tight">
                                        {tier.extraPricingNote}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Practitioner Team Configurator */}
            {currentTier !== 'balance' ? (
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/60">
                        <div>
                            <h4 className="text-sm font-bold text-[#0D1B2A] tracking-tight">
                                Configure Practitioner Team
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Add full-time or part-time practitioner seats to your {activeTiers[currentTier]?.name || currentTier} plan
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4" aria-hidden="true" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        {/* Full-Time Practitioners Counter */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-bold text-[#0D1B2A]">
                                        Full-Time Practitioners
                                    </span>
                                    {breakdown.extraFtCount > 0 ? (
                                        <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 tabular-nums">
                                            +${extraFtCost.toFixed(2)}/mo
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            Base included
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                        1 included
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span>
                                        +${(activeTiers[currentTier]?.extraFtPrice || 35).toFixed(2)} CAD/mo each extra
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-xs font-medium text-slate-500">Seat count</span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onChangeFt(Math.max(1, (parseInt(ftCount, 10) || 1) - 1))}
                                        disabled={parseInt(ftCount, 10) <= 1}
                                        className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] active:scale-95"
                                        aria-label="Decrease full-time practitioners"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-[#0D1B2A] font-mono tabular-nums">
                                        {ftCount || 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onChangeFt((parseInt(ftCount, 10) || 1) + 1)}
                                        className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] active:scale-95"
                                        aria-label="Increase full-time practitioners"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Part-Time Practitioners Counter */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[13px] font-bold text-[#0D1B2A]">
                                        Part-Time Practitioners
                                    </span>
                                    {breakdown.extraPtCount > 0 ? (
                                        <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 tabular-nums">
                                            +${extraPtCost.toFixed(2)}/mo
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            None added
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                        0 included
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span>
                                        +${(activeTiers[currentTier]?.extraPtPrice || 17.5).toFixed(2)} CAD/mo each
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-xs font-medium text-slate-500">Seat count</span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onChangePt(Math.max(0, (parseInt(ptCount, 10) || 0) - 1))}
                                        disabled={parseInt(ptCount, 10) <= 0}
                                        className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] active:scale-95"
                                        aria-label="Decrease part-time practitioners"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-[#0D1B2A] font-mono tabular-nums">
                                        {ptCount || 0}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onChangePt((parseInt(ptCount, 10) || 0) + 1)}
                                        className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] active:scale-95"
                                        aria-label="Increase part-time practitioners"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Balance Tier Policy Callout */
                <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <div className="text-[13px] text-slate-700 leading-relaxed">
                        <span className="font-bold text-[#0D1B2A]">Solo Practitioner Limit:</span> The Balance plan
                        is designed for independent practitioners. It includes 1 seat and up to{' '}
                        {activeTiers.balance?.maxAppointments || 20} appointments per month. Need team collaboration
                        or higher volume? Select <span className="font-semibold text-[#2563EB]">Practice</span> or{' '}
                        <span className="font-semibold text-[#2563EB]">Thrive</span>.
                    </div>
                </div>
            )}

            {/* Total Cost Summary (Dark Card) */}
            <div className="bg-[#0D1B2A] text-white rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xl shadow-slate-900/10 border border-slate-800">
                <div className="space-y-2.5 text-[13px]">
                    {/* Line Item: Base Plan */}
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-300 font-medium">
                            {activeTiers[currentTier]?.name || currentTier} base plan
                        </span>
                        <span className="flex-1 border-b border-dotted border-slate-700/80 mx-2 mb-1" aria-hidden="true" />
                        <span className="font-mono font-semibold text-slate-100 tabular-nums">
                            ${breakdown.basePrice.toFixed(2)} CAD
                        </span>
                    </div>

                    {/* Line Item: Extra Full-Time Practitioners */}
                    {breakdown.extraFtCount > 0 && (
                        <div className="flex items-baseline justify-between gap-2 text-slate-300">
                            <span>
                                +{breakdown.extraFtCount}{' '}
                                {breakdown.extraFtCount === 1 ? 'full-time practitioner' : 'full-time practitioners'}
                                <span className="text-xs text-slate-400 font-normal ml-1.5">
                                    ({breakdown.extraFtCount} × ${(activeTiers[currentTier]?.extraFtPrice || 35).toFixed(2)})
                                </span>
                            </span>
                            <span className="flex-1 border-b border-dotted border-slate-700/80 mx-2 mb-1" aria-hidden="true" />
                            <span className="font-mono font-semibold text-slate-100 tabular-nums">
                                +${breakdown.extraFtCost.toFixed(2)} CAD
                            </span>
                        </div>
                    )}

                    {/* Line Item: Part-Time Practitioners */}
                    {breakdown.extraPtCount > 0 && (
                        <div className="flex items-baseline justify-between gap-2 text-slate-300">
                            <span>
                                +{breakdown.extraPtCount}{' '}
                                {breakdown.extraPtCount === 1 ? 'part-time practitioner' : 'part-time practitioners'}
                                <span className="text-xs text-slate-400 font-normal ml-1.5">
                                    ({breakdown.extraPtCount} × ${(activeTiers[currentTier]?.extraPtPrice || 17.5).toFixed(2)})
                                </span>
                            </span>
                            <span className="flex-1 border-b border-dotted border-slate-700/80 mx-2 mb-1" aria-hidden="true" />
                            <span className="font-mono font-semibold text-slate-100 tabular-nums">
                                +${breakdown.extraPtCost.toFixed(2)} CAD
                            </span>
                        </div>
                    )}
                </div>

                {/* Total Cost Row with Green Reassurance Note */}
                <div className="pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <span className="text-[13px] font-semibold text-slate-300 block">
                            Total monthly cost
                        </span>
                        <span className="text-[12px] text-emerald-400 font-medium inline-flex items-center gap-1.5 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                            <span>Charged only after platform approval</span>
                        </span>
                    </div>

                    <div className="flex items-baseline gap-1.5 sm:text-right">
                        <span className="text-3xl sm:text-[32px] font-extrabold text-white tracking-tight leading-none font-mono tabular-nums">
                            ${breakdown.total.toFixed(2)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                            CAD / mo
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
