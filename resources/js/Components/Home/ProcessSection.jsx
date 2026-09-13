import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    EASING,
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createFadeInScale,
    createButtonHover,
    createCardHover,
} from '@/Utils/motion';

const STEPS = [
    { num: '01', title: 'Quick Setup', desc: 'Configure locations, treatment rooms, practitioner schedules, and branded consent forms in under 15 minutes.' },
    { num: '02', title: 'Client Self-Booking', desc: 'Embed your booking portal on your website or share a link — with smart intake forms collected automatically.' },
    { num: '03', title: 'Integrated Care', desc: 'Conduct sessions, complete SOAP notes, log body charts, and update treatment plans all in one place.' },
    { num: '04', title: 'Grow & Automate', desc: 'Process payments, track package balances, manage staff commissions, and view real-time revenue analytics.' },
];

export default function ProcessSection() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const scheduleCardEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <section id="process" className="py-16 md:py-24 bg-white dark:bg-[#0E1422] transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">

                    {/* Left — decorative UI card */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={scheduleCardEntrance}
                        className="relative"
                    >
                        <div className="absolute -top-8 -left-8 rounded-full blur-3xl pointer-events-none w-64 h-64 bg-purple-200/40 dark:bg-purple-900/15" />
                        <div
                            className="relative rounded-2xl p-6 shadow-2xl text-white overflow-hidden border border-purple-100 dark:border-violet-500/40 dark:shadow-[0_0_35px_-5px_rgba(124,58,237,0.25)] transition-all duration-300"
                            style={{ background: 'linear-gradient(135deg, #1E0B3C, #5B2EFF)', minHeight: 360 }}
                        >
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                            <div className="relative z-10 space-y-3 mb-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-[#c4b5fd] text-[11px] font-semibold uppercase tracking-wider">Today's Schedule</p>
                                    <span className="bg-[#10b981] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">Live</span>
                                </div>
                                {["10:00 – Sarah M. · Massage 60min", "11:30 – James K. · Acupuncture", "14:00 – Dana P. · Nutrition Consult"].map((line, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd] flex-shrink-0 inline-block" />
                                        <p className="text-white text-xs sm:text-sm font-medium">{line}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="relative z-10 bg-white/10 border border-white/20 rounded-xl p-4">
                                <p className="text-[#c4b5fd] text-[11px] font-semibold uppercase tracking-wider mb-1">Monthly Revenue</p>
                                <p className="text-white text-2xl sm:text-3xl font-extrabold">$24,850</p>
                                <p className="text-[#10b981] text-xs mt-1 font-semibold">↑ 23% vs last month</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right text */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="space-y-5"
                    >
                        <PillBadge text="Simple Onboarding" />

                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            How UMAHZ Transforms Your{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Daily</em>{' '}
                            Practice
                        </h2>

                        <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed font-normal">
                            Designed with licensed practitioners, UMAHZ removes technical friction so you spend more time on patient care and less on administration.
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <motion.a
                                href="#booking"
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                                variants={buttonHover}
                                className="inline-flex items-center gap-2 bg-[#5B2EFF] hover:bg-purple-700 dark:bg-[#6D3BFF] dark:hover:bg-[#5B2EFF] text-white font-medium px-7 py-3.5 rounded-full shadow-lg shadow-purple-500/20 transition-colors text-sm cursor-pointer"
                            >
                                <span>Book a Demo</span>
                                <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                                    →
                                </span>
                            </motion.a>
                            <motion.a
                                href="#services"
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                                variants={buttonHover}
                                className="inline-flex items-center text-[#1E0B3C] dark:text-slate-200 hover:text-[#5B2EFF] dark:hover:text-purple-300 font-medium px-7 py-3.5 rounded-full border border-purple-200 dark:border-slate-700/80 hover:border-[#5B2EFF] dark:hover:border-purple-400 bg-white/50 dark:bg-slate-800/30 transition-all text-sm cursor-pointer shadow-xs"
                            >
                                Explore Features
                            </motion.a>
                        </div>
                    </motion.div>
                </div>

                {/* 4-column step cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {STEPS.map((step) => (
                        <motion.div
                            key={step.num}
                            variants={cardEntrance}
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="group bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300"
                        >
                            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-purple-100/80 dark:border-slate-700 text-[#5B2EFF] dark:text-[#8B6BFF] font-bold text-sm flex items-center justify-center shadow-xs mb-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                                {step.num}
                            </div>
                            <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">{step.title}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-normal">{step.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
