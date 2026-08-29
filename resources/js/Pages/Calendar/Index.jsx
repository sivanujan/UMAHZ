import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, User,
    MapPin, DoorOpen, Trash2, Check, Ban, AlertCircle, Sparkles, Loader2, CheckCircle2,
    CalendarCheck, AlertTriangle
} from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';

const DAY_START_HOUR = 7;   // 07:00
const DAY_END_HOUR = 21;    // 21:00
const HOUR_PX = 60;
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const STATUS_STYLES = {
    scheduled: {
        label: 'Scheduled',
        bg: 'rgba(37, 99, 235, 0.12)',
        fg: '#1D4ED8',
        border: '#3B82F6',
        dot: '#2563EB',
    },
    confirmed: {
        label: 'Confirmed',
        bg: 'rgba(6, 182, 212, 0.14)',
        fg: '#0E7490',
        border: '#06B6D4',
        dot: '#0891B2',
    },
    checked_in: {
        label: 'Checked in',
        bg: 'rgba(139, 92, 246, 0.14)',
        fg: '#6D28D9',
        border: '#8B5CF6',
        dot: '#7C3AED',
    },
    completed: {
        label: 'Completed',
        bg: 'rgba(34, 197, 94, 0.14)',
        fg: '#15803D',
        border: '#22C55E',
        dot: '#16A34A',
    },
    no_show: {
        label: 'No-show',
        bg: 'rgba(245, 158, 11, 0.16)',
        fg: '#B45309',
        border: '#F59E0B',
        dot: '#D97706',
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'rgba(148, 163, 184, 0.20)',
        fg: '#64748B',
        border: '#94A3B8',
        dot: '#64748B',
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

const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/50 border';
const fieldStyle = { background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' };
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';

/* ------------------------------ date helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
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

/* ------------------------------ appointment block ------------------------------ */

function AppointmentBlock({ appt, tz, onClick }) {
    const gridStart = DAY_START_HOUR * 60;
    const top = ((appt.startMin - gridStart) / 60) * HOUR_PX;
    const height = Math.max(26, ((appt.endMin - appt.startMin) / 60) * HOUR_PX - 2);
    const width = 100 / appt.laneCount;
    const left = appt.lane * width;
    const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
    const cancelled = appt.status === 'cancelled';

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick(appt);
            }}
            className="absolute rounded-lg px-2.5 py-1 text-left overflow-hidden transition-all duration-150 hover:shadow-md hover:z-20 group"
            style={{
                top, height, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`,
                background: s.bg, borderLeft: `3.5px solid ${s.border}`,
                opacity: cancelled ? 0.6 : 1,
            }}
            title={`${appt.client_name} · ${appt.service_name} (${humanTime(appt.starts_at, tz)} - ${humanTime(appt.ends_at, tz)})`}
        >
            <div className="flex items-center justify-between gap-1 leading-tight">
                <span className="text-[11px] font-bold" style={{ color: s.fg }}>
                    {humanTime(appt.starts_at, tz)}
                </span>
                <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: s.dot }}
                />
            </div>

            <div
                className={`text-[12px] font-semibold truncate leading-tight mt-0.5 ${cancelled ? 'line-through text-slate-500' : ''}`}
                style={{ color: cancelled ? undefined : 'var(--umahz-text-primary)' }}
            >
                {appt.client_name}
            </div>

            {height > 44 && (
                <div
                    className="text-[11px] truncate leading-tight mt-0.5"
                    style={{ color: 'var(--umahz-text-secondary)' }}
                >
                    {appt.service_name}
                </div>
            )}

            {height > 62 && (appt.practitioner_name || appt.room_name) && (
                <div
                    className="text-[10px] truncate leading-tight mt-0.5 text-slate-400"
                >
                    {[appt.practitioner_name, appt.room_name].filter(Boolean).join(' · ')}
                </div>
            )}
        </button>
    );
}

/* --------------------------------- day column --------------------------------- */

function DayColumn({ dateKey, appts, tz, isToday, onCreate, onOpen }) {
    const hours = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) hours.push(h);
    const packed = useMemo(() => packLanes(appts), [appts]);

    return (
        <div
            className={`relative flex-1 min-w-[130px] border-l transition-colors ${isToday ? 'bg-blue-50/20' : ''}`}
            style={{ borderColor: 'var(--umahz-border)' }}
        >
            {hours.map((h) => (
                <div
                    key={h}
                    className="border-b cursor-pointer hover:bg-[var(--umahz-hover)] transition-colors group relative"
                    style={{ height: HOUR_PX, borderColor: 'var(--umahz-border)' }}
                    onClick={() => onCreate(dateKey, `${pad(h)}:00`)}
                    title={`Click to book at ${pad(h)}:00`}
                >
                    <span className="hidden group-hover:inline-block absolute right-2 top-1 text-[10px] font-semibold text-blue-500 bg-white/90 px-1.5 py-0.5 rounded shadow-sm">
                        + {pad(h)}:00
                    </span>
                </div>
            ))}
            {packed.map((a) => (
                <AppointmentBlock key={a.id} appt={a} tz={tz} onClick={onOpen} />
            ))}
            {isToday && <NowLine tz={tz} />}
        </div>
    );
}

function NowLine({ tz }) {
    const now = zonedParts(new Date().toISOString(), tz);
    const gridStart = DAY_START_HOUR * 60;
    if (now.minutesOfDay < gridStart || now.minutesOfDay > DAY_END_HOUR * 60) return null;
    const top = ((now.minutesOfDay - gridStart) / 60) * HOUR_PX;
    return (
        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
            <div className="h-[2px] shadow-sm" style={{ background: '#EF4444' }} />
            <div className="w-2.5 h-2.5 rounded-full -mt-1.5 -ml-1 bg-red-500 shadow-sm" />
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

    // Keep rooms cascading to current location
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

    // Identify if there is a conflict error
    const hasConflict = errors.staff_membership_id && errors.staff_membership_id.includes('already has an appointment');
    const hasRoomConflict = errors.room_id && errors.room_id.includes('already booked');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[92vh] overflow-y-auto"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div>
                        <h2 className="text-base font-bold text-slate-900" style={{ color: 'var(--umahz-text-primary)' }}>
                            {editing ? 'Edit Appointment' : 'New Appointment'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Times are scheduled in <strong className="text-slate-700">{tz}</strong>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[var(--umahz-hover)] text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 space-y-4">
                    {/* Conflict Error Alert */}
                    {(hasConflict || hasRoomConflict) && (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-rose-900">Scheduling Conflict</p>
                                <p className="mt-0.5">
                                    {hasConflict && errors.staff_membership_id}
                                    {hasRoomConflict && errors.room_id}
                                </p>
                                <p className="mt-1 text-[11px] text-rose-700">
                                    Please adjust the start time, duration, or practitioner to resolve.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status switcher on Edit */}
                    {editing && (
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Appointment Status
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {['scheduled', 'confirmed', 'checked_in', 'completed', 'no_show'].map((st) => {
                                    const isCurrent = appt.status === st;
                                    const s = STATUS_STYLES[st];
                                    return (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatus(st)}
                                            className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${isCurrent ? 'ring-2 ring-offset-1 ring-blue-500 font-bold' : 'opacity-80 hover:opacity-100'}`}
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
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                            Client <span className="text-rose-500">*</span>
                        </label>
                        <select
                            className={fieldClass}
                            style={fieldStyle}
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
                        </select>
                        {(clientErrors.client_id || errors.client_id) && (
                            <FieldError msg={clientErrors.client_id || errors.client_id} />
                        )}
                    </div>

                    {/* Practitioner Selection */}
                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                            Practitioner <span className="text-rose-500">*</span>
                        </label>
                        <select
                            className={fieldClass}
                            style={fieldStyle}
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
                        </select>
                        {(clientErrors.staff_membership_id || (!hasConflict && errors.staff_membership_id)) && (
                            <FieldError msg={clientErrors.staff_membership_id || errors.staff_membership_id} />
                        )}
                    </div>

                    {/* Service Name & Quick Suggestions */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)', marginBottom: 0 }}>
                                Service <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-slate-400">Quick chips below</span>
                        </div>
                        <input
                            type="text"
                            className={fieldClass}
                            style={fieldStyle}
                            value={data.service_name}
                            placeholder="e.g. Acupuncture Session"
                            onChange={(e) => {
                                setData('service_name', e.target.value);
                                setClientErrors((prev) => ({ ...prev, service_name: undefined }));
                            }}
                        />
                        {(clientErrors.service_name || errors.service_name) && (
                            <FieldError msg={clientErrors.service_name || errors.service_name} />
                        )}
                        {/* Quick Suggestions Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {COMMON_SERVICES.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                        setData('service_name', s);
                                        setClientErrors((prev) => ({ ...prev, service_name: undefined }));
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition"
                                >
                                    + {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location & Room */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Location</label>
                            <select
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.location_id}
                                onChange={(e) => handleLocationChange(e.target.value)}
                            >
                                <option value="">No location specified</option>
                                {locations.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Room</label>
                            <select
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.room_id}
                                onChange={(e) => setData('room_id', e.target.value)}
                                disabled={!rooms.length}
                            >
                                <option value="">No specific room</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            {errors.room_id && !hasRoomConflict && <FieldError msg={errors.room_id} />}
                        </div>
                    </div>

                    {/* Date, Start Time & Duration */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.date}
                                onChange={(e) => {
                                    setData('date', e.target.value);
                                    setClientErrors((prev) => ({ ...prev, date: undefined }));
                                }}
                            />
                            {(clientErrors.date || errors.date) && (
                                <FieldError msg={clientErrors.date || errors.date} />
                            )}
                        </div>

                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Start Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="time"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.start_time}
                                onChange={(e) => {
                                    setData('start_time', e.target.value);
                                    setClientErrors((prev) => ({ ...prev, start_time: undefined }));
                                }}
                            />
                            {(clientErrors.start_time || errors.start_time) && (
                                <FieldError msg={clientErrors.start_time || errors.start_time} />
                            )}
                        </div>

                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Duration (min) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="5"
                                max="480"
                                step="5"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.duration_minutes}
                                onChange={(e) => {
                                    setData('duration_minutes', parseInt(e.target.value || '0', 10));
                                    setClientErrors((prev) => ({ ...prev, duration_minutes: undefined }));
                                }}
                            />
                            {(clientErrors.duration_minutes || errors.duration_minutes) && (
                                <FieldError msg={clientErrors.duration_minutes || errors.duration_minutes} />
                            )}
                        </div>
                    </div>

                    {/* Quick duration presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase text-slate-400 mr-1">Presets:</span>
                        {DURATION_PRESETS.map((mins) => (
                            <button
                                key={mins}
                                type="button"
                                onClick={() => setData('duration_minutes', mins)}
                                className={`text-[11px] px-2.5 py-0.5 rounded-md border font-semibold transition ${data.duration_minutes === mins ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'}`}
                            >
                                {mins}m
                            </button>
                        ))}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Notes (Optional)</label>
                        <textarea
                            rows={2}
                            className={fieldClass}
                            style={fieldStyle}
                            value={data.notes}
                            placeholder="Internal notes regarding this booking…"
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                    </div>

                    {/* Starts_at error / closed hours error */}
                    {errors.starts_at && <FieldError msg={errors.starts_at} />}

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                        {editing ? (
                            <button
                                type="button"
                                onClick={doCancel}
                                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                            >
                                <Ban className="w-3.5 h-3.5" /> Cancel appointment
                            </button>
                        ) : <span />}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="text-[13px] font-semibold px-4 py-2 rounded-lg border text-slate-600 hover:bg-slate-50 transition"
                                style={{ borderColor: 'var(--umahz-border)' }}
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                disabled={processing || hasConflict || hasRoomConflict}
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-5 py-2 rounded-lg text-white disabled:opacity-60 transition shadow-sm"
                                style={{ background: BRAND_GRADIENT }}
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {editing ? 'Saving…' : 'Booking…'}
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {editing ? 'Save Changes' : 'Book Appointment'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FieldError({ msg }) {
    return (
        <p className="mt-1 text-[12px] flex items-center gap-1 font-medium text-rose-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {msg}
        </p>
    );
}

/* ------------------------------- Toast Alert ------------------------------- */

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
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

/* ------------------------------- main page ------------------------------- */

export default function CalendarIndex() {
    const { props } = usePage();
    const {
        view, anchorDate, rangeStart, timezone, appointments,
        practitioners, clients, locations, statuses, filters,
    } = props;

    const [modal, setModal] = useState(null); // { appt } | { defaults }
    const [toastMessage, setToastMessage] = useState(null);

    const days = view === 'week'
        ? Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))
        : [anchorDate];

    const today = todayInZone(timezone);

    // Pre-compute zoned start/end minutes and bucket by clinic-local day.
    const byDay = useMemo(() => {
        const map = Object.fromEntries(days.map((d) => [d, []]));
        appointments.forEach((a) => {
            const s = zonedParts(a.starts_at, timezone);
            const e = zonedParts(a.ends_at, timezone);
            if (map[s.dateKey]) {
                map[s.dateKey].push({
                    ...a,
                    startMin: s.minutesOfDay,
                    endMin: e.dateKey === s.dateKey ? e.minutesOfDay : DAY_END_HOUR * 60,
                });
            }
        });
        return map;
    }, [appointments, timezone, rangeStart, view]);

    const navigate = (patch) => {
        router.get('/app/calendar', {
            view, date: anchorDate, ...filters, ...patch,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const shift = (dir) => navigate({ date: addDays(anchorDate, dir * (view === 'week' ? 7 : 1)) });
    const setView = (v) => navigate({ view: v, date: anchorDate });
    const setFilter = (key, value) => navigate({ [key]: value || undefined });

    const roomsForFilter = locations.find((l) => l.id === filters.location_id)?.rooms || [];
    const hours = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) hours.push(h);

    const openCreate = (date, start_time) => setModal({
        defaults: {
            date,
            start_time,
            staff_membership_id: filters.staff_membership_id,
            location_id: filters.location_id,
            room_id: filters.room_id,
        },
    });

    const totalAppointmentsInView = appointments.length;

    return (
        <AuthenticatedLayout>
            <Head title="Calendar" />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: BRAND_GRADIENT }}>
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900" style={{ color: 'var(--umahz-text-primary)' }}>
                                Clinic Calendar
                            </h1>
                            <p className="text-[12px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{view === 'week' ? `Week of ${humanDate(rangeStart)}` : humanDate(anchorDate)}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {timezone}
                                </span>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => openCreate(view === 'week' ? today : anchorDate, '09:00')}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2.5 rounded-lg text-white shadow-sm transition hover:opacity-95"
                        style={{ background: BRAND_GRADIENT }}
                    >
                        <Plus className="w-4 h-4" /> New appointment
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => shift(-1)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                                title="Previous"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate({ date: today })}
                                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => shift(1)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                                title="Next"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-100 p-0.5">
                            {['day', 'week'].map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setView(v)}
                                    className={`text-[12px] font-semibold px-3 py-1 rounded-md capitalize transition ${v === view ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.staff_membership_id || ''}
                            onChange={(e) => setFilter('staff_membership_id', e.target.value)}
                        >
                            <option value="">All practitioners</option>
                            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select
                            className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.location_id || ''}
                            onChange={(e) => setFilter('location_id', e.target.value)}
                        >
                            <option value="">All locations</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select
                            className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                            value={filters.room_id || ''}
                            onChange={(e) => setFilter('room_id', e.target.value)}
                            disabled={!roomsForFilter.length}
                        >
                            <option value="">All rooms</option>
                            {roomsForFilter.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Main Calendar Grid Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    {/* Day Headers */}
                    <div className="flex border-b border-slate-200 bg-slate-50/70">
                        <div className="w-16 shrink-0 border-r border-slate-200 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                            TIME
                        </div>
                        {days.map((d) => {
                            const isToday = d === today;
                            const parts = humanDate(d).split(' ');
                            return (
                                <div
                                    key={d}
                                    className={`flex-1 min-w-[130px] text-center py-2.5 border-l border-slate-200 transition-colors ${isToday ? 'bg-blue-50/60 font-bold' : ''}`}
                                >
                                    <div className={`text-[11px] uppercase tracking-wider font-bold ${isToday ? 'text-blue-700' : 'text-slate-400'}`}>
                                        {parts[0]}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <span className={`text-[16px] font-bold ${isToday ? 'text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full' : 'text-slate-800'}`}>
                                            {d.split('-')[2]}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {parts[1]}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Grid Rows */}
                    <div className="flex overflow-x-auto relative">
                        {/* Time axis */}
                        <div className="w-16 shrink-0 border-r border-slate-200 bg-slate-50/30 select-none">
                            {hours.map((h) => (
                                <div
                                    key={h}
                                    className="text-right pr-2.5 text-[11px] font-medium text-slate-400 border-b border-slate-100 -mt-2.5 flex items-start justify-end"
                                    style={{ height: HOUR_PX }}
                                >
                                    {h % 12 === 0 ? 12 : h % 12} {h < 12 ? 'AM' : 'PM'}
                                </div>
                            ))}
                        </div>

                        {/* Day Columns */}
                        {days.map((d) => (
                            <DayColumn
                                key={d}
                                dateKey={d}
                                appts={byDay[d] || []}
                                tz={timezone}
                                isToday={d === today}
                                onCreate={openCreate}
                                onOpen={(appt) => setModal({ appt })}
                            />
                        ))}
                    </div>
                </div>

                {/* Empty State when no appointments in current view */}
                {totalAppointmentsInView === 0 && (
                    <div className="mt-4 p-6 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 shadow-sm flex flex-col items-center">
                        <CalendarCheck className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                            No appointments scheduled for this {view === 'week' ? 'week' : 'day'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            Click any empty time slot in the calendar above or use the button below to book a new appointment.
                        </p>
                        <button
                            type="button"
                            onClick={() => openCreate(view === 'week' ? today : anchorDate, '09:00')}
                            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                        >
                            <Plus className="w-3.5 h-3.5" /> Book appointment
                        </button>
                    </div>
                )}

                {/* Legend Bar */}
                <div className="flex items-center justify-between gap-4 mt-5 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex-wrap text-xs">
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
