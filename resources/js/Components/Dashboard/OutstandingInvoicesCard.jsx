import React from 'react';
import { Link } from '@inertiajs/react';
import { ReceiptText, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

function dueBadge(due) {
    if (/^Overdue/i.test(due || '')) {
        return {
            bg: 'bg-rose-50 dark:bg-rose-950/60',
            text: 'text-rose-700 dark:text-rose-400',
            border: 'border-rose-200 dark:border-rose-800/50',
            icon: AlertCircle,
        };
    }
    if (/Due today/i.test(due || '')) {
        return {
            bg: 'bg-amber-50 dark:bg-amber-950/60',
            text: 'text-amber-700 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800/50',
            icon: AlertCircle,
        };
    }
    return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        icon: ReceiptText,
    };
}

export default function OutstandingInvoicesCard({ invoices = [] }) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';

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
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <ReceiptText className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            Outstanding Invoices
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Unsettled patient balances awaiting payment
                        </p>
                    </div>
                </div>

                <Link
                    href="/app/clients"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Invoices list */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                {invoices && invoices.length > 0 ? (
                    invoices.map((inv) => {
                        const badge = dueBadge(inv.due);
                        const BadgeIcon = badge.icon;
                        return (
                            <div
                                key={inv.id || inv.client}
                                className="py-3.5 flex items-center justify-between gap-3 group hover:bg-white/60 dark:hover:bg-slate-800/40 px-2.5 -mx-2.5 rounded-xl transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                        {inv.client.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                            {inv.client}
                                        </p>
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border} mt-0.5`}
                                        >
                                            <BadgeIcon className="w-3 h-3" />
                                            <span>{inv.due}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                                        {inv.amount}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400 block">
                                        Balance Due
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            All invoices settled!
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                            There are currently no overdue or open balances for your clinic.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
