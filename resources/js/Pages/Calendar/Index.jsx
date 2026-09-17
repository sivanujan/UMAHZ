import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { GlassModal } from '@/Components/UI/GlassModal';
import { GlassInput, GlassSelect, GlassTextarea, GlassLabel, GlassError } from '@/Components/UI/FormControls';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, User,
    MapPin, DoorOpen, Trash2, Check, Ban, AlertCircle, Loader2, CheckCircle2,
    CalendarCheck, AlertTriangle, Users, LayoutGrid, SlidersHorizontal
} from 'lucide-react';

const HOUR_PX = 64;

const STATUS_STYLES = {
    scheduled: {
        label: 'Scheduled',
        bg: 'rgba(130, 0, 219, 0.10)',
        fg: '#6b00b6',
        border: '#8200db',
        dot: '#8200db',
    },
    confirmed: {
        label: 'Confirmed',
        bg: 'rgba(6, 182, 212, 0.12)',
        fg: '#0e7490',
        border: '#06b6d4',
        dot: '#0891b2',
    },
    checked_in: {
        label: 'Checked in',
        bg: 'rgba(168, 85, 247, 0.12)',
        fg: '#7e22ce',
        border: '#a855f7',
        dot: '#9333ea',
    },
    completed: {
        label: 'Completed',
        bg: 'rgba(34, 197, 94, 0.12)',
        fg: '#15803d',
        border: '#22c55e',
        dot: '#16a34a',
    },
    no_show: {
        label: 'No-show',
        bg: 'rgba(245, 158, 11, 0.12)',
        fg: '#b45309',
        border: '#f59e0b',
        dot: '#d97706',
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'rgba(148, 163, 184, 0.16)',
        fg: '#475569',
        border: '#94a3b8',
        dot: '#64748b',
    },
};

const COMMON_SERVICES = [
    'Initial Consultation',
    'Follow-up Visit',
    'Acupuncture Session',
    'Massage Therapy',
    'Physiotherapy Assessment',
    'Chiropractic Adjustment',
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

/* ------------------------------ date helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function addMonths(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(Math.min(d, 28))}`;
}

function zonedParts(iso, tz) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
    const hour = parseInt(parts.hour === '24' ? '00' : parts.hour, 10);
    const minute = parseInt(parts.minute, 10);
    return {
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        hour,
        minute,
        minutesOfDay: hour * 60 + minute,
    };
}

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

function humanMonthYear(dateStr, tz) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
        month: 'long', year: 'numeric', timeZone: tz,
    }).format(new Date(Date.UTC(y, m - 1, d)));
}

function todayInZone(tz) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
}

/* --------------------------- lane packing (overlaps) --------------------------- */

function packLanes(items) {
    const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const result = [];
    let cluster = [];
    let clusterEnd = -1;

    const flush = () => {
        const lanes = [];
        cluster.forEach((it) => {
            let placed = false;
            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i] <= it.startMin) { it.lane = i; lanes[i] = it.endMin; placed = true; break; }
            }
            if (!placed) { it.lane = lanes.length; lanes.push(it.endMin); }
        });
        cluster.forEach((it) => { it.laneCount = lanes.length; result.push(it); });
        cluster = [];
    };

    sorted.forEach((it) => {
        if (cluster.length && it.startMin >= clusterEnd) flush();
        cluster.push(it);
        clusterEnd = Math.max(clusterEnd, it.endMin);
    });
    flush();
    return result;
}

/* ------------------------------ appointment block (time grid) ------------------------------ */

function AppointmentBlock({ appt, tz, startHour, onClick }) {
    const gridStart = startHour * 60;
    const top = ((appt.startMin - gridStart) / 60) * HOUR_PX;
    const height = Math.max(30, ((appt.endMin - appt.startMin) / 60) * HOUR_PX - 2);
    const width = 100 / (appt.laneCount || 1);
    const left = (appt.lane || 0) * width;
    const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
    const cancelled = appt.status === 'cancelled';

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick(appt);
            }}
            className="absolute rounded-xl px-2.5 py-1.5 text-left overflow-hidden transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 hover:z-30 group border backdrop-blur-md"
            style={{
                top,
                height,
                left: `calc(${left}% + 2px)`,
                width: `calc(${width}% - 4px)`,
                backgroundColor: s.bg,
                borderColor: s.border,
                borderLeftWidth: '4px',
                opacity: cancelled ? 0.6 : 1,
            }}
            title={`${appt.client_name} · ${appt.service_name} (${humanTime(appt.starts_at, tz)} - ${humanTime(appt.ends_at, tz)})`}
        >
            <div className="flex items-center justify-between gap-1 leading-tight">
                <span className="text-[11px] font-extrabold flex items-center gap-1" style={{ color: s.fg }}>
                    <Clock className="w-3 h-3 shrink-0 opacity-80" />
                    <span>{humanTime(appt.starts_at, tz)}</span>
                    <span className="text-[10px] font-normal opacity-70">· {appt.duration_minutes}m</span>
                </span>
                <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                    style={{ background: s.dot }}
                />
            </div>

            <div
                className={`text-[12px] font-bold truncate leading-tight mt-1 text-slate-900 dark:text-white ${cancelled ? 'line-through opacity-60' : ''}`}
            >
                {appt.client_name}
            </div>

            {height > 46 && (
                <div className="text-[11px] font-semibold truncate leading-tight mt-0.5 text-slate-700 dark:text-slate-200">
                    {appt.service_name}
                </div>
            )}

            {height > 66 && (appt.practitioner_name || appt.room_name) && (
                <div className="text-[10px] truncate leading-tight mt-0.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    {[appt.practitioner_name, appt.room_name].filter(Boolean).join(' · ')}
                </div>
            )}
        </button>
    );
}

