import React from 'react';
import { Head } from '@inertiajs/react';
import {
    CalendarCheck,
    FolderHeart,
    FileText,
    ShieldCheck,
    CreditCard,
    BarChart3,
    Sparkles,
    Check,
    Shield,
    Lock,
    Zap,
    Clock,
} from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import CTABanner from '@/Components/Home/CTABanner';

const FEATURES = [
    {
        id: 'booking',
        number: '01',
        title: 'Online Booking',
        tag: 'Scheduling & Intake',
        description:
            'Client-facing self-booking synchronized with real-time practitioner schedules, room availability, smart intake pre-requisites, and automated SMS & email reminders.',
        icon: CalendarCheck,
        accent: {
            iconBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-600 ring-1 ring-indigo-200/70',
            tag: 'text-indigo-700 bg-indigo-50/80 border-indigo-200/60',
            pill: 'bg-indigo-50/60 text-indigo-800 border-indigo-100',
            borderHover: 'hover:border-indigo-300/80 hover:shadow-indigo-500/10',
        },
        highlights: ['Real-Time Availability', 'Automated Reminders', 'Intake Integration'],
        isFeatured: false,
    },
    {
        id: 'records',
        number: '02',
        title: 'Client Records',
        tag: 'Unified Health Record',
        description:
            'A single, longitudinal health record across every modality. Access complete treatment histories, medical intake files, contraindication flags, and cross-discipline notes in one secure view.',
        icon: FolderHeart,
        accent: {
            iconBg: 'bg-gradient-to-br from-rose-50 to-rose-100/80 text-rose-600 ring-1 ring-rose-200/70',
            tag: 'text-rose-700 bg-rose-50/80 border-rose-200/60',
            pill: 'bg-rose-50/60 text-rose-800 border-rose-100',
            borderHover: 'hover:border-rose-300/80 hover:shadow-rose-500/10',
        },
        highlights: ['Single Source of Truth', 'Contraindication Alerts', 'Timeline View'],
        isFeatured: false,
    },
    {
        id: 'notes',
        number: '03',
        title: 'Profession-Specific Notes',
        tag: 'Flagship Clinical Engine',
        description:
            'Purpose-built clinical templates configured for how your practitioners actually assess and treat. Standardize documentation with interactive body mapping for massage, meridian charts for acupuncture, range-of-motion assessments for physio, and dietary logs for nutrition.',
        icon: FileText,
        accent: {
            iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-600 ring-1 ring-amber-200/70',
            tag: 'text-amber-800 bg-amber-50 border-amber-200/80',
            pill: 'bg-amber-50/60 text-amber-800 border-amber-100',
            borderHover: 'hover:border-amber-300/80 hover:shadow-amber-500/10',
        },
        highlights: [
            'Interactive Body Mapping',
            'TCM Meridian Points',
            'Customizable SOAP Forms',
            'Range of Motion',
            'Nutritional Logs',
        ],
        isFeatured: true,
    },
    {
        id: 'consent',
        number: '04',
        title: 'Consent Management',
        tag: 'HIPAA & Audit Trail',
        description:
            'Digitally capture, store, and verify signed informed consent documents. Enforce clinic policies with cryptographic timestamps, client IP logging, and automatic expiration alerts.',
        icon: ShieldCheck,
        accent: {
            iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-600 ring-1 ring-blue-200/70',
            tag: 'text-blue-700 bg-blue-50/80 border-blue-200/60',
            pill: 'bg-blue-50/60 text-blue-800 border-blue-100',
            borderHover: 'hover:border-blue-300/80 hover:shadow-blue-500/10',
        },
        highlights: ['Cryptographic Audit Trail', 'Digital E-Signatures', 'Auto-Expiration Rules'],
        isFeatured: false,
    },
    {
        id: 'payments',
        number: '05',
        title: 'Payments & Invoicing',
        tag: 'Revenue Cycle',
        description:
            'Process in-person and online payments with ease. Manage prepaid treatment packages, multi-tier memberships, compliant insurance receipts, and automated staff commission calculations.',
        icon: CreditCard,
        accent: {
            iconBg: 'bg-gradient-to-br from-teal-50 to-teal-100/80 text-teal-600 ring-1 ring-teal-200/70',
            tag: 'text-teal-700 bg-teal-50/80 border-teal-200/60',
            pill: 'bg-teal-50/60 text-teal-800 border-teal-100',
            borderHover: 'hover:border-teal-300/80 hover:shadow-teal-500/10',
        },
        highlights: ['Split Commission Engine', 'Membership Packages', 'Insurance Receipts'],
        isFeatured: false,
    },
    {
        id: 'reporting',
        number: '06',
        title: 'Real-Time Reporting',
        tag: 'Practice Analytics',
        description:
            'Turn practice activity into operational clarity. Track practitioner utilization rates, modality revenue contribution, client retention cohorts, and tax-ready financial statements across all locations.',
        icon: BarChart3,
        accent: {
            iconBg: 'bg-gradient-to-br from-red-50 to-red-100/80 text-red-600 ring-1 ring-red-200/70',
            tag: 'text-red-700 bg-red-50/80 border-red-200/60',
            pill: 'bg-red-50/60 text-red-800 border-red-100',
            borderHover: 'hover:border-red-300/80 hover:shadow-red-500/10',
        },
        highlights: ['Room & Staff Utilization', 'Retention Cohorts', 'Multi-Location Rollup'],
        isFeatured: false,
    },
];

