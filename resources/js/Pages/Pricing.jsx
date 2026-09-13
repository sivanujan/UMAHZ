import React from 'react';
import { Head } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
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

const PLANS = [
    {
        name: 'Solo Practitioner',
        price: '$49',
        period: '/month',
        description: 'For independent practitioners running a single-provider practice.',
        features: [
            '1 practitioner seat',
            'Unlimited clients',
            'Online booking & reminders',
            '1 profession-specific module',
            'Payments & invoicing',
            'Email support',
        ],
        cta: 'Book a Demo',
        highlight: false,
    },
    {
        name: 'Growing Clinic',
        price: '$149',
        period: '/month',
        description: 'For multi-practitioner clinics running several rooms and modalities.',
        features: [
            'Up to 10 practitioner seats',
            'Multi-room scheduling',
            'All profession-specific modules',
            'Consent & compliance tracking',
            'Staff commissions & reporting',
            'Priority support',
        ],
        cta: 'Book a Demo',
        highlight: true,
    },
    {
        name: 'Multi-Location',
        price: 'Custom',
        period: '',
        description: 'For growing brands operating across multiple clinic locations.',
        features: [
            'Unlimited practitioner seats',
            'Unlimited locations',
            'Dedicated account manager',
            'Custom onboarding & migration',
            'SSO & advanced security controls',
            'Service-level agreement',
        ],
        cta: 'Talk to Sales',
        highlight: false,
    },
];

const PRICING_FAQS = [
    { question: 'Can I switch plans later?', answer: 'Absolutely. You can upgrade or downgrade at any time, and billing is prorated automatically.' },
    { question: 'Do you charge per profession module?', answer: 'No. Growing Clinic and Multi-Location plans include every profession-specific module — Massage, Acupuncture & TCM, Personal Training, Nutrition, and Colon Hydrotherapy — at no extra cost.' },
    { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards. Multi-Location plans can also be invoiced annually.' },
];

export default function Pricing() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.1, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title="Pricing — Simple, Transparent Practice Plans" />

            {/* Header */}
            <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-3xl mx-auto text-center"
                >
                    <div className="mb-4">
                        <PillBadge text="Simple Pricing" />
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Plans That{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Grow</em> With Your Practice
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        No hidden fees, no per-module upsells. Pick the plan that matches your team size today.
                    </p>
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
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"
                    >
                        {PLANS.map((plan) => (
                            <motion.div
                                key={plan.name}
                                variants={cardEntrance}
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className={`rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 ${
                                    plan.highlight
                                        ? 'bg-[#1E0B3C] dark:bg-[#161226] text-white shadow-2xl relative overflow-hidden border-2 border-[#5B2EFF] dark:border-violet-500/50 dark:shadow-[0_0_35px_-5px_rgba(124,58,237,0.25)]'
                                        : 'bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40'
                                }`}
                            >
                                {plan.highlight && (
                                    <div
                                        className="absolute -bottom-8 -right-8 rounded-full blur-2xl pointer-events-none w-40 h-40 bg-purple-600/30"
                                        aria-hidden="true"
                                    />
                                )}

                                <div className="relative z-10 flex flex-col flex-1">
                                    {plan.highlight && (
                                        <div className="mb-4">
                                            <span className="inline-flex items-center bg-[#5B2EFF] text-white text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full shadow-xs">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}

                                    <h3 className={`text-xl font-bold mb-2 tracking-tight ${plan.highlight ? 'text-white' : 'text-[#1E0B3C] dark:text-white'}`}>
                                        {plan.name}
                                    </h3>

                                    <p className={`text-sm leading-relaxed mb-6 font-normal ${plan.highlight ? 'text-purple-200 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {plan.description}
                                    </p>

                                    <div className="mb-6 flex items-baseline gap-1">
                                        <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${plan.highlight ? 'text-white' : 'text-[#1E0B3C] dark:text-white'}`}>
                                            {plan.price}
                                        </span>
                                        {plan.period && (
                                            <span className={`text-sm font-medium ${plan.highlight ? 'text-purple-300 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {plan.period}
                                            </span>
                                        )}
                                    </div>

                                    <ul className="space-y-3 mb-8 flex-1">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-start gap-3">
                                                <span
                                                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                        plan.highlight
                                                            ? 'bg-violet-500/20 text-violet-300'
                                                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50'
                                                    }`}
                                                >
                                                    <Check className="w-3 h-3" strokeWidth={3} />
                                                </span>
                                                <span className={`text-sm leading-relaxed font-normal ${plan.highlight ? 'text-purple-100 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {f}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        href="/contact"
                                        variant={plan.highlight ? 'white' : 'solid'}
                                        className="w-full"
                                    >
                                        {plan.cta}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
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
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            Pricing <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Questions</em>
                        </h2>
                    </motion.div>
                    <Accordion items={PRICING_FAQS} />
                </div>
            </section>
        </PublicLayout>
    );
}
