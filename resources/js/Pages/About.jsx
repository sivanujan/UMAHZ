import React from 'react';
import { Head } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Target,
    Eye,
    HeartHandshake,
    ShieldCheck,
    Layers,
    Users2,
    LayoutDashboard,
    ClipboardCheck,
    Stethoscope,
    Mountain,
} from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import CTABanner from '@/Components/Home/CTABanner';
import PillBadge from '@/Components/Common/PillBadge';
import {
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createFadeInScale,
    createCardHover,
} from '@/Utils/motion';

const VALUES = [
    {
        icon: HeartHandshake,
        iconBg: 'bg-purple-100 dark:bg-purple-950/70 border border-purple-200/60 dark:border-purple-800/50 text-[#5B2EFF] dark:text-purple-300',
        title: 'Practitioner-First',
        description: 'Every workflow is designed with real practitioners, not just imagined personas.',
    },
    {
        icon: ShieldCheck,
        iconBg: 'bg-pink-100 dark:bg-pink-950/70 border border-pink-200/60 dark:border-pink-800/50 text-[#db2777] dark:text-pink-300',
        title: 'Privacy By Design',
        description: 'Client trust is earned by treating consent and data protection as core features, not afterthoughts.',
    },
    {
        icon: Layers,
        iconBg: 'bg-amber-100 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/50 text-[#d97706] dark:text-amber-300',
        title: 'Built For Every Modality',
        description: "We don't force massage, TCM, training, and nutrition into one generic form.",
    },
    {
        icon: Users2,
        iconBg: 'bg-teal-100 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/50 text-[#0f766e] dark:text-teal-300',
        title: 'Continuous Partnership',
        description: "Onboarding doesn't end at go-live — our team stays close as your practice grows.",
    },
];

const NAME_MEANING = [
    { letter: 'U', word: 'Unified', icon: Layers, color: '#5B2EFF', image: '/imags/about/unified.jpg' },
    { letter: 'M', word: 'Management', icon: LayoutDashboard, color: '#db2777', image: '/imags/about/management.jpg' },
    { letter: 'A', word: 'Assessment', icon: ClipboardCheck, color: '#d97706', image: '/imags/about/assessment.jpg' },
    { letter: 'H', word: 'Healthcare', icon: Stethoscope, color: '#0f766e', image: '/imags/about/healthcare.jpg' },
    { letter: 'Z', word: 'Zenith', icon: Mountain, color: '#dc2626', image: '/imags/about/zenith.jpg' },
];

const TEAM = [
    { initials: 'JM', name: 'Jordan Mercer', role: 'Co-Founder & CEO', bg: 'linear-gradient(135deg, #a78bfa, #6366f1)' },
    { initials: 'PK', name: 'Priya Kapoor', role: 'Co-Founder & Head of Product', bg: 'linear-gradient(135deg, #f472b6, #f43f5e)' },
    { initials: 'DO', name: 'Daniel Osei', role: 'Head of Clinical Design', bg: 'linear-gradient(135deg, #fbbf24, #f97316)' },
    { initials: 'RL', name: 'Rachel Lindqvist', role: 'Head of Security & Compliance', bg: 'linear-gradient(135deg, #34d399, #06b6d4)' },
];

