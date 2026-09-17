import React from 'react';
import { Link } from '@inertiajs/react';
import { CheckCircle2, Circle, ArrowRight, ShieldCheck, Sparkles, CreditCard, ArrowUpRight } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

export default function SetupProgressCard({ setupProgress, subscription }) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    const isSetupComplete = setupProgress?.completed === setupProgress?.total;

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
            {/* Header */}
            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                            {isSetupComplete ? 'Clinic Status & Plan' : 'Setup Checklist'}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {isSetupComplete ? 'All systems active' : `${setupProgress?.completed || 0} of ${setupProgress?.total || 5} milestones completed`}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                        aria-label="View Details"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 dark:bg-white/10 rounded-full h-3 mt-4 overflow-hidden p-0.5">
                    <div
                        className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${setupProgress?.percentage || 0}%` }}
                    />
                </div>
            </div>

            {/* Checklist Items: High contrast light/dark */}
            <div className="my-4 space-y-2">
                {setupProgress?.items?.map((step) => (
                    <div
                        key={step.key}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl transition-all"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(139,124,246,0.16)',
                            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            {step.complete ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                                <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            <span
                                className={`font-semibold ${
                                    step.complete
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {!step.complete && (
                            <Link
                                href={step.href}
                                className="text-[11px] font-bold text-violet-700 dark:text-violet-300 hover:underline flex items-center gap-0.5"
                            >
                                <span>Configure</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* Plan / Billing Quick Bar */}
            {subscription && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wide">
                            Billing Status
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                            {subscription.monthly_total}/mo &bull; Active
                        </span>
                    </div>
                    <Link
                        href="/app/billing"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors flex items-center gap-1 shadow-xs"
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Manage</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
