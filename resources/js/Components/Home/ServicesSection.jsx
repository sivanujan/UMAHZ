import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    EASING,
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createFadeInScale,
    createCardHover,
} from '@/Utils/motion';

const SERVICES = [
    {
        title: 'Massage Therapy',
        desc: 'Body-map charting, multi-room scheduling, treatment packages, and automated reminders for RMTs.',
        iconPath: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg: 'bg-[#ede9fe] dark:bg-purple-950/70 border border-purple-200/50 dark:border-purple-800/50 text-[#5B2EFF] dark:text-purple-300',
    },
    {
        title: 'Acupuncture & TCM',
        desc: 'Meridian charts, herbal formula inventory, custom tongue/pulse forms, and TCM-specific SOAP templates.',
        iconPath: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
        iconBg: 'bg-[#fce7f3] dark:bg-pink-950/70 border border-pink-200/50 dark:border-pink-800/50 text-pink-600 dark:text-pink-300',
    },
    {
        title: 'Personal Training',
        desc: 'Fitness assessments, workout plan assignments, progress tracking, package management, and commissions.',
        iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
        iconBg: 'bg-[#fef3c7] dark:bg-amber-950/70 border border-amber-200/50 dark:border-amber-800/50 text-amber-600 dark:text-amber-300',
    },
    {
        title: 'Nutrition & Dietetics',
        desc: 'Meal plan builders, macronutrient templates, telehealth consultations, and secure client messaging.',
        iconPath: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
        iconBg: 'bg-[#ccfbf1] dark:bg-teal-950/70 border border-teal-200/50 dark:border-teal-800/50 text-teal-600 dark:text-teal-300',
    },
];

export default function ServicesSection() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.09, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const featuredCardEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <section id="services" className="py-16 md:py-24 bg-[#F9F5FB] dark:bg-[#0B0F19] transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                {/* Section Header */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end mb-12"
                >
                    <div className="space-y-3">
                        <PillBadge text="Supported Modalities" />
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            Purpose-Built for Modern Health &{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Wellness</em>{' '}
                            Professionals
                        </h2>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed lg:text-right font-normal">
                        Whether you run a solo practice or an integrated multi-practitioner clinic, UMAHZ adapts to your specific clinical and administrative needs.
                    </p>
                </motion.div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* 2×2 service cards (8 cols) with staggered entrance */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6"
                    >
                        {SERVICES.map((svc) => (
                            <motion.div
                                key={svc.title}
                                variants={cardEntrance}
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className="group bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 flex-shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${svc.iconBg}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={svc.iconPath} />
                                        </svg>
                                    </div>
                                    <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">{svc.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5 font-normal">{svc.desc}</p>
                                </div>

                                <a
                                    href="#booking"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B2EFF] dark:text-[#8B6BFF] hover:text-purple-800 dark:hover:text-purple-300 transition-colors pt-3 border-t border-purple-50 dark:border-slate-800/80"
                                >
                                    <span>Learn More</span>
                                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                                        →
                                    </span>
                                </a>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Featured Dark CTA card (4 cols) with stronger entrance (fade + scale from 0.97) */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={featuredCardEntrance}
                        className="group lg:col-span-4 rounded-2xl p-8 shadow-xl text-white flex flex-col justify-between relative overflow-hidden bg-[#1E0B3C] dark:bg-gradient-to-br dark:from-[#18112A] dark:to-[#0F0A1C] border border-purple-900/40 dark:border-violet-500/40 dark:shadow-[0_0_35px_-5px_rgba(124,58,237,0.25)] transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="absolute -bottom-8 -right-8 rounded-full blur-2xl pointer-events-none w-40 h-40 bg-purple-600/25" />

                        <div className="space-y-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                                <svg className="w-5 h-5" fill="none" stroke="#c4b5fd" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                </svg>
                            </div>
                            <span className="block text-[10px] font-bold tracking-[0.14em] uppercase text-pink-300">Also Available</span>
                            <h3 className="text-xl font-bold text-white leading-snug tracking-tight">Colon Hydrotherapy Management</h3>
                            <p className="text-purple-200 text-sm leading-relaxed font-normal">
                                Sterilization logs, equipment tracking, session protocols, and privacy-first consent management for colon hydrotherapy centers.
                            </p>
                        </div>

                        <div className="pt-6 relative z-10">
                            <a
                                href="#booking"
                                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                            >
                                <span>Learn More</span>
                                <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                                    →
                                </span>
                            </a>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
