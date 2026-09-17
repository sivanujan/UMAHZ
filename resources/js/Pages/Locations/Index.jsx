import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AddressPicker from '@/Components/AddressPicker';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { GlassModal } from '@/Components/UI/GlassModal';
import { GlassInput, GlassSelect, GlassTextarea, GlassLabel, GlassError } from '@/Components/UI/FormControls';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    MapPin, Plus, Pencil, Power, Trash2, DoorOpen, Phone, Clock,
    ArrowRight, Users, Calendar, CheckCircle2, AlertTriangle, Building2,
    Check, X, Sparkles
} from 'lucide-react';

/* ------------------------------- Location Modal ------------------------------- */

function LocationModal({ location, timezones = [], provinces = [], onClose }) {
    const editing = Boolean(location);
    const { data, setData, post, patch, processing, errors } = useForm({
        name: location?.name || '',
        address: location?.address || '',
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        phone: location?.phone || '',
        timezone: location?.timezone || 'UTC',
    });

    const onPick = (a) => {
        const line = [a.line1, a.city, a.region, a.country].filter(Boolean).join(', ');
        setData((prev) => ({
            ...prev,
            address: line || prev.address,
            latitude: a.lat,
            longitude: a.lng,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        editing ? patch(`/app/locations/${location.id}`, opts) : post('/app/locations', opts);
    };

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={editing ? 'Edit Location' : 'New Clinic Location'}
            maxWidth="max-w-lg"
        >
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <GlassLabel required>Location Name</GlassLabel>
                    <GlassInput
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="e.g. Downtown Wellness Centre"
                        autoFocus
                    />
                    <GlassError message={errors.name} />
                </div>

                <div>
                    <GlassLabel>Address & Coordinates</GlassLabel>
                    <div className="mb-3">
                        <AddressPicker
                            provinces={provinces}
                            lat={data.latitude}
                            lng={data.longitude}
                            onPick={onPick}
                        />
                    </div>
                    <GlassTextarea
                        rows={2}
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        placeholder="123 Wellness Ave, Suite 200, Toronto, ON"
                    />
                    <GlassError message={errors.address} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <GlassLabel>Phone Number</GlassLabel>
                        <GlassInput
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="+1 (555) 000-0000"
                        />
                        <GlassError message={errors.phone} />
                    </div>
                    <div>
                        <GlassLabel required>Timezone</GlassLabel>
                        <GlassSelect
                            value={data.timezone}
                            onChange={(e) => setData('timezone', e.target.value)}
                        >
                            {timezones.map((tz) => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </GlassSelect>
                        <GlassError message={errors.timezone} />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200/50 dark:border-white/10">
                    <GlassButton type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton type="submit" variant="primary" disabled={processing}>
                        {editing ? 'Save changes' : 'Create location'}
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
    );
}

/* --------------------------------- Main Component --------------------------------- */

export default function LocationsIndex({ locations = [], timezones = [], provinces = [] }) {
    const { flash, errors } = usePage().props;
    const [modal, setModal] = useState(null); // null | 'new' | location object
    const [deleteModal, setDeleteModal] = useState(null); // null | location object

    const toggle = (loc) => {
        router.patch(`/app/locations/${loc.id}/toggle`, {}, { preserveScroll: true });
    };

    const confirmDelete = () => {
        if (!deleteModal) return;
        router.delete(`/app/locations/${deleteModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteModal(null),
        });
    };

    // Calculate Summary KPIs
    const totalLocations = locations.length;
    const activeLocations = locations.filter((l) => l.is_active).length;
    const totalRooms = locations.reduce((sum, l) => sum + (l.rooms_count || 0), 0);
    const appointmentsToday = locations.reduce((sum, l) => sum + (l.appointments_today_count || 0), 0);

    return (
        <AuthenticatedLayout title="Locations & Rooms">
            <Head title="Locations & Rooms" />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <PageHeader
                    eyebrow="Facilities & Practices"
                    title="Locations & Rooms"
                    subtitle="Manage physical clinic branches, treatment rooms, and facility schedules."
                    actions={
                        <GlassButton
                            variant="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => setModal('new')}
                        >
                            New location
                        </GlassButton>
                    }
                />

                {flash?.success && (
                    <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {errors?.location && (
                    <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{errors.location}</span>
                    </div>
                )}

                {/* Top Summary Stat Chips */}
                {totalLocations > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <GlassCard className="p-4 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                    {totalLocations}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Total Locations
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                    {activeLocations}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Active Practices
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                                <DoorOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                    {totalRooms}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Treatment Rooms
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                    {appointmentsToday}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Visits Today
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Locations Responsive Grid */}
                {locations.length === 0 ? (
                    <GlassCard className="p-12 text-center">
                        <EmptyState
                            icon={MapPin}
                            title="No locations configured yet"
                            description="Add your clinic's primary location to configure treatment rooms, assign practitioners, and start scheduling appointments."
                            action={
                                <GlassButton
                                    variant="primary"
                                    icon={<Plus className="w-4 h-4" />}
                                    onClick={() => setModal('new')}
                                >
                                    Add First Location
                                </GlassButton>
                            }
                        />
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {locations.map((loc) => {
                            const roomsCount = loc.rooms_count ?? 0;
                            const activeRooms = loc.active_rooms_count ?? 0;
                            const practitionersCount = loc.practitioners_count ?? 0;
                            const todayVisits = loc.appointments_today_count ?? 0;

                            return (
                                <GlassCard
                                    key={loc.id}
                                    className={`p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
                                        loc.is_active ? '' : 'opacity-70'
                                    }`}
                                >
                                    <div>
                                        {/* Card Header: Icon + Title + Status */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 dark:bg-purple-400/20 border border-purple-500/25 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                        {loc.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                        <span className="truncate">{loc.timezone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <StatusBadge variant={loc.is_active ? 'success' : 'neutral'}>
                                                {loc.is_active ? 'Active' : 'Inactive'}
                                            </StatusBadge>
                                        </div>

                                        {/* Address & Phone Details */}
                                        <div className="mt-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 min-h-[44px]">
                                            <p className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 mt-0.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                                <span className="leading-snug line-clamp-2">
                                                    {loc.address || <span className="text-slate-400 italic">Address not set</span>}
                                                </span>
                                            </p>
                                            {loc.phone ? (
                                                <p className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                    <span>{loc.phone}</span>
                                                </p>
                                            ) : (
                                                <p className="flex items-center gap-2 text-slate-400 dark:text-slate-500 italic text-xs">
                                                    <Phone className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                                    <span>Phone not specified</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Stats Row Strip */}
                                        <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-white/10 grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 rounded-xl bg-purple-500/5 dark:bg-white/[0.02] border border-purple-500/10">
                                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
                                                    <DoorOpen className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                    <span>{roomsCount}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                                    {activeRooms} Active
                                                </div>
                                            </div>

                                            <div className="p-2 rounded-xl bg-purple-500/5 dark:bg-white/[0.02] border border-purple-500/10">
                                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
                                                    <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                    <span>{practitionersCount}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                                    Staff
                                                </div>
                                            </div>

                                            <div className="p-2 rounded-xl bg-purple-500/5 dark:bg-white/[0.02] border border-purple-500/10">
                                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
                                                    <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                    <span>{todayVisits}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                                    Today
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="mt-6 pt-4 flex items-center justify-between border-t border-slate-200/50 dark:border-white/10">
                                        <Link
                                            href={`/app/locations/${loc.id}`}
                                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#8200db] dark:text-purple-300 hover:gap-2 transition-all"
                                        >
                                            Manage rooms <ArrowRight className="w-4 h-4" />
                                        </Link>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setModal(loc)}
                                                title="Edit location details"
                                                aria-label={`Edit ${loc.name}`}
                                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggle(loc)}
                                                title={loc.is_active ? 'Deactivate location' : 'Reactivate location'}
                                                aria-label={loc.is_active ? 'Deactivate location' : 'Reactivate location'}
                                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteModal(loc)}
                                                title="Delete location"
                                                aria-label={`Delete ${loc.name}`}
                                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}

                {/* Edit / New Location Modal */}
                {modal && (
                    <LocationModal
                        location={modal === 'new' ? null : modal}
                        timezones={timezones}
                        provinces={provinces}
                        onClose={() => setModal(null)}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {deleteModal && (
                    <GlassModal
                        isOpen={true}
                        onClose={() => setDeleteModal(null)}
                        title={`Delete "${deleteModal.name}"`}
                        maxWidth="max-w-md"
                    >
                        <div className="space-y-4">
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Are you sure?</p>
                                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                                        Deleting "{deleteModal.name}" cannot be undone. Note that if this location has treatment rooms or appointment history, you must deactivate it instead of deleting.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
                                <GlassButton
                                    variant="secondary"
                                    onClick={() => setDeleteModal(null)}
                                >
                                    Cancel
                                </GlassButton>
                                <GlassButton
                                    variant="danger"
                                    onClick={confirmDelete}
                                >
                                    Delete Location
                                </GlassButton>
                            </div>
                        </div>
                    </GlassModal>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
