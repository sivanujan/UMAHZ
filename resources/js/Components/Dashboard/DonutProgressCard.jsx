import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, PieChart, ArrowUpRight } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

export default function DonutProgressCard({
    title = 'Success Rate',
    percentage = 100,
    paidCount = 0,
    openCount = 0,
    totalCount = 0,
    subtitle = 'Patient invoice settlement',
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    const shouldReduceMotion = useReducedMotion();
    const clampedPercentage = Math.min(100, Math.max(0, Math.round(percentage)));

    // Circle properties
    const radius = 64;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

    return (
        <div
            className="p-5 sm:p-6 flex flex-col justify-between transition-all duration-300"
            style={{
                borderRadius: '24px',
                background: isDark ? 'rgba(30, 24, 45, 0.50)' : 'rgba(255, 255, 255, 0.40)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(255, 255, 255, 0.65)',
                boxShadow: isDark
                    ? '0 12px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                    : '0 12px 36px rgba(130, 0, 219, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
            }}
        >
            {/* Top row: Title and reference circular arrow button */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                        {subtitle}
                    </p>
                </div>
                <button
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    aria-label="View Details"
                >
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>

            {/* Radial SVG Donut Ring */}
            <div className="relative my-6 flex items-center justify-center">
                <svg className="w-44 h-44 -rotate-90 transform overflow-visible" viewBox="0 0 160 160">
                    <defs>
                        <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B7CF6" />
                            <stop offset="60%" stopColor="#6366F1" />
                            <stop offset="100%" stopColor="#818CF8" />
                        </linearGradient>
                    </defs>
                    {/* Background Track (high-contrast in both light and dark) */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,124,246,0.18)'}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {/* Animated Progress Circle */}
                    <motion.circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="url(#donutGradient)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        initial={shouldReduceMotion ? { strokeDashoffset } : { strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>

                {/* Center Content: High contrast in both light and dark */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                        {clampedPercentage}%
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-1.5">
                        Settled
                    </span>
                </div>
            </div>

            {/* Legend / Breakdown: High contrast chips in light and dark */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <div
                    className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all"
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(12px)',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(139,124,246,0.18)',
                        boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wide">
                            Paid Invoices
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block mt-0.5">
                            {paidCount} {paidCount === 1 ? 'invoice' : 'invoices'}
                        </span>
                    </div>
                </div>

                <div
                    className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all"
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(12px)',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(139,124,246,0.18)',
                        boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                >
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wide">
                            Outstanding
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block mt-0.5">
                            {openCount} {openCount === 1 ? 'pending' : 'pending'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
