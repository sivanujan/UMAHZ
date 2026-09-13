import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

function useCountUp(target = 38, duration = 1200) {
    const shouldReduce = useReducedMotion();
    const [count, setCount] = useState(shouldReduce ? target : 0);

    useEffect(() => {
        if (shouldReduce) {
            setCount(target);
            return;
        }
        let current = 0;
        const interval = 25;
        const totalSteps = duration / interval;
        const increment = target / totalSteps;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.round(current));
            }
        }, interval);

        return () => clearInterval(timer);
    }, [target, duration, shouldReduce]);

    return count;
}

export default function AuthVisualPanel({ className = '' }) {
    const shouldReduceMotion = useReducedMotion();
    const count = useCountUp(38, 1400);

    // Floating motion variants (or static if reduced motion)
    const floatVariant1 = shouldReduceMotion
        ? {}
        : {
              animate: {
                  y: [-3, 3, -3],
                  transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
              },
          };

    const floatVariant2 = shouldReduceMotion
        ? {}
        : {
              animate: {
                  y: [4, -4, 4],
                  transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
              },
          };

    const floatVariant3 = shouldReduceMotion
        ? {}
        : {
              animate: {
                  y: [-4, 4, -4],
                  transition: { duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 1.0 },
              },
          };

    return (
        <div
            className={`relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#6d5efc] via-[#4338ca] to-[#0ea5e9] dark:from-[#4338ca] dark:via-[#1e1b4b] dark:to-[#0f172a] p-8 xl:p-12 text-white select-none ${className}`}
        >
            {/* Organic Curved / Bulging Left Edge Divider */}
            <div
                className="absolute top-0 bottom-0 -left-8 lg:-left-12 xl:-left-16 w-8 lg:w-12 xl:w-16 h-full pointer-events-none z-30 filter drop-shadow-[-6px_0_12px_rgba(109,94,252,0.22)] dark:drop-shadow-[-8px_0_16px_rgba(0,0,0,0.45)]"
                aria-hidden="true"
            >
                <svg
                    className="w-full h-full animate-curve-drift"
                    viewBox="0 0 100 1000"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="edgeBulgeLight" x1="0%" y1="50%" x2="100%" y2="50%">
                            <stop offset="0%" stopColor="#7566fd" />
                            <stop offset="100%" stopColor="#6d5efc" />
                        </linearGradient>
                        <linearGradient id="edgeBulgeDark" x1="0%" y1="50%" x2="100%" y2="50%">
                            <stop offset="0%" stopColor="#4c3fc9" />
                            <stop offset="100%" stopColor="#4338ca" />
                        </linearGradient>
                    </defs>
                    {/* Light mode curve fill */}
                    <path
                        d="M 100,0 C 35,180 0,340 0,500 C 0,660 35,820 100,1000 L 100,0 Z"
                        className="dark:hidden fill-[url(#edgeBulgeLight)]"
                    />
                    {/* Dark mode curve fill */}
                    <path
                        d="M 100,0 C 35,180 0,340 0,500 C 0,660 35,820 100,1000 L 100,0 Z"
                        className="hidden dark:block fill-[url(#edgeBulgeDark)]"
                    />
                    {/* Subtle luminous highlight line along the curved edge */}
                    <path
                        d="M 100,0 C 35,180 0,340 0,500 C 0,660 35,820 100,1000"
                        fill="none"
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth="1.5"
                    />
                </svg>
            </div>

            {/* Angled / Geometric Color-Blocked Background Shapes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {/* Diagonal Angled Card Layer */}
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-[60px] rotate-12 bg-white/[0.08] dark:bg-white/[0.04] backdrop-blur-3xl border border-white/15 dark:border-white/10 animate-aurora-1" />

                {/* Angled Teal Accent Ribbon */}
                <div className="absolute top-1/4 -right-20 w-[420px] h-[180px] -rotate-12 bg-gradient-to-l from-teal-400/25 via-indigo-400/10 to-transparent blur-2xl animate-aurora-3" />

                {/* Secondary Cyan/Teal Glow */}
                <div className="absolute -bottom-36 -left-32 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-[#06b6d4]/30 to-purple-600/20 dark:from-[#06b6d4]/20 dark:to-purple-900/20 blur-3xl animate-aurora-2" />

                {/* Subtle Ambient Mesh Grid */}
                <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            {/* Top Bar: Brand Pill */}
            <div className="relative z-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-white/10 text-white shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Practice Management SaaS</span>
                    </span>
                </div>
                <span className="text-xs font-medium text-white/80">
                    Trusted across Canada
                </span>
            </div>

            {/* Middle Section: Unified Floating Glass Cards Showcase (Vertically Centered Flex Column) */}
            <div className="relative z-20 my-auto py-4 flex flex-col items-center gap-4 xl:gap-5 w-full max-w-[390px] mx-auto">
                {/* Floating Card 1: Live Dashboard Pill */}
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="w-fit"
                >
                    <motion.div
                        {...floatVariant1}
                        className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl shadow-indigo-950/15 dark:shadow-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-semibold tracking-wide">
                            Live Clinic Dashboard · Active Rooms & Staff
                        </span>
                    </motion.div>
                </motion.div>

                {/* Floating Card 2: Stat Card ("↑38% Revenue") with Sparkline */}
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.22 }}
                    className="w-full"
                >
                    <motion.div
                        {...floatVariant2}
                        className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl shadow-indigo-950/15 dark:shadow-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 w-full"
                    >
                        <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4" />
                                </span>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Clinic Revenue Growth
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                +12% vs last mo
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between mt-3">
                            <div>
                                <span className="text-3xl font-extrabold tracking-normal font-mono text-slate-900 dark:text-white">
                                    ↑{count}%
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Average increase in collected revenue
                                </p>
                            </div>

                            {/* Sparkline chart SVG with draw-in animation */}
                            <div className="w-24 h-10 flex-shrink-0">
                                <svg viewBox="0 0 96 40" className="w-full h-full overflow-visible">
                                    <motion.path
                                        d="M 0 34 Q 24 28 36 30 T 60 18 T 80 12 T 96 4"
                                        fill="none"
                                        className="stroke-emerald-500 dark:stroke-emerald-400"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={shouldReduceMotion ? false : { pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
                                    />
                                    <motion.circle
                                        cx="96"
                                        cy="4"
                                        r="3.5"
                                        className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900"
                                        strokeWidth="2"
                                        initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.3, delay: 1.2 }}
                                    />
                                </svg>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Floating Card 3: Trust & Compliance Card */}
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.34 }}
                    className="w-full"
                >
                    <motion.div
                        {...floatVariant3}
                        className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl shadow-indigo-950/15 dark:shadow-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 w-full"
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-normal">
                                        PHIPA & PIPEDA Compliant
                                    </h4>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    End-to-end encrypted chart records, audit trails & patient data privacy guaranteed.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom Section: Headline & Social Proof */}
            <div className="relative z-20 pt-6 border-t border-white/15 dark:border-white/10 space-y-3 mt-4">
                <h3 className="text-2xl xl:text-3xl font-bold tracking-normal leading-snug text-white">
                    One Platform.{' '}
                    <span className="text-cyan-200">
                        Every Wellness Practice.
                    </span>
                </h3>
                <p className="text-xs xl:text-sm text-indigo-100/90 max-w-md leading-relaxed">
                    Designed for modern multidisciplinary clinics: streamlined booking, customizable clinical intake, automated billing & team management.
                </p>

                {/* Practitioner Avatars & Count */}
                <div className="flex items-center gap-3 pt-1">
                    <div className="flex -space-x-2">
                        {['#38bdf8', '#818cf8', '#34d399', '#f472b6'].map((bg, idx) => (
                            <span
                                key={idx}
                                className="w-7 h-7 rounded-full border-2 border-[#4338ca] dark:border-indigo-950 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: bg }}
                            >
                                {['JD', 'SC', 'MR', 'AL'][idx]}
                            </span>
                        ))}
                    </div>
                    <span className="text-xs font-medium text-white/90">
                        Empowering hundreds of Canadian health practitioners
                    </span>
                </div>
            </div>
        </div>
    );
}
