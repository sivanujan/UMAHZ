import React, { useState } from 'react';
import {
    Check,
    Sparkles,
    Zap,
    Shield,
    Users,
    Plus,
    Minus,
    Info,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const BLUE = '#2563EB';

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
            bg: 'bg-slate-100 dark:bg-slate-700/80',
            text: 'text-slate-700 dark:text-slate-200',
            border: 'border-slate-200/90 dark:border-slate-600',
            icon: 'text-slate-600 dark:text-slate-300',
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
            bg: 'bg-blue-50 dark:bg-indigo-950/70',
            text: 'text-[#2563EB] dark:text-indigo-300',
            border: 'border-blue-200/80 dark:border-indigo-800',
            icon: 'text-[#2563EB] dark:text-indigo-300',
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
            bg: 'bg-purple-50 dark:bg-purple-950/70',
            text: 'text-purple-700 dark:text-purple-300',
            border: 'border-purple-200/80 dark:border-purple-800',
            icon: 'text-purple-600 dark:text-purple-300',
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

        const rawFeatures = Array.isArray(val.features) ? val.features : defaultTier.features;
        const benefitFeatures = rawFeatures.filter(
            (f) => typeof f === 'string' && !f.trim().startsWith('+$') && !f.toLowerCase().includes('per extra')
        );

        const extraFtPrice =
            val.addon_price_ft !== undefined
                ? parseFloat(val.addon_price_ft)
                : val.extraFtPrice || defaultTier.extraFtPrice;
        const extraPtPrice =
            val.addon_price_pt !== undefined
                ? parseFloat(val.addon_price_pt)
                : val.extraPtPrice || defaultTier.extraPtPrice;

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
            basePrice:
                val.base_price !== undefined
                    ? parseFloat(val.base_price)
                    : val.basePrice || defaultTier.basePrice,
            includedFt:
                val.included_full_time !== undefined
                    ? parseInt(val.included_full_time, 10)
                    : val.includedFt || defaultTier.includedFt,
            maxPractitioners:
                val.max_practitioners !== undefined ? val.max_practitioners : defaultTier.maxPractitioners,
            maxAppointments:
                val.max_appointments_per_month !== undefined
                    ? val.max_appointments_per_month
                    : defaultTier.maxAppointments,
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
    const shouldReduceMotion = useReducedMotion();
    const activeTiers = normalizeTiers(rawTiers);
    const currentTier = selectedTier || 'practice';
    const breakdown = calculateMonthlyTotal(currentTier, ftCount, ptCount, activeTiers);

    // Track per-card expansion of hidden features
    const [expandedCards, setExpandedCards] = useState({});

    const toggleExpand = (tierId, e) => {
        e.stopPropagation();
        setExpandedCards((prev) => ({
            ...prev,
            [tierId]: !prev[tierId],
        }));
    };

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
        <div className="space-y-5">
            {error && (
                <div
                    role="alert"
                    className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2 shadow-xs"
                >
                    <Info className="w-4 h-4 text-rose-500 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* 1. COMPACT PLAN CARDS ROW */}
            <div
                role="radiogroup"
                aria-label="Subscription Plans"
                className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:gap-3.5 items-stretch"
            >
                {Object.values(activeTiers).map((tier) => {
                    const isSelected = currentTier === tier.id;
                    const isRecommended = tier.isPopular || tier.id === 'practice';
                    const BadgeIcon = tier.badgeIcon || Sparkles;
                    const badgeColors = tier.badgeColor || {
                        bg: 'bg-slate-100 dark:bg-slate-800',
                        text: 'text-slate-700 dark:text-slate-300',
                        border: 'border-slate-200/80 dark:border-slate-700',
                        icon: 'text-slate-500 dark:text-slate-400',
                    };

                    const topFeatures = (tier.features || []).slice(0, 3);
                    const remainingFeatures = (tier.features || []).slice(3);
                    const isExpanded = !!expandedCards[tier.id];

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
                            className={`group relative rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between p-4 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                                isRecommended
                                    ? 'md:-translate-y-1 shadow-md shadow-indigo-950/5 dark:shadow-black/20'
                                    : 'hover:shadow-sm'
                            } ${
                                isSelected
                                    ? isRecommended
                                        ? 'bg-indigo-50/60 dark:bg-indigo-950/50 border-2 border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-500/10'
                                        : 'bg-indigo-50/50 dark:bg-indigo-950/40 border-2 border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-500/10'
                                    : isRecommended
                                    ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500/80 dark:border-indigo-500/60 hover:shadow-md'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            {/* "Most Popular" Ribbon Badge Centered on Top Edge */}
                            {isRecommended && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                                        <Sparkles className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                                        <span>Most Popular</span>
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col flex-1">
                                {/* Row 1: Badge on Left + Radio Check Indicator on Right */}
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${badgeColors.bg} ${badgeColors.text} ${badgeColors.border}`}
                                    >
                                        <BadgeIcon className={`w-3 h-3 flex-shrink-0 ${badgeColors.icon}`} aria-hidden="true" />
                                        <span>{tier.badge}</span>
                                    </span>

                                    {/* Selection Radio Circle */}
                                    <span
                                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white'
                                                : 'border-2 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-400'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                    </span>
                                </div>

                                {/* Row 2: Plan Name */}
                                <div className="mt-2.5 flex items-center justify-between">
                                    <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                        {tier.name}
                                    </h4>
                                </div>

                                {/* Row 3: One-line Description */}
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5 h-7 overflow-hidden line-clamp-2">
                                    {tier.tagline}
                                </p>

                                {/* Row 4: Price Block (High contrast, clearly visible on all card states) */}
                                <div className="mt-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                                            ${tier.basePrice}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                            CAD/mo
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium mt-1">
                                        {tier.id === 'balance'
                                            ? '1 practitioner included (capped)'
                                            : 'Includes 1 full-time practitioner'}
                                    </p>
                                </div>

                                {/* Row 5: Top 3 Features (Crisp, readable text-slate-700 dark:text-slate-200) */}
                                <ul className="space-y-1.5 flex-1 text-[11.5px]">
                                    {topFeatures.map((feat, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-slate-700 dark:text-slate-200 leading-tight"
                                        >
                                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                                            </div>
                                            <span className="flex-1">{feat}</span>
                                        </li>
                                    ))}

                                    {/* Collapsed Features Behind Expander */}
                                    {remainingFeatures.length > 0 && (
                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                                    className="overflow-hidden space-y-1.5 pt-1.5"
                                                >
                                                    {remainingFeatures.map((feat, idx) => (
                                                        <li
                                                            key={`rem-${idx}`}
                                                            className="flex items-start gap-2 text-slate-700 dark:text-slate-200 leading-tight"
                                                        >
                                                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                                                            </div>
                                                            <span className="flex-1">{feat}</span>
                                                        </li>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    )}
                                </ul>

                                {/* "See All Features" Expander Button */}
                                {remainingFeatures.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => toggleExpand(tier.id, e)}
                                        aria-expanded={isExpanded}
                                        className="mt-2 text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 focus:outline-none cursor-pointer select-none py-0.5"
                                    >
                                        <span>{isExpanded ? 'Hide details' : `+${remainingFeatures.length} more features`}</span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </button>
                                )}

                                {/* Row 6: Small Muted Helper Line */}
                                <div className="pt-2 mt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight truncate">
                                        {tier.extraPricingNote}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. TEAM CONFIGURATION & STICKY TOTAL (SIDE-BY-SIDE IN 2 COLUMNS) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-1">
                {/* LEFT COLUMN: Team Config / Balance Notice (7 cols) */}
                <div className="md:col-span-7">
                    {currentTier !== 'balance' ? (
                        <div className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-700/80">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Configure Practitioner Team
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Adjust practitioner seats for your {activeTiers[currentTier]?.name || currentTier} plan
                                    </p>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center flex-shrink-0">
                                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {/* Full-Time Practitioners Counter */}
                                <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Full-Time Practitioners
                                            </span>
                                            {breakdown.extraFtCount > 0 ? (
                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60 tabular-nums">
                                                    +${extraFtCost.toFixed(2)}/mo
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-750">
                                                    1 included
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            +${(activeTiers[currentTier]?.extraFtPrice || 35).toFixed(2)} CAD/mo each extra
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onChangeFt(Math.max(1, (parseInt(ftCount, 10) || 1) - 1))}
                                            disabled={parseInt(ftCount, 10) <= 1}
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                                            aria-label="Decrease full-time practitioners"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-7 text-center text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                                            {ftCount || 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onChangeFt((parseInt(ftCount, 10) || 1) + 1)}
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                                            aria-label="Increase full-time practitioners"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Part-Time Practitioners Counter */}
                                <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Part-Time Practitioners
                                            </span>
                                            {breakdown.extraPtCount > 0 ? (
                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60 tabular-nums">
                                                    +${extraPtCost.toFixed(2)}/mo
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-slate-750">
                                                    0 added
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            +${(activeTiers[currentTier]?.extraPtPrice || 17.5).toFixed(2)} CAD/mo each extra
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onChangePt(Math.max(0, (parseInt(ptCount, 10) || 0) - 1))}
                                            disabled={parseInt(ptCount, 10) <= 0}
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                                            aria-label="Decrease part-time practitioners"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-7 text-center text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                                            {ptCount || 0}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onChangePt((parseInt(ptCount, 10) || 0) + 1)}
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                                            aria-label="Increase part-time practitioners"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Balance Tier Policy Callout */
                        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 p-4 flex items-start gap-3 shadow-2xs">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                <strong className="font-bold text-slate-900 dark:text-white block mb-0.5">Solo Practitioner Limit:</strong>
                                The Balance plan includes 1 seat and up to {activeTiers.balance?.maxAppointments || 20} appointments/mo. Need team collaboration or higher capacity? Select{' '}
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Practice</span> or{' '}
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Thrive</span>.
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Compact & Sticky Total Monthly Cost Summary (5 cols) */}
                <div className="md:col-span-5 sticky top-4">
                    <div className="bg-[#0D1B2A] dark:bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl shadow-slate-900/10 border border-slate-800 dark:border-slate-750">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 dark:border-slate-750">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Order Summary
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Monthly CAD
                            </span>
                        </div>

                        {/* Itemized Line Items */}
                        <div className="space-y-1.5 text-xs">
                            {/* Base Plan */}
                            <div className="flex items-baseline justify-between gap-1.5">
                                <span className="text-slate-300">
                                    {activeTiers[currentTier]?.name || currentTier} base plan
                                </span>
                                <span className="flex-1 border-b border-dotted border-slate-700/60 mx-1.5 mb-1" aria-hidden="true" />
                                <span className="font-mono font-bold text-slate-100 tabular-nums">
                                    ${breakdown.basePrice.toFixed(2)}
                                </span>
                            </div>

                            {/* Extra Full-Time Seats */}
                            {breakdown.extraFtCount > 0 && (
                                <div className="flex items-baseline justify-between gap-1.5 text-slate-300">
                                    <span>
                                        +{breakdown.extraFtCount} FT {breakdown.extraFtCount === 1 ? 'seat' : 'seats'}
                                    </span>
                                    <span className="flex-1 border-b border-dotted border-slate-700/60 mx-1.5 mb-1" aria-hidden="true" />
                                    <span className="font-mono font-bold text-slate-100 tabular-nums">
                                        +${breakdown.extraFtCost.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {/* Extra Part-Time Seats */}
                            {breakdown.extraPtCount > 0 && (
                                <div className="flex items-baseline justify-between gap-1.5 text-slate-300">
                                    <span>
                                        +{breakdown.extraPtCount} PT {breakdown.extraPtCount === 1 ? 'seat' : 'seats'}
                                    </span>
                                    <span className="flex-1 border-b border-dotted border-slate-700/60 mx-1.5 mb-1" aria-hidden="true" />
                                    <span className="font-mono font-bold text-slate-100 tabular-nums">
                                        +${breakdown.extraPtCost.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Total Row */}
                        <div className="pt-2.5 border-t border-slate-800 dark:border-slate-750 flex items-baseline justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-200 block">Total monthly cost</span>
                                <span className="text-[10px] text-slate-400">Billed monthly in CAD</span>
                            </div>
                            <div className="text-right" aria-live="polite">
                                <span className="text-2xl font-extrabold font-mono text-indigo-400 tabular-nums">
                                    ${breakdown.total.toFixed(2)}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 ml-1">
                                    CAD
                                </span>
                            </div>
                        </div>

                        {/* Green Reassuring Note */}
                        <div className="pt-1">
                            <span className="text-[11px] text-emerald-400 font-medium inline-flex items-center gap-1.5 leading-snug">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                                <span>Charged only after platform approval</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
