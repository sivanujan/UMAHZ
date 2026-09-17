import React from 'react';
import { Head } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
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
    Activity,
    ArrowRight,
} from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import CTABanner from '@/Components/Home/CTABanner';
import PillBadge from '@/Components/Common/PillBadge';
import { openComingSoonModal } from '@/Components/Common/ComingSoonModal';
import {
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createCardHover,
} from '@/Utils/motion';

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
            iconBg: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200/70 dark:ring-indigo-800/50',
            tag: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/60',
            pill: 'bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50',
            borderHover: 'hover:border-indigo-300/80 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10',
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
            iconBg: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 ring-1 ring-rose-200/70 dark:ring-rose-800/50',
            tag: 'text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800/60',
            pill: 'bg-rose-50/60 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-100 dark:border-rose-900/50',
            borderHover: 'hover:border-rose-300/80 dark:hover:border-rose-500/50 hover:shadow-rose-500/10',
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
            iconBg: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/70 dark:ring-amber-800/50',
            tag: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60',
            pill: 'bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
            borderHover: 'hover:border-amber-300/80 dark:hover:border-amber-500/50 hover:shadow-amber-500/10',
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
            iconBg: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200/70 dark:ring-blue-800/50',
            tag: 'text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60',
            pill: 'bg-blue-50/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-100 dark:border-blue-900/50',
            borderHover: 'hover:border-blue-300/80 dark:hover:border-blue-500/50 hover:shadow-blue-500/10',
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
            iconBg: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 ring-1 ring-teal-200/70 dark:ring-teal-800/50',
            tag: 'text-teal-700 dark:text-teal-300 bg-teal-50/80 dark:bg-teal-950/60 border-teal-200/60 dark:border-teal-800/60',
            pill: 'bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-100 dark:border-teal-900/50',
            borderHover: 'hover:border-teal-300/80 dark:hover:border-teal-500/50 hover:shadow-teal-500/10',
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
            iconBg: 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400 ring-1 ring-red-200/70 dark:ring-red-800/50',
            tag: 'text-red-700 dark:text-red-300 bg-red-50/80 dark:bg-red-950/60 border-red-200/60 dark:border-red-800/60',
            pill: 'bg-red-50/60 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-100 dark:border-red-900/50',
            borderHover: 'hover:border-red-300/80 dark:hover:border-red-500/50 hover:shadow-red-500/10',
        },
        highlights: ['Room & Staff Utilization', 'Retention Cohorts', 'Multi-Location Rollup'],
        isFeatured: false,
    },
    {
        id: 'motion',
        number: '07',
        title: 'UMAHZ Motion',
        tag: 'Computer Vision AI',
        isComingSoon: true,
        description:
            'Camera-based movement assessment & progress tracking. Empowers practitioners with objective, visual motion evaluations and range-of-motion tracking directly inside client records.',
        icon: Activity,
        accent: {
            iconBg: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-200/70 dark:ring-cyan-800/50',
            tag: 'text-cyan-800 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-950/60 border-cyan-200/80 dark:border-cyan-800/60',
            pill: 'bg-cyan-50/60 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/50',
            borderHover: 'hover:border-cyan-400 dark:hover:border-cyan-500/50 hover:shadow-cyan-500/15',
        },
        highlights: ['Movement Tracking', 'Range-of-Motion AI', 'Visual Progress'],
        isFeatured: false,
    },
    {
        id: 'scribe',
        number: '08',
        title: 'UMAHZ Scribe',
        tag: 'Clinical AI Assistant',
        isComingSoon: true,
        description:
            'AI-assisted clinical documentation. Converts consultation dialogue and practitioner observations into structured SOAP notes ready for rapid review and one-tap sign-off.',
        icon: FileText,
        accent: {
            iconBg: 'bg-purple-50 dark:bg-purple-950/70 text-[#5B2EFF] dark:text-purple-300 ring-1 ring-purple-200/70 dark:ring-purple-800/50',
            tag: 'text-purple-800 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800/60',
            pill: 'bg-purple-50/60 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-100 dark:border-purple-900/50',
            borderHover: 'hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-purple-500/15',
        },
        highlights: ['Automated SOAP Notes', 'Voice Consultation', 'Practitioner Sign-off'],
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
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title="Features — Practice Management Unified" />

            {/* Header with ambient backdrop */}
            <section
                className="relative overflow-hidden pt-16 pb-12 md:pt-24 md:pb-16 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#FBF9FD] via-[#FAF7FC] to-[#F5F2F9] dark:from-[#0B0F19] dark:via-[#0D1220] dark:to-[#0B0F19] transition-colors duration-300"
                aria-labelledby="features-heading"
            >
                {/* Subtle clinical background mesh grid */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, rgba(91, 46, 255, 0.12) 1px, transparent 0)',
                        backgroundSize: '24px 24px',
                    }}
                    aria-hidden="true"
                />

                {/* Ambient glow discs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                    <div className="absolute -top-32 right-1/4 w-96 h-96 bg-purple-200/40 dark:bg-purple-900/15 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 -left-20 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/15 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="relative max-w-4xl mx-auto text-center"
                >
                    <div className="mb-5">
                        <PillBadge text="Practice Management Platform" />
                    </div>

                    <h1
                        id="features-heading"
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1E0B3C] dark:text-white tracking-tight leading-[1.15]"
                    >
                        Everything Your Practice Needs,{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Unified</em>
                    </h1>

                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        Booking, records, consent, billing, and reporting — UMAHZ replaces disconnected tools
                        with one cohesive workspace engineered specifically for multi-modality clinics.
                    </p>
                </motion.div>
            </section>

            {/* Main Features Grid */}
            <section
                className="relative py-12 md:py-16 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#F5F2F9] via-white to-[#FBF9FD] dark:from-[#0B0F19] dark:via-[#0E1422] dark:to-[#0B0F19] transition-colors duration-300"
                aria-label="Core platform features"
            >
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 items-stretch"
                    >
                        {FEATURES.map((f) => {
                            const IconComponent = f.icon;
                            return (
                                <motion.article
                                    key={f.id}
                                    variants={cardEntrance}
                                    initial="rest"
                                    whileHover="hover"
                                    {...cardHover}
                                    onClick={f.isComingSoon ? openComingSoonModal : undefined}
                                    className={`group relative bg-white dark:bg-[#131B2B] rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_-2px_rgba(30,11,60,0.06),0_1px_3px_0_rgba(30,11,60,0.04)] hover:shadow-[0_20px_35px_-10px_rgba(91,46,255,0.12),0_6px_16px_-4px_rgba(30,11,60,0.06)] dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden focus-within:ring-2 focus-within:ring-[#5B2EFF] focus-within:ring-offset-2 ${
                                        f.accent.borderHover
                                    } ${f.isFeatured ? 'lg:col-span-2' : 'col-span-1'} ${
                                        f.isComingSoon ? 'cursor-pointer ring-1 ring-purple-200/60 dark:ring-purple-800/60' : ''
                                    }`}
                                >
                                    {/* Subtle large watermark number */}
                                    <span
                                        className="absolute top-2 right-4 font-mono font-black text-6xl text-slate-100/70 dark:text-slate-800/40 select-none pointer-events-none transition-colors duration-300 group-hover:text-slate-200/60 dark:group-hover:text-slate-700/50"
                                        aria-hidden="true"
                                    >
                                        {f.number}
                                    </span>

                                    <div>
                                        {/* Card Top Row: Icon and Tag Badge */}
                                        <div className="flex items-center justify-between gap-3 mb-5">
                                            <div
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105 ${f.accent.iconBg}`}
                                            >
                                                <IconComponent className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {f.isComingSoon && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-950 dark:to-indigo-950 text-[#5B2EFF] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
                                                        <Sparkles className="w-2.5 h-2.5 text-[#5B2EFF] dark:text-purple-300" />
                                                        Coming Soon
                                                    </span>
                                                )}
                                                <span
                                                    className={`inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-xs ${f.accent.tag}`}
                                                >
                                                    {f.tag}
                                                </span>
                                                <span
                                                    className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 tabular-nums select-none"
                                                    title={`Feature ${f.number}`}
                                                >
                                                    {f.number}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title & Description with high-contrast text */}
                                        <h2 className="text-xl font-bold text-[#1E0B3C] dark:text-white tracking-tight mb-2.5 flex items-center gap-2">
                                            {f.title}
                                        </h2>

                                        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-[14.5px] leading-relaxed mb-6 font-normal">
                                            {f.description}
                                        </p>
                                    </div>

                                    {/* Highlights Pills or Coming Soon Action */}
                                    <div className="pt-4 border-t border-slate-100/90 dark:border-slate-800/80 mt-auto">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
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

                                            {f.isComingSoon && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openComingSoonModal();
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#5B2EFF] dark:text-[#8B6BFF] hover:text-purple-900 dark:hover:text-purple-300 group-hover:translate-x-0.5 transition-all cursor-pointer mt-1"
                                                >
                                                    <span>View Details</span>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.article>
                            );
                        })}
                    </motion.div>

                    {/* Coming Soon to UMAHZ Showcase */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="mt-16 lg:mt-20"
                    >
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <div className="mb-3">
                                <PillBadge text="Roadmap Preview" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E0B3C] dark:text-white tracking-tight">
                                Coming Soon to UMAHZ
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mt-2 font-normal">
                                We're continually advancing practice technology. Here is what our engineering team is actively building.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                            {/* Motion Card */}
                            <motion.div
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/20 dark:from-[#131B2B] dark:via-[#132238] dark:to-[#0F1B2B] border border-cyan-100/80 dark:border-cyan-900/50 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-5">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-100/90 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                            Coming Soon
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1E0B3C] dark:text-white tracking-tight mb-2">
                                        UMAHZ Motion
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 font-normal">
                                        Camera-based movement assessment & progress tracking. Empowering practitioners with objective, visual motion evaluations directly inside client records.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-cyan-100/60 dark:border-cyan-900/40 flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Computer Vision Assessment</span>
                                    <button
                                        type="button"
                                        onClick={openComingSoonModal}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-200 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                                    >
                                        <span>View Details</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>

                            {/* Scribe Card */}
                            <motion.div
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 dark:from-[#131B2B] dark:via-[#1A1635] dark:to-[#120F24] border border-indigo-100/80 dark:border-purple-900/50 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-5">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-[#5B2EFF] dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-100/90 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                            Coming Soon
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1E0B3C] dark:text-white tracking-tight mb-2">
                                        UMAHZ Scribe
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 font-normal">
                                        AI-assisted clinical documentation. Converts consultation observations into accurate, structured SOAP notes ready for practitioner review and signature.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-indigo-100/60 dark:border-purple-900/40 flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Clinical AI Assistant</span>
                                    <button
                                        type="button"
                                        onClick={openComingSoonModal}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B2EFF] dark:text-[#8B6BFF] hover:text-purple-900 dark:hover:text-purple-200 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                                    >
                                        <span>View Details</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Trust Signals Strip */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="mt-12 lg:mt-16 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#131B2B] backdrop-blur-xs p-6 sm:p-8 shadow-sm"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
                            {TRUST_METRICS.map((metric, idx) => {
                                const MetricIcon = metric.icon;
                                return (
                                    <div
                                        key={metric.label}
                                        className={`flex items-center gap-3.5 ${
                                            idx > 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-[#5B2EFF] dark:text-purple-300 border border-purple-100/70 dark:border-purple-800/50 flex items-center justify-center flex-shrink-0">
                                            <MetricIcon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-bold text-[#1E0B3C] dark:text-white leading-snug">
                                                {metric.label}
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {metric.sub}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
