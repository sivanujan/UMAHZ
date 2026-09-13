import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    EASING,
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createCardHover,
    createButtonHover,
} from '@/Utils/motion';

const MODULES = [
    { initials: 'MT', name: 'Massage Therapy Module', specialty: 'Body mapping · Room scheduling · SOAP charting', bg: 'linear-gradient(135deg, #a78bfa, #6366f1)' },
    { initials: 'AC', name: 'Acupuncture & TCM Module', specialty: 'Meridian charts · Herbal inventory · Pulse assessment', bg: 'linear-gradient(135deg, #f472b6, #f43f5e)' },
    { initials: 'PT', name: 'Personal Training Module', specialty: 'Workout plans · Progress tracking · Commissions', bg: 'linear-gradient(135deg, #fbbf24, #f97316)' },
];

const SOCIAL_PATHS = [
    'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z',
    'M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z',
    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
];

export default function DoctorsSection() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.09, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);

    return (
        <section id="team" className="py-16 md:py-24 bg-white dark:bg-[#0E1422] transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
                >
                    <div className="space-y-3 max-w-2xl">
                        <PillBadge text="Platform Modules" />
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            Explore Our{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Specialty</em>{' '}
                            Practice Modules
                        </h2>
                    </div>
                    <motion.a
                        href="#services"
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                        variants={buttonHover}
                        className="inline-flex items-center bg-[#F9F5FB] dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-[#5B2EFF] dark:text-purple-300 border border-purple-200 dark:border-slate-700 font-medium px-6 py-3 rounded-full transition-colors text-sm flex-shrink-0 cursor-pointer shadow-xs"
                    >
                        View All Modules
                    </motion.a>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    {MODULES.map((m) => (
                        <motion.div
                            key={m.name}
                            variants={cardEntrance}
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="bg-[#F9F5FB] dark:bg-[#131B2B] rounded-2xl p-4 border border-purple-100/90 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 group overflow-hidden"
                        >
                            {/* Card image area */}
                            <div
                                className="relative rounded-xl h-64 flex flex-col items-center justify-center overflow-hidden mb-5"
                                style={{ background: m.bg }}
                            >
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                <div className="w-18 h-18 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-3 z-10 flex-shrink-0 shadow-md transition-transform duration-200 group-hover:scale-105">
                                    <span className="text-white text-3xl font-extrabold">{m.initials}</span>
                                </div>
                                <span className="text-white/80 text-xs font-semibold z-10 tracking-wide uppercase">Module</span>
                            </div>

                            <div className="px-2 pb-2 space-y-2">
                                <h3 className="text-[#1E0B3C] dark:text-white text-lg font-bold tracking-tight">{m.name}</h3>
                                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-normal">{m.specialty}</p>

                                <div className="flex items-center gap-3 pt-3">
                                    {SOCIAL_PATHS.map((path, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            aria-label="Social link"
                                            className="w-8 h-8 rounded-full border border-purple-200/80 dark:border-slate-700 flex items-center justify-center bg-white/50 dark:bg-slate-800 hover:border-[#5B2EFF] dark:hover:border-purple-400 cursor-pointer flex-shrink-0 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5 fill-slate-500 dark:fill-slate-400" viewBox="0 0 24 24">
                                                <path d={path} />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
