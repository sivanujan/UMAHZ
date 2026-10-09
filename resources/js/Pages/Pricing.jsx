import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import Button from '@/Components/UI/Button';
import Accordion from '@/Components/UI/Accordion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createCardHover,
} from '@/Utils/motion';

const DEFAULT_PLANS = [
    {
        id: '1',
        slug: 'essential',
        name: 'Essential',
        description: 'Everything you need to run your solo practice smoothly.',
        is_popular: false,
        monthly_price: 39,
        annual_price: 390,
        annual_monthly_equivalent: 32.50,
        included_practitioners: 1,
        allows_extra_practitioners: false,
        limit_lines: [
            'Up to 50 appointments/month',
            '1 location',
            'Standard support',
        ],
        parent_tier_name: null,
        features: [
            'Online Booking',
            'Client Management',
            'Intake & Custom Forms',
            'Consent & Signatures',
            'Clinical Notes',
            'Billing & Invoices',
            'Basic Reporting',
            'Client Portal',
            'Visual Drag-and-Drop Page Builder',
        ],
    },
    {
        id: '2',
        slug: 'professional',
        name: 'Professional',
        description: 'Unlimited appointments and multi-practitioner team collaboration.',
        is_popular: true,
        monthly_price: 69,
        annual_price: 690,
        annual_monthly_equivalent: 57.50,
        included_practitioners: 1,
        allows_extra_practitioners: true,
        extra_seat_monthly: 35,
        extra_seat_annual: 350,
        show_extra_seat_price: false, // Under review placeholder
        limit_lines: [
            'Unlimited appointments',
            'Multiple locations',
        ],
        parent_tier_name: 'Essential',
        delta_features: [
            'More automation',
            'Priority support',
            'Staff / Receptionist Management',
            'Rooms & Resources',
            'Advanced Scheduling',
            'Advanced / Financial Reporting',
        ],
        features: [
            'Online Booking',
            'Client Management',
            'Intake & Custom Forms',
            'Consent & Signatures',
            'Clinical Notes',
            'Billing & Invoices',
            'Basic Reporting',
            'Client Portal',
            'Visual Drag-and-Drop Page Builder',
            'More automation',
            'Priority support',
            'Staff / Receptionist Management',
            'Rooms & Resources',
            'Advanced Scheduling',
            'Advanced / Financial Reporting',
        ],
    },
    {
        id: '3',
        slug: 'signature',
        name: 'Signature',
        description: 'Advanced roles, priority onboarding, and white-glove migration assistance.',
        is_popular: false,
        monthly_price: 90,
        annual_price: 900,
        annual_monthly_equivalent: 75.00,
        included_practitioners: 3,
        allows_extra_practitioners: true,
        extra_seat_monthly: 30,
        extra_seat_annual: 300,
        show_extra_seat_price: false, // Under review placeholder
        limit_lines: [
            'Unlimited appointments',
            'Unlimited locations',
        ],
        parent_tier_name: 'Professional',
        delta_features: [
            'Advanced automation',
            'Advanced Roles',
            'Advanced Analytics',
            'Enhanced Website',
            'Priority Onboarding',
            'Data Migration Assistance',
        ],
        features: [
            'Online Booking',
            'Client Management',
            'Intake & Custom Forms',
            'Consent & Signatures',
            'Clinical Notes',
            'Billing & Invoices',
            'Basic Reporting',
            'Client Portal',
            'Visual Drag-and-Drop Page Builder',
            'Advanced automation',
            'Priority support',
            'Staff / Receptionist Management',
            'Rooms & Resources',
            'Advanced Scheduling',
            'Advanced / Financial Reporting',
            'Advanced Roles',
            'Advanced Analytics',
            'Enhanced Website',
            'Priority Onboarding',
            'Data Migration Assistance',
        ],
    },
];