const TRUST_METRICS = [
    { icon: Shield, label: 'HIPAA & PHIPA Ready', sub: 'Audited compliance standards' },
    { icon: Lock, label: '256-Bit TLS Encryption', sub: 'End-to-end data security' },
    { icon: Zap, label: '99.99% Availability', sub: 'Reliable cloud infrastructure' },
    { icon: Clock, label: 'Multi-Tenant Isolation', sub: 'Strict tenant data boundaries' },
];

export default function Features() {
    return (
        <PublicLayout>
            <Head title="Features — Practice Management Unified" />

            {/* Header with ambient backdrop */}
            <section
                className="relative overflow-hidden pt-16 pb-12 md:pt-24 md:pb-16 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#FBF9FD] via-[#FAF7FC] to-[#F5F2F9]"
                aria-labelledby="features-heading"
            >
                {/* Subtle clinical background mesh grid */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, rgba(91, 46, 255, 0.08) 1px, transparent 0)',
                        backgroundSize: '24px 24px',
                    }}
                    aria-hidden="true"
                />

                {/* Ambient glow discs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                    <div className="absolute -top-32 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 -left-20 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100/80 text-[#5B2EFF] border border-purple-200/70 shadow-xs mb-5">
                        <Sparkles className="w-3.5 h-3.5 text-[#5B2EFF]" aria-hidden="true" />
                        <span>Practice Management Platform</span>
                    </div>

                    <h1
                        id="features-heading"
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1E0B3C] tracking-tight leading-[1.15]"
                    >
                        Everything Your Practice Needs,{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Unified</em>
                    </h1>

                    <p className="text-slate-600 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        Booking, records, consent, billing, and reporting — UMAHZ replaces disconnected tools
                        with one cohesive workspace engineered specifically for multi-modality clinics.
                    </p>
                </div>
            </section>

            {/* Main Features Grid */}
            <section
                className="relative py-12 md:py-16 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#F5F2F9] via-white to-[#FBF9FD]"
                aria-label="Core platform features"
            >
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 items-stretch">
                        {FEATURES.map((f) => {
                            const IconComponent = f.icon;
                            return (
                                <article
                                    key={f.id}
                                    className={`group relative bg-white/95 rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(30,11,60,0.06),0_1px_3px_0_rgba(30,11,60,0.04)] hover:shadow-[0_20px_35px_-10px_rgba(91,46,255,0.12),0_6px_16px_-4px_rgba(30,11,60,0.06)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-1.5 motion-reduce:transform-none motion-reduce:transition-none flex flex-col justify-between overflow-hidden focus-within:ring-2 focus-within:ring-[#5B2EFF] focus-within:ring-offset-2 ${
                                        f.accent.borderHover
                                    } ${f.isFeatured ? 'lg:col-span-2' : 'col-span-1'}`}
                                >
                                    {/* Subtle large watermark number */}
                                    <span
                                        className="absolute top-2 right-4 font-mono font-black text-6xl text-slate-100/70 select-none pointer-events-none transition-colors duration-300 group-hover:text-slate-200/60"
                                        aria-hidden="true"
                                    >
                                        {f.number}
                                    </span>

                                    <div>
                                        {/* Card Top Row: Icon and Tag Badge */}
                                        <div className="flex items-center justify-between gap-3 mb-5">
                                            <div
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs transition-transform duration-300 motion-safe:group-hover:scale-105 motion-reduce:transform-none ${f.accent.iconBg}`}
                                            >
                                                <IconComponent className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-xs ${f.accent.tag}`}
                                                >
                                                    {f.tag}
                                                </span>
                                                <span
                                                    className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200/80 bg-slate-50 text-slate-500 tabular-nums select-none"
                                                    title={`Feature ${f.number}`}
                                                >
                                                    {f.number}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title & Description with high-contrast text */}
                                        <h2 className="text-xl font-bold text-[#1E0B3C] tracking-tight mb-2.5">
                                            {f.title}
                                        </h2>

                                        <p className="text-slate-600 text-sm sm:text-[14.5px] leading-relaxed mb-6 font-normal">
                                            {f.description}
                                        </p>
                                    </div>

                                    {/* Highlights Pills */}
                                    <div className="pt-4 border-t border-slate-100/90 mt-auto">
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {f.highlights.map((item) => (
                                                <span
                                                    key={item}
                                                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${f.accent.pill}`}
                                                >
                                                    <Check className="w-3 h-3 opacity-75" strokeWidth={2.5} aria-hidden="true" />
                                                    <span>{item}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* Trust Signals Strip */}
                    <div className="mt-12 lg:mt-16 rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-xs p-6 sm:p-8 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            {TRUST_METRICS.map((metric, idx) => {
                                const MetricIcon = metric.icon;
                                return (
                                    <div
                                        key={metric.label}
                                        className={`flex items-center gap-3.5 ${
                                            idx > 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5B2EFF] border border-purple-100/70 flex items-center justify-center flex-shrink-0">
                                            <MetricIcon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-[#1E0B3C] leading-snug">
                                                {metric.label}
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                                {metric.sub}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
