import React, { useState, useMemo } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { GlassModal } from '@/Components/UI/GlassModal';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { GlassTable, GlassThead, GlassTh, GlassTbody, GlassTr, GlassTd } from '@/Components/UI/GlassTable';
import { GlassInput, GlassSelect, GlassLabel, GlassError } from '@/Components/UI/FormControls';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    UserPlus, Mail, Users, Shield, UserCheck, UserX, Crown, Sparkles,
    Clock, Search, MoreVertical, Pencil, Trash2, RotateCcw, Check,
    AlertTriangle, CheckCircle2, Power, Info, Filter, X
} from 'lucide-react';

const ROLE_META = {
    clinic_owner: {
        label: 'Clinic Owner',
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        icon: Crown,
        desc: 'Full administrative oversight, billing, staff management, and clinic configuration.',
    },
    practitioner: {
        label: 'Practitioner',
        badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
        icon: Sparkles,
        desc: 'Conducts appointments, charts clinical notes, and manages their own practitioner schedule.',
    },
    receptionist: {
        label: 'Receptionist',
        badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
        icon: UserCheck,
        desc: 'Front-desk operations, schedule management, patient registration, and intake checks.',
    },
};

const STATUS_VARIANTS = {
    invited: 'warning',
    active: 'success',
    suspended: 'danger',
    deactivated: 'neutral',
};

function getInitials(name, email) {
    if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
        return email.slice(0, 2).toUpperCase();
    }
    return 'ST';
}

/* ------------------------------- Toast Alert ------------------------------- */

function Toast({ message, onClose }) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/15 animate-in slide-in-from-bottom-5 duration-200">
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

/* --------------------------------- Main Component --------------------------------- */