const PRICING_FAQS = [
    {
        question: 'Can I switch plans or billing cadence later?',
        answer: 'Yes! You can switch between Monthly and Annual billing or upgrade/downgrade your plan at any time directly in your clinic settings. Prorated billing is applied immediately by Stripe.',
    },
    {
        question: 'How do additional practitioner seats work?',
        answer: 'Each plan includes licensed practitioner seats. For Professional and Signature plans, you can add extra practitioner seats at any time with a fixed monthly or annual add-on price.',
    },
    {
        question: 'Will my card be charged when I submit my clinic application?',
        answer: 'No. When registering, your payment method is securely saved and authorized via Stripe with zero charge today. The first charge occurs only after your clinic credentials and license are reviewed and approved.',
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) powered securely by Stripe.',
    },
];

export default function Pricing({ plans = [] }) {
    const shouldReduceMotion = useReducedMotion();
    const [billingInterval, setBillingInterval] = useState('month');

    const displayPlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;
    const isAnnual = billingInterval === 'year';

    const containerVariants = createStaggerContainer(0.1, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title="Pricing — Simple, Transparent Practice Plans" />

            {/* Header */}
            <section className="pt-16 pb-10 md:pt-24 md:pb-12 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-3xl mx-auto text-center"
                >
                    <div className="mb-4">
                        <PillBadge text="Transparent Pricing" />
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-normal">
                        Plans That{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Grow</em> With Your Practice
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        No hidden surprises. Pick the plan tailored to your team size, with zero charge until your clinic is approved.
                    </p>

                    {/* Cadence Toggle */}
                    <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setBillingInterval('month')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                !isAnnual
                                    ? 'bg-[#1E0B3C] text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Monthly Billing
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingInterval('year')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                isAnnual
                                    ? 'bg-[#5B2EFF] text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span>Annual Billing</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                                Save ~17%
                            </span>
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Pricing Cards Grid */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4"
                    >
                        {displayPlans.map((plan) => {
                            const isHighlighted = plan.is_popular;
                            const price = isAnnual
                                ? (plan.annual_monthly_equivalent ?? (plan.annual_price ? (typeof plan.annual_price === 'object' ? plan.annual_price.base_price / 12 : plan.annual_price / 12) : plan.monthly_price))
                                : (typeof plan.monthly_price === 'object' && plan.monthly_price !== null ? plan.monthly_price.base_price : plan.monthly_price);
                            const extraSeat = isAnnual ? plan.extra_seat_annual : plan.extra_seat_monthly;

                            return (
                                <motion.div
                                    key={plan.id || plan.slug || plan.name}
                                    variants={cardEntrance}
                                    initial="rest"
                                    whileHover="hover"
                                    {...cardHover}
                                    className={`rounded-3xl p-8 flex flex-col justify-between h-full transition-all duration-300 relative ${
                                        isHighlighted
                                            ? 'bg-[#1E0B3C] dark:bg-[#161226] text-white shadow-2xl border-2 border-[#5B2EFF] dark:border-violet-500/50 dark:shadow-[0_0_35px_-5px_rgba(124,58,237,0.25)]'
                                            : 'bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40'
                                    }`}
                                >
                                    {/* Most Popular Ribbon Badge (Show only once, on top edge) */}
                                    {isHighlighted && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#5B2EFF] to-indigo-600 text-white text-[10.5px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md whitespace-nowrap">
                                                <Sparkles className="w-3 h-3 text-white" aria-hidden="true" />
                                                <span>Most Popular</span>
                                            </span>
                                        </div>
                                    )}

                                    {isHighlighted && (
                                        <div
                                            className="absolute -bottom-8 -right-8 rounded-full blur-2xl pointer-events-none w-40 h-40 bg-purple-600/30 overflow-hidden"
                                            aria-hidden="true"
                                        />
                                    )}

                                    <div className="relative z-10 flex flex-col flex-1">
                                        <h3 className={`text-2xl font-bold mb-2 tracking-normal ${isHighlighted ? 'text-white' : 'text-[#1E0B3C] dark:text-white'}`}>
                                            {plan.name}
                                        </h3>

                                        <p className={`text-sm leading-relaxed mb-6 font-normal ${isHighlighted ? 'text-purple-200 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {plan.description}
                                        </p>

                                        <div className="mb-6">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`text-4xl sm:text-5xl font-bold tracking-normal ${isHighlighted ? 'text-white' : 'text-[#1E0B3C] dark:text-white'}`}>
                                                    ${price !== null && price !== undefined ? Number(price).toFixed(0) : '—'}
                                                </span>
                                                <span className={`text-sm font-medium ${isHighlighted ? 'text-purple-300 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    CAD / month
                                                </span>
                                            </div>
                                            {isAnnual && plan.annual_price && (
                                                <p className={`text-xs mt-1 ${isHighlighted ? 'text-purple-300' : 'text-slate-500'}`}>
                                                    Billed annually at ${Number(typeof plan.annual_price === 'object' ? plan.annual_price.base_price : plan.annual_price).toFixed(0)} CAD/yr
                                                </p>
                                            )}
                                        </div>

                                        <div className={`p-3 rounded-xl mb-6 text-xs ${isHighlighted ? 'bg-white/10 text-purple-200' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300'}`}>
                                            <span className="font-semibold">Includes {plan.included_practitioners} practitioner seat{plan.included_practitioners > 1 ? 's' : ''}.</span>{' '}
                                            {plan.allows_extra_practitioners ? (
                                                plan.show_extra_seat_price && extraSeat ? (
                                                    <span>+${extraSeat} CAD per extra seat/{isAnnual ? 'yr' : 'mo'}.</span>
                                                ) : (
                                                    <span>Additional practitioners available.</span>
                                                )
                                            ) : (
                                                <span>Single practitioner capped.</span>
                                            )}
                                        </div>

                                        {/* 1. Limit lines at the top of each card's list (data-driven) */}
                                        {plan.limit_lines && plan.limit_lines.length > 0 && (
                                            <div className="mb-4 pb-4 border-b border-purple-200/20 dark:border-white/10 space-y-2.5">
                                                {plan.limit_lines.map((limit, idx) => (
                                                    <div key={`limit-${idx}`} className="flex items-center gap-3">
                                                        <span
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                isHighlighted
                                                                    ? 'bg-violet-400/20 text-violet-300 ring-1 ring-violet-400/30'
                                                                    : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60'
                                                            }`}
                                                        >
                                                            <Check className="w-3 h-3" strokeWidth={3} />
                                                        </span>
                                                        <span className={`text-sm font-semibold tracking-tight ${isHighlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                            {limit}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 3. "Everything in X, plus:" divider */}
                                        {plan.parent_tier_name && (
                                            <div className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${isHighlighted ? 'text-violet-300' : 'text-[#5B2EFF] dark:text-[#8B6BFF]'}`}>
                                                Everything in {plan.parent_tier_name}, plus:
                                            </div>
                                        )}

                                        {/* Features List (delta features if parent_tier_name exists, else full features) */}
                                        <ul className="space-y-3 mb-8 flex-1">
                                            {(plan.parent_tier_name ? (plan.delta_features || []) : (plan.features || []))
                                                .filter((f) => {
                                                    if (plan.show_scribe_allowance === false && typeof f === 'string' && f.toLowerCase().includes('scribe allowance')) {
                                                        return false;
                                                    }
                                                    return true;
                                                })
                                                .map((f) => (
                                                <li key={f} className="flex items-start gap-3">
                                                    <span
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                            isHighlighted
                                                                ? 'bg-violet-500/20 text-violet-300'
                                                                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50'
                                                        }`}
                                                    >
                                                        <Check className="w-3 h-3" strokeWidth={3} />
                                                    </span>
                                                    <span className={`text-sm leading-relaxed font-normal ${isHighlighted ? 'text-purple-100 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {f}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <Link
                                            href={`/clinics/register?plan=${plan.slug || plan.id}`}
                                            className={`inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-sm ${
                                                isHighlighted
                                                    ? 'bg-white text-[#1E0B3C] hover:bg-slate-100'
                                                    : 'bg-[#5B2EFF] text-white hover:bg-[#4820d4]'
                                            }`}
                                        >
                                            <span>Get Started</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* Pricing FAQ Section */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="text-center mb-10"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-normal">
                            Pricing <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Questions</em>
                        </h2>
                    </motion.div>
                    <Accordion items={PRICING_FAQS} />
                </div>
            </section>
        </PublicLayout>
    );
}
