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
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import OrderSummary from '@/Components/Onboarding/OrderSummary';

/**
 * @deprecated Legacy tier defaults. Dynamic plans from the database are preferred.
 */
export const TIERS = {
    balance: {
        id: 'balance',
        name: 'Balance',
        tagline: 'For solo practitioners starting out',
        basePrice: 54,
        includedFt: 1,
        maxPractitioners: 1,
        allowsExtra: false,
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
        allowsExtra: true,
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
        allowsExtra: true,
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

/**
 * @deprecated Use normalizeDynamicPlans instead.
 */
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
        if (key === 'balance' || key === 'essential') {
            extraPricingNote = 'Solo practitioner only (no add-on seats)';
        } else if (extraFtPrice || extraPtPrice) {
            extraPricingNote = `Extra seats: +$${extraFtPrice.toFixed(2)}/mo FT · +$${extraPtPrice.toFixed(2)}/mo PT`;
        }

        const allowsExtra = val.allowsExtra !== undefined
            ? Boolean(val.allowsExtra)
            : (val.allows_extra_practitioners !== undefined
                ? Boolean(val.allows_extra_practitioners)
                : (key !== 'balance' && key !== 'essential'));

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
            allowsExtra,
            showExtraSeatPrice: val.showExtraSeatPrice !== undefined
                ? val.showExtraSeatPrice
                : (val.show_extra_seat_price !== undefined ? Boolean(val.show_extra_seat_price) : true),
            maxAppointments:
                val.max_appointments_per_month !== undefined
                    ? val.max_appointments_per_month
                    : defaultTier.maxAppointments,
            extraFtPrice,
            extraPtPrice,
            badge: key === 'balance' || key === 'essential' ? 'Solo' : key === 'practice' || key === 'professional' ? 'Clinic' : 'Full',
            badgeIcon: defaultTier.badgeIcon || Sparkles,
            badgeColor: defaultTier.badgeColor,
            isPopular: key === 'practice' || key === 'professional',
            features: benefitFeatures.length > 0 ? benefitFeatures : defaultTier.features,
            extraPricingNote,
        };
    });

    return result;
}

export function normalizeDynamicPlans(plans = [], billingInterval = 'month') {
    const isAnnual = billingInterval === 'year';
    const result = {};

    plans.forEach((plan) => {
        const priceObj = isAnnual ? plan.annual_price : plan.monthly_price;
        const basePrice = priceObj ? (typeof priceObj === 'object' ? priceObj.base_price : priceObj) : 0;
        const extraFtPrice = priceObj ? (typeof priceObj === 'object' ? priceObj.extra_practitioner_price : (isAnnual ? plan.extra_seat_annual : plan.extra_seat_monthly) || 0) : 0;

        const isEssential = plan.slug === 'essential' || plan.slug === 'balance';
        const isProfessional = plan.slug === 'professional' || plan.slug === 'practice';
        const isSignature = plan.slug === 'signature' || plan.slug === 'thrive';

        let badge = plan.badge || (isEssential ? 'Solo' : isProfessional ? 'Clinic' : 'Full');
        if (badge === 'Most Popular') {
            badge = 'Clinic';
        }
        let isPopular = isProfessional || plan.is_popular;
        const showExtraSeatPrice = plan.show_extra_seat_price !== false;

        result[plan.slug] = {
            id: plan.slug,
            planId: plan.id,
            rawPlan: plan,
            name: plan.name,
            tagline: plan.tagline || (isEssential ? 'For solo practitioners starting out' : isProfessional ? 'For growing clinics' : 'For full-service practices'),
            basePrice,
            includedFt: plan.included_practitioners || 1,
            maxPractitioners: plan.max_practitioners,
            allowsExtra: plan.allows_extra_practitioners,
            showExtraSeatPrice,
            extraFtPrice,
            extraPtPrice: 0,
            badge,
            isPopular,
            limitLines: plan.limit_lines || (
                isEssential
                    ? ['Up to 50 appointments/month', '1 location', 'Standard support']
                    : isProfessional
                    ? ['Unlimited appointments', 'Multiple locations']
                    : ['Unlimited appointments', 'Unlimited locations']
            ),
            parentTierName: plan.parent_tier_name !== undefined
                ? plan.parent_tier_name
                : (isProfessional ? 'Essential' : isSignature ? 'Professional' : null),
            deltaFeatures: plan.delta_features || [],
            features: (plan.features || []).filter((f) => {
                if (plan.show_scribe_allowance === false && typeof f === 'string' && f.toLowerCase().includes('scribe allowance')) {
                    return false;
                }
                return true;
            }),
            extraPricingNote: plan.allows_extra_practitioners
                ? (showExtraSeatPrice && extraFtPrice > 0
                    ? `Extra seats: +$${Number(extraFtPrice).toFixed(2)}${isAnnual ? '/yr' : '/mo'}`
                    : 'Additional practitioners available')
                : 'Solo practitioner only (no add-on seats)',
        };
    });

    return result;
}

