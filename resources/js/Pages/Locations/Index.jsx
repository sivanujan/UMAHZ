import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { MapPin, Plus, Pencil, Power, Trash2, DoorOpen, Phone, Clock, X, ArrowRight } from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';

const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/50 border';
const fieldStyle = { background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' };
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';

function StatusPill({ active }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={active
                ? { background: 'rgba(34,197,94,0.12)', color: '#16A34A' }
                : { background: 'var(--umahz-hover)', color: 'var(--umahz-text-tertiary)' }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#22C55E' : '#94A3B8' }} />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function LocationModal({ location, timezones, onClose }) {
    const editing = Boolean(location);
    const { data, setData, post, patch, processing, errors } = useForm({
        name: location?.name || '',
        address: location?.address || '',
        phone: location?.phone || '',
        timezone: location?.timezone || 'UTC',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        editing ? patch(`/app/locations/${location.id}`, opts) : post('/app/locations', opts);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                    <h2 className="text-base font-bold" style={{ color: 'var(--umahz-text-primary)' }}>
                        {editing ? 'Edit location' : 'New location'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-tertiary)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Name</label>
                        <input className={fieldClass} style={fieldStyle} value={data.name}
                            onChange={(e) => setData('name', e.target.value)} placeholder="Downtown Clinic" autoFocus />
                        {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.name}</p>}
                    </div>
                    <div>
                        <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Address</label>
                        <textarea className={fieldClass} style={fieldStyle} rows={2} value={data.address}
                            onChange={(e) => setData('address', e.target.value)} placeholder="123 Wellness Ave, Suite 200" />
                        {errors.address && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.address}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Phone</label>
                            <input className={fieldClass} style={fieldStyle} value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                            {errors.phone && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.phone}</p>}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Timezone</label>
                            <select className={fieldClass} style={fieldStyle} value={data.timezone}
                                onChange={(e) => setData('timezone', e.target.value)}>
                                {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                            {errors.timezone && <p className="text-xs mt-1" style={{ color: 'var(--umahz-danger)' }}>{errors.timezone}</p>}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--umahz-hover)]"
                            style={{ color: 'var(--umahz-text-secondary)' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={processing}
                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                            style={{ background: BRAND_GRADIENT, boxShadow: '0 10px 22px -12px rgba(37,99,235,0.6)' }}>
                            {editing ? 'Save changes' : 'Create location'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LocationsIndex({ locations, timezones }) {
    const { flash, errors } = usePage().props;
    const [modal, setModal] = useState(null); // null | 'new' | location object

    const toggle = (loc) => router.patch(`/app/locations/${loc.id}/toggle`, {}, { preserveScroll: true });
    const remove = (loc) => {
        if (confirm(`Delete "${loc.name}"? This can't be undone.`)) {
            router.delete(`/app/locations/${loc.id}`, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout title="Locations & Rooms">
            <Head title="Locations & Rooms" />

            {flash?.success && (
                <div className="mb-5 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>
                    {flash.success}
                </div>
            )}
            {errors?.location && (
                <div className="mb-5 p-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--umahz-danger)' }}>
                    {errors.location}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <p className="text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>
                    Manage your clinic's locations and the rooms within each.
                </p>
                <button onClick={() => setModal('new')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    style={{ background: BRAND_GRADIENT, boxShadow: '0 10px 22px -12px rgba(37,99,235,0.6)' }}>
                    <Plus className="w-4 h-4" /> New location
                </button>
            </div>

            {locations.length === 0 ? (
                <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--umahz-accent)' }}>
                        <MapPin className="w-6 h-6" />
                    </span>
                    <h3 className="font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>No locations yet</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--umahz-text-secondary)' }}>Add your first clinic location to start assigning rooms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {locations.map((loc) => (
                        <div key={loc.id} className="rounded-2xl border shadow-sm p-5 flex flex-col transition-colors"
                            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)', opacity: loc.is_active ? 1 : 0.72 }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--umahz-accent)' }}>
                                        <MapPin className="w-5 h-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="font-bold truncate" style={{ color: 'var(--umahz-text-primary)' }}>{loc.name}</h3>
                                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                            <DoorOpen className="w-3.5 h-3.5" />
                                            {loc.active_rooms_count} active / {loc.rooms_count} room{loc.rooms_count === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </div>
                                <StatusPill active={loc.is_active} />
                            </div>

                            <div className="mt-4 space-y-1.5 text-sm" style={{ color: 'var(--umahz-text-secondary)' }}>
                                {loc.address && <p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />{loc.address}</p>}
                                {loc.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />{loc.phone}</p>}
                                <p className="flex items-center gap-2"><Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--umahz-text-tertiary)' }} />{loc.timezone}</p>
                            </div>

                            <div className="mt-5 pt-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                                <Link href={`/app/locations/${loc.id}`}
                                    className="inline-flex items-center gap-1 text-sm font-semibold hover:gap-1.5 transition-all"
                                    style={{ color: 'var(--umahz-accent)' }}>
                                    Manage rooms <ArrowRight className="w-4 h-4" />
                                </Link>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setModal(loc)} title="Edit"
                                        className="p-2 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}>
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => toggle(loc)} title={loc.is_active ? 'Deactivate' : 'Reactivate'}
                                        className="p-2 rounded-lg hover:bg-[var(--umahz-hover)]" style={{ color: 'var(--umahz-text-secondary)' }}>
                                        <Power className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => remove(loc)} title="Delete"
                                        className="p-2 rounded-lg hover:bg-rose-500/10" style={{ color: 'var(--umahz-danger)' }}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <LocationModal
                    location={modal === 'new' ? null : modal}
                    timezones={timezones}
                    onClose={() => setModal(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
