import React, { useState, Suspense } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from '@inertiajs/react';
import PillBadge from '@/Components/Common/PillBadge';
import { Play, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import {
    VIEWPORT_ONCE,
    createFadeInUp,
    createFadeInScale,
    createButtonHover,
} from '@/Utils/motion';

const VideoModal = React.lazy(() => import('@/Components/Common/VideoModal'));

export default function SetupTutorialSection() {
    const shouldReduceMotion = useReducedMotion();
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    const entrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);

    return (
        <section id="tutorial" className="py-16 md:py-24 bg-[#F9F5FB] dark:bg-[#0B0F19] transition-colors duration-300 relative overflow-hidden">
            {/* Background subtle radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-500/10 dark:bg-violet-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 lg:px-20 text-center space-y-10">
                {/* Header */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={entrance}
                    className="space-y-4 max-w-3xl mx-auto"
                >
                    <PillBadge text="Setup Tutorial" />

                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-normal">
                        How To Set Up Your{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Clinic</em>
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed font-normal">
                        Watch how easy it is to configure your clinic workspace, practitioner schedules, and online booking in under 3 minutes.
                    </p>
                </motion.div>

                {/* Video Card */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={cardEntrance}
                    className="relative group rounded-3xl overflow-hidden shadow-2xl border border-purple-100 dark:border-violet-500/35 bg-[#18112A] max-w-4xl mx-auto aspect-video cursor-pointer"
                    onClick={() => setIsVideoOpen(true)}
                >
                    {/* Poster Image */}
                    <img
                        src="/videos/umahz-setup-tutorial-poster.webp"
                        alt="UMAHZ Clinic Setup Tutorial Poster"
                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20 group-hover:via-slate-950/30 transition-colors" />

                    {/* Center Pulsing Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                            {!shouldReduceMotion && (
                                <div className="absolute inset-0 rounded-full bg-violet-500/40 animate-ping" />
                            )}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-110">
                                <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-white text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Metadata Bar */}
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-center justify-between text-left border-t border-white/10 bg-black/40 backdrop-blur-xs">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                                Quickstart Guide
                            </span>
                            <span className="text-sm sm:text-base font-bold text-white">
                                Clinic Account & Workspace Setup
                            </span>
                        </div>
                        <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-full text-white text-xs font-semibold">
                            2:45 min
                        </span>
                    </div>
                </motion.div>

                {/* Call To Action Button */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={entrance}
                    className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <motion.a
                        href="/clinics/register"
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                        variants={buttonHover}
                        className="bg-gradient-to-r from-[#5B2EFF] to-indigo-600 hover:from-[#4f24e6] hover:to-indigo-700 text-white font-semibold px-9 py-4 rounded-full transition-all shadow-xl text-sm w-full sm:w-auto text-center cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                        <span>Create your clinic account</span>
                        <ArrowRight className="w-4 h-4" />
                    </motion.a>

                    <Link
                        href="/pricing"
                        className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#5B2EFF] dark:hover:text-[#8B6BFF] transition-colors"
                    >
                        Compare plans & pricing →
                    </Link>
                </motion.div>
            </div>

            {/* Modal Lightbox */}
            {isVideoOpen && (
                <Suspense fallback={null}>
                    <VideoModal
                        isOpen={isVideoOpen}
                        onClose={() => setIsVideoOpen(false)}
                        title="How To Set Up Your Clinic (2:45 min)"
                        src="/videos/umahz-setup-tutorial.mp4"
                        poster="/videos/umahz-setup-tutorial-poster.webp"
                        captionsSrc="/videos/umahz-setup-tutorial.vtt"
                        aspect="16:9"
                    />
                </Suspense>
            )}
        </section>
    );
}

