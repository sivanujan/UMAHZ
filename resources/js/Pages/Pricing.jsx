import React from 'react';
import { Head } from '@inertiajs/react';
import { Check } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import Button from '@/Components/UI/Button';
import Accordion from '@/Components/UI/Accordion';

const PLANS = [
    {
        name: 'Solo Practitioner',
        price: '$49',
        period: '/month',
        description: 'For independent practitioners running a single-provider practice.',
        features: ['1 practitioner seat', 'Unlimited clients', 'Online booking & reminders', '1 profession-specific module', 'Payments & invoicing', 'Email support'],
        cta: 'Book a Demo',
        highlight: false,
    },
    {
        name: 'Growing Clinic',
        price: '$149',
        period: '/month',
        description: 'For multi-practitioner clinics running several rooms and modalities.',
        features: ['Up to 10 practitioner seats', 'Multi-room scheduling', 'All profession-specific modules', 'Consent & compliance tracking', 'Staff commissions & reporting', 'Priority support'],
        cta: 'Book a Demo',
        highlight: true,
    },
    {
        name: 'Multi-Location',
        price: 'Custom',
        period: '',
        description: 'For growing brands operating across multiple clinic locations.',
        features: ['Unlimited practitioner seats', 'Unlimited locations', 'Dedicated account manager', 'Custom onboarding & migration', 'SSO & advanced security controls', 'Service-level agreement'],
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
    return (
        <PublicLayout>
            <Head title="Pricing" />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">Simple Pricing</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                        Plans That{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Grow</em> With Your Practice
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
                        No hidden fees, no per-module upsells. Pick the plan that matches your team size today.
                    </p>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={`rounded-3xl p-8 flex flex-col ${plan.highlight
                                ? 'text-white shadow-2xl relative overflow-hidden'
                                : 'bg-white border border-purple-100 shadow-sm'}`}
                            style={plan.highlight ? { background: '#1E0B3C' } : undefined}
                        >
                            {plan.highlight && (
                                <div className="absolute -bottom-8 -right-8 rounded-full blur-2xl pointer-events-none" style={{ width: 160, height: 160, background: 'rgba(124,58,237,0.25)' }} />
                            )}

                            <div className="relative z-10 flex flex-col flex-1">
                                {plan.highlight && (
                                    <span className="inline-flex self-start items-center bg-[#5B2EFF] text-white text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full mb-4">
                                        Most Popular
                                    </span>
                                )}
                                <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-[#1E0B3C]'}`}>{plan.name}</h3>
                                <p className={`text-sm leading-relaxed mb-6 ${plan.highlight ? 'text-purple-200' : 'text-slate-500'}`}>{plan.description}</p>

                                <div className="mb-6">
                                    <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-[#1E0B3C]'}`}>{plan.price}</span>
                                    <span className={`text-sm ${plan.highlight ? 'text-purple-300' : 'text-slate-400'}`}>{plan.period}</span>
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-start gap-3">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                                                <Check className={`w-3 h-3 ${plan.highlight ? 'text-violet-300' : 'text-[#5B2EFF]'}`} strokeWidth={3} />
                                            </span>
                                            <span className={`text-sm leading-relaxed ${plan.highlight ? 'text-purple-100' : 'text-slate-600'}`}>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button href="/contact" variant={plan.highlight ? 'white' : 'solid'} className="w-full">
                                    {plan.cta}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            Pricing <em className="not-italic font-light font-serif text-[#5B2EFF]">Questions</em>
                        </h2>
                    </div>
                    <Accordion items={PRICING_FAQS} />
                </div>
            </section>
        </PublicLayout>
    );
}
