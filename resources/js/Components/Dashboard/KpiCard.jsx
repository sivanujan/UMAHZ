import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

function useCountUp(targetNumber, duration = 800) {
    const shouldReduce = useReducedMotion();
    const [display, setDisplay] = useState(shouldReduce ? targetNumber : 0);

    useEffect(() => {
        if (shouldReduce || typeof targetNumber !== 'number') {
            setDisplay(targetNumber);
            return;
        }

        let start = 0;
        const interval = 20;
        const totalSteps = duration / interval;
        const stepAmount = targetNumber / totalSteps;

        const timer = setInterval(() => {
            start += stepAmount;
            if (start >= targetNumber) {
                setDisplay(targetNumber);
                clearInterval(timer);
            } else {
                setDisplay(Math.round(start));
            }
        }, interval);

        return () => clearInterval(timer);
    }, [targetNumber, duration, shouldReduce]);

    return display;
}

export default function KpiCard({
    label,
    value,
    rawValue = null,
    prefix = '',
    suffix = '',
    icon: Icon,
    iconTint = '#2563EB',
    iconBg = 'rgba(37,99,235,0.12)',
    trend = null, // e.g. { value: 12.5, isPositive: true, text: 'vs last month' }
    sparkline = null, // array of numbers e.g. [10, 15, 8, 22, 18]
    delay = 0,
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    const shouldReduceMotion = useReducedMotion();
    const animatedNumber = useCountUp(typeof rawValue === 'number' ? rawValue : null, 900);

    const displayValue =
        typeof rawValue === 'number'
            ? `${prefix}${animatedNumber.toLocaleString()}${suffix}`
            : value;

    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: delay * 0.08, ease: 'easeOut' }}
            className="group relative p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between"
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
            {/* Top row: Minimalist Icon on left */}
            <div className="flex items-center justify-between">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                    style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(139,124,246,0.12)',
                        color: isDark ? '#E2E8F0' : '#5B4FBE',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(139,124,246,0.18)',
                    }}
                >
                    <Icon className="w-4.5 h-4.5" />
                </div>
            </div>

            {/* Middle: Big Metric Value (Impactful size, high-contrast) */}
            <div className="mt-3.5">
                <h3 className="text-3xl sm:text-[34px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
                    {displayValue}
                </h3>
            </div>

            {/* Bottom: 2-line Label & Trend (High-contrast theme tokens) */}
            <div className="mt-2.5 text-xs">
                <p className="text-slate-600 dark:text-slate-300 font-semibold leading-snug">
                    {label}
                </p>
                {trend ? (
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {typeof trend.value === 'number' && trend.value !== 0 && trend.hasComparison !== false ? (
                            <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${
                                    trend.isPositive
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold'
                                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold'
                                }`}
                            >
                                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
                            </span>
                        ) : null}
                        {trend.text && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                {trend.text}
                            </span>
                        )}
                    </div>
                ) : sparkline && sparkline.length > 1 ? (
                    <div className="w-20 h-5 mt-1">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 80 20">
                            {(() => {
                                const min = Math.min(...sparkline);
                                const max = Math.max(...sparkline);
                                const range = max - min || 1;
                                const points = sparkline
                                    .map((val, idx) => {
                                        const x = (idx / (sparkline.length - 1)) * 80;
                                        const y = 18 - ((val - min) / range) * 16;
                                        return `${x},${y}`;
                                    })
                                    .join(' ');
                                return (
                                    <polyline
                                        fill="none"
                                        stroke={iconTint}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={points}
                                        className="opacity-80"
                                    />
                                );
                            })()}
                        </svg>
                    </div>
                ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] mt-1 block">
                        Up to date
                    </span>
                )}
            </div>
        </motion.div>
    );
}