export function calculateMonthlyTotal(tierId, fullTimeCount = 1, partTimeCount = 0, customTiers = null) {
    let tiers = TIERS;
    if (customTiers) {
        if (Array.isArray(customTiers)) {
            tiers = normalizeDynamicPlans(customTiers);
        } else if (
            customTiers[tierId]?.basePrice !== undefined ||
            customTiers.professional?.basePrice !== undefined ||
            customTiers.practice?.basePrice !== undefined ||
            customTiers.essential?.basePrice !== undefined ||
            customTiers.balance?.basePrice !== undefined
        ) {
            tiers = customTiers;
        } else {
            tiers = normalizeTiers(customTiers);
        }
    }
    const tier = tiers[tierId] || tiers.practice || Object.values(tiers)[0] || TIERS.practice;
    const ft = Math.max(1, parseInt(fullTimeCount, 10) || 1);

    const allowsExtra = tier.allowsExtra !== undefined
        ? Boolean(tier.allowsExtra)
        : (tierId !== 'balance' && tierId !== 'essential');

    if (tierId === 'balance' || tierId === 'essential' || !allowsExtra) {
        return {
            basePrice: tier.basePrice,
            includedFt: tier.includedFt || 1,
            extraFtCount: 0,
            extraPtCount: 0,
            extraFtCost: 0,
            extraPtCost: 0,
            showExtraSeatPrice: tier.showExtraSeatPrice !== false,
            total: tier.basePrice,
            totalPractitioners: 1,
        };
    }

    const includedFt = tier.includedFt || 1;
    const extraFtCount = Math.max(0, ft - includedFt);
    const showExtraSeatPrice = tier.showExtraSeatPrice !== false;
    const extraFtCost = showExtraSeatPrice ? extraFtCount * (tier.extraFtPrice || 0) : 0;
    const total = tier.basePrice + extraFtCost;

    return {
        basePrice: tier.basePrice,
        includedFt,
        extraFtCount,
        extraPtCount: 0,
        extraFtCost,
        extraPtCost: 0,
        showExtraSeatPrice,
        total,
        totalPractitioners: ft,
    };
}

