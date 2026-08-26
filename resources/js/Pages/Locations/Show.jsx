import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { MapPin, Phone, Clock, DoorOpen, Plus, Pencil, Power, Trash2, X, ArrowLeft } from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';
const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/50 border';
const fieldStyle = { background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' };
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';

function StatusPill({ active }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={active ? { background: 'rgba(34,197,94,0.12)', color: '#16A34A' } : { background: 'var(--umahz-hover)', color: 'var(--umahz-text-tertiary)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#22C55E' : '#94A3B8' }} />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border shadow-2xl" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                    <h2 className="text-base font-bold" style={{ color: 'var(--umahz-text-primary)' }}>{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-tertiary)' }}><X className="w-5 h-5" /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function ModalFooter({ processing, submitLabel, onClose }) {
    return (
        <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}>Cancel</button>
            <button type="submit" disabled={processing} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: BRAND_GRADIENT, boxShadow: '0 10px 22px -12px rgba(37,99,235,0.6)' }}>{submitLabel}</button>
        </div>
    );
}

function LocationEditModal({ location, timezones, onClose }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: location.name, address: location.address || '', phone: location.phone || '', timezone: location.timezone,
    });
    const submit = (e) => { e.preventDefault(); patch(`/app/locations/${location.id}`, { preserveScroll: true, onSuccess: onClose }); };
    return (
        <Modal title="Edit location" onClose={onClose}>
            <form onSubmit={submit} className="px-6 py-5 space-y-4">
                <div>
                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Name</label>
                    <input className={fieldClass} style={fieldStyle} value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                    {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.name}</p>}
                </div>
                <div>
                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Address</label>
                    <textarea className={fieldClass} style={fieldStyle} rows={2} value={data.address} onChange={(e) => setData('address', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Phone</label>
                        <input className={fieldClass} style={fieldStyle} value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Timezone</label>
                        <select className={fieldClass} style={fieldStyle} value={data.timezone} onChange={(e) => setData('timezone', e.target.value)}>
                            {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                    </div>
                </div>
                <ModalFooter processing={processing} submitLabel="Save changes" onClose={onClose} />
            </form>
        </Modal>
    );
}

function RoomModal({ locationId, room, onClose }) {
    const editing = Boolean(room);
    const { data, setData, post, patch, processing, errors } = useForm({
        name: room?.name || '', description: room?.description || '',
    });
    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        editing ? patch(`/app/rooms/${room.id}`, opts) : post(`/app/locations/${locationId}/rooms`, opts);
    };
    return (
        <Modal title={editing ? 'Edit room' : 'Add room'} onClose={onClose}>
            <form onSubmit={submit} className="px-6 py-5 space-y-4">
                <div>
                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Name</label>
                    <input className={fieldClass} style={fieldStyle} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Treatment Room 1" autoFocus />
                    {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.name}</p>}
                </div>
                <div>
                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Description / type</label>
                    <textarea className={fieldClass} style={fieldStyle} rows={2} value={data.description}
                        onChange={(e) => setData('description', e.target.value)} placeholder="Private massage room · biofeedback equipment" />
                    {errors.description && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.description}</p>}
                </div>
                <ModalFooter processing={processing} submitLabel={editing ? 'Save changes' : 'Add room'} onClose={onClose} />
            </form>
        </Modal>
    );
}

export default function LocationShow({ location, rooms, timezones }) {
    const { flash, errors } = usePage().props;
    const [editLocation, setEditLocation] = useState(false);
    const [roomModal, setRoomModal] = useState(null); // null | 'new' | room object

    const toggleLocation = () => router.patch(`/app/locations/${location.id}/toggle`, {}, { preserveScroll: true });
    const toggleRoom = (room) => router.patch(`/app/rooms/${room.id}/toggle`, {}, { preserveScroll: true });
    const removeRoom = (room) => {
        if (confirm(`Delete room "${room.name}"? This can't be undone.`)) {
            router.delete(`/app/rooms/${room.id}`, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout title="Locations & Rooms">
            <Head title={location.name} />

            <Link href="/app/locations" className="inline-flex items-center gap-1.5 text-sm font-medium mb-5 hover:gap-2 transition-all" style={{ color: 'var(--umahz-text-secondary)' }}>
                <ArrowLeft className="w-4 h-4" /> All locations
            </Link>

            {flash?.success && (
                <div className="mb-5 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>{flash.success}</div>
            )}
            {errors?.room && (
                <div className="mb-5 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--umahz-danger)' }}>{errors.room}</div>
            )}

            {/* Location detail */}
            <div className="rounded-2xl border shadow-sm p-6 mb-6" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--umahz-accent)' }}>
                            <MapPin className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--umahz-text-primary)' }}>{location.name}</h1>
                            <div className="mt-1"><StatusPill active={location.is_active} /></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setEditLocation(true)} title="Edit" className="p-2 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                        <button onClick={toggleLocation} title={location.is_active ? 'Deactivate' : 'Reactivate'} className="p-2 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}><Power className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>
                    <p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />{location.address || '—'}</p>
                    <p className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />{location.phone || '—'}</p>
                    <p className="flex items-center gap-2"><Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />{location.timezone}</p>
                </div>
            </div>

            {/* Rooms */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                    <DoorOpen className="w-4 h-4" style={{ color: 'var(--umahz-accent)' }} /> Rooms
                    <span className="text-sm font-medium" style={{ color: 'var(--umahz-text-tertiary)' }}>({rooms.length})</span>
                </h2>
                <button onClick={() => setRoomModal('new')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    style={{ background: BRAND_GRADIENT, boxShadow: '0 10px 22px -12px rgba(37,99,235,0.6)' }}>
                    <Plus className="w-4 h-4" /> Add room
                </button>
            </div>

            {rooms.length === 0 ? (
                <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>No rooms yet. Add the first room for this location.</p>
                </div>
            ) : (
                <div className="rounded-2xl border shadow-sm overflow-hidden divide-y" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    {rooms.map((room) => (
                        <div key={room.id} className="flex items-center justify-between gap-4 p-4" style={{ borderColor: 'var(--umahz-border)', opacity: room.is_active ? 1 : 0.7 }}>
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--umahz-hover)', color: 'var(--umahz-text-secondary)' }}>
                                    <DoorOpen className="w-[18px] h-[18px]" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold truncate" style={{ color: 'var(--umahz-text-primary)' }}>{room.name}</p>
                                    {room.description && <p className="text-xs truncate" style={{ color: 'var(--umahz-text-tertiary)' }}>{room.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusPill active={room.is_active} />
                                <button onClick={() => setRoomModal(room)} title="Edit" className="p-2 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => toggleRoom(room)} title={room.is_active ? 'Deactivate' : 'Reactivate'} className="p-2 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}><Power className="w-4 h-4" /></button>
                                <button onClick={() => removeRoom(room)} title="Delete" className="p-2 rounded-lg hover:bg-rose-500/10" style={{ color: 'var(--umahz-danger)' }}><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editLocation && <LocationEditModal location={location} timezones={timezones} onClose={() => setEditLocation(false)} />}
            {roomModal && <RoomModal locationId={location.id} room={roomModal === 'new' ? null : roomModal} onClose={() => setRoomModal(null)} />}
        </AuthenticatedLayout>
    );
}