export default function StaffIndex({ staff = [], roles = [] }) {
    const { flash } = usePage().props;

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals state
    const [confirmModal, setConfirmModal] = useState(null); // { type, member, title, message, action }
    const [editRoleModal, setEditRoleModal] = useState(null); // { member, currentRole }
    const [toastMessage, setToastMessage] = useState(null);

    // Invite form
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        email: '',
        role: roles?.[0] || 'practitioner',
    });

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
    const isAlreadyMember = useMemo(() => {
        if (!data.email.trim()) return false;
        return staff.some((s) => s.email?.toLowerCase() === data.email.trim().toLowerCase());
    }, [data.email, staff]);

    const submitInvite = (e) => {
        e.preventDefault();
        clearErrors();
        if (!isEmailValid || isAlreadyMember) return;

        post('/app/staff', {
            preserveScroll: true,
            onSuccess: () => {
                reset('email');
                setToastMessage(`Invitation sent to ${data.email}.`);
            },
        });
    };

    // Actions handlers
    const handleResend = (member) => {
        router.post(`/app/staff/${member.id}/resend`, {}, {
            preserveScroll: true,
            onSuccess: () => setToastMessage(`Invitation resent to ${member.email}.`),
        });
    };

    const handleSetStatus = (member, newStatus) => {
        router.patch(`/app/staff/${member.id}`, { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => {
                const label = newStatus === 'active' ? 'reactivated' : (newStatus === 'suspended' ? 'suspended' : 'deactivated');
                setToastMessage(`Staff member ${label} successfully.`);
            },
        });
    };

    const handleUpdateRole = (member, newRole) => {
        router.patch(`/app/staff/${member.id}`, { role: newRole }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditRoleModal(null);
                setToastMessage(`Role updated to ${ROLE_META[newRole]?.label || newRole}.`);
            },
        });
    };

    const handleRemove = (member) => {
        router.delete(`/app/staff/${member.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmModal(null);
                const msg = member.status === 'invited' ? 'Invitation cancelled.' : 'Staff member removed from clinic.';
                setToastMessage(msg);
            },
        });
    };

    // Filtered staff list
    const filteredStaff = useMemo(() => {
        return staff.filter((m) => {
            // Search query (name or email)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = m.name?.toLowerCase().includes(q);
                const matchesEmail = m.email?.toLowerCase().includes(q);
                if (!matchesName && !matchesEmail) return false;
            }
            // Role filter
            if (roleFilter !== 'all' && m.role !== roleFilter) {
                return false;
            }
            // Status filter
            if (statusFilter !== 'all' && m.status !== statusFilter) {
                return false;
            }
            return true;
        });
    }, [staff, searchQuery, roleFilter, statusFilter]);

    // KPI Summary Metrics
    const totalMembers = staff.length;
    const activeCount = staff.filter((s) => s.status === 'active').length;
    const invitedCount = staff.filter((s) => s.status === 'invited').length;
    const practitionerCount = staff.filter((s) => s.role === 'practitioner').length;

    const onlyOwner = totalMembers <= 1;

    return (
        <AuthenticatedLayout title="Staff Members">
            <Head title="Staff Members & Team" />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <PageHeader
                    eyebrow="Team Management"
                    title="Clinic Staff & Roles"
                    subtitle="Invite clinical staff, manage roles & access levels, and monitor team onboarding."
                />

                {flash?.success && (
                    <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Team Summary Stat Chips Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {totalMembers}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total Members
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {activeCount}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Active Staff
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {invitedCount}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Pending Invites
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {practitionerCount}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Practitioners
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Two-Column Balanced Layout: 1/3 Invite Card, 2/3 Clinic Team Card */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* ── LEFT: Invite Staff Form Card (~1/3) ── */}
                    <div className="xl:col-span-4 space-y-4">
                        <GlassCard className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Invite Staff Member</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Send an invitation to join your clinic</p>
                                </div>
                            </div>

                            <form onSubmit={submitInvite} className="space-y-4">
                                <div>
                                    <GlassLabel required>Email Address</GlassLabel>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                                        <GlassInput
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            required
                                            placeholder="colleague@clinic.com"
                                            className="pl-9"
                                        />
                                    </div>
                                    {isAlreadyMember && (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                            <span>This person is already on your clinic team or has a pending invite.</span>
                                        </p>
                                    )}
                                    <GlassError message={errors.email} />
                                </div>

                                <div>
                                    <GlassLabel required>Access Role</GlassLabel>
                                    <GlassSelect
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                    >
                                        {(roles || []).map((r) => (
                                            <option key={r} value={r}>
                                                {ROLE_META[r]?.label || r}
                                            </option>
                                        ))}
                                    </GlassSelect>
                                    <GlassError message={errors.role} />

                                    {/* Role Description Helper Tile */}
                                    <div className="mt-2 p-2.5 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/15 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-2">
                                        <Info className="w-3.5 h-3.5 text-[#8200db] dark:text-purple-400 shrink-0 mt-0.5" />
                                        <span>{ROLE_META[data.role]?.desc}</span>
                                    </div>
                                </div>

                                <GlassButton
                                    type="submit"
                                    variant="primary"
                                    disabled={processing || !isEmailValid || isAlreadyMember}
                                    icon={<UserPlus className="w-4 h-4" />}
                                    className="w-full justify-center mt-2 shadow-sm"
                                >
                                    Send Invitation
                                </GlassButton>
                            </form>
                        </GlassCard>

                        {/* Clinic Plan Notice Tile */}
                        <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <p className="font-bold text-slate-700 dark:text-slate-300">Team Security & Privacy</p>
                            <p className="text-[11px] leading-relaxed">
                                Staff members only receive access after accepting the emailed invitation link and creating their credentials. All clinical activities are audited.
                            </p>
                        </div>
                    </div>

                    {/* ── RIGHT: Clinic Team Table Card (~2/3) ── */}
                    <div className="xl:col-span-8 space-y-4">
                        <GlassCard className="overflow-hidden shadow-lg">
                            {/* Card Header with Counts and Search/Filter Bar */}
                            <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/10 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-[#8200db] dark:text-purple-400 flex items-center justify-center">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Clinic Team</h2>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {filteredStaff.length} {filteredStaff.length === 1 ? 'member' : 'members'} found
                                            </p>
                                        </div>
                                    </div>

                                    {/* Role Filter Tabs */}
                                    <div className="flex items-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] p-1 overflow-x-auto text-xs">
                                        {[
                                            { id: 'all', label: 'All' },
                                            { id: 'clinic_owner', label: 'Owners' },
                                            { id: 'practitioner', label: 'Practitioners' },
                                            { id: 'receptionist', label: 'Reception' },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setRoleFilter(tab.id)}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                                                    roleFilter === tab.id
                                                        ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-xs'
                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Search Input + Status Filter */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by name or email…"
                                            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8200db]"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/10 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#8200db]"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active Only</option>
                                        <option value="invited">Pending Invites</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="deactivated">Deactivated</option>
                                    </select>
                                </div>
                            </div>

                            {/* Friendly banner if only the owner is on the team */}
                            {onlyOwner && (
                                <div className="mx-4 sm:mx-6 my-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
                                    <Sparkles className="w-4 h-4 text-[#8200db] dark:text-purple-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Start Building Your Team</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                            You are currently the only member of your clinic team. Use the invite form on the left to add your practitioners, receptionists, or clinic administrators.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Staff Members Table */}
                            <div className="overflow-x-auto">
                                <GlassTable>
                                    <GlassThead>
                                        <tr>
                                            <GlassTh className="pl-6">Staff Member</GlassTh>
                                            <GlassTh>Role</GlassTh>
                                            <GlassTh>Discipline</GlassTh>
                                            <GlassTh>Status</GlassTh>
                                            <GlassTh>Activity</GlassTh>
                                            <GlassTh align="right" className="pr-6">Actions</GlassTh>
                                        </tr>
                                    </GlassThead>
                                    <GlassTbody>
                                        {filteredStaff && filteredStaff.length > 0 ? (
                                            filteredStaff.map((member) => {
                                                const roleMeta = ROLE_META[member.role] || {
                                                    label: member.role,
                                                    badgeColor: 'bg-slate-200 text-slate-700',
                                                    icon: Shield,
                                                };
                                                const RoleIcon = roleMeta.icon;
                                                const initials = getInitials(member.name, member.email);

                                                return (
                                                    <GlassTr key={member.id}>
                                                        {/* Staff Member Avatar + Name */}
                                                        <GlassTd className="pl-6 font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                                    {initials}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                                                        <span>{member.name || member.email}</span>
                                                                        {member.is_self && (
                                                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/15 text-[#8200db] dark:text-purple-300 border border-purple-500/30">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                        {member.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </GlassTd>

                                                        {/* Role Badge */}
                                                        <GlassTd>
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${roleMeta.badgeColor}`}>
                                                                <RoleIcon className="w-3.5 h-3.5 shrink-0" />
                                                                <span>{roleMeta.label}</span>
                                                            </span>
                                                        </GlassTd>

                                                        {/* Discipline Column */}
                                                        <GlassTd>
                                                            {member.discipline ? (
                                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/10">
                                                                    {member.discipline}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                                                            )}
                                                        </GlassTd>

                                                        {/* Status Pill */}
                                                        <GlassTd>
                                                            <StatusBadge variant={STATUS_VARIANTS[member.status] || 'neutral'}>
                                                                {member.status}
                                                            </StatusBadge>
                                                        </GlassTd>

                                                        {/* Activity / Joined Date */}
                                                        <GlassTd>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                {member.status === 'invited'
                                                                    ? (member.invited_at ? `Invited ${member.invited_at}` : 'Pending')
                                                                    : (member.joined_at ? `Joined ${member.joined_at}` : (member.created_at_date || 'Active'))}
                                                            </span>
                                                        </GlassTd>

                                                        {/* Actions Column */}
                                                        <GlassTd align="right" className="pr-6">
                                                            {member.is_self ? (
                                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 italic">
                                                                    Owner Account
                                                                </span>
                                                            ) : (
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {/* Actions for Pending Invites */}
                                                                    {member.status === 'invited' && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleResend(member)}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-500/30 bg-purple-500/10 text-[#8200db] dark:text-purple-300 hover:bg-purple-500/20 transition flex items-center gap-1"
                                                                                title="Resend invitation email"
                                                                            >
                                                                                <RotateCcw className="w-3 h-3" />
                                                                                <span>Resend</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setConfirmModal({
                                                                                    type: 'cancel_invite',
                                                                                    member,
                                                                                    title: 'Cancel Invitation',
                                                                                    message: `Are you sure you want to cancel the pending invitation for ${member.email}? The invitation link will be invalidated immediately.`,
                                                                                    action: () => handleRemove(member),
                                                                                })}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </>
                                                                    )}

                                                                    {/* Actions for Active Members */}
                                                                    {member.status === 'active' && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditRoleModal({ member, currentRole: member.role })}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                                                                                title="Edit staff role"
                                                                            >
                                                                                <Pencil className="w-3 h-3" />
                                                                                <span>Role</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setConfirmModal({
                                                                                    type: 'suspend',
                                                                                    member,
                                                                                    title: 'Suspend Staff Member',
                                                                                    message: `Suspend access for ${member.name}? They will temporarily lose access to the clinic workspace until reactivated.`,
                                                                                    action: () => handleSetStatus(member, 'suspended'),
                                                                                })}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
                                                                                title="Suspend access"
                                                                            >
                                                                                Suspend
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setConfirmModal({
                                                                                    type: 'remove',
                                                                                    member,
                                                                                    title: 'Remove Staff Member',
                                                                                    message: `Are you sure you want to remove ${member.name} from the clinic? Their access will be revoked immediately. All past clinical notes and appointments will be retained.`,
                                                                                    action: () => handleRemove(member),
                                                                                })}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition"
                                                                                title="Remove from clinic"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </>
                                                                    )}

                                                                    {/* Actions for Suspended / Deactivated Members */}
                                                                    {(member.status === 'suspended' || member.status === 'deactivated') && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSetStatus(member, 'active')}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition flex items-center gap-1"
                                                                                title="Reactivate access"
                                                                            >
                                                                                <Power className="w-3 h-3" />
                                                                                <span>Reactivate</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setConfirmModal({
                                                                                    type: 'remove',
                                                                                    member,
                                                                                    title: 'Remove Staff Member',
                                                                                    message: `Permanently delete membership for ${member.name}? Past clinical documentation remains safely retained.`,
                                                                                    action: () => handleRemove(member),
                                                                                })}
                                                                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </GlassTd>
                                                    </GlassTr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="py-12 text-center">
                                                    <EmptyState
                                                        icon={Users}
                                                        title="No team members match your filters"
                                                        description="Try changing or clearing your search term or filter selection."
                                                        action={
                                                            (searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                                                                <GlassButton
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSearchQuery('');
                                                                        setRoleFilter('all');
                                                                        setStatusFilter('all');
                                                                    }}
                                                                >
                                                                    Clear Filters
                                                                </GlassButton>
                                                            )
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </GlassTbody>
                                </GlassTable>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>

            {/* ── EDIT ROLE MODAL ── */}
            {editRoleModal && (
                <EditRoleModal
                    member={editRoleModal.member}
                    roles={roles}
                    onClose={() => setEditRoleModal(null)}
                    onSave={(newRole) => handleUpdateRole(editRoleModal.member, newRole)}
                />
            )}

            {/* ── CONFIRMATION MODAL ── */}
            {confirmModal && (
                <GlassModal
                    isOpen={true}
                    onClose={() => setConfirmModal(null)}
                    title={confirmModal.title}
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Confirmation Required</p>
                                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{confirmModal.message}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
                            <GlassButton
                                variant="secondary"
                                onClick={() => setConfirmModal(null)}
                            >
                                Cancel
                            </GlassButton>
                            <GlassButton
                                variant="danger"
                                onClick={confirmModal.action}
                            >
                                Confirm Action
                            </GlassButton>
                        </div>
                    </div>
                </GlassModal>
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

/* ------------------------------- Edit Role Modal ------------------------------- */

function EditRoleModal({ member, roles, onClose, onSave }) {
    const [selectedRole, setSelectedRole] = useState(member.role);

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={`Edit Role: ${member.name || member.email}`}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div>
                    <GlassLabel required>Assign Access Role</GlassLabel>
                    <GlassSelect
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                    >
                        {(roles || []).map((r) => (
                            <option key={r} value={r}>
                                {ROLE_META[r]?.label || r}
                            </option>
                        ))}
                    </GlassSelect>
                </div>

                {/* Role Description Tile */}
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#8200db] dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                            {ROLE_META[selectedRole]?.label || selectedRole}
                        </p>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                            {ROLE_META[selectedRole]?.desc}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-white/10">
                    <GlassButton
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </GlassButton>
                    <GlassButton
                        variant="primary"
                        icon={<Check className="w-4 h-4" />}
                        onClick={() => onSave(selectedRole)}
                    >
                        Save Role
                    </GlassButton>
                </div>
            </div>
        </GlassModal>
    );
}