export default function PlanStep({
    selectedTier,
    onSelectTier,
    billingInterval = 'month',
    onChangeInterval,
    ftCount,
    onChangeFt,
    ptCount,
    onChangePt,
    error,
    tiers: rawTiers,
    plans = [],
}) {
    const shouldReduceMotion = useReducedMotion();
    const isDynamic = plans && plans.length > 0;
    const activeTiers = isDynamic
        ? normalizeDynamicPlans(plans, billingInterval)
        : normalizeTiers(rawTiers);

    const currentTier = selectedTier || (isDynamic ? (plans.find(p => p.slug === 'professional' || p.slug === 'practice')?.slug || plans[0]?.slug) : 'practice');
    const breakdown = calculateMonthlyTotal(currentTier, ftCount, ptCount, activeTiers);

    const handleTierChange = (tierId) => {
        const tier = activeTiers[tierId];
        onSelectTier(tierId, tier?.rawPlan);
        if (tierId === 'balance' || tierId === 'essential' || (tier && !tier.allowsExtra)) {
            onChangeFt?.(1);
            onChangePt?.(0);
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

            {/* MONTHLY / ANNUAL CADENCE TOGGLE */}
            {onChangeInterval && (
                <div className="flex items-center justify-center gap-2 pb-1">
                    <div className="inline-flex p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => onChangeInterval('month')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                                billingInterval === 'month'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Monthly Billing
                        </button>
                        <button
                            type="button"
                            onClick={() => onChangeInterval('year')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                                billingInterval === 'year'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span>Annual Billing</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Save ~17%
                            </span>
                        </button>
                    </div>
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

                    const featureItems = tier.parentTierName && tier.deltaFeatures?.length > 0
                        ? tier.deltaFeatures
                        : (tier.features || []);

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
                            className={`group relative rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between h-full p-4 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
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
                                    {!isRecommended && tier.badge ? (
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${badgeColors.bg} ${badgeColors.text} ${badgeColors.border}`}
                                        >
                                            <BadgeIcon className={`w-3 h-3 flex-shrink-0 ${badgeColors.icon}`} aria-hidden="true" />
                                            <span>{tier.badge}</span>
                                        </span>
                                    ) : (
                                        <span />
                                    )}

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
                                    <h4 className="text-base font-semibold text-slate-900 dark:text-white tracking-normal">
                                        {tier.name}
                                    </h4>
                                </div>

                                {/* Row 3: One-line Description */}
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-0.5 h-7 overflow-hidden line-clamp-2">
                                    {tier.tagline}
                                </p>

                                {/* Row 4: Price Block (High contrast, clearly visible on all card states) */}
                                <div className="mt-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-normal leading-none">
                                            ${tier.basePrice}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                            CAD{billingInterval === 'year' ? '/yr' : '/mo'}
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium mt-1">
                                        {tier.allowsExtra
                                            ? `Includes ${tier.includedFt} practitioner${tier.includedFt > 1 ? 's' : ''}`
                                            : '1 practitioner included (capped)'}
                                    </p>
                                </div>

                                {/* Row 5: Limits Lines at Top of List */}
                                {tier.limitLines && tier.limitLines.length > 0 && (
                                    <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/60 space-y-1 text-[11.5px]">
                                        {tier.limitLines.map((limit, idx) => (
                                            <div key={`limit-${idx}`} className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold leading-tight">
                                                <div className="w-3.5 h-3.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                                                </div>
                                                <span className="flex-1 truncate">{limit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Row 6: "Everything in X, plus:" Subheader */}
                                {tier.parentTierName && (
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                                        Everything in {tier.parentTierName}, plus:
                                    </div>
                                )}

                                {/* Row 7: Features (Crisp, readable text-slate-700 dark:text-slate-200) */}
                                <ul className="space-y-1.5 flex-1 text-[11.5px]">
                                    {featureItems.map((feat, idx) => (
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
                                </ul>

                                {/* Row 8: Small Muted Helper Line */}
                                <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-700/60">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight truncate">
                                        {tier.extraPricingNote}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. TEAM CONFIGURATION & STICKY TOTAL (SIDE-BY-SIDE IN 2 COLUMNS: ~55% / ~45%) */}
            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start pt-1">
                {/* LEFT COLUMN: Team Config / Solo Plan Notice (~55% on desktop, top on mobile/tablet) */}
                <div className="lg:col-span-6">
                    {activeTiers[currentTier]?.allowsExtra ? (
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

                            <div className="space-y-3">
                                {/* Included Practitioners Banner */}
                                <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">Included practitioners</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {activeTiers[currentTier]?.includedFt || 1} {((activeTiers[currentTier]?.includedFt || 1) === 1) ? 'practitioner' : 'practitioners'} included
                                    </span>
                                </div>

                                {/* Additional Practitioners Counter */}
                                <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Additional practitioners
                                            </span>
                                            {breakdown.extraFtCount > 0 && (
                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60 tabular-nums">
                                                    +{breakdown.extraFtCount} {breakdown.extraFtCount === 1 ? 'seat' : 'seats'}
                                                </span>
                                            )}
                                        </div>
                                        {breakdown.showExtraSeatPrice ? (
                                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                +${(activeTiers[currentTier]?.extraFtPrice || 0).toFixed(2)} CAD/{billingInterval === 'year' ? 'yr' : 'mo'} each additional
                                            </p>
                                        ) : (
                                            <p className="text-[10.5px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                                Additional practitioner pricing will be confirmed before you're charged
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const inc = activeTiers[currentTier]?.includedFt || 1;
                                                const currentFt = Math.max(inc, parseInt(ftCount, 10) || inc);
                                                onChangeFt?.(Math.max(inc, currentFt - 1));
                                            }}
                                            disabled={breakdown.extraFtCount <= 0}
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                                            aria-label="Decrease additional practitioners"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-7 text-center text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                                            {breakdown.extraFtCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const inc = activeTiers[currentTier]?.includedFt || 1;
                                                const currentFt = Math.max(inc, parseInt(ftCount, 10) || inc);
                                                if (activeTiers[currentTier]?.maxPractitioners && (currentFt + 1) > activeTiers[currentTier].maxPractitioners) {
                                                    return;
                                                }
                                                onChangeFt?.(currentFt + 1);
                                            }}
                                            disabled={
                                                Boolean(
                                                    activeTiers[currentTier]?.maxPractitioners &&
                                                    (Math.max(activeTiers[currentTier]?.includedFt || 1, parseInt(ftCount, 10) || 1)) >= activeTiers[currentTier].maxPractitioners
                                                )
                                            }
                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
                                            aria-label="Increase additional practitioners"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Essential / Solo Plan Notice (no +/- buttons) */
                        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 p-4 sm:p-5 flex items-start gap-3 shadow-2xs">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Shield className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                <strong className="font-bold text-slate-900 dark:text-white block mb-0.5">
                                    1 practitioner (solo plan)
                                </strong>
                                The {activeTiers[currentTier]?.name || 'Essential'} plan is built for solo practitioners with 1 practitioner seat included. Additional practitioner seats are not available on this plan. Need team collaboration? Select{' '}
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Professional</span> or{' '}
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Signature</span>.
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Shared Order Summary Card (~45% on desktop, stacked below on tablet/mobile) */}
                <div className="lg:col-span-5 sticky top-4">
                    <OrderSummary
                        planName={activeTiers[currentTier]?.name || currentTier}
                        billingInterval={billingInterval}
                        basePrice={breakdown.basePrice}
                        extraSeats={breakdown.extraFtCount}
                        extraCost={breakdown.extraFtCost}
                        showExtraSeatPrice={breakdown.showExtraSeatPrice}
                        trialDays={activeTiers[currentTier]?.rawPlan?.trial_days || 0}
                        subtotal={breakdown.total}
                        totalDue={breakdown.total}
                        showPromoInput={false}
                    />
                </div>
            </div>
        </div>
    );
}
