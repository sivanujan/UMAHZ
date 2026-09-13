import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    EASING,
    VIEWPORT_ONCE,
    createFadeInUp,
    createButtonHover,
} from '@/Utils/motion';

export default function CTABanner() {
    const shouldReduceMotion = useReducedMotion();
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);

    return (
        <section className="relative py-16 md:py-24 overflow-hidden bg-[#1E0B3C] dark:bg-[#0B0F19] dark:border-y dark:border-slate-800/80 transition-colors duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2A1054] via-[#5B2EFF]/35 to-[#1E0B3C] dark:from-[#1c0c38] dark:via-[#4c1d95]/20 dark:to-[#0B0F19]" />

            {/* Radial glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[600px] bg-purple-500/15 dark:bg-purple-600/10 rounded-full blur-3xl" />
            </div>

            {/* Dot pattern */}
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
            />

            <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 lg:px-24 text-center space-y-6">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="space-y-6"
                >
                    <PillBadge text="Transform Your Practice" />

                    <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight max-w-2xl mx-auto tracking-tight">
                        Ready To Unify Your{' '}
                        <em className="not-italic font-light font-serif text-purple-300">Integrated</em>{' '}
                        Practice Management?
                    </h2>

                    <p className="text-purple-200 dark:text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
                        Join wellness studios optimising their clinical workflows, client booking, and revenue with UMAHZ today.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <motion.a
                            href="#booking"
                            initial="rest"
                            whileHover="hover"
                            whileTap="tap"
                            variants={buttonHover}
                            className="bg-white hover:bg-purple-50 text-[#1E0B3C] font-semibold px-9 py-4 rounded-full transition-colors shadow-xl text-sm w-full sm:w-auto text-center cursor-pointer"
                        >
                            Book a Free Demo
                        </motion.a>
                        <motion.a
                            href="#about"
                            initial="rest"
                            whileHover="hover"
                            whileTap="tap"
                            variants={buttonHover}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-white font-medium px-8 py-4 rounded-full border border-purple-400/30 transition-colors text-sm w-full sm:w-auto text-center cursor-pointer"
                        >
                            Learn More
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
