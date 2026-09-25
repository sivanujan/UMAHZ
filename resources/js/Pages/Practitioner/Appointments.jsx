import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { GlassModal } from '@/Components/UI/GlassModal';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import {
    Calendar as CalendarIcon, Clock, User, MapPin, DoorOpen,
    CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
    Sparkles, FileText, Check, ArrowRight, UserCheck, Phone, Mail,
    CalendarDays, ListOrdered, Mic
} from 'lucide-react';
import ScribePanel from '@/Components/Scribe/ScribePanel';

const STATUS_STYLES = {
    scheduled: {
        label: 'Scheduled',
        bg: 'rgba(130, 0, 219, 0.12)',
        fg: '#6b00b6',
        border: '#8200db',
        dot: '#8200db',
    },
    confirmed: {
        label: 'Confirmed',
        bg: 'rgba(6, 182, 212, 0.14)',
        fg: '#0e7490',
        border: '#06b6d4',
        dot: '#0891b2',
    },
    checked_in: {
        label: 'Checked in',
        bg: 'rgba(168, 85, 247, 0.14)',
        fg: '#7e22ce',
        border: '#a855f7',
        dot: '#9333ea',
    },
    completed: {
        label: 'Completed',
        bg: 'rgba(34, 197, 94, 0.14)',
        fg: '#15803d',
        border: '#22c55e',
        dot: '#16a34a',
    },
    no_show: {
        label: 'No-show',
        bg: 'rgba(245, 158, 11, 0.16)',
        fg: '#b45309',
        border: '#f59e0b',
        dot: '#d97706',
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'rgba(148, 163, 184, 0.20)',
        fg: '#64748b',
        border: '#94a3b8',
        dot: '#64748b',
    },
};

const pad = (n) => String(n).padStart(2, '0');

function humanTime(iso, tz) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(iso));
}

function humanDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    }).format(new Date(Date.UTC(y, m - 1, d)));
}

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function zonedDateKey(iso, tz) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(new Date(iso));
}

