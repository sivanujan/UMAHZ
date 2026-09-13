import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Navbar from '@/Components/Layout/Navbar';
import PillBadge from '@/Components/Common/PillBadge';
import { EASING, DURATION_NORMAL, DURATION_SLOW, createButtonHover } from '@/Utils/motion';

function AnimatedCounter({ from = 0, to = 38, duration = 1.1 }) {
    const shouldReduceMotion = useReducedMotion();
    const [count, setCount] = useState(shouldReduceMotion ? to : from);

    useEffect(() => {
        if (shouldReduceMotion) {
            setCount(to);
            return;
        }
        let startTime = null;
        let animationFrame;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(from + (to - from) * easeOut));
            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            }
        };
        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    }, [from, to, duration, shouldReduceMotion]);

    return <>{count}</>;
}

export default function HeroSection() {
    const shouldReduceMotion = useReducedMotion();
    const { scrollY } = useScroll();

    // Subtle, tasteful parallax on the hero media and ambient glow
    const parallaxImageY = useTransform(scrollY, [0, 500], [0, shouldReduceMotion ? 0 : 25]);
    const parallaxBgY = useTransform(scrollY, [0, 500], [0, shouldReduceMotion ? 0 : -20]);

    const words = [
        { text: 'One', isItalic: false },
        { text: 'Platform', isItalic: false },
        { text: 'For', isItalic: false },
        { text: 'Your', isItalic: false },
        { text: 'Wellness', isItalic: true },
        { text: 'Practice', isItalic: false },
        { text: 'Growth!', isItalic: true },
    ];

    const wordVariants = {
        hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: shouldReduceMotion ? 0 : 0.05 + i * 0.045,
                duration: shouldReduceMotion ? 0.01 : 0.38,
                ease: EASING,
            },
        }),
    };

    const elementEntrance = (delay) => ({
        initial: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
        animate: { opacity: 1, y: 0 },
        transition: {
            delay: shouldReduceMotion ? 0 : delay,
            duration: shouldReduceMotion ? 0.01 : DURATION_NORMAL,
            ease: EASING,
        },
    });

    const buttonHover = createButtonHover(1.02, shouldReduceMotion);

    return (
        <section id="home" className="bg-[#F9F5FB] dark:bg-[#0B0F19] relative overflow-hidden transition-colors duration-300">
            {/* Ambient background glow discs with subtle parallax */}
            <motion.div
                style={{ y: parallaxBgY }}
                className="absolute inset-0 overflow-hidden pointer-events-none"
                aria-hidden="true"
            >
                <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/35 dark:bg-purple-900/15 rounded-full blur-3xl transition-colors duration-300" />
                <div className="absolute bottom-0 left-[-60px] w-[320px] h-[320px] bg-pink-200/25 dark:bg-pink-900/10 rounded-full blur-3xl transition-colors duration-300" />
            </motion.div>

            <Navbar />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
                {/* HERO CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center pb-20 pt-6 lg:pt-10">

                    {/* Left Column: Headline & CTAs */}
                    <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
                        {/* Badge */}
                        <motion.div {...elementEntrance(0.02)}>
                            <PillBadge text="Integrated Practice Management" />
                        </motion.div>

                        {/* Staggered word-by-word headline */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-[1.14] tracking-tight">
                            {words.map((w, idx) => (
                                <motion.span
                                    key={idx}
                                    custom={idx}
                                    initial="hidden"
                                    animate="visible"
                                    variants={wordVariants}
                                    className={`inline-block mr-2.5 ${w.isItalic ? 'font-serif font-light text-[#5B2EFF] dark:text-[#8B6BFF]' : ''}`}
                                >
                                    {w.text}
                                </motion.span>
                            ))}
                        </h1>

                        {/* Subtext */}
                        <motion.p
                            {...elementEntrance(0.4)}
                            className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal"
                        >
                            UMAHZ unifies scheduling, SOAP notes, billing, and client management for Massage Therapy, Acupuncture, Personal Training, Nutrition, and Colon Hydrotherapy studios.
                        </motion.p>

                        {/* Action Buttons */}
                        <motion.div
                            {...elementEntrance(0.5)}
                            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2"
                        >
                            {/* Primary Button */}
                            <motion.a
                                href="#booking"
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                                variants={buttonHover}
                                className="group inline-flex justify-center items-center gap-2 bg-[#5B2EFF] hover:bg-purple-700 dark:bg-[#6D3BFF] dark:hover:bg-[#5B2EFF] text-white font-medium px-8 py-4 rounded-full shadow-xl shadow-purple-500/25 transition-colors duration-200 text-sm cursor-pointer"
                            >
                                <span>Book a Demo</span>
                                <motion.span
                                    variants={{
                                        rest: { x: 0 },
                                        hover: { x: shouldReduceMotion ? 0 : 4 },
                                    }}
                                    transition={{ duration: 0.2, ease: EASING }}
                                    className="inline-flex"
                                    aria-hidden="true"
                                >
                                    →
                                </motion.span>
                            </motion.a>

                            {/* Secondary Button with Watch Overview Pulse */}
                            <motion.a
                                href="#about"
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                                variants={buttonHover}
                                className="group inline-flex justify-center items-center gap-3 text-[#1E0B3C] dark:text-slate-200 hover:text-[#5B2EFF] dark:hover:text-purple-300 font-medium text-sm transition-colors cursor-pointer"
                            >
                                <span className="relative w-10 h-10 rounded-full bg-white dark:bg-[#131B2B] border border-purple-200 dark:border-slate-700/80 group-hover:border-[#5B2EFF] dark:group-hover:border-purple-400 flex items-center justify-center flex-shrink-0 shadow-xs transition-colors">
                                    {/* Pulse ring on hover */}
                                    {!shouldReduceMotion && (
                                        <motion.span
                                            variants={{
                                                rest: { scale: 1, opacity: 0 },
                                                hover: {
                                                    scale: [1, 1.25, 1.45],
                                                    opacity: [0.6, 0.25, 0],
                                                    transition: { duration: 1.1, repeat: Infinity, ease: 'easeOut' },
                                                },
                                            }}
                                            className="absolute inset-0 rounded-full border border-[#5B2EFF] dark:border-purple-400 pointer-events-none"
                                        />
                                    )}
                                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="#5B2EFF">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </span>
                                <span>Watch Overview</span>
                            </motion.a>
                        </motion.div>
                    </div>

                    {/* Right Column: Hero Image with Floating Stat Cards */}
                    <motion.div
                        style={{ y: parallaxImageY }}
                        className="relative order-1 lg:order-2"
                    >
                        {/* Soft ambient backplate */}
                        <div className="absolute inset-6 bg-gradient-to-br from-purple-300/40 to-pink-300/30 dark:from-purple-900/30 dark:to-pink-900/20 rounded-[2rem] rotate-3 scale-105 -z-10 blur-xs" />

                        {/* Image card entrance */}
                        <motion.div
                            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: EASING, delay: 0.15 }}
                            className="relative bg-white dark:bg-[#131B2B] rounded-[2rem] p-3 shadow-2xl border border-purple-100 dark:border-slate-800/90 overflow-hidden transition-colors duration-300"
                        >
                            <div className="rounded-[1.6rem] min-h-[440px] relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                                <img
                                    src="/imags/Home/sider.png"
                                    alt="Practitioner reviewing a client's schedule together on a tablet"
                                    className="w-full h-full object-cover absolute inset-0"
                                />

                                {/* Floating Card 1: Revenue with Animated Counter */}
                                <motion.div
                                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                                    animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
                                    transition={shouldReduceMotion ? { duration: 0.3 } : {
                                        opacity: { duration: 0.4, delay: 0.35 },
                                        y: { repeat: Infinity, duration: 3.6, ease: 'easeInOut', delay: 0.35 },
                                    }}
                                    className="absolute top-8 -left-3 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] border border-slate-100 dark:border-slate-800 text-xs font-bold text-[#1E0B3C] dark:text-white z-20"
                                >
                                    <span className="text-[#5B2EFF] dark:text-[#8B6BFF] mr-1">
                                        ↑ <AnimatedCounter from={0} to={38} />%
                                    </span>
                                    <span>Revenue</span>
                                </motion.div>

                                {/* Floating Card 2: Live Dashboard */}
                                <motion.div
                                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                                    animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, 6, 0] }}
                                    transition={shouldReduceMotion ? { duration: 0.3 } : {
                                        opacity: { duration: 0.4, delay: 0.48 },
                                        y: { repeat: Infinity, duration: 4.2, ease: 'easeInOut', delay: 0.48 },
                                    }}
                                    className="absolute bottom-12 -right-3 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] border border-slate-100 dark:border-slate-800 text-xs font-bold text-[#1E0B3C] dark:text-white z-20 flex items-center gap-1.5"
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    <span>Live Dashboard</span>
                                </motion.div>
                            </div>

                            {/* Floating Card 3: All-in-One Platform */}
                            <motion.div
                                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                                animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -4, 0] }}
                                transition={shouldReduceMotion ? { duration: 0.3 } : {
                                    opacity: { duration: 0.4, delay: 0.62 },
                                    y: { repeat: Infinity, duration: 3.2, ease: 'easeInOut', delay: 0.62 },
                                }}
                                className="absolute bottom-5 left-5 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6)] border border-purple-100 dark:border-purple-900/40 max-w-[60%] z-20"
                            >
                                <p className="text-[10px] text-[#5B2EFF] dark:text-[#8B6BFF] font-bold uppercase tracking-wider">
                                    All-in-One Platform
                                </p>
                                <p className="text-xs font-bold text-[#1E0B3C] dark:text-white mt-0.5">
                                    Clinical · Admin · Revenue
                                </p>
                            </motion.div>

                            {/* Service jump button */}
                            <a
                                href="#services"
                                aria-label="Jump to supported services"
                                className="absolute bottom-5 right-5 w-10 h-10 rounded-full bg-[#5B2EFF] hover:bg-purple-700 dark:bg-[#6D3BFF] dark:hover:bg-[#5B2EFF] flex items-center justify-center shadow-lg shadow-purple-500/40 transition-transform duration-200 hover:scale-105 active:scale-95 z-20 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                </svg>
                            </a>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
