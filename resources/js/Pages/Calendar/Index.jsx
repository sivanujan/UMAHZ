import React, { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, User,
    MapPin, DoorOpen, Trash2, Check, Ban, AlertCircle,
} from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';

const DAY_START_HOUR = 7;   // 07:00
const DAY_END_HOUR = 21;    // 21:00
const HOUR_PX = 56;
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const STATUS_STYLES = {
    scheduled: { label: 'Scheduled', bg: 'rgba(37,99,235,0.12)', fg: '#2563EB', dot: '#2563EB' },
    confirmed: { label: 'Confirmed', bg: 'rgba(6,182,212,0.14)', fg: '#0E7490', dot: '#06B6D4' },
    checked_in: { label: 'Checked in', bg: 'rgba(139,92,246,0.14)', fg: '#6D28D9', dot: '#8B5CF6' },
    completed: { label: 'Completed', bg: 'rgba(34,197,94,0.14)', fg: '#16A34A', dot: '#22C55E' },
    no_show: { label: 'No-show', bg: 'rgba(245,158,11,0.16)', fg: '#B45309', dot: '#F59E0B' },
    cancelled: { label: 'Cancelled', bg: 'rgba(148,163,184,0.18)', fg: '#64748B', dot: '#94A3B8' },
};

const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/50 border';
const fieldStyle = { background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' };
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';

/* ------------------------------ date helpers ------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

// Add days to a plain 'YYYY-MM-DD' string using UTC math (no tz drift).
function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// Break a UTC ISO instant into its wall-clock parts *in the clinic timezone*.
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

// Assign each appointment a lane so overlapping ones sit side by side.
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
    const height = Math.max(22, ((appt.endMin - appt.startMin) / 60) * HOUR_PX - 2);
    const width = 100 / appt.laneCount;
    const left = appt.lane * width;
    const s = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
    const cancelled = appt.status === 'cancelled';

    return (
        <button
            onClick={() => onClick(appt)}
            className="absolute rounded-lg px-2 py-1 text-left overflow-hidden transition hover:shadow-md hover:z-20"
            style={{
                top, height, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`,
                background: s.bg, borderLeft: `3px solid ${s.dot}`,
                opacity: cancelled ? 0.55 : 1,
                textDecoration: cancelled ? 'line-through' : 'none',
            }}
            title={`${appt.client_name} · ${appt.service_name}`}
        >
            <div className="text-[11px] font-semibold truncate" style={{ color: s.fg }}>
                {humanTime(appt.starts_at, tz)}
            </div>
            <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--umahz-text-primary)' }}>
                {appt.client_name}
            </div>
            {height > 46 && (
                <div className="text-[11px] truncate" style={{ color: 'var(--umahz-text-tertiary)' }}>
                    {appt.service_name}
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
        <div className="relative flex-1 min-w-[130px] border-l" style={{ borderColor: 'var(--umahz-border)' }}>
            {hours.map((h) => (
                <div
                    key={h}
                    className="border-b cursor-pointer hover:bg-[var(--umahz-hover)]"
                    style={{ height: HOUR_PX, borderColor: 'var(--umahz-border)' }}
                    onClick={() => onCreate(dateKey, `${pad(h)}:00`)}
                />
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
            <div className="h-px" style={{ background: '#EF4444' }} />
            <div className="w-2 h-2 rounded-full -mt-1 -ml-1" style={{ background: '#EF4444' }} />
        </div>
    );
}

/* --------------------------------- modal --------------------------------- */

function AppointmentModal({ appt, defaults, practitioners, clients, locations, statuses, tz, onClose }) {
    const editing = Boolean(appt);

    const initialLocation = appt?.location_id || defaults?.location_id || (locations[0]?.id ?? '');
    const roomsFor = (locId) => locations.find((l) => l.id === locId)?.rooms || [];

    const startParts = appt ? zonedParts(appt.starts_at, tz) : null;

    const { data, setData, post, patch, processing, errors } = useForm({
        client_id: appt?.client_id || '',
        staff_membership_id: appt?.staff_membership_id || defaults?.staff_membership_id || (practitioners[0]?.id ?? ''),
        location_id: initialLocation,
        room_id: appt?.room_id || '',
        service_name: appt?.service_name || '',
        date: appt ? startParts.dateKey : (defaults?.date || ''),
        start_time: appt ? `${pad(startParts.hour)}:${pad(startParts.minute)}` : (defaults?.start_time || '09:00'),
        duration_minutes: appt?.duration_minutes || 60,
        notes: appt?.notes || '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (editing) patch(`/app/appointments/${appt.id}`, opts);
        else post('/app/appointments', opts);
    };

    const doCancel = () => {
        const reason = window.prompt('Reason for cancellation (optional):') ?? '';
        router.patch(`/app/appointments/${appt.id}/cancel`, { reason }, { preserveScroll: true, onSuccess: onClose });
    };

    const setStatus = (status) => {
        router.patch(`/app/appointments/${appt.id}/status`, { status }, { preserveScroll: true, onSuccess: onClose });
    };

    const rooms = roomsFor(data.location_id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[92vh] overflow-y-auto"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                    <h2 className="text-base font-bold" style={{ color: 'var(--umahz-text-primary)' }}>
                        {editing ? 'Edit appointment' : 'New appointment'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--umahz-hover)]">
                        <X className="w-4 h-4" style={{ color: 'var(--umahz-text-tertiary)' }} />
                    </button>
                </div>

                <form onSubmit={submit} className="px-5 py-4 space-y-4">
                    {editing && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {['confirmed', 'checked_in', 'completed', 'no_show'].map((st) => (
                                <button key={st} type="button" onClick={() => setStatus(st)}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                                    style={{ borderColor: 'var(--umahz-border)', color: STATUS_STYLES[st].fg, background: STATUS_STYLES[st].bg }}>
                                    {STATUS_STYLES[st].label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Client</label>
                        <select className={fieldClass} style={fieldStyle} value={data.client_id}
                            onChange={(e) => setData('client_id', e.target.value)}>
                            <option value="">Select a client…</option>
                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.client_id && <FieldError msg={errors.client_id} />}
                    </div>

                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Practitioner</label>
                        <select className={fieldClass} style={fieldStyle} value={data.staff_membership_id}
                            onChange={(e) => setData('staff_membership_id', e.target.value)}>
                            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {errors.staff_membership_id && <FieldError msg={errors.staff_membership_id} />}
                    </div>

                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Service</label>
                        <input className={fieldClass} style={fieldStyle} value={data.service_name}
                            placeholder="e.g. Acupuncture Session"
                            onChange={(e) => setData('service_name', e.target.value)} />
                        {errors.service_name && <FieldError msg={errors.service_name} />}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Location</label>
                            <select className={fieldClass} style={fieldStyle} value={data.location_id}
                                onChange={(e) => { setData('location_id', e.target.value); setData('room_id', ''); }}>
                                <option value="">None</option>
                                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Room</label>
                            <select className={fieldClass} style={fieldStyle} value={data.room_id}
                                onChange={(e) => setData('room_id', e.target.value)} disabled={!rooms.length}>
                                <option value="">None</option>
                                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            {errors.room_id && <FieldError msg={errors.room_id} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Date</label>
                            <input type="date" className={fieldClass} style={fieldStyle} value={data.date}
                                onChange={(e) => setData('date', e.target.value)} />
                            {errors.date && <FieldError msg={errors.date} />}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Start</label>
                            <input type="time" className={fieldClass} style={fieldStyle} value={data.start_time}
                                onChange={(e) => setData('start_time', e.target.value)} />
                            {errors.start_time && <FieldError msg={errors.start_time} />}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Mins</label>
                            <input type="number" min="5" max="480" step="5" className={fieldClass} style={fieldStyle}
                                value={data.duration_minutes}
                                onChange={(e) => setData('duration_minutes', parseInt(e.target.value || '0', 10))} />
                            {errors.duration_minutes && <FieldError msg={errors.duration_minutes} />}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-tertiary)' }}>Notes</label>
                        <textarea rows={2} className={fieldClass} style={fieldStyle} value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)} />
                    </div>

                    {/* starts_at errors (availability / closed) surface on the date field key. */}
                    {errors.starts_at && <FieldError msg={errors.starts_at} />}

                    <div className="flex items-center justify-between pt-1">
                        {editing ? (
                            <button type="button" onClick={doCancel}
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg"
                                style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
                                <Ban className="w-4 h-4" /> Cancel appointment
                            </button>
                        ) : <span />}
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onClose}
                                className="text-[13px] font-semibold px-4 py-2 rounded-lg border"
                                style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}>
                                Close
                            </button>
                            <button type="submit" disabled={processing}
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-60"
                                style={{ background: BRAND_GRADIENT }}>
                                <Check className="w-4 h-4" /> {editing ? 'Save changes' : 'Book'}
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
        <p className="mt-1 text-[12px] flex items-center gap-1" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-3.5 h-3.5" /> {msg}
        </p>
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
                    // If the appointment ends past midnight, clamp to the grid end.
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
        defaults: { date, start_time, staff_membership_id: filters.staff_membership_id, location_id: filters.location_id },
    });

    return (
        <AuthenticatedLayout>
            <Head title="Calendar" />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: BRAND_GRADIENT }}>
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: 'var(--umahz-text-primary)' }}>Calendar</h1>
                            <p className="text-[12px]" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                {view === 'week' ? `Week of ${humanDate(rangeStart)}` : humanDate(anchorDate)} · times in {timezone}
                            </p>
                        </div>
                    </div>

                    <button onClick={() => openCreate(view === 'week' ? today : anchorDate, '09:00')}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2.5 rounded-lg text-white"
                        style={{ background: BRAND_GRADIENT }}>
                        <Plus className="w-4 h-4" /> New appointment
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex items-center gap-1">
                        <button onClick={() => shift(-1)} className="p-2 rounded-lg border" style={{ borderColor: 'var(--umahz-border)' }}>
                            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--umahz-text-secondary)' }} />
                        </button>
                        <button onClick={() => navigate({ date: today })}
                            className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}>
                            Today
                        </button>
                        <button onClick={() => shift(1)} className="p-2 rounded-lg border" style={{ borderColor: 'var(--umahz-border)' }}>
                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--umahz-text-secondary)' }} />
                        </button>
                    </div>

                    <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--umahz-border)' }}>
                        {['day', 'week'].map((v) => (
                            <button key={v} onClick={() => setView(v)}
                                className="text-[13px] font-semibold px-3.5 py-2 capitalize"
                                style={v === view
                                    ? { background: BRAND_GRADIENT, color: '#fff' }
                                    : { color: 'var(--umahz-text-secondary)' }}>
                                {v}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <select className="text-[13px] px-3 py-2 rounded-lg border" style={{ ...fieldStyle, borderColor: 'var(--umahz-border)' }}
                            value={filters.staff_membership_id || ''} onChange={(e) => setFilter('staff_membership_id', e.target.value)}>
                            <option value="">All practitioners</option>
                            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select className="text-[13px] px-3 py-2 rounded-lg border" style={{ ...fieldStyle, borderColor: 'var(--umahz-border)' }}
                            value={filters.location_id || ''} onChange={(e) => { setFilter('location_id', e.target.value); }}>
                            <option value="">All locations</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select className="text-[13px] px-3 py-2 rounded-lg border" style={{ ...fieldStyle, borderColor: 'var(--umahz-border)' }}
                            value={filters.room_id || ''} onChange={(e) => setFilter('room_id', e.target.value)} disabled={!roomsForFilter.length}>
                            <option value="">All rooms</option>
                            {roomsForFilter.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Grid */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--umahz-border)', background: 'var(--umahz-surface)' }}>
                    {/* Day headers */}
                    <div className="flex" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div className="w-14 shrink-0" />
                        {days.map((d) => (
                            <div key={d} className="flex-1 min-w-[130px] text-center py-2.5 border-l" style={{ borderColor: 'var(--umahz-border)' }}>
                                <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                    {humanDate(d).split(' ')[0]}
                                </div>
                                <div className="text-[15px] font-bold" style={{ color: d === today ? '#2563EB' : 'var(--umahz-text-primary)' }}>
                                    {d.split('-')[2]}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Time rows + columns */}
                    <div className="flex overflow-x-auto">
                        {/* Time axis */}
                        <div className="w-14 shrink-0">
                            {hours.map((h) => (
                                <div key={h} className="text-right pr-2 text-[11px] -mt-2" style={{ height: HOUR_PX, color: 'var(--umahz-text-tertiary)' }}>
                                    {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'am' : 'pm'}
                                </div>
                            ))}
                        </div>

                        {days.map((d) => (
                            <DayColumn key={d} dateKey={d} appts={byDay[d] || []} tz={timezone}
                                isToday={d === today} onCreate={openCreate} onOpen={(appt) => setModal({ appt })} />
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                    {Object.entries(STATUS_STYLES).map(([k, s]) => (
                        <span key={k} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--umahz-text-tertiary)' }}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} /> {s.label}
                        </span>
                    ))}
                </div>
            </div>

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
                />
            )}
        </AuthenticatedLayout>
    );
}
