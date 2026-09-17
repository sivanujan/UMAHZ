import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    ShieldCheck,
    TrendingUp,
    Sparkles,
    Building2,
    MapPin,
    PhoneCall,
    CheckCircle2,
    Lock,
    Stethoscope,
    Layers,
    BadgeCheck,
    Clock,
    HeartHandshake,
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

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

export default function AuthVisualPanel({ currentStep = null, data = {}, tiers = {}, clinic = null, className = '' }) {
    const shouldReduceMotion = useReducedMotion();
    const count = useCountUp(38, 1400);

    // Subtle floating animations for cards
    const float1 = shouldReduceMotion
        ? {}
        : {
              animate: {
                  y: [-3, 3, -3],
                  transition: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' },
              },
          };

    const float2 = shouldReduceMotion
        ? {}
        : {
              animate: {
                  y: [4, -4, 4],
                  transition: { duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
              },
          };

    const float3 = shouldReduceMotion
        ? {}
        : {
              animate: {
                  y: [-4, 4, -4],
                  transition: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
              },
          };

    // Render step-specific card showcases
    const renderStepContent = () => {
        // Default or Step 0: Account
        if (currentStep === null || currentStep === 0) {
            return (
                <>
                    {/* Floating Pill: Live Dashboard */}
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl shadow-indigo-950/15 dark:shadow-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-xs font-semibold tracking-wide">
                                {clinic ? `${clinic.name} · Staff Workspace` : 'Live Clinic Dashboard · Active Rooms & Staff'}
                            </span>
                        </div>
                    </motion.div>

                    {/* Middle Card: Welcome to UMAHZ */}
                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl shadow-indigo-950/15 dark:shadow-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 w-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
                                    All-in-One Cloud Suite
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    Practice OS
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                                {clinic ? `${clinic.name} Clinic Hub` : 'Designed for Modern Holistic Clinics'}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                {clinic
                                    ? `${clinic.name} uses UMAHZ for patient charting, team scheduling, and automated clinic operations.`
                                    : 'Streamlined bookings, customizable clinical notes, team calendars & automated patient invoicing in one secure hub.'}
                            </p>
                        </div>
                    </motion.div>

                    {/* Bottom Card: PHIPA Trust Card */}
                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl shadow-indigo-950/15 dark:shadow-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 w-full">
                            <div className="flex items-start gap-3.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                            PHIPA & PIPEDA Compliant
                                        </h4>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        End-to-end encrypted chart records, audit trails & patient data privacy guaranteed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            );
        }

        // Step 1: Clinic ("Your Clinic on the Map")
        if (currentStep === 1) {
            const clinicName = data.clinic_name || 'Your Wellness Studio';
            const city = data.address_city || 'Vancouver';
            const province = data.address_region || 'BC';
            const subdomain = data.subdomain ? `${data.subdomain}.umahz.com` : 'yourclinic.umahz.com';

            return (
                <>
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span>Your Clinic on the Map</span>
                        </div>
                    </motion.div>

                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full space-y-3">
                            <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {clinicName}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {city}, {province} · Canada
                                    </p>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                                    {subdomain}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex-shrink-0">
                                    Online Booking Ready
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-4.5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                    Multi-Room & Practitioner Setup
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Configure treatment rooms, tables, and staff schedules seamlessly.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            );
        }

        // Step 2: Contact ("We'll Reach Out")
        if (currentStep === 2) {
            return (
                <>
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Dedicated Concierge Onboarding</span>
                        </div>
                    </motion.div>

                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                        UM
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                        Review Team · Toronto & Vancouver
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Average review time: &lt; 24 business hours
                                    </p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2.5">
                                We'll verify your primary contact and assist with historical chart migrations, intake forms, and billing setup.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-4.5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Fast Canadian Support
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Priority Queue
                            </span>
                        </div>
                    </motion.div>
                </>
            );
        }

        // Step 3: Disciplines ("Disciplines & Modalities")
        if (currentStep === 3) {
            const selected = Array.isArray(data.requested_disciplines) ? data.requested_disciplines : [];
            const custom = Array.isArray(data.custom_disciplines) ? data.custom_disciplines : [];

            return (
                <>
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold">
                            <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Tailored Intake & SOAP Notes</span>
                        </div>
                    </motion.div>

                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full space-y-3">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                Configured Practice Disciplines
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {selected.slice(0, 4).map((slug) => (
                                    <span
                                        key={slug}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                    >
                                        {DISCIPLINE_LABELS?.[slug] || slug.replace(/_/g, ' ')}
                                    </span>
                                ))}
                                {custom.map((c) => (
                                    <span
                                        key={c.slug}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60"
                                    >
                                        {c.label}
                                    </span>
                                ))}
                                {selected.length === 0 && custom.length === 0 && (
                                    <span className="text-[11px] text-slate-400">Select disciplines on the left…</span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                Pre-loaded body charts, specialty assessments & consent forms ready immediately.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-4.5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                                <HeartHandshake className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                    Interdisciplinary Sharing
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Cross-practitioner care plans with patient-consented access controls.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            );
        }

        // Step 4: License ("Verified & Compliant")
        if (currentStep === 4) {
            return (
                <>
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Credentialed & Regulatory Compliant</span>
                        </div>
                    </motion.div>

                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Regulatory Verification
                                </span>
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                                    Audit Trail
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Every registered clinic undergoes license validation, guaranteeing your patients that your practice meets provincial standards.
                            </p>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span>Zero-leak Canadian data residency (AWS Montreal / Toronto)</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-4.5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                256-Bit Encrypted Vault
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                SOC-2 Certified
                            </span>
                        </div>
                    </motion.div>
                </>
            );
        }

        // Step 5: Plan ("Revenue Growth")
        if (currentStep === 5) {
            return (
                <>
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Transparent, Scalable Pricing</span>
                        </div>
                    </motion.div>

                    {/* Stat Card ("↑38% Revenue") with Sparkline */}
                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full">
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

                                {/* Sparkline */}
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
                                            transition={{ duration: 1.1, ease: 'easeOut' }}
                                        />
                                        <motion.circle
                                            cx="96"
                                            cy="4"
                                            r="3.5"
                                            className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900"
                                            strokeWidth="2"
                                            initial={shouldReduceMotion ? false : { scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ duration: 0.3, delay: 1.1 }}
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-4.5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Zero Commission on Bookings
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Keep 100% of Care Revenue
                            </span>
                        </div>
                    </motion.div>
                </>
            );
        }

        // Step 6: Payment ("Secure Checkout")
        if (currentStep === 6) {
            return (
                <>
                    <motion.div {...float1} className="w-fit">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Stripe Verified Partner Checkout</span>
                        </div>
                    </motion.div>

                    <motion.div {...float2} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Risk-Free Guarantee
                                </span>
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                    No Charge Today
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Your card is verified and held securely via Stripe SetupIntent. Your subscription only activates after our compliance team reviews and approves your practice application.
                            </p>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <span>Cancel anytime with 1 click</span>
                                <span className="text-indigo-600 dark:text-indigo-400">No lock-in contracts</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div {...float3} className="w-full">
                        <div className="bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-2xl p-4.5 shadow-xl backdrop-blur-xl border border-white/60 dark:border-white/10 w-full flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                                <span>PCI-DSS Level 1 Encryption</span>
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">Stripe.js v3</span>
                        </div>
                    </motion.div>
                </>
            );
        }

        return null;
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
                        <span>{clinic ? `${clinic.name} Workspace` : 'Practice Management SaaS'}</span>
                    </span>
                </div>
                <span className="text-xs font-medium text-white/80">
                    {clinic ? 'Secure Provider Portal' : 'Trusted across Canada'}
                </span>
            </div>

            {/* Middle Section: Dynamic Step Visual Showcase with AnimatePresence */}
            <div className="relative z-20 my-auto py-4 w-full max-w-[390px] mx-auto min-h-[340px] flex items-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep ?? 'default'}
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        className={`w-full flex flex-col items-center ${
                            currentStep === 5
                                ? 'justify-between min-h-[420px] xl:min-h-[460px] gap-6 xl:gap-8 py-2'
                                : 'gap-4 xl:gap-5'
                        }`}
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Section: Headline & Social Proof */}
            <div className="relative z-20 pt-6 border-t border-white/15 dark:border-white/10 space-y-3 mt-4">
                <h3 className="text-2xl xl:text-3xl font-bold tracking-normal leading-snug text-white">
                    {clinic ? (
                        <>
                            {clinic.name}{' '}
                            <span className="text-cyan-200">
                                runs on UMAHZ.
                            </span>
                        </>
                    ) : (
                        <>
                            One Platform.{' '}
                            <span className="text-cyan-200">
                                Every Wellness Practice.
                            </span>
                        </>
                    )}
                </h3>
                <p className="text-xs xl:text-sm text-indigo-100/90 max-w-md leading-relaxed">
                    {clinic
                        ? `${clinic.name} is powered by UMAHZ's unified platform for streamlined patient booking, custom intake forms, and practice management.`
                        : 'Designed for modern multidisciplinary clinics: streamlined booking, customizable clinical intake, automated billing & team management.'}
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
                        {clinic ? `Welcome to ${clinic.name}'s workspace` : 'Empowering hundreds of Canadian health practitioners'}
                    </span>
                </div>
            </div>
        </div>
    );
}