export default function About() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const missionEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title="About — Built For Modern Holistic Practice" />

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
                        <PillBadge text="About UMAHZ" />
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Built By People Who{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Understand</em> Wellness Practices
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        UMAHZ is a cloud-native, multi-tenant platform that replaces fragmented tools with one unified workspace for holistic health practices.
                    </p>
                </motion.div>
            </section>

            {/* Mission / Vision */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* Mission Card */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={missionEntrance}
                        className="lg:col-span-8 relative rounded-2xl overflow-hidden shadow-xl border border-purple-100 dark:border-violet-500/40 dark:shadow-[0_0_35px_-5px_rgba(124,58,237,0.25)] p-10 flex flex-col justify-center bg-[#1E0B3C] dark:bg-[#161226] text-white transition-all duration-300"
                        style={{ minHeight: 320 }}
                    >
                        <div
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
                        />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mb-5 shadow-xs">
                                <Target className="w-7 h-7 text-white" strokeWidth={1.8} />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-purple-300 mb-3">Our Mission</p>
                            <p className="text-white text-xl md:text-2xl font-bold leading-snug max-w-lg tracking-tight">
                                Give every wellness practitioner one unified system of record — so administration never gets in the way of care.
                            </p>
                        </div>
                    </motion.div>

                    {/* Vision & Approach */}
                    <div className="lg:col-span-4 flex flex-col gap-5">
                        <motion.div
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="group flex-1 bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/70 border border-violet-200/60 dark:border-violet-800/50 flex items-center justify-center mb-4 flex-shrink-0 text-[#5B2EFF] dark:text-[#8B6BFF] transition-transform duration-200 group-hover:scale-105">
                                <Eye className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">Our Vision</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 font-normal">
                                A world where every modality — from massage to TCM to nutrition — has documentation tools built for how it actually practices.
                            </p>
                        </motion.div>

                        <motion.div
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="group flex-1 bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-pink-500/40 transition-all duration-300 flex flex-col"
                        >
                            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/70 border border-pink-200/60 dark:border-pink-800/50 flex items-center justify-center mb-4 flex-shrink-0 text-[#db2777] dark:text-pink-400 transition-transform duration-200 group-hover:scale-105">
                                <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">Our Approach</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 font-normal">
                                Profession-specific charting, privacy-first consent, and multi-tenant architecture built from the ground up — not bolted on.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Why we built UMAHZ */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Why We Built{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">UMAHZ</em>
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 font-normal">
                        UMAHZ started after watching a multi-modality clinic run their massage, acupuncture, and nutrition practitioners on five different tools — one for booking, one for charting, one for billing, and spreadsheets to hold it all together. Every new modality meant another workaround. We built UMAHZ so clinics never have to choose between the right software for one profession and a single source of truth for the whole practice.
                    </p>
                </motion.div>
            </section>

            {/* The Meaning Behind UMAHZ */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        The Meaning Behind <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">UMAHZ</em>
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 font-normal">
                        UMAHZ stands for our mission — bringing wellness practice management together in one place.
                    </p>
                </motion.div>

                <motion.ul
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    className="max-w-5xl mx-auto mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 list-none"
                >
                    {NAME_MEANING.map((n) => (
                        <motion.li
                            key={n.letter}
                            variants={cardEntrance}
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col items-center text-center group"
                        >
                            <div className="relative mb-4">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-1.5 bg-white dark:bg-slate-800 border border-purple-100/80 dark:border-slate-700 shadow-sm transition-transform duration-300 group-hover:scale-105">
                                    <img
                                        src={n.image}
                                        alt={`${n.letter} - ${n.word}`}
                                        className="w-full h-full object-cover rounded-xl"
                                        loading="lazy"
                                    />
                                </div>
                                <span
                                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full text-white text-xs font-black shadow-md flex items-center justify-center ring-2 ring-white dark:ring-slate-800"
                                    style={{ background: n.color }}
                                >
                                    {n.letter}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="text-xs font-black px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-purple-100/80 dark:border-slate-700 shadow-2xs"
                                    style={{ color: n.color }}
                                >
                                    {n.letter}
                                </span>
                                <h3 className="text-[#1E0B3C] dark:text-white font-bold text-sm md:text-base tracking-tight">{n.word}</h3>
                            </div>
                        </motion.li>
                    ))}
                </motion.ul>

                <div className="max-w-2xl mx-auto mt-12">
                    <div className="rounded-2xl border border-purple-100/90 dark:border-slate-800 bg-white dark:bg-[#131B2B] px-6 py-5 shadow-sm text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B2EFF] dark:text-[#8B6BFF] mb-2">In Full</p>
                        <p className="text-lg md:text-xl font-bold text-[#1E0B3C] dark:text-white leading-snug tracking-tight">
                            Unified Management, Assessment &amp; Healthcare at its{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Zenith</em>.
                        </p>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="text-center max-w-2xl mx-auto mb-12"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            What We <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Value</em>
                        </h2>
                    </motion.div>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {VALUES.map((v) => {
                            const IconComponent = v.icon;
                            return (
                                <motion.div
                                    key={v.title}
                                    variants={cardEntrance}
                                    initial="rest"
                                    whileHover="hover"
                                    {...cardHover}
                                    className="group bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${v.iconBg}`}>
                                        <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">{v.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-normal">{v.description}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* Team */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="text-center max-w-2xl mx-auto mb-12"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            Meet The <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Team</em>
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-4 font-normal">
                            A small team of clinicians, engineers, and privacy specialists building UMAHZ full-time.
                        </p>
                    </motion.div>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {TEAM.map((t) => (
                            <motion.div
                                key={t.name}
                                variants={cardEntrance}
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className="bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 text-center"
                            >
                                <div
                                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-xs"
                                    style={{ background: t.bg }}
                                >
                                    {t.initials}
                                </div>
                                <h3 className="text-[#1E0B3C] dark:text-white font-bold text-sm tracking-tight">{t.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-normal">{t.role}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
