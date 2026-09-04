import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Calendar as CalendarIcon, Clock, User, MapPin, DoorOpen,
    CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
    Sparkles, FileText, Check, ArrowRight, UserCheck, Phone, Mail,
    HelpCircle, CalendarDays, ListOrdered, Radio
} from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';

const STATUS_STYLES = {
    scheduled: {
        label: 'Scheduled',
        bg: 'rgba(37, 99, 235, 0.10)',
        fg: '#1D4ED8',
        border: '#93C5FD',
        dot: '#2563EB',
    },
    confirmed: {
        label: 'Confirmed',
        bg: 'rgba(6, 182, 212, 0.12)',
        fg: '#0E7490',
        border: '#A5F3FC',
        dot: '#0891B2',
    },
    checked_in: {
        label: 'Checked in',
        bg: 'rgba(139, 92, 246, 0.12)',
        fg: '#6D28D9',
        border: '#DDD6FE',
        dot: '#7C3AED',
    },
    completed: {
        label: 'Completed',
        bg: 'rgba(34, 197, 94, 0.12)',
        fg: '#15803D',
        border: '#BBF7D0',
        dot: '#16A34A',
    },
    no_show: {
        label: 'No-show',
        bg: 'rgba(245, 158, 11, 0.14)',
        fg: '#B45309',
        border: '#FDE68A',
        dot: '#D97706',
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'rgba(148, 163, 184, 0.16)',
        fg: '#64748B',
        border: '#CBD5E1',
        dot: '#64748B',
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
    view, anchorDate, weekStart, todayDate, timezone, appointments, stats, practitioner,
}) {
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const now = new Date();

    // Determine current / next appointment for highlighting
    const sortedActive = useMemo(() => {
        return appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed');
    }, [appointments]);

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

    // Group upcoming appointments by date
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

    // Week days calculation
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
        <AuthenticatedLayout>
            <Head title="My Appointments" />

            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                                <Sparkles className="w-4 h-4" />
                                <span>Practitioner Schedule</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                {practitioner.name}’s Appointments
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm mt-1 flex items-center gap-2">
                                <span>Showing only your assigned client sessions</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-cyan-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    {timezone}
                                </span>
                            </p>
                        </div>

                        {/* Quick Stats Pill */}
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 self-start md:self-auto">
                            <div className="text-center px-2">
                                <span className="block text-xl font-extrabold text-white">{stats.todayCount}</span>
                                <span className="text-[11px] text-slate-300 font-medium">Today</span>
                            </div>
                            <div className="h-8 w-px bg-white/20" />
                            <div className="text-center px-2">
                                <span className="block text-xl font-extrabold text-emerald-400">{stats.completedToday}</span>
                                <span className="text-[11px] text-slate-300 font-medium">Completed</span>
                            </div>
                            <div className="h-8 w-px bg-white/20" />
                            <div className="text-center px-2">
                                <span className="block text-xl font-extrabold text-cyan-300">{stats.checkedInToday}</span>
                                <span className="text-[11px] text-slate-300 font-medium">Waiting</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* View Switcher & Date Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    {/* View mode tabs */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                        <button
                            type="button"
                            onClick={() => setViewMode('today')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('week')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Week
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('upcoming')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
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
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 px-2">
                                Week of {humanDate(weekStart)}
                            </span>
                            <button
                                type="button"
                                onClick={() => shiftDate(7)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => router.get('/app/practitioner/appointments', { view: 'week', date: todayDate })}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                            >
                                Current Week
                            </button>
                        </div>
                    )}

                    {view === 'today' && (
                        <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                            {humanDate(todayDate)}
                        </div>
                    )}
                </div>

                {/* ----------------- VIEW 1: TODAY ----------------- */}
                {view === 'today' && (
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-sm flex flex-col items-center">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                                    <CalendarIcon className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-slate-800">No appointments scheduled for today</h3>
                                <p className="text-xs text-slate-500 max-w-sm mt-1">
                                    You have a clear schedule today. Check the upcoming tab to see what’s booked for the rest of the week.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('upcoming')}
                                    className="mt-4 text-xs font-bold px-4 py-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
                                >
                                    View Upcoming Appointments
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3.5">
                                {appointments.map((appt) => {
                                    const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                                    const isCurrent = appt.id === currentApptId;
                                    const isNext = appt.id === nextApptId;
                                    const isCancelled = appt.status === 'cancelled';

                                    return (
                                        <div
                                            key={appt.id}
                                            onClick={() => setSelectedAppt(appt)}
                                            className={`group relative bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${isCurrent ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/10' : 'border-slate-200/80'}`}
                                        >
                                            {/* Highlight badges */}
                                            {isCurrent && (
                                                <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 shadow-sm animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    Happening Now
                                                </div>
                                            )}
                                            {isNext && (
                                                <div className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 shadow-sm">
                                                    Next Up
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                {/* Client & Service Info */}
                                                <div className="flex items-start gap-3.5">
                                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-300/60 shadow-sm group-hover:border-blue-300 transition-colors">
                                                        {appt.client_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-base font-bold transition-colors ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                                            {appt.client_name}
                                                        </h3>
                                                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                                                            {appt.service_name}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                                                            {appt.room_name && (
                                                                <span className="flex items-center gap-1 font-medium text-slate-500">
                                                                    <DoorOpen className="w-3 h-3 text-slate-400" />
                                                                    {appt.room_name}
                                                                </span>
                                                            )}
                                                            {appt.location_name && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                                    {appt.location_name}
                                                                </span>
                                                            )}
                                                            {appt.notes && (
                                                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                                    <FileText className="w-3 h-3" />
                                                                    Has notes
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Time & Quick Actions */}
                                                <div className="flex flex-col sm:items-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
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

                                                    {/* Quick 1-Tap Status Action Buttons & Note Action */}
                                                    {!isCancelled && (
                                                        <div
                                                            className="flex items-center gap-1.5 flex-wrap"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {appt.clinical_note_id ? (
                                                                <a
                                                                    href={appt.clinical_note_status === 'draft' ? `/app/notes/${appt.clinical_note_id}/edit` : `/app/notes/${appt.clinical_note_id}`}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition shadow-2xs"
                                                                >
                                                                    <FileText className="w-3 h-3 text-violet-600" />
                                                                    <span>{appt.clinical_note_status === 'draft' ? 'Continue Note' : 'View Note'}</span>
                                                                </a>
                                                            ) : appt.client_id ? (
                                                                <a
                                                                    href={`/app/clients/${appt.client_id}/notes/create?appointment_id=${appt.id}`}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition shadow-2xs"
                                                                >
                                                                    <FileText className="w-3 h-3" />
                                                                    <span>Write Note</span>
                                                                </a>
                                                            ) : null}

                                                            {appt.status !== 'checked_in' && appt.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusUpdate(appt.id, 'checked_in')}
                                                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition shadow-2xs"
                                                                >
                                                                    Check In
                                                                </button>
                                                            )}
                                                            {appt.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusUpdate(appt.id, 'completed')}
                                                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition shadow-2xs"
                                                                >
                                                                    Complete
                                                                </button>
                                                            )}
                                                            {appt.status !== 'no_show' && appt.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusUpdate(appt.id, 'no_show')}
                                                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition shadow-2xs"
                                                                >
                                                                    No-show
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ----------------- VIEW 2: WEEK ----------------- */}
                {view === 'week' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                            {weekDays.map((d) => {
                                const isToday = d === todayDate;
                                const dayAppts = weekAppointmentsByDay[d] || [];
                                const parts = humanDate(d).split(' ');

                                return (
                                    <div key={d} className={`min-h-[220px] p-3.5 flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`}>
                                        <div className="text-center pb-3 border-b border-slate-100">
                                            <div className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {parts[0]}
                                            </div>
                                            <div className={`text-base font-extrabold mt-0.5 ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                                                {d.split('-')[2]}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2 mt-3">
                                            {dayAppts.length === 0 ? (
                                                <div className="text-[11px] text-slate-300 text-center py-6 font-medium">
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
                                                            <div className={`text-xs font-bold truncate mt-0.5 ${isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                                                {a.client_name}
                                                            </div>
                                                            <div className="text-[10px] truncate text-slate-600">
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
                    </div>
                )}

                {/* ----------------- VIEW 3: UPCOMING ----------------- */}
                {view === 'upcoming' && (
                    <div className="space-y-6">
                        {Object.keys(groupedUpcoming).length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-sm flex flex-col items-center">
                                <CalendarIcon className="w-10 h-10 text-slate-300 mb-2" />
                                <h3 className="text-base font-bold text-slate-800">No upcoming appointments</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    You have no scheduled bookings in the future.
                                </p>
                            </div>
                        ) : (
                            Object.entries(groupedUpcoming).map(([dateKey, items]) => (
                                <div key={dateKey} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
                                            {dateKey === todayDate ? 'Today — ' : ''}{humanDate(dateKey)}
                                        </h3>
                                        <span className="text-xs text-slate-400 font-semibold">
                                            ({items.length} {items.length === 1 ? 'appointment' : 'appointments'})
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        {items.map((appt) => {
                                            const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                                            return (
                                                <div
                                                    key={appt.id}
                                                    onClick={() => setSelectedAppt(appt)}
                                                    className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.dot }} />
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">
                                                                {appt.client_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                {appt.service_name} · {appt.room_name || appt.location_name || 'Clinic'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-right">
                                                        <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                                                            {humanTime(appt.starts_at, timezone)}
                                                        </span>
                                                        <span
                                                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                                                            style={{ background: s.bg, color: s.fg, borderColor: s.border }}
                                                        >
                                                            {s.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Status Legend */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex-wrap text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        Status Legend:
                    </span>
                    <div className="flex items-center gap-4 flex-wrap">
                        {Object.entries(STATUS_STYLES).map(([k, s]) => (
                            <span key={k} className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
                                {s.label}
                            </span>
                        ))}
                    </div>
                </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <span
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                                style={{ background: s.bg, color: s.fg, borderColor: s.border }}
                            >
                                {s.label}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                {appt.duration_minutes} mins
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mt-1">
                            {appt.client_name}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Session Details Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">Service:</span>
                            <span className="font-bold text-slate-800">{appt.service_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">Date & Time:</span>
                            <span className="font-bold text-slate-800">
                                {humanDate(zonedDateKey(appt.starts_at, tz))} · {humanTime(appt.starts_at, tz)} - {humanTime(appt.ends_at, tz)}
                            </span>
                        </div>
                        {appt.room_name && (
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-500">Room:</span>
                                <span className="font-bold text-slate-800">{appt.room_name}</span>
                            </div>
                        )}
                        {appt.location_name && (
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-500">Location:</span>
                                <span className="font-bold text-slate-800">{appt.location_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Patient Contact (read-only for practitioner) */}
                    {(appt.client_phone || appt.client_email) && (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Patient Contact
                            </label>
                            <div className="flex items-center gap-3 flex-wrap text-xs">
                                {appt.client_phone && (
                                    <a
                                        href={`tel:${appt.client_phone}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                                    >
                                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                                        {appt.client_phone}
                                    </a>
                                )}
                                {appt.client_email && (
                                    <a
                                        href={`mailto:${appt.client_email}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                                    >
                                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                                        {appt.client_email}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Change Status Section */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
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
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-1 font-extrabold' : 'opacity-80 hover:opacity-100'}`}
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
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Session & Appointment Notes
                            </label>
                            <span className="text-[10px] text-slate-400">Editable by practitioner</span>
                        </div>
                        <textarea
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add clinical observation, session notes or follow-up instructions…"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={saveNotes}
                                disabled={savingNotes}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg text-white transition disabled:opacity-60"
                                style={{ background: BRAND_GRADIENT }}
                            >
                                <Check className="w-3.5 h-3.5" />
                                {savingNotes ? 'Saving…' : 'Save Notes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-slate-400">
                        Rescheduling & cancellations managed by clinic reception.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function Toast({ message, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
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
