import React from 'react';
import { Check, Sparkles, Zap, Shield, Users, Plus, Minus, Info } from 'lucide-react';

const BLUE = '#2563EB';
const NAVY = '#0D1B2A';
const TEAL = '#06B6D4';
const GREEN = '#22C55E';
const LIGHT_GRAY = '#F1F5F9';
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
        badge: 'Solo Practitioner',
        badgeIcon: Shield,
        features: [
            '1 practitioner only (capped)',
            'Up to 20 appointments / mo',
            'Online booking & calendar',
            'Charting & intake forms',
            'Billing & invoicing',
        ],
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
        badge: 'Most Popular',
        badgeIcon: Sparkles,
        features: [
            'Includes 1 full-time practitioner',
            'Unlimited appointments',
            '+$35/mo per extra FT practitioner',
            '+$17.50/mo per extra PT practitioner',
            'Custom disciplines & templates',
            'Multi-practitioner scheduling',
        ],
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
        badge: 'Full Featured',
        badgeIcon: Zap,
        features: [
            'Includes 1 full-time practitioner',
            'Unlimited appointments',
            '+$40/mo per extra FT practitioner',
            '+$20/mo per extra PT practitioner',
            'Priority support & analytics',
            'Custom branding & white-label',
        ],
    },
};

export function normalizeTiers(rawTiers = {}) {
    const result = { ...TIERS };
    if (!rawTiers || typeof rawTiers !== 'object') return result;

    Object.entries(rawTiers).forEach(([key, val]) => {
        if (!val) return;
        const defaultTier = TIERS[key] || TIERS.practice;
        result[key] = {
            id: key,
            name: val.name || defaultTier.name,
            tagline: val.tagline !== undefined ? val.tagline : defaultTier.tagline,
            basePrice: val.base_price !== undefined ? parseFloat(val.base_price) : (val.basePrice || defaultTier.basePrice),
            includedFt: val.included_full_time !== undefined ? parseInt(val.included_full_time, 10) : (val.includedFt || defaultTier.includedFt),
            maxPractitioners: val.max_practitioners !== undefined ? val.max_practitioners : defaultTier.maxPractitioners,
            maxAppointments: val.max_appointments_per_month !== undefined ? val.max_appointments_per_month : defaultTier.maxAppointments,
            extraFtPrice: val.addon_price_ft !== undefined ? parseFloat(val.addon_price_ft) : (val.extraFtPrice || defaultTier.extraFtPrice),
            extraPtPrice: val.addon_price_pt !== undefined ? parseFloat(val.addon_price_pt) : (val.extraPtPrice || defaultTier.extraPtPrice),
            badge: val.badge || defaultTier.badge,
            badgeIcon: defaultTier.badgeIcon || Sparkles,
            features: Array.isArray(val.features) ? val.features : defaultTier.features,
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

export default function PlanStep({ selectedTier, onSelectTier, ftCount, onChangeFt, ptCount, onChangePt, error, tiers: rawTiers }) {
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

    return (
        <div className="space-y-6" style={{ fontFamily: FONT_MANROPE }}>
            <div>
                <h3 className="text-[14px] font-bold text-[#0D1B2A] tracking-tight mb-1">
                    Select your clinic subscription plan
                </h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                    All plans are billed monthly in CAD after admin review. Card is captured now, but nothing is charged today.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-[13px] text-rose-700 font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* 3 Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {Object.values(activeTiers).map((tier) => {
                    const isSelected = currentTier === tier.id;
                    const BadgeIcon = tier.badgeIcon || Sparkles;

                    return (
                        <div
                            key={tier.id}
                            onClick={() => handleTierChange(tier.id)}
                            className={`group relative rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between p-5 ${
                                isSelected
                                    ? 'bg-blue-50/40 border-2 border-[#2563EB] shadow-lg shadow-blue-500/10'
                                    : 'bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                            }`}
                            style={isSelected ? { borderTopWidth: '4px', borderTopColor: BLUE } : {}}
                        >
                            {/* Card Content Top Section */}
                            <div>
                                {/* Top Bar: Exactly ONE badge on left, radio selector on right */}
                                <div className="h-7 flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                                            isSelected
                                                ? 'bg-[#2563EB] text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200/70 font-medium'
                                        }`}
                                    >
                                        <BadgeIcon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                        {tier.badge}
                                    </span>

                                    {/* Selection Radio Circle */}
                                    <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-[#2563EB] border border-[#2563EB] text-white shadow-xs'
                                                : 'border border-slate-300 bg-white group-hover:border-slate-400'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </span>
                                </div>

                                {/* Title */}
                                <h4 className="mt-3 text-[17px] sm:text-[18px] font-bold text-[#0D1B2A] tracking-tight leading-snug">
                                    {tier.name}
                                </h4>

                                {/* Tagline (Fixed height ensures price aligns at the exact same Y position) */}
                                <div className="h-[36px] mt-1 flex items-center">
                                    <p className="text-[12px] sm:text-[12.5px] text-slate-500 leading-snug">
                                        {tier.tagline}
                                    </p>
                                </div>

                                {/* Price Section (Identical height & alignment across all cards) */}
                                <div className="mt-3 mb-4 pb-3.5 border-b border-slate-100">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-[30px] sm:text-[32px] font-extrabold text-[#0D1B2A] tracking-tight leading-none">
                                            ${tier.basePrice}
                                        </span>
                                        <span className="text-[12.5px] font-semibold text-slate-500">
                                            CAD / mo
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium mt-1.5 h-[16px] flex items-center">
                                        {tier.id === 'balance' ? '1 practitioner included' : 'Includes 1 full-time practitioner'}
                                    </p>
                                </div>

                                {/* Feature List */}
                                <ul className="space-y-2.5">
                                    {(tier.features || []).map((feat, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[12px] sm:text-[12.5px] text-slate-600 leading-snug">
                                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-[#22C55E] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                            </div>
                                            <span className="whitespace-normal break-words">{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Practitioner Counters (for Practice and Thrive) */}
            {currentTier !== 'balance' ? (
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                        <div>
                            <h4 className="text-[14px] font-bold text-[#0D1B2A] tracking-tight">
                                Configure Practitioner Team
                            </h4>
                            <p className="text-[13px] text-slate-500 mt-0.5">
                                Add part-time or additional full-time practitioners to your plan
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Full-time Practitioners Counter */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
                            <div>
                                <span className="text-[13px] font-semibold text-[#0D1B2A] block">
                                    Full-Time Practitioners
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                    1 included (+${(activeTiers[currentTier]?.extraFtPrice || 35).toFixed(2)}/mo each extra)
                                </span>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                                <button
                                    type="button"
                                    onClick={() => onChangeFt(Math.max(1, (parseInt(ftCount, 10) || 1) - 1))}
                                    disabled={parseInt(ftCount, 10) <= 1}
                                    className="w-8 h-8 rounded-xl bg-[#F1F5F9] border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                    aria-label="Decrease full-time practitioners"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-7 text-center text-[15px] font-bold text-[#0D1B2A]">
                                    {ftCount || 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChangeFt((parseInt(ftCount, 10) || 1) + 1)}
                                    className="w-8 h-8 rounded-xl bg-[#F1F5F9] border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors active:scale-95"
                                    aria-label="Increase full-time practitioners"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Part-time Practitioners Counter */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
                            <div>
                                <span className="text-[13px] font-semibold text-[#0D1B2A] block">
                                    Part-Time Practitioners
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                    +${(activeTiers[currentTier]?.extraPtPrice || 17.5).toFixed(2)}/mo each
                                </span>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                                <button
                                    type="button"
                                    onClick={() => onChangePt(Math.max(0, (parseInt(ptCount, 10) || 0) - 1))}
                                    disabled={parseInt(ptCount, 10) <= 0}
                                    className="w-8 h-8 rounded-xl bg-[#F1F5F9] border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                    aria-label="Decrease part-time practitioners"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-7 text-center text-[15px] font-bold text-[#0D1B2A]">
                                    {ptCount || 0}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChangePt((parseInt(ptCount, 10) || 0) + 1)}
                                    className="w-8 h-8 rounded-xl bg-[#F1F5F9] border border-slate-200/80 flex items-center justify-center text-[#0D1B2A] hover:bg-slate-200/80 transition-colors active:scale-95"
                                    aria-label="Increase part-time practitioners"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Restyled Neutral Warning Banner - Light Gray #F1F5F9 background, Deep Navy #0D1B2A text */
                <div className="rounded-2xl border border-slate-300/80 bg-[#F1F5F9] p-4.5 flex items-start gap-3 shadow-xs">
                    <div className="w-5 h-5 rounded-full bg-amber-100/90 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[13px] text-[#0D1B2A] leading-relaxed">
                        <span className="font-bold text-[#0D1B2A]">Balance Tier Cap:</span> Limited to 1 solo practitioner and up to {activeTiers.balance?.maxAppointments || 20} appointments/month. No add-on practitioners permitted on this plan.
                    </div>
                </div>
            )}

            {/* Bottom Order Summary Panel */}
            <div className="bg-[#0D1B2A] text-white rounded-2xl p-5 space-y-3 shadow-xl shadow-slate-900/10 border border-slate-800">
                <div className="flex justify-between items-center text-[13px] text-slate-300 pb-2.5 border-b border-slate-800">
                    <span className="font-semibold text-slate-200">{activeTiers[currentTier]?.name || currentTier} Base Plan</span>
                    <span className="font-medium text-slate-200">${breakdown.basePrice.toFixed(2)} CAD / mo</span>
                </div>

                {breakdown.extraFtCount > 0 && (
                    <div className="flex justify-between items-center text-[13px] text-slate-300">
                        <span>+ {breakdown.extraFtCount} Extra Full-Time ({breakdown.extraFtCount} × ${(activeTiers[currentTier]?.extraFtPrice || 35).toFixed(2)})</span>
                        <span className="font-medium text-slate-200">+${breakdown.extraFtCost.toFixed(2)} CAD / mo</span>
                    </div>
                )}

                {breakdown.extraPtCount > 0 && (
                    <div className="flex justify-between items-center text-[13px] text-slate-300">
                        <span>+ {breakdown.extraPtCount} Part-Time ({breakdown.extraPtCount} × ${(activeTiers[currentTier]?.extraPtPrice || 17.5).toFixed(2)})</span>
                        <span className="font-medium text-slate-200">+${breakdown.extraPtCost.toFixed(2)} CAD / mo</span>
                    </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <div>
                        <span className="text-[13px] font-medium text-slate-400 block">Total Monthly Cost</span>
                        <span className="text-[11px] text-[#22C55E] font-semibold flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                            Charged only after platform approval
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-[28px] font-extrabold text-white tracking-tight leading-none">
                            ${breakdown.total.toFixed(2)}
                        </span>
                        <span className="text-[13px] text-slate-400 font-medium ml-1.5">
                            CAD / mo
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
