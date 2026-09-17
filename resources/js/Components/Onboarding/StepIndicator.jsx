import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    User,
    Building2,
    Phone,
    Stethoscope,
    ShieldCheck,
    Layers,
    Wallet,
    Check,
} from 'lucide-react';

export const SECTIONS = [
    { id: 'account', title: 'Your Account', shortTitle: 'Account', icon: User },
    { id: 'clinic', title: 'Clinic Details', shortTitle: 'Clinic', icon: Building2 },
    { id: 'contact', title: 'Primary Contact', shortTitle: 'Contact', icon: Phone },
    { id: 'practice', title: 'Disciplines', shortTitle: 'Disciplines', icon: Stethoscope },
    { id: 'license', title: 'Your License', shortTitle: 'License', icon: ShieldCheck },
    { id: 'plan', title: 'Plan & Team', shortTitle: 'Plan', icon: Layers },
    { id: 'payment', title: 'Payment', shortTitle: 'Payment', icon: Wallet },
];

export default function StepIndicator({ current = 0, onJump }) {
    const shouldReduceMotion = useReducedMotion();
    const totalSteps = SECTIONS.length;
    // Calculate percentage fill from circle 0 center to circle (totalSteps - 1) center
    const progressPercent = Math.min(
        100,
        Math.max(0, (current / (totalSteps - 1)) * 100)
    );

    return (
        <div className="w-full space-y-3" role="navigation" aria-label="Registration Progress">
            {/* Step Header Label: Single clean line above the circles */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                        Step {current + 1} of {totalSteps}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white [word-spacing:0.02em]">
                        {SECTIONS[current]?.title}
                    </span>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {Math.round(progressPercent)}% completed
                </span>
            </div>

            {/* Desktop Step Indicator with Icon Circles & Progress Fill */}
            <div className="hidden sm:block relative py-1">
                {/* Track Line behind the circles */}
                <div
                    className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2.5px] bg-slate-200 dark:bg-slate-800 rounded-full pointer-events-none"
                    aria-hidden="true"
                >
                    {/* Animated Progress Fill Bar */}
                    <motion.div
                        className="h-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 rounded-full"
                        initial={false}
                        animate={{ width: `${progressPercent}%` }}
                        transition={
                            shouldReduceMotion
                                ? { duration: 0 }
                                : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
                        }
                    />
                </div>

                {/* Step Circles Row */}
                <div className="relative z-10 flex items-center justify-between">
                    {SECTIONS.map((section, index) => {
                        const Icon = section.icon;
                        const isDone = index < current;
                        const isActive = index === current;

                        return (
                            <div key={section.id} className="relative group">
                                <button
                                    type="button"
                                    onClick={() => isDone && onJump && onJump(index)}
                                    disabled={!isDone}
                                    aria-current={isActive ? 'step' : undefined}
                                    aria-label={`${section.title}${
                                        isDone
                                            ? ' (completed — click to return)'
                                            : isActive
                                            ? ' (current step)'
                                            : ' (upcoming)'
                                    }`}
                                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                        isDone
                                            ? 'w-9 h-9 bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-110 cursor-pointer'
                                            : isActive
                                            ? 'w-10 h-10 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/20 scale-105 cursor-default'
                                            : 'w-9 h-9 bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/80 cursor-default'
                                    }`}
                                >
                                    {isDone ? (
                                        <motion.div
                                            key="done"
                                            initial={
                                                shouldReduceMotion
                                                    ? false
                                                    : { scale: 0.5, opacity: 0 }
                                            }
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Check className="w-4 h-4 stroke-[2.5]" />
                                        </motion.div>
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Tooltip on Hover for Completed / Active Steps */}
                                <div
                                    role="tooltip"
                                    className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap z-30"
                                >
                                    <span>
                                        {isDone
                                            ? `Return to: ${section.title}`
                                            : section.title}
                                    </span>
                                    <div
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-100 rotate-45"
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile View: Compact Progress Bar */}
            <div className="sm:hidden space-y-1.5 pt-1">
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500"
                        initial={false}
                        animate={{
                            width: `${((current + 1) / totalSteps) * 100}%`,
                        }}
                        transition={
                            shouldReduceMotion
                                ? { duration: 0 }
                                : { duration: 0.35, ease: 'easeOut' }
                        }
                    />
                </div>
            </div>
        </div>
    );
}
