import React from 'react';
import { Link } from '@inertiajs/react';
import { Calendar, Clock, MapPin, User, ArrowRight, Plus } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

const STATUS_BADGES = {
    scheduled: {
        label: 'Scheduled',
        bg: 'bg-blue-50 dark:bg-blue-950/60',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200/60 dark:border-blue-800/40',
        dot: 'bg-blue-500',
    },
    confirmed: {
        label: 'Confirmed',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200/60 dark:border-emerald-800/40',
        dot: 'bg-emerald-500',
    },
    in_session: {
        label: 'In Session',
        bg: 'bg-indigo-50 dark:bg-indigo-950/60',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200/60 dark:border-indigo-800/40',
        dot: 'bg-indigo-500',
    },
    completed: {
        label: 'Completed',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'bg-rose-50 dark:bg-rose-950/60',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200/60 dark:border-rose-800/40',
        dot: 'bg-rose-500',
    },
};

export default function ActivityListCard({ appointments = [] }) {
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
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            Upcoming Appointments & Activity
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Upcoming clinical sessions and client bookings
                        </p>
                    </div>
                </div>

                <Link
                    href="/app/calendar"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                    <span>Full Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Content list */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                {appointments && appointments.length > 0 ? (
                    appointments.map((appt) => {
                        const badge =
                            STATUS_BADGES[appt.status?.toLowerCase()] || STATUS_BADGES.scheduled;
                        return (
                            <div
                                key={appt.id}
                                className="py-3.5 flex items-center justify-between gap-3 group hover:bg-white/60 dark:hover:bg-slate-800/40 px-2.5 -mx-2.5 rounded-xl transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Avatar with Initials */}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600/15 via-indigo-600/15 to-purple-600/15 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0 shadow-2xs">
                                        {appt.client_avatar || 'PT'}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {appt.client_name}
                                            </p>
                                            <span
                                                className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                                            >
                                                <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {appt.service_name}
                                            </span>
                                            <span>&bull;</span>
                                            <span>with {appt.practitioner_name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Time & Date badge */}
                                <div className="text-right shrink-0">
                                    <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{appt.time}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                                        {appt.date}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            No upcoming sessions
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                            Your clinic schedule is clear today. New online client bookings and staff entries will appear here.
                        </p>
                        <Link
                            href="/app/calendar"
                            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-colors shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Book an Appointment</span>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