/* ------------------------------- live now line ------------------------------- */

function NowLine({ nowMinutes, startHour, endHour }) {
    const gridStart = startHour * 60;
    const gridEnd = endHour * 60;
    if (nowMinutes < gridStart || nowMinutes > gridEnd) return null;
    const top = ((nowMinutes - gridStart) / 60) * HOUR_PX;

    const h = Math.floor(nowMinutes / 60);
    const m = nowMinutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const timeLabel = `${displayHour}:${pad(m)} ${ampm}`;

    return (
        <div className="absolute left-0 right-0 z-20 pointer-events-none transition-all duration-300" style={{ top }}>
            {/* Pulsing indicator dot */}
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-[#8200db] dark:bg-purple-400 ring-4 ring-purple-500/20 shadow-md flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </div>

            {/* Gradient line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-[#8200db] via-purple-500 to-pink-500 dark:from-purple-400 dark:via-purple-400 dark:to-pink-400 shadow-sm" />

            {/* Time badge */}
            <div className="absolute -top-3 left-3 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#8200db] text-white dark:bg-purple-600 shadow-sm whitespace-nowrap">
                {timeLabel}
            </div>
        </div>
    );
}

/* --------------------------------- day column (week/day view) --------------------------------- */

function DayColumn({
    dateKey, appts, tz, isToday, nowMinutes, startHour, endHour, onCreate, onOpen,
}) {
    const hours = [];
    for (let h = startHour; h < endHour; h++) hours.push(h);
    const packed = useMemo(() => packLanes(appts), [appts]);

    return (
        <div
            className={`relative flex-1 min-w-[135px] border-l border-slate-200/50 dark:border-white/10 transition-colors ${
                isToday ? 'bg-gradient-to-b from-purple-500/[0.07] via-purple-500/[0.03] to-transparent dark:from-purple-500/[0.14] dark:via-purple-500/[0.05] dark:to-transparent' : ''
            }`}
        >
            {hours.map((h) => {
                const displayH = h % 12 === 0 ? 12 : h % 12;
                const ampm = h < 12 ? 'AM' : 'PM';
                const isNoon = h === 12;

                return (
                    <div
                        key={h}
                        className={`border-b ${isNoon ? 'border-purple-300/40 dark:border-purple-500/30' : 'border-slate-200/40 dark:border-white/5'} transition-colors relative flex flex-col`}
                        style={{ height: HOUR_PX }}
                    >
                        {/* 00 min slot */}
                        <div
                            className="h-1/2 cursor-pointer hover:bg-purple-500/[0.08] dark:hover:bg-purple-400/[0.10] transition-colors group/slot relative border-b border-dashed border-slate-200/30 dark:border-white/[0.04]"
                            onClick={() => onCreate(dateKey, `${pad(h)}:00`)}
                            title={`Click to book at ${displayH}:00 ${ampm}`}
                        >
                            <div className="hidden group-hover/slot:flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#8200db] dark:text-purple-300 bg-white/95 dark:bg-slate-900 px-2 py-0.5 rounded-md shadow-xs border border-purple-200 dark:border-purple-800 pointer-events-none z-10">
                                <Plus className="w-3 h-3" />
                                <span>{displayH}:00 {ampm}</span>
                            </div>
                        </div>

                        {/* 30 min slot */}
                        <div
                            className="h-1/2 cursor-pointer hover:bg-purple-500/[0.08] dark:hover:bg-purple-400/[0.10] transition-colors group/slot relative"
                            onClick={() => onCreate(dateKey, `${pad(h)}:30`)}
                            title={`Click to book at ${displayH}:30 ${ampm}`}
                        >
                            <div className="hidden group-hover/slot:flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#8200db] dark:text-purple-300 bg-white/95 dark:bg-slate-900 px-2 py-0.5 rounded-md shadow-xs border border-purple-200 dark:border-purple-800 pointer-events-none z-10">
                                <Plus className="w-3 h-3" />
                                <span>{displayH}:30 {ampm}</span>
                            </div>
                        </div>
                    </div>
                );
            })}

            {packed.map((a) => (
                <AppointmentBlock
                    key={a.id}
                    appt={a}
                    tz={tz}
                    startHour={startHour}
                    onClick={onOpen}
                />
            ))}

            {isToday && (
                <NowLine
                    nowMinutes={nowMinutes}
                    startHour={startHour}
                    endHour={endHour}
                />
            )}
        </div>
    );
}

/* --------------------------------- modal --------------------------------- */

function AppointmentModal({
    appt, defaults, practitioners, clients, locations, statuses, tz, onClose, onToast,
}) {
    const editing = Boolean(appt);

    const initialLocation = appt?.location_id || defaults?.location_id || (locations[0]?.id ?? '');
    const roomsFor = (locId) => locations.find((l) => l.id === locId)?.rooms || [];

    const startParts = appt ? zonedParts(appt.starts_at, tz) : null;

    const { data, setData, post, patch, processing, errors, clearErrors } = useForm({
        client_id: appt?.client_id || '',
        staff_membership_id: appt?.staff_membership_id || defaults?.staff_membership_id || (practitioners[0]?.id ?? ''),
        location_id: initialLocation,
        room_id: appt?.room_id || defaults?.room_id || '',
        service_name: appt?.service_name || '',
        date: appt ? startParts.dateKey : (defaults?.date || ''),
        start_time: appt ? `${pad(startParts.hour)}:${pad(startParts.minute)}` : (defaults?.start_time || '09:00'),
        duration_minutes: appt?.duration_minutes || 60,
        notes: appt?.notes || '',
    });

    const [clientErrors, setClientErrors] = useState({});
    const rooms = useMemo(() => roomsFor(data.location_id), [data.location_id, locations]);

    const handleLocationChange = (locId) => {
        setData((prev) => {
            const locRooms = roomsFor(locId);
            const validRoom = locRooms.some((r) => r.id === prev.room_id) ? prev.room_id : '';
            return {
                ...prev,
                location_id: locId,
                room_id: validRoom,
            };
        });
    };

    const validateForm = () => {
        const errs = {};
        if (!data.client_id) errs.client_id = 'Please select a client.';
        if (!data.staff_membership_id) errs.staff_membership_id = 'Please select a practitioner.';
        if (!data.service_name.trim()) errs.service_name = 'Please enter a service name.';
        if (!data.date) errs.date = 'Date is required.';
        if (!data.start_time) errs.start_time = 'Start time is required.';
        if (!data.duration_minutes || Number(data.duration_minutes) <= 0) {
            errs.duration_minutes = 'Duration must be positive.';
        }
        setClientErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = (e) => {
        e.preventDefault();
        clearErrors();
        if (!validateForm()) return;

        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                onToast(editing ? 'Appointment updated successfully.' : 'Appointment booked successfully.');
            },
        };

        if (editing) {
            patch(`/app/appointments/${appt.id}`, opts);
        } else {
            post('/app/appointments', opts);
        }
    };

    const doCancel = () => {
        if (!window.confirm('Are you sure you want to cancel this appointment? It will be marked as cancelled.')) {
            return;
        }
        const reason = window.prompt('Reason for cancellation (optional):') ?? '';
        router.patch(
            `/app/appointments/${appt.id}/cancel`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    onToast('Appointment marked as cancelled.');
                },
            }
        );
    };

    const setStatus = (status) => {
        router.patch(
            `/app/appointments/${appt.id}/status`,
            { status },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    onToast(`Status changed to ${STATUS_STYLES[status]?.label || status}.`);
                },
            }
        );
    };

    const hasConflict = errors.staff_membership_id && errors.staff_membership_id.includes('already has an appointment');
    const hasRoomConflict = errors.room_id && errors.room_id.includes('already booked');

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={editing ? 'Edit Appointment' : 'New Appointment'}
            maxWidth="max-w-lg"
        >
            <form onSubmit={submit} className="space-y-4">
                {/* Conflict Error Alert */}
                {(hasConflict || hasRoomConflict) && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-rose-900 dark:text-rose-200">Scheduling Conflict</p>
                            <p className="mt-0.5">
                                {hasConflict && errors.staff_membership_id}
                                {hasRoomConflict && errors.room_id}
                            </p>
                            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                                Please adjust the start time, duration, or practitioner to resolve.
                            </p>
                        </div>
                    </div>
                )}

                {/* Status switcher on Edit */}
                {editing && (
                    <div>
                        <GlassLabel>Appointment Status</GlassLabel>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {['scheduled', 'confirmed', 'checked_in', 'completed', 'no_show'].map((st) => {
                                const isCurrent = appt.status === st;
                                const s = STATUS_STYLES[st];
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStatus(st)}
                                        className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                                            isCurrent ? 'ring-2 ring-offset-1 ring-[#8200db] font-extrabold' : 'opacity-80 hover:opacity-100'
                                        }`}
                                        style={{
                                            borderColor: s.border,
                                            color: s.fg,
                                            background: s.bg,
                                        }}
                                    >
                                        {isCurrent && '✓ '}
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Client Selection */}
                <div>
                    <GlassLabel required>Client</GlassLabel>
                    <GlassSelect
                        value={data.client_id}
                        onChange={(e) => {
                            setData('client_id', e.target.value);
                            setClientErrors((prev) => ({ ...prev, client_id: undefined }));
                        }}
                    >
                        <option value="">Select client…</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </GlassSelect>
                    <GlassError message={clientErrors.client_id || errors.client_id} />
                </div>

                {/* Practitioner Selection */}
                <div>
                    <GlassLabel required>Practitioner</GlassLabel>
                    <GlassSelect
                        value={data.staff_membership_id}
                        onChange={(e) => {
                            setData('staff_membership_id', e.target.value);
                            setClientErrors((prev) => ({ ...prev, staff_membership_id: undefined }));
                        }}
                    >
                        <option value="">Select practitioner…</option>
                        {practitioners.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </GlassSelect>
                    {!hasConflict && <GlassError message={clientErrors.staff_membership_id || errors.staff_membership_id} />}
                </div>

                {/* Service Name & Quick Suggestions */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <GlassLabel required>Service Name</GlassLabel>
                        <span className="text-[11px] text-slate-400">Quick chips below</span>
                    </div>
                    <GlassInput
                        type="text"
                        value={data.service_name}
                        placeholder="e.g. Acupuncture Session"
                        onChange={(e) => {
                            setData('service_name', e.target.value);
                            setClientErrors((prev) => ({ ...prev, service_name: undefined }));
                        }}
                    />
                    <GlassError message={clientErrors.service_name || errors.service_name} />
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {COMMON_SERVICES.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    setData('service_name', s);
                                    setClientErrors((prev) => ({ ...prev, service_name: undefined }));
                                }}
                                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-white/50 dark:bg-white/10 hover:bg-purple-500/15 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 transition"
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Location & Room */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <GlassLabel>Location</GlassLabel>
                        <GlassSelect
                            value={data.location_id}
                            onChange={(e) => handleLocationChange(e.target.value)}
                        >
                            <option value="">No location specified</option>
                            {locations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </GlassSelect>
                    </div>
                    <div>
                        <GlassLabel>Room</GlassLabel>
                        <GlassSelect
                            value={data.room_id}
                            onChange={(e) => setData('room_id', e.target.value)}
                            disabled={!rooms.length}
                        >
                            <option value="">No specific room</option>
                            {rooms.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </GlassSelect>
                        {!hasRoomConflict && <GlassError message={errors.room_id} />}
                    </div>
                </div>

                {/* Date, Start Time & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <GlassLabel required>Date</GlassLabel>
                        <GlassInput
                            type="date"
                            value={data.date}
                            onChange={(e) => {
                                setData('date', e.target.value);
                                setClientErrors((prev) => ({ ...prev, date: undefined }));
                            }}
                        />
                        <GlassError message={clientErrors.date || errors.date} />
                    </div>

                    <div>
                        <GlassLabel required>Start Time</GlassLabel>
                        <GlassInput
                            type="time"
                            value={data.start_time}
                            onChange={(e) => {
                                setData('start_time', e.target.value);
                                setClientErrors((prev) => ({ ...prev, start_time: undefined }));
                            }}
                        />
                        <GlassError message={clientErrors.start_time || errors.start_time} />
                    </div>

                    <div>
                        <GlassLabel required>Duration (min)</GlassLabel>
                        <GlassInput
                            type="number"
                            min="5"
                            max="480"
                            step="5"
                            value={data.duration_minutes}
                            onChange={(e) => {
                                setData('duration_minutes', parseInt(e.target.value || '0', 10));
                                setClientErrors((prev) => ({ ...prev, duration_minutes: undefined }));
                            }}
                        />
                        <GlassError message={clientErrors.duration_minutes || errors.duration_minutes} />
                    </div>
                </div>

                {/* Quick duration presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Presets:</span>
                    {DURATION_PRESETS.map((mins) => (
                        <button
                            key={mins}
                            type="button"
                            onClick={() => setData('duration_minutes', mins)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold transition ${
                                data.duration_minutes === mins
                                    ? 'bg-[#8200db] text-white border-[#8200db]'
                                    : 'bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-white/40 dark:border-white/10'
                            }`}
                        >
                            {mins}m
                        </button>
                    ))}
                </div>

                {/* Notes */}
                <div>
                    <GlassLabel>Notes (Optional)</GlassLabel>
                    <GlassTextarea
                        rows={2}
                        value={data.notes}
                        placeholder="Internal notes regarding this booking…"
                        onChange={(e) => setData('notes', e.target.value)}
                    />
                </div>

                {errors.starts_at && <GlassError message={errors.starts_at} />}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/10">
                    {editing ? (
                        <GlassButton
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={doCancel}
                            icon={<Ban className="w-3.5 h-3.5" />}
                        >
                            Cancel appointment
                        </GlassButton>
                    ) : <span />}

                    <div className="flex items-center gap-2">
                        <GlassButton
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Close
                        </GlassButton>
                        <GlassButton
                            type="submit"
                            variant="primary"
                            disabled={processing || hasConflict || hasRoomConflict}
                            icon={processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        >
                            {editing ? 'Save Changes' : 'Book Appointment'}
                        </GlassButton>
                    </div>
                </div>
            </form>
        </GlassModal>
    );
}

