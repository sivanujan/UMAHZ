import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    EASING,
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createCardHover,
} from '@/Utils/motion';

const TESTIMONIALS = [
    { quote: 'UMAHZ unified our massage therapists and acupuncturists into one shared schedule. Room conflicts vanished overnight and our SOAP notes take half the time.', name: 'Dr. Amanda Ross', role: 'Clinic Director, Synergy Integrative Health', initials: 'AR', bg: 'linear-gradient(135deg, #a78bfa, #6366f1)' },
    { quote: "Managing 6 treatment rooms across colon hydrotherapy and nutrition used to be a nightmare. UMAHZ's multi-tenant architecture handles it all effortlessly.", name: 'Marcus Vance, LMT', role: 'Lead Therapist, Oasis Bodywork & Wellness', initials: 'MV', bg: 'linear-gradient(135deg, #f472b6, #f43f5e)' },
    { quote: 'Our clients love the sleek self-booking portal and automated intake forms. Package renewals increased by 35% in the first two months.', name: 'Elena Rostova', role: 'Founder, Elemental Acupuncture & TCM', initials: 'ER', bg: 'linear-gradient(135deg, #fbbf24, #f97316)' },
    { quote: 'The personalised workout and nutrition tracking templates let us provide high-touch care to every personal training client without extra admin overhead.', name: 'David Sterling', role: 'Head Coach, Apex Performance Studio', initials: 'DS', bg: 'linear-gradient(135deg, #34d399, #06b6d4)' },
    { quote: 'Transitioning to UMAHZ was smooth and painless. Their team migrated 3,000+ client histories overnight with zero downtime.', name: 'Dr. Chloe Lin', role: 'Naturopathic Practitioner, Harmony Health', initials: 'CL', bg: 'linear-gradient(135deg, #6ee7b7, #34d399)' },
    { quote: 'Having billing, consent forms, and multi-staff commission calculations in one place saves our front desk over 15 hours every single week.', name: 'Robert Morales', role: 'Operations Manager, Revival Hydrotherapy', initials: 'RM', bg: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' },
];

export default function TestimonialsSection() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <section className="py-16 md:py-24 bg-[#F9F5FB] dark:bg-[#0B0F19] transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="text-center max-w-3xl mx-auto mb-14 space-y-4"
                >
                    <PillBadge text="Practitioner Stories" />

                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Loved By{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Wellness Practices</em>{' '}
                        Everywhere
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed font-normal">
                        Real stories from practitioners who transformed their daily operations with UMAHZ.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {TESTIMONIALS.map((t) => (
                        <motion.div
                            key={t.name}
                            variants={cardEntrance}
                            initial="rest"
                            whileHover="hover"
                            {...cardHover}
                            className="bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-7 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className="w-3.5 h-3.5" fill="#fbbf24" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic mt-4 font-normal">"{t.quote}"</p>
                            </div>

                            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-purple-50 dark:border-slate-800/80">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-2xs"
                                    style={{ background: t.bg }}
                                >
                                    {t.initials}
                                </div>
                                <div>
                                    <p className="text-[#1E0B3C] dark:text-white font-bold text-sm">{t.name}</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">{t.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