export default function PractitionerAppointments({
    view, anchorDate, weekStart, todayDate, timezone, appointments = [], stats = {}, practitioner = {}, canUseScribe = false,
}) {
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [scribeAppt, setScribeAppt] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const now = new Date();

    const currentApptId = useMemo(() => {
        const current = appointments.find((a) => {
            const s = new Date(a.starts_at);
            const e = new Date(a.ends_at);
            return now >= s && now <= e && a.status !== 'cancelled';
        });
        return current?.id || null;
    }, [appointments, now]);

    const nextApptId = useMemo(() => {
        if (currentApptId) return null;
        const upcoming = appointments.find((a) => {
            const s = new Date(a.starts_at);
            return s > now && a.status !== 'cancelled';
        });
        return upcoming?.id || null;
    }, [appointments, currentApptId, now]);

    const setViewMode = (mode) => {
        router.get('/app/practitioner/appointments', {
            view: mode,
            date: anchorDate,
        }, { preserveState: true, preserveScroll: true });
    };

    const shiftDate = (days) => {
        const nextDate = addDays(anchorDate, days);
        router.get('/app/practitioner/appointments', {
            view,
            date: nextDate,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleStatusUpdate = (apptId, status) => {
        router.patch(
            `/app/practitioner/appointments/${apptId}/status`,
            { status },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setToastMessage(`Appointment marked as ${STATUS_STYLES[status]?.label || status}.`);
                    if (selectedAppt && selectedAppt.id === apptId) {
                        setSelectedAppt((prev) => ({ ...prev, status }));
                    }
                },
            }
        );
    };

    const groupedUpcoming = useMemo(() => {
        if (view !== 'upcoming') return {};
        const groups = {};
        appointments.forEach((a) => {
            const dKey = zonedDateKey(a.starts_at, timezone);
            if (!groups[dKey]) groups[dKey] = [];
            groups[dKey].push(a);
        });
        return groups;
    }, [appointments, view, timezone]);

    const weekDays = useMemo(() => {
        if (view !== 'week') return [];
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [view, weekStart]);

    const weekAppointmentsByDay = useMemo(() => {
        if (view !== 'week') return {};
        const map = Object.fromEntries(weekDays.map((d) => [d, []]));
        appointments.forEach((a) => {
            const dKey = zonedDateKey(a.starts_at, timezone);
            if (map[dKey]) map[dKey].push(a);
        });
        return map;
    }, [appointments, view, weekDays, timezone]);

    return (
        <AuthenticatedLayout title="My Appointments">
            <Head title="My Appointments" />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header Banner */}
                <GlassCard className="p-6 sm:p-7">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-[#8200db] dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                                <Sparkles className="w-4 h-4" />
                                <span>Practitioner Schedule</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {practitioner.name}’s Appointments
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 flex items-center gap-2 font-medium">
                                <span>Showing your assigned client sessions</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300">
                                    <Clock className="w-3.5 h-3.5" />
                                    {timezone}
                                </span>
                            </p>
                        </div>

                        {/* Quick Stats Pill */}
                        <div className="flex items-center gap-3 bg-white/50 dark:bg-white/[0.04] px-4 py-3 rounded-2xl border border-white/40 dark:border-white/10 self-start md:self-auto shadow-xs">
                            <div className="text-center px-2">
                                <span className="block text-xl font-extrabold text-slate-900 dark:text-white">{stats.todayCount ?? 0}</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Today</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200/60 dark:bg-white/10" />
                            <div className="text-center px-2">
                                <span className="block text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completedToday ?? 0}</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Completed</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200/60 dark:bg-white/10" />
                            <div className="text-center px-2">
                                <span className="block text-xl font-extrabold text-[#8200db] dark:text-purple-300">{stats.checkedInToday ?? 0}</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Waiting</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* View Switcher & Date Controls */}
                <GlassCard className="p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* View mode tabs */}
                        <div className="flex items-center bg-white/40 dark:bg-white/[0.04] p-1 rounded-xl border border-white/40 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setViewMode('today')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    view === 'today'
                                        ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('week')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    view === 'week'
                                        ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                Week
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('upcoming')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    view === 'upcoming'
                                        ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <ListOrdered className="w-3.5 h-3.5" />
                                Upcoming
                            </button>
                        </div>

                        {/* Date Navigation (for week/day) */}
                        {view === 'week' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => shiftDate(-7)}
                                    className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2">
                                    Week of {humanDate(weekStart)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => shiftDate(7)}
                                    className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.get('/app/practitioner/appointments', { view: 'week', date: todayDate })}
                                    className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200"
                                >
                                    Current Week
                                </button>
                            </div>
                        )}

                        {view === 'today' && (
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-white/[0.04] px-3.5 py-2 rounded-xl border border-white/40 dark:border-white/10">
                                {humanDate(todayDate)}
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* ----------------- VIEW 1: TODAY ----------------- */}
                {view === 'today' && (
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <GlassCard className="p-12 text-center flex flex-col items-center">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-[#8200db] dark:text-purple-300 flex items-center justify-center mb-3">
                                    <CalendarIcon className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">No appointments scheduled for today</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                    You have a clear schedule today. Check the upcoming tab to see what’s booked for the rest of the week.
                                </p>
                                <GlassButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setViewMode('upcoming')}
                                    className="mt-4"
                                >
                                    View Upcoming Appointments
                                </GlassButton>
                            </GlassCard>
                        ) : (
                            <div className="grid grid-cols-1 gap-3.5">
                                {appointments.map((appt) => {
                                    const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                                    const isCurrent = appt.id === currentApptId;
                                    const isNext = appt.id === nextApptId;
                                    const isCancelled = appt.status === 'cancelled';

                                    return (
                                        <GlassCard
                                            key={appt.id}
                                            onClick={() => setSelectedAppt(appt)}
                                            className={`p-5 transition-all cursor-pointer hover:shadow-md ${
                                                isCurrent ? 'ring-2 ring-[#8200db] border-purple-500/50 bg-purple-500/[0.04]' : ''
                                            }`}
                                        >
                                            {isCurrent && (
                                                <div className="inline-flex items-center gap-1.5 bg-[#8200db] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 shadow-xs animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    Happening Now
                                                </div>
                                            )}
                                            {isNext && (
                                                <div className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 shadow-xs">
                                                    Next Up
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-start gap-3.5">
                                                    <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 text-[#8200db] dark:text-purple-300 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-500/20 shadow-xs">
                                                        {appt.client_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-base font-bold transition-colors ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                            {appt.client_name}
                                                        </h3>
                                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                                                            {appt.service_name}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                                            {appt.room_name && (
                                                                <span className="flex items-center gap-1 font-medium">
                                                                    <DoorOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                    {appt.room_name}
                                                                </span>
                                                            )}
                                                            {appt.location_name && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                    {appt.location_name}
                                                                </span>
                                                            )}
                                                            {appt.notes && (
                                                                <span className="flex items-center gap-1 text-[#8200db] dark:text-purple-300 font-semibold">
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                    Has notes
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:items-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-white/10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-white/10 px-3 py-1 rounded-xl border border-slate-200/60 dark:border-white/10">
                                                            {humanTime(appt.starts_at, timezone)} - {humanTime(appt.ends_at, timezone)}
                                                        </span>
                                                        <span
                                                            className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                                                            style={{
                                                                background: s.bg,
                                                                color: s.fg,
                                                                borderColor: s.border,
                                                            }}
                                                        >
                                                            {s.label}
                                                        </span>
                                                    </div>

                                                    {!isCancelled && (
                                                        <div
                                                            className="flex items-center gap-1.5 flex-wrap"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {appt.clinical_note_id ? (
                                                                <a
                                                                    href={appt.clinical_note_status === 'draft' ? `/app/notes/${appt.clinical_note_id}/edit` : `/app/notes/${appt.clinical_note_id}`}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition shadow-2xs"
                                                                >
                                                                    <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                                    <span>{appt.clinical_note_status === 'draft' ? 'Continue Note' : 'View Note'}</span>
                                                                </a>
                                                            ) : appt.client_id ? (
                                                                <a
                                                                    href={`/app/clients/${appt.client_id}/notes/create?appointment_id=${appt.id}`}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[#8200db] hover:opacity-90 text-white transition shadow-2xs"
                                                                >
                                                                    <FileText className="w-3 h-3" />
                                                                    <span>Write Note</span>
                                                                </a>
                                                            ) : null}

                                                            {canUseScribe && appt.client_id && appt.status !== 'completed' && appt.status !== 'no_show' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setScribeAppt(appt)}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/25 transition shadow-2xs"
                                                                >
                                                                    <Mic className="w-3 h-3" />
                                                                    <span>Start Scribe</span>
                                                                </button>
                                                            )}

                                                            {appt.status !== 'checked_in' && appt.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusUpdate(appt.id, 'checked_in')}
                                                                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 transition shadow-2xs"
                                                                >
                                                                    Check In
                                                                </button>
                                                            )}
                                                            {appt.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusUpdate(appt.id, 'completed')}
                                                                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition shadow-2xs"
                                                                >
                                                                    Complete
                                                                </button>
                                                            )}
                                                            {appt.status !== 'no_show' && appt.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusUpdate(appt.id, 'no_show')}
                                                                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 transition shadow-2xs"
                                                                >
                                                                    No-show
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ----------------- VIEW 2: WEEK ----------------- */}
                {view === 'week' && (
                    <GlassCard className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200/50 dark:divide-white/10">
                            {weekDays.map((d) => {
                                const isToday = d === todayDate;
                                const dayAppts = weekAppointmentsByDay[d] || [];
                                const parts = humanDate(d).split(' ');

                                return (
                                    <div key={d} className={`min-h-[220px] p-3.5 flex flex-col ${isToday ? 'bg-purple-500/[0.05]' : ''}`}>
                                        <div className="text-center pb-3 border-b border-slate-200/50 dark:border-white/10">
                                            <div className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? 'text-[#8200db] dark:text-purple-300' : 'text-slate-400'}`}>
                                                {parts[0]}
                                            </div>
                                            <div className={`text-base font-extrabold mt-0.5 ${isToday ? 'text-[#8200db] dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {d.split('-')[2]}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2 mt-3">
                                            {dayAppts.length === 0 ? (
                                                <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-6 font-medium">
                                                    No sessions
                                                </div>
                                            ) : (
                                                dayAppts.map((a) => {
                                                    const s = STATUS_STYLES[a.status] || STATUS_STYLES.scheduled;
                                                    const isCancelled = a.status === 'cancelled';
                                                    return (
                                                        <div
                                                            key={a.id}
                                                            onClick={() => setSelectedAppt(a)}
                                                            className="p-2.5 rounded-xl border text-left cursor-pointer hover:shadow-md transition-all"
                                                            style={{
                                                                background: s.bg,
                                                                borderColor: s.border,
                                                                opacity: isCancelled ? 0.6 : 1,
                                                            }}
                                                        >
                                                            <div className="text-[10px] font-bold" style={{ color: s.fg }}>
                                                                {humanTime(a.starts_at, timezone)}
                                                            </div>
                                                            <div className={`text-xs font-bold truncate mt-0.5 ${isCancelled ? 'line-through opacity-60' : 'text-slate-900 dark:text-white'}`}>
                                                                {a.client_name}
                                                            </div>
                                                            <div className="text-[10px] truncate text-slate-600 dark:text-slate-300">
                                                                {a.service_name}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                )}

                {/* ----------------- VIEW 3: UPCOMING ----------------- */}
                {view === 'upcoming' && (
                    <div className="space-y-6">
                        {Object.keys(groupedUpcoming).length === 0 ? (
                            <GlassCard className="p-12 text-center flex flex-col items-center">
                                <CalendarIcon className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-2 opacity-70" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">No upcoming appointments</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    You have no scheduled bookings in the future.
                                </p>
                            </GlassCard>
                        ) : (
                            Object.entries(groupedUpcoming).map(([dateKey, items]) => (
                                <div key={dateKey} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
                                            {dateKey === todayDate ? 'Today — ' : ''}{humanDate(dateKey)}
                                        </h3>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                            ({items.length} {items.length === 1 ? 'appointment' : 'appointments'})
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        {items.map((appt) => {
                                            const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                                            return (
                                                <GlassCard
                                                    key={appt.id}
                                                    onClick={() => setSelectedAppt(appt)}
                                                    className="p-4 hover:border-purple-500/40 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ background: s.dot }} />
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {appt.client_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {appt.service_name} · {appt.room_name || appt.location_name || 'Clinic'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-right">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-white/10 px-3 py-1 rounded-xl border border-slate-200/60 dark:border-white/10">
                                                            {humanTime(appt.starts_at, timezone)}
                                                        </span>
                                                        <span
                                                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                                                            style={{ background: s.bg, color: s.fg, borderColor: s.border }}
                                                        >
                                                            {s.label}
                                                        </span>
                                                    </div>
                                                </GlassCard>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Status Legend */}
                <GlassCard className="p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Status Legend:
                    </span>
                    <div className="flex items-center gap-4 flex-wrap">
                        {Object.entries(STATUS_STYLES).map(([k, s]) => (
                            <span key={k} className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ background: s.dot }} />
                                {s.label}
                            </span>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* ----------------- APPOINTMENT DETAIL & NOTES MODAL ----------------- */}
            {selectedAppt && (
                <AppointmentDetailModal
                    appt={selectedAppt}
                    tz={timezone}
                    onClose={() => setSelectedAppt(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onToast={(msg) => setToastMessage(msg)}
                />
            )}

            {/* AI Scribe (consent-gated recording + transcription) */}
            {scribeAppt && (
                <ScribePanel
                    clientId={scribeAppt.client_id}
                    clientName={scribeAppt.client_name}
                    appointmentId={scribeAppt.id}
                    onClose={() => setScribeAppt(null)}
                />
            )}

            {/* Toast Alert */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}

function AppointmentDetailModal({ appt, tz, onClose, onStatusUpdate, onToast }) {
    const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
    const [notes, setNotes] = useState(appt.notes || '');
    const [savingNotes, setSavingNotes] = useState(false);

    const saveNotes = (e) => {
        e.preventDefault();
        setSavingNotes(true);
        router.patch(
            `/app/practitioner/appointments/${appt.id}/notes`,
            { notes },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSavingNotes(false);
                    onToast('Appointment notes saved.');
                },
                onError: () => setSavingNotes(false),
            }
        );
    };

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={appt.client_name}
            maxWidth="max-w-lg"
        >
            <div className="space-y-5">
                <div className="flex items-center gap-2">
                    <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                        style={{ background: s.bg, color: s.fg, borderColor: s.border }}
                    >
                        {s.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {appt.duration_minutes} mins
                    </span>
                </div>

                {/* Session Details Box */}
                <div className="p-4 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-white/40 dark:border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Service:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{appt.service_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Date & Time:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {humanDate(zonedDateKey(appt.starts_at, tz))} · {humanTime(appt.starts_at, tz)} - {humanTime(appt.ends_at, tz)}
                        </span>
                    </div>
                    {appt.room_name && (
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Room:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{appt.room_name}</span>
                        </div>
                    )}
                    {appt.location_name && (
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Location:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{appt.location_name}</span>
                        </div>
                    )}
                </div>

                {/* Patient Contact */}
                {(appt.client_phone || appt.client_email) && (
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            Patient Contact
                        </label>
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                            {appt.client_phone && (
                                <a
                                    href={`tel:${appt.client_phone}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 border border-white/40 dark:border-white/10 font-semibold transition"
                                >
                                    <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    {appt.client_phone}
                                </a>
                            )}
                            {appt.client_email && (
                                <a
                                    href={`mailto:${appt.client_email}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 border border-white/40 dark:border-white/10 font-semibold transition"
                                >
                                    <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    {appt.client_email}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Change Status Section */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Update Session Status
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['confirmed', 'checked_in', 'completed', 'no_show'].map((st) => {
                            const isCurrent = appt.status === st;
                            const itemStyle = STATUS_STYLES[st];
                            return (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => onStatusUpdate(appt.id, st)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCurrent ? 'ring-2 ring-[#8200db] ring-offset-1 font-extrabold' : 'opacity-80 hover:opacity-100'
                                    }`}
                                    style={{
                                        background: itemStyle.bg,
                                        color: itemStyle.fg,
                                        borderColor: itemStyle.border,
                                    }}
                                >
                                    {isCurrent && '✓ '}
                                    {itemStyle.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Clinical / Appointment Notes */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Session & Appointment Notes
                        </label>
                        <span className="text-[10px] text-slate-400">Editable by practitioner</span>
                    </div>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add clinical observation, session notes or follow-up instructions…"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8200db] transition"
                    />
                    <div className="flex justify-end mt-2">
                        <GlassButton
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={saveNotes}
                            disabled={savingNotes}
                            icon={<Check className="w-3.5 h-3.5" />}
                        >
                            {savingNotes ? 'Saving…' : 'Save Notes'}
                        </GlassButton>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        Rescheduling managed by clinic reception.
                    </span>
                    <GlassButton variant="secondary" size="sm" onClick={onClose}>
                        Close
                    </GlassButton>
                </div>
            </div>
        </GlassModal>
    );
}

function Toast({ message, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/15 animate-in slide-in-from-bottom-5 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{message}</span>
            <button
                type="button"
                onClick={onClose}
                className="ml-2 text-slate-400 hover:text-white"
            >
                ✕
            </button>
        </div>
    );
}