/* ------------------------------- Toast Alert ------------------------------- */

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
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

/* ------------------------------- main page ------------------------------- */

export default function CalendarIndex() {
    const { props } = usePage();
    const {
        view = 'week', anchorDate, rangeStart, rangeEnd, timezone = 'UTC', appointments = [],
        practitioners = [], clients = [], locations = [], statuses, filters = {},
    } = props;

    const [modal, setModal] = useState(null); // { appt } | { defaults }
    const [toastMessage, setToastMessage] = useState(null);
    const [fullDay, setFullDay] = useState(false);
    const [splitByPractitioner, setSplitByPractitioner] = useState(false);

    const scrollContainerRef = useRef(null);

    // Live clock for current time line
    const [nowMinutes, setNowMinutes] = useState(() => zonedParts(new Date().toISOString(), timezone).minutesOfDay);

    useEffect(() => {
        const updateNow = () => {
            setNowMinutes(zonedParts(new Date().toISOString(), timezone).minutesOfDay);
        };
        updateNow();
        const interval = setInterval(updateNow, 30000); // 30s update
        return () => clearInterval(interval);
    }, [timezone]);

    // Calculate smart business hours vs full day
    const hasOffHourAppts = useMemo(() => {
        return appointments.some((a) => {
            const s = zonedParts(a.starts_at, timezone);
            const e = zonedParts(a.ends_at, timezone);
            return s.hour < 8 || e.hour >= 19 || (e.hour === 19 && e.minute > 0);
        });
    }, [appointments, timezone]);

    const startHour = fullDay || hasOffHourAppts ? 7 : 8;
    const endHour = fullDay || hasOffHourAppts ? 21 : 19;

    const today = todayInZone(timezone);

    // Compute visible days based on view
    const days = useMemo(() => {
        if (view === 'day') return [anchorDate];
        if (view === 'week') return Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
        if (view === 'month') {
            const [y1, m1, d1] = rangeStart.split('-').map(Number);
            const endStr = rangeEnd || addDays(rangeStart, 34);
            const [y2, m2, d2] = endStr.split('-').map(Number);
            const dt1 = new Date(Date.UTC(y1, m1 - 1, d1));
            const dt2 = new Date(Date.UTC(y2, m2 - 1, d2));
            const diffDays = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24)) + 1;
            const count = Math.max(28, Math.min(diffDays, 42));
            return Array.from({ length: count }, (_, i) => addDays(rangeStart, i));
        }
        return [anchorDate];
    }, [view, rangeStart, anchorDate, rangeEnd]);

    // Group appointments by date
    const byDay = useMemo(() => {
        const map = Object.fromEntries(days.map((d) => [d, []]));
        appointments.forEach((a) => {
            const s = zonedParts(a.starts_at, timezone);
            const e = zonedParts(a.ends_at, timezone);
            if (map[s.dateKey]) {
                map[s.dateKey].push({
                    ...a,
                    startMin: s.minutesOfDay,
                    endMin: e.dateKey === s.dateKey ? e.minutesOfDay : endHour * 60,
                });
            }
        });
        return map;
    }, [appointments, timezone, days, endHour]);

    const navigate = (patch) => {
        router.get('/app/calendar', {
            view, date: anchorDate, ...filters, ...patch,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const shift = (dir) => {
        if (view === 'month') {
            navigate({ date: addMonths(anchorDate, dir) });
        } else if (view === 'week') {
            navigate({ date: addDays(anchorDate, dir * 7) });
        } else {
            navigate({ date: addDays(anchorDate, dir) });
        }
    };

    const setView = (v) => navigate({ view: v, date: anchorDate });
    const setFilter = (key, value) => navigate({ [key]: value || undefined });

    const roomsForFilter = locations.find((l) => l.id === filters.location_id)?.rooms || [];
    const hours = [];
    for (let h = startHour; h < endHour; h++) hours.push(h);

    const openCreate = (date, start_time, staffId) => setModal({
        defaults: {
            date,
            start_time,
            staff_membership_id: staffId || filters.staff_membership_id || (practitioners[0]?.id ?? ''),
            location_id: filters.location_id,
            room_id: filters.room_id,
        },
    });

    const totalAppointmentsInView = appointments.length;

    // Subtitle based on view
    let rangeSubtitle = '';
    if (view === 'month') {
        rangeSubtitle = `${humanMonthYear(anchorDate, timezone)} • ${timezone}`;
    } else if (view === 'week') {
        const weekEndDate = addDays(rangeStart, 6);
        rangeSubtitle = `${humanDate(rangeStart)} – ${humanDate(weekEndDate)} • ${timezone}`;
    } else {
        rangeSubtitle = `${humanDate(anchorDate)} • ${timezone}`;
    }

    // Resource split for Day View
    const canSplitPractitioners = view === 'day' && practitioners.length > 1 && !filters.staff_membership_id;

    return (
        <AuthenticatedLayout title="Appointments">
            <Head title="Calendar - Appointments" />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    eyebrow="Clinic Schedule"
                    title="Calendar & Appointments"
                    subtitle={rangeSubtitle}
                    actions={
                        <GlassButton
                            variant="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => openCreate(view === 'month' ? today : (view === 'week' ? today : anchorDate), '09:00')}
                        >
                            New appointment
                        </GlassButton>
                    }
                />

                {/* Toolbar */}
                <GlassCard className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Navigation Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => shift(-1)}
                                    className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                                    title="Previous"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate({ date: today })}
                                    className={`text-xs font-bold px-3 py-2 rounded-xl border transition ${
                                        anchorDate === today
                                            ? 'bg-[#8200db] text-white border-[#8200db] shadow-xs'
                                            : 'border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => shift(1)}
                                    className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                                    title="Next"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Day / Week / Month View Switcher */}
                            <div className="flex rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-white/[0.04] p-1">
                                {['day', 'week', 'month'].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setView(v)}
                                        className={`text-xs font-bold px-3 py-1 rounded-lg capitalize transition ${
                                            v === view
                                                ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>

                            {/* Smart Time Range Toggle (only relevant in day/week time grids) */}
                            {view !== 'month' && (
                                <button
                                    type="button"
                                    onClick={() => setFullDay((prev) => !prev)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                                        fullDay
                                            ? 'bg-purple-500/15 border-purple-500/30 text-[#8200db] dark:text-purple-300 font-semibold'
                                            : 'border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5'
                                    }`}
                                    title={fullDay ? 'Click to show business hours only (8 AM – 7 PM)' : 'Click to expand full day (7 AM – 9 PM)'}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{fullDay ? 'Full Day (7 AM–9 PM)' : 'Business Hours (8 AM–7 PM)'}</span>
                                </button>
                            )}

                            {/* Day View Resource Split Toggle */}
                            {canSplitPractitioners && (
                                <button
                                    type="button"
                                    onClick={() => setSplitByPractitioner((prev) => !prev)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                                        splitByPractitioner
                                            ? 'bg-purple-500/15 border-purple-500/30 text-[#8200db] dark:text-purple-300 font-semibold'
                                            : 'border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{splitByPractitioner ? 'Practitioner Columns' : 'Single Column'}</span>
                                </button>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/10 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#8200db]"
                                value={filters.staff_membership_id || ''}
                                onChange={(e) => setFilter('staff_membership_id', e.target.value)}
                            >
                                <option value="">All practitioners</option>
                                {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select
                                className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/10 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#8200db]"
                                value={filters.location_id || ''}
                                onChange={(e) => setFilter('location_id', e.target.value)}
                            >
                                <option value="">All locations</option>
                                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <select
                                className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/10 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#8200db] disabled:opacity-50"
                                value={filters.room_id || ''}
                                onChange={(e) => setFilter('room_id', e.target.value)}
                                disabled={!roomsForFilter.length}
                            >
                                <option value="">All rooms</option>
                                {roomsForFilter.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Integrated Compact Status Legend Row */}
                    <div className="flex items-center justify-between gap-3 flex-wrap pt-2.5 border-t border-slate-200/40 dark:border-white/[0.06] text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <span>Status:</span>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            {Object.entries(STATUS_STYLES).map(([k, s]) => (
                                <span key={k} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 rounded-full shadow-xs shrink-0" style={{ background: s.dot }} />
                                    <span>{s.label}</span>
                                </span>
                            ))}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {totalAppointmentsInView} {totalAppointmentsInView === 1 ? 'appointment' : 'appointments'}
                        </div>
                    </div>
                </GlassCard>

                {/* Main Calendar Card */}
                <GlassCard className="overflow-hidden relative shadow-lg">
                    {view === 'month' ? (
                        /* ── MONTH VIEW ── */
                        <div className="overflow-x-auto">
                            <div className="min-w-[760px]">
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 border-b border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                                        <div
                                            key={dayName}
                                            className="py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase border-r last:border-r-0 border-slate-200/40 dark:border-white/5"
                                        >
                                            {dayName}
                                        </div>
                                    ))}
                                </div>

                                {/* Month Days Grid */}
                                <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/50 dark:divide-white/10 border-b border-slate-200/50 dark:border-white/10">
                                    {days.map((d) => {
                                        const isToday = d === today;
                                        const isCurrentMonth = d.slice(0, 7) === anchorDate.slice(0, 7);
                                        const dayNum = parseInt(d.split('-')[2], 10);
                                        const dayAppts = byDay[d] || [];

                                        return (
                                            <div
                                                key={d}
                                                onClick={() => openCreate(d, '09:00')}
                                                className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors relative group/cell cursor-pointer ${
                                                    isCurrentMonth
                                                        ? 'bg-transparent hover:bg-purple-500/[0.04] dark:hover:bg-purple-400/[0.05]'
                                                        : 'bg-black/[0.02] dark:bg-white/[0.01] opacity-55 hover:opacity-90'
                                                } ${isToday ? 'bg-purple-500/[0.07] dark:bg-purple-500/[0.14]' : ''}`}
                                            >
                                                {/* Header in Cell: Day number & quick book button */}
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span
                                                        className={`text-xs font-bold ${
                                                            isToday
                                                                ? 'bg-gradient-to-r from-[#8200db] to-[#9333ea] text-white shadow-xs px-2 py-0.5 rounded-full font-black'
                                                                : isCurrentMonth
                                                                    ? 'text-slate-800 dark:text-slate-200 font-extrabold'
                                                                    : 'text-slate-400 dark:text-slate-500'
                                                        }`}
                                                    >
                                                        {dayNum}
                                                    </span>

                                                    <span className="hidden group-hover/cell:inline-flex items-center gap-0.5 text-[10px] font-bold text-[#8200db] dark:text-purple-300 bg-white/95 dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-xs border border-purple-200/80 dark:border-purple-800">
                                                        <Plus className="w-2.5 h-2.5" /> Book
                                                    </span>
                                                </div>

                                                {/* Compact Appointment Chips */}
                                                <div className="space-y-1 my-0.5 flex-1">
                                                    {dayAppts.slice(0, 3).map((a) => {
                                                        const s = STATUS_STYLES[a.status] || STATUS_STYLES.scheduled;
                                                        return (
                                                            <button
                                                                key={a.id}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModal({ appt: a });
                                                                }}
                                                                className="w-full text-left rounded-md px-1.5 py-0.5 text-[11px] font-semibold truncate flex items-center gap-1.5 border transition hover:shadow-sm"
                                                                style={{
                                                                    backgroundColor: s.bg,
                                                                    borderColor: s.border,
                                                                    color: s.fg,
                                                                    borderLeftWidth: '3px',
                                                                }}
                                                                title={`${a.client_name} · ${a.service_name} (${humanTime(a.starts_at, timezone)})`}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
                                                                <span className="font-bold shrink-0">{humanTime(a.starts_at, timezone)}</span>
                                                                <span className="truncate text-slate-800 dark:text-slate-200">{a.client_name}</span>
                                                            </button>
                                                        );
                                                    })}

                                                    {dayAppts.length > 3 && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setView('day');
                                                                navigate({ view: 'day', date: d });
                                                            }}
                                                            className="text-[10px] font-bold text-[#8200db] dark:text-purple-300 hover:underline px-1 py-0.5 block text-left"
                                                        >
                                                            +{dayAppts.length - 3} more…
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── DAY & WEEK TIME-GRID VIEW ── */
                        <>
                            {/* Day Headers */}
                            <div className="flex border-b border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] select-none">
                                <div className="w-20 shrink-0 border-r border-slate-200/50 dark:border-white/10 text-[10px] font-bold text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center py-2">
                                    <span>TIME</span>
                                    <span className="text-[9px] font-normal opacity-70">({timezone.split('/')[1] || timezone})</span>
                                </div>

                                {/* If in day view with split practitioners */}
                                {canSplitPractitioners && splitByPractitioner ? (
                                    practitioners.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex-1 min-w-[160px] text-center py-3 border-l border-slate-200/50 dark:border-white/10"
                                        >
                                            <div className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-[#8200db] dark:text-purple-400" />
                                                <span>{p.name}</span>
                                            </div>
                                            <div className="text-[11px] text-purple-600 dark:text-purple-300 font-medium truncate mt-0.5">
                                                {Array.isArray(p.disciplines) ? p.disciplines.join(', ') : 'Practitioner'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    days.map((d) => {
                                        const isToday = d === today;
                                        const parts = humanDate(d).split(' ');
                                        return (
                                            <div
                                                key={d}
                                                className={`flex-1 min-w-[135px] text-center py-3 border-l border-slate-200/50 dark:border-white/10 transition-colors ${
                                                    isToday ? 'bg-purple-500/[0.09] dark:bg-purple-500/[0.16]' : ''
                                                }`}
                                            >
                                                <div className={`text-[11px] uppercase tracking-wider font-extrabold ${isToday ? 'text-[#8200db] dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {parts[0]}
                                                </div>
                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                    <span className={`text-[15px] ${isToday ? 'bg-gradient-to-r from-[#8200db] to-[#9333ea] text-white shadow-md shadow-purple-500/25 px-3 py-0.5 rounded-full font-black' : 'font-extrabold text-slate-800 dark:text-slate-200'}`}>
                                                        {d.split('-')[2]}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                                        {parts[1]}
                                                    </span>
                                                </div>
                                                {isToday && (
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-[#8200db] dark:text-purple-300 mt-0.5">
                                                        Today
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Time Grid Scroll Area */}
                            <div ref={scrollContainerRef} className="flex overflow-x-auto relative">
                                {/* Time axis */}
                                <div className="w-20 shrink-0 border-r border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/[0.01] select-none">
                                    {hours.map((h) => {
                                        const isNoon = h === 12;
                                        return (
                                            <div
                                                key={h}
                                                className={`text-right pr-2 text-[11px] font-bold border-b ${isNoon ? 'border-purple-300/40 dark:border-purple-500/30 text-[#8200db] dark:text-purple-300' : 'border-slate-200/30 dark:border-white/5 text-slate-400 dark:text-slate-500'} -mt-2.5 flex items-start justify-end`}
                                                style={{ height: HOUR_PX }}
                                            >
                                                <span>{h % 12 === 0 ? 12 : h % 12} {h < 12 ? 'AM' : 'PM'}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Columns */}
                                {canSplitPractitioners && splitByPractitioner ? (
                                    practitioners.map((p) => {
                                        const practitionerAppts = (byDay[anchorDate] || []).filter((a) => a.staff_membership_id === p.id);
                                        return (
                                            <DayColumn
                                                key={p.id}
                                                dateKey={anchorDate}
                                                appts={practitionerAppts}
                                                tz={timezone}
                                                isToday={anchorDate === today}
                                                nowMinutes={nowMinutes}
                                                startHour={startHour}
                                                endHour={endHour}
                                                onCreate={(d, t) => openCreate(d, t, p.id)}
                                                onOpen={(appt) => setModal({ appt })}
                                            />
                                        );
                                    })
                                ) : (
                                    days.map((d) => (
                                        <DayColumn
                                            key={d}
                                            dateKey={d}
                                            appts={byDay[d] || []}
                                            tz={timezone}
                                            isToday={d === today}
                                            nowMinutes={nowMinutes}
                                            startHour={startHour}
                                            endHour={endHour}
                                            onCreate={openCreate}
                                            onOpen={(appt) => setModal({ appt })}
                                        />
                                    ))
                                )}

                                {/* Inline Empty State Overlay */}
                                {totalAppointmentsInView === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
                                        <div className="pointer-events-auto max-w-sm w-full p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-[#8200db] dark:text-purple-300 flex items-center justify-center mx-auto shadow-inner">
                                                <CalendarCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    No appointments scheduled {view === 'week' ? 'this week' : 'today'}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Click any time slot in the calendar or use the button below to book an appointment.
                                                </p>
                                            </div>
                                            <GlassButton
                                                variant="primary"
                                                size="sm"
                                                icon={<Plus className="w-3.5 h-3.5" />}
                                                onClick={() => openCreate(view === 'week' ? today : anchorDate, '09:00')}
                                                className="mx-auto"
                                            >
                                                New appointment
                                            </GlassButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </GlassCard>
            </div>

            {/* Modal */}
            {modal && (
                <AppointmentModal
                    appt={modal.appt}
                    defaults={modal.defaults}
                    practitioners={practitioners}
                    clients={clients}
                    locations={locations}
                    statuses={statuses}
                    tz={timezone}
                    onClose={() => setModal(null)}
                    onToast={(msg) => setToastMessage(msg)}
                />
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
