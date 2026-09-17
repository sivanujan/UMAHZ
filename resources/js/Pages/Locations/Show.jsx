import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { GlassModal } from '@/Components/UI/GlassModal';
import { GlassInput, GlassSelect, GlassTextarea, GlassLabel, GlassError } from '@/Components/UI/FormControls';
import { EmptyState } from '@/Components/UI/EmptyState';
import AddressPicker from '@/Components/AddressPicker';
import {
    MapPin, Phone, Clock, DoorOpen, Plus, Pencil, Power, Trash2,
    ArrowLeft, Users, Calendar, CheckCircle2, AlertTriangle, Building2,
    Check, X, Sparkles, Navigation, Layers
} from 'lucide-react';

/* ------------------------------- Edit Location Modal ------------------------------- */

function LocationEditModal({ location, timezones = [], provinces = [], onClose }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: location.name,
        address: location.address || '',
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        phone: location.phone || '',
        timezone: location.timezone,
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
        patch(`/app/locations/${location.id}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={`Edit Location: ${location.name}`}
            maxWidth="max-w-lg"
        >
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <GlassLabel required>Location Name</GlassLabel>
                    <GlassInput
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
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
                        placeholder="Street Address, City, Province, Postal Code"
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
                        Save changes
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
    );
}

/* --------------------------------- Room Modal --------------------------------- */

function RoomModal({ locationId, room, onClose }) {
    const editing = Boolean(room);
    const { data, setData, post, patch, processing, errors } = useForm({
        name: room?.name || '',
        description: room?.description || '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        editing
            ? patch(`/app/rooms/${room.id}`, opts)
            : post(`/app/locations/${locationId}/rooms`, opts);
    };

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={editing ? `Edit Room: ${room.name}` : 'Add Treatment Room'}
            maxWidth="max-w-lg"
        >
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <GlassLabel required>Room Name / Number</GlassLabel>
                    <GlassInput
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="e.g. Treatment Room 1 or Acupuncture Suite"
                        autoFocus
                    />
                    <GlassError message={errors.name} />
                </div>

                <div>
                    <GlassLabel>Equipment, Capacity & Notes</GlassLabel>
                    <GlassTextarea
                        rows={3}
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="e.g. Electric hydraulic examination table, infrared heating lamp, sink. Capacity: 1 practitioner + 1 patient."
                    />
                    <GlassError message={errors.description} />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200/50 dark:border-white/10">
                    <GlassButton type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton type="submit" variant="primary" disabled={processing}>
                        {editing ? 'Save changes' : 'Add room'}
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
    );
}

/* --------------------------------- Main Component --------------------------------- */

export default function LocationShow({ location, rooms = [], stats = {}, timezones = [], provinces = [] }) {
    const { flash, errors } = usePage().props;
    const [editLocation, setEditLocation] = useState(false);
    const [roomModal, setRoomModal] = useState(null); // null | 'new' | room object
    const [deleteRoomModal, setDeleteRoomModal] = useState(null); // null | room object

    const toggleLocation = () => {
        router.patch(`/app/locations/${location.id}/toggle`, {}, { preserveScroll: true });
    };

    const toggleRoom = (room) => {
        router.patch(`/app/rooms/${room.id}/toggle`, {}, { preserveScroll: true });
    };

    const confirmDeleteRoom = () => {
        if (!deleteRoomModal) return;
        router.delete(`/app/rooms/${deleteRoomModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteRoomModal(null),
        });
    };

    // Calculate metrics
    const totalRooms = stats.total_rooms ?? rooms.length;
    const activeRooms = stats.active_rooms ?? rooms.filter((r) => r.is_active).length;
    const practitionersCount = stats.practitioners_count ?? 0;
    const upcomingVisits = stats.upcoming_appointments ?? 0;

    return (
        <AuthenticatedLayout title="Locations & Rooms">
            <Head title={`${location.name} - Details & Rooms`} />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Back navigation & Page Header */}
                <div>
                    <Link
                        href="/app/locations"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#8200db] dark:text-purple-300 hover:gap-2 transition-all mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to all locations
                    </Link>

                    <PageHeader
                        eyebrow="Practice Facility"
                        title={location.name}
                        subtitle="Manage treatment rooms, equipment, capacity, and scheduling settings for this location."
                        actions={
                            <div className="flex items-center gap-2">
                                <GlassButton
                                    variant="secondary"
                                    icon={<Pencil className="w-4 h-4" />}
                                    onClick={() => setEditLocation(true)}
                                >
                                    Edit Details
                                </GlassButton>
                                <GlassButton
                                    variant="primary"
                                    icon={<Plus className="w-4 h-4" />}
                                    onClick={() => setRoomModal('new')}
                                >
                                    Add Room
                                </GlassButton>
                            </div>
                        }
                    />
                </div>

                {flash?.success && (
                    <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {errors?.room && (
                    <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{errors.room}</span>
                    </div>
                )}

                {/* Location KPI Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                            <DoorOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {totalRooms}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total Rooms
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {activeRooms}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Active Rooms
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {practitionersCount}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Staff Assigned
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {upcomingVisits}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Upcoming Visits
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Location Overview Summary Card */}
                <GlassCard className="p-6 sm:p-7 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-2xl bg-purple-500/15 dark:bg-purple-400/20 border border-purple-500/25 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                                <Building2 className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                        {location.name}
                                    </h2>
                                    <StatusBadge variant={location.is_active ? 'success' : 'neutral'}>
                                        {location.is_active ? 'Active Location' : 'Inactive Location'}
                                    </StatusBadge>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {totalRooms} treatment room{totalRooms === 1 ? '' : 's'} configured in this facility
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <GlassButton
                                variant="secondary"
                                size="sm"
                                icon={<Power className="w-4 h-4" />}
                                onClick={toggleLocation}
                            >
                                {location.is_active ? 'Deactivate practice' : 'Reactivate practice'}
                            </GlassButton>
                        </div>
                    </div>

                    {/* Graceful Metadata Fields */}
                    <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs sm:text-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block">Street Address</span>
                                {location.address ? (
                                    <span className="text-slate-600 dark:text-slate-300 leading-snug block">
                                        {location.address}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEditLocation(true)}
                                        className="text-[#8200db] dark:text-purple-300 hover:underline font-semibold text-xs mt-0.5 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add address
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block">Contact Phone</span>
                                {location.phone ? (
                                    <span className="text-slate-600 dark:text-slate-300 block">
                                        {location.phone}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEditLocation(true)}
                                        className="text-[#8200db] dark:text-purple-300 hover:underline font-semibold text-xs mt-0.5 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add phone
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block">Facility Timezone</span>
                                <span className="text-slate-600 dark:text-slate-300 block">
                                    {location.timezone}
                                </span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Treatment Rooms Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-[#8200db] dark:text-purple-400 flex items-center justify-center">
                                <DoorOpen className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900 dark:text-white">
                                    Treatment Rooms & Suites
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {rooms.length} room{rooms.length === 1 ? '' : 's'} available for bookings
                                </p>
                            </div>
                        </div>

                        <GlassButton
                            variant="primary"
                            size="sm"
                            icon={<Plus className="w-3.5 h-3.5" />}
                            onClick={() => setRoomModal('new')}
                        >
                            Add Room
                        </GlassButton>
                    </div>

                    {rooms.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <EmptyState
                                icon={DoorOpen}
                                title="No treatment rooms configured"
                                description="Add treatment rooms, massage therapy suites, or consultation spaces to enable room-specific appointment bookings at this location."
                                action={
                                    <GlassButton
                                        variant="primary"
                                        icon={<Plus className="w-4 h-4" />}
                                        onClick={() => setRoomModal('new')}
                                    >
                                        Add First Room
                                    </GlassButton>
                                }
                            />
                        </GlassCard>
                    ) : (
                        /* Treatment Rooms Responsive Card Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {rooms.map((room) => {
                                const upcomingAppts = room.upcoming_appointments_count ?? 0;

                                return (
                                    <GlassCard
                                        key={room.id}
                                        className={`p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
                                            room.is_active ? '' : 'opacity-70'
                                        }`}
                                    >
                                        <div>
                                            {/* Room Card Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 dark:bg-purple-400/20 border border-purple-500/25 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                                                        <DoorOpen className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {room.name}
                                                        </h3>
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            Room space
                                                        </span>
                                                    </div>
                                                </div>
                                                <StatusBadge variant={room.is_active ? 'success' : 'neutral'}>
                                                    {room.is_active ? 'Active' : 'Inactive'}
                                                </StatusBadge>
                                            </div>

                                            {/* Description & Equipment notes */}
                                            <div className="mt-4 p-3 rounded-xl bg-purple-500/5 dark:bg-white/[0.02] border border-purple-500/10 text-xs min-h-[58px]">
                                                {room.description ? (
                                                    <p className="text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                                                        {room.description}
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-400 dark:text-slate-500 italic">
                                                        No equipment or capacity notes specified.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Upcoming Visits metric */}
                                            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                                <span>
                                                    {upcomingAppts} upcoming visit{upcomingAppts === 1 ? '' : 's'} scheduled
                                                </span>
                                            </div>
                                        </div>

                                        {/* Room Card Footer Actions */}
                                        <div className="mt-5 pt-3.5 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setRoomModal(room)}
                                                title="Edit room equipment & details"
                                                aria-label={`Edit ${room.name}`}
                                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleRoom(room)}
                                                title={room.is_active ? 'Deactivate room' : 'Reactivate room'}
                                                aria-label={room.is_active ? 'Deactivate room' : 'Reactivate room'}
                                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteRoomModal(room)}
                                                title="Delete room"
                                                aria-label={`Delete ${room.name}`}
                                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Edit Location Modal */}
                {editLocation && (
                    <LocationEditModal
                        location={location}
                        timezones={timezones}
                        provinces={provinces}
                        onClose={() => setEditLocation(false)}
                    />
                )}

                {/* Add / Edit Room Modal */}
                {roomModal && (
                    <RoomModal
                        locationId={location.id}
                        room={roomModal === 'new' ? null : roomModal}
                        onClose={() => setRoomModal(null)}
                    />
                )}

                {/* Delete Room Confirmation Modal */}
                {deleteRoomModal && (
                    <GlassModal
                        isOpen={true}
                        onClose={() => setDeleteRoomModal(null)}
                        title={`Delete Room: ${deleteRoomModal.name}`}
                        maxWidth="max-w-md"
                    >
                        <div className="space-y-4">
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Are you sure?</p>
                                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                                        Deleting "{deleteRoomModal.name}" cannot be undone. If this room is scheduled for upcoming appointments, it should be deactivated instead.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
                                <GlassButton
                                    variant="secondary"
                                    onClick={() => setDeleteRoomModal(null)}
                                >
                                    Cancel
                                </GlassButton>
                                <GlassButton
                                    variant="danger"
                                    onClick={confirmDeleteRoom}
                                >
                                    Delete Room
                                </GlassButton>
                            </div>
                        </div>
                    </GlassModal>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
