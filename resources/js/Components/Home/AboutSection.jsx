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

export default function AboutSection() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.12, 0.1, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const featuredCardEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <section id="about" className="py-16 md:py-24 bg-white dark:bg-[#0E1422] transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                {/* Centered header */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="text-center max-w-3xl mx-auto mb-14 space-y-4"
                >
                    <PillBadge text="About UMAHZ" />

                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Built For Modern{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Holistic</em>{' '}
                        Health Practices
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed font-normal">
                        UMAHZ is a cloud-native, multi-tenant platform that replaces fragmented tools with one unified workspace — connecting practitioners, treatment rooms, and clients seamlessly.
                    </p>

                    <div className="pt-2">
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

                {/* Content row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                    {/* Dark Demo card (8 cols) with stronger entrance (fade + scale from 0.97) */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={featuredCardEntrance}
                        className="lg:col-span-8 relative group rounded-2xl overflow-hidden shadow-xl border border-purple-100 dark:border-violet-500/35 bg-[#1E0B3C] dark:bg-gradient-to-br dark:from-[#18112A] dark:to-[#0F0A1C] dark:shadow-[0_0_35px_-5px_rgba(124,58,237,0.25)] flex flex-col justify-between transition-all duration-300"
                        style={{ minHeight: 360 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2A1054] via-[#5B2EFF]/60 to-[#1E0B3C] dark:from-[#220E44] dark:via-[#4C1D95]/40 dark:to-[#0F0A1C] opacity-90 pointer-events-none" />
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

                        <div className="relative z-10 flex flex-col items-center justify-center p-10 text-center flex-1" style={{ minHeight: 280 }}>
                            {/* Play button with hover pulse ring */}
                            <motion.button
                                type="button"
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                                variants={buttonHover}
                                aria-label="Play product walkthrough video"
                                className="relative w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 flex items-center justify-center mb-5 flex-shrink-0 shadow-lg cursor-pointer transition-colors"
                            >
                                {!shouldReduceMotion && (
                                    <motion.span
                                        variants={{
                                            rest: { scale: 1, opacity: 0 },
                                            hover: {
                                                scale: [1, 1.3, 1.5],
                                                opacity: [0.7, 0.3, 0],
                                                transition: { duration: 1.2, repeat: Infinity, ease: 'easeOut' },
                                            },
                                        }}
                                        className="absolute inset-0 rounded-full border border-white pointer-events-none"
                                    />
                                )}
                                <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="white">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </motion.button>
                            <p className="text-white text-xl font-bold mb-2 tracking-tight">See UMAHZ In Action</p>
                            <p className="text-purple-200 text-sm">2-minute product walkthrough</p>
                        </div>

                        <div className="relative z-10 flex items-center justify-between px-6 py-4 bg-black/25 dark:bg-black/40 border-t border-white/10">
                            <div>
                                <p className="text-purple-300 dark:text-purple-200 text-[10px] uppercase tracking-[0.1em] font-semibold">Interactive Demo</p>
                                <p className="text-white text-sm font-bold mt-0.5">Unified Clinical Workspace</p>
                            </div>
                            <span className="bg-white/10 dark:bg-white/15 border border-white/20 px-3 py-1 rounded-full text-white text-xs font-semibold flex-shrink-0">
                                2:45 min
                            </span>
                        </div>
                    </motion.div>

                    {/* Side cards (4 cols) with staggered entrance */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="lg:col-span-4 flex flex-col gap-5"
                    >
                        {/* Benefit Card 1 */}
                        <motion.div
                            variants={cardEntrance}
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="group flex-1 bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/70 border border-violet-200/60 dark:border-violet-800/50 flex items-center justify-center mb-4 flex-shrink-0 text-[#5B2EFF] dark:text-[#8B6BFF] transition-transform duration-200 group-hover:scale-105">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">Built To Save You Time</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 font-normal">
                                Automated intake forms, instant SOAP charting, and one-click online booking eliminate front-desk overhead.
                            </p>
                        </motion.div>

                        {/* Benefit Card 2 */}
                        <motion.div
                            variants={cardEntrance}
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="group flex-1 bg-[#F9F5FB] dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-pink-500/40 transition-all duration-300 flex flex-col"
                        >
                            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/70 border border-pink-200/60 dark:border-pink-800/50 flex items-center justify-center mb-4 flex-shrink-0 text-pink-600 dark:text-pink-400 transition-transform duration-200 group-hover:scale-105">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                            </div>
                            <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 tracking-tight">Enterprise-Grade Security</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 font-normal">
                                HIPAA & PIPEDA compliant, role-based access controls, complete audit trails, and encrypted data at rest and in transit.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
