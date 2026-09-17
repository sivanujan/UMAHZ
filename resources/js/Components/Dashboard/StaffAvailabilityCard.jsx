import React from 'react';
import { Link } from '@inertiajs/react';
import { UserCheck, ArrowRight, UserCog } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

const AVAILABILITY_STYLES = {
    'Available': {
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40',
    },
    'In Session': {
        dot: 'bg-blue-500 animate-pulse',
        badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40',
    },
    'Off Today': {
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
};

export default function StaffAvailabilityCard({ staff = [] }) {
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
                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <UserCog className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            Staff Availability
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Practitioner status & real-time sessions
                        </p>
                    </div>
                </div>

                <Link
                    href="/app/staff"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                    <span>Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Staff list */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                {staff && staff.length > 0 ? (
                    staff.map((member, idx) => {
                        const style =
                            AVAILABILITY_STYLES[member.availability] ||
                            AVAILABILITY_STYLES['Off Today'];
                        return (
                            <div
                                key={member.id || idx}
                                className="py-3.5 flex items-center justify-between gap-3 group hover:bg-white/60 dark:hover:bg-slate-800/40 px-2.5 -mx-2.5 rounded-xl transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                            {member.role?.replace('_', ' ') || 'Practitioner'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {member.todays_count > 0 && (
                                        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                                            {member.todays_count}{' '}
                                            {member.todays_count === 1 ? 'session' : 'sessions'}
                                        </span>
                                    )}
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.badge}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                        <span>{member.availability}</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                        No active staff members found.
                    </div>
                )}
            </div>
        </div>
    );
}
