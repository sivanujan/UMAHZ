import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GlassCard from '@/Components/UI/GlassCard';
import PageHeader from '@/Components/UI/PageHeader';
import GlassButton from '@/Components/UI/GlassButton';
import StatusBadge from '@/Components/UI/StatusBadge';
import { GlassTable, GlassThead, GlassTh, GlassTbody, GlassTr, GlassTd } from '@/Components/UI/GlassTable';
import GlassModal from '@/Components/UI/GlassModal';
import { GlassInput, GlassSelect, GlassLabel, GlassError } from '@/Components/UI/FormControls';
import Tabs from '@/Components/UI/Tabs';
import EmptyState from '@/Components/UI/EmptyState';
import ActionsMenu from '@/Components/UI/ActionsMenu';
import {
    Users, Plus, Search, Mail, Phone, Calendar, Pencil, Power,
    Trash2, Eye, AlertCircle, HeartHandshake, UserCheck, UserX,
    UserPlus, ArrowUpDown, ChevronDown, ChevronUp, ChevronLeft,
    ChevronRight, Clock, MessageSquare, ShieldAlert, CheckCircle2,
    CalendarCheck2
} from 'lucide-react';

/* ------------------------------- Helper: Calculate Age ------------------------------- */
function calculateAge(dateString) {
    if (!dateString) return null;
    const dob = new Date(dateString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age >= 0 ? age : null;
}

/* ------------------------------- Helper: Display Name ------------------------------- */
function getClientDisplayName(client) {
    if (!client) return '';
    const first = (client.first_name || '').trim();
    let last = (client.last_name || '').trim();
    // Drop literal "unknown" if present
    if (last.toLowerCase() === 'unknown') {
        last = '';
    }
    if (first && last) return `${first} ${last}`;
    return first || last || client.name || 'Unnamed Client';
}

/* ------------------------------- Client Modal (Create / Edit) ------------------------------- */
function ClientModal({ client, onClose }) {
    const editing = Boolean(client);

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        first_name: client?.first_name || '',
        last_name: client?.last_name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        date_of_birth: client?.date_of_birth || '',
        sex: client?.sex || '',
        preferred_contact_method: client?.preferred_contact_method || 'email',
        emergency_contact_name: client?.emergency_contact?.name || '',
        emergency_contact_phone: client?.emergency_contact?.phone || '',
        emergency_contact_relationship: client?.emergency_contact?.relationship || '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (editing) {
            patch(`/app/clients/${client.id}`, opts);
        } else {
            post('/app/clients', opts);
        }
    };

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={editing ? 'Edit Client' : 'Register New Client'}
            subtitle={editing ? 'Update client details and primary emergency contact.' : 'Create a patient record in your practice directory.'}
            maxWidth="max-w-xl"
        >
            <form onSubmit={submit} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <GlassLabel required>First Name</GlassLabel>
                        <GlassInput
                            value={data.first_name}
                            onChange={(e) => setData('first_name', e.target.value)}
                            placeholder="Jane"
                            required
                            autoFocus
                            error={errors.first_name}
                        />
                        <GlassError message={errors.first_name} />
                    </div>

                    <div>
                        <GlassLabel required>Last Name</GlassLabel>
                        <GlassInput
                            value={data.last_name}
                            onChange={(e) => setData('last_name', e.target.value)}
                            placeholder="Doe"
                            required
                            error={errors.last_name}
                        />
                        <GlassError message={errors.last_name} />
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <GlassLabel>Email Address</GlassLabel>
                        <GlassInput
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="jane.doe@example.com"
                            error={errors.email}
                        />
                        <GlassError message={errors.email} />
                    </div>

                    <div>
                        <GlassLabel>Phone Number</GlassLabel>
                        <GlassInput
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="+1 (555) 234-5678"
                            error={errors.phone}
                        />
                        <GlassError message={errors.phone} />
                    </div>
                </div>

                {/* Demographics & Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <GlassLabel>Date of Birth</GlassLabel>
                        <GlassInput
                            type="date"
                            value={data.date_of_birth}
                            onChange={(e) => setData('date_of_birth', e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            error={errors.date_of_birth}
                        />
                        <GlassError message={errors.date_of_birth} />
                    </div>

                    <div>
                        <GlassLabel>Sex / Gender</GlassLabel>
                        <GlassSelect
                            value={data.sex}
                            onChange={(e) => setData('sex', e.target.value)}
                            error={errors.sex}
                        >
                            <option value="">Select Sex...</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="intersex">Intersex</option>
                            <option value="other">Other / Non-Binary</option>
                            <option value="prefer_not_to_say">Prefer Not to Say</option>
                        </GlassSelect>
                        <GlassError message={errors.sex} />
                    </div>

                    <div>
                        <GlassLabel>Preferred Channel</GlassLabel>
                        <GlassSelect
                            value={data.preferred_contact_method}
                            onChange={(e) => setData('preferred_contact_method', e.target.value)}
                            error={errors.preferred_contact_method}
                        >
                            <option value="email">Email</option>
                            <option value="phone">Phone Call</option>
                            <option value="sms">SMS / Text</option>
                        </GlassSelect>
                        <GlassError message={errors.preferred_contact_method} />
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                        <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                        <span>Emergency Contact (Optional)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <GlassLabel>Contact Name</GlassLabel>
                            <GlassInput
                                value={data.emergency_contact_name}
                                onChange={(e) => setData('emergency_contact_name', e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <GlassLabel>Phone</GlassLabel>
                            <GlassInput
                                type="tel"
                                value={data.emergency_contact_phone}
                                onChange={(e) => setData('emergency_contact_phone', e.target.value)}
                                placeholder="+1 (555) 987-6543"
                            />
                        </div>

                        <div>
                            <GlassLabel>Relationship</GlassLabel>
                            <GlassInput
                                value={data.emergency_contact_relationship}
                                onChange={(e) => setData('emergency_contact_relationship', e.target.value)}
                                placeholder="Spouse, Parent, etc."
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
                    <GlassButton type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton type="submit" variant="primary" loading={processing}>
                        {editing ? 'Save Changes' : 'Create Client'}
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
    );
}

/* ------------------------------- Confirm Delete / Deactivate Modal ------------------------------- */
function ConfirmDeleteModal({ client, onClose, onDeactivate, onDelete }) {
    if (!client) return null;
    const displayName = getClientDisplayName(client);
    const hasAppointments = (client.appointments_count || 0) > 0;

    return (
        <GlassModal
            isOpen={true}
            onClose={onClose}
            title={hasAppointments ? 'Preserve Clinical Records' : 'Delete Client Record'}
            subtitle={`Action for ${displayName}`}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        {hasAppointments ? (
                            <p>
                                <strong>{displayName}</strong> has <strong>{client.appointments_count}</strong> recorded visit(s).
                                To protect medical audit compliance, clinical records cannot be hard deleted. You can safely <strong>deactivate</strong> the client profile instead.
                            </p>
                        ) : (
                            <p>
                                Are you sure you want to permanently delete <strong>{displayName}</strong>?
                                Alternatively, you can <strong>deactivate</strong> this client account to keep historical records intact.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                    <GlassButton variant="ghost" onClick={onClose}>
                        Cancel
                    </GlassButton>

                    {client.is_active && (
                        <GlassButton
                            variant="secondary"
                            icon={Power}
                            onClick={() => {
                                onDeactivate(client);
                                onClose();
                            }}
                        >
                            Deactivate Instead
                        </GlassButton>
                    )}

                    {!hasAppointments && (
                        <GlassButton
                            variant="danger"
                            icon={Trash2}
                            onClick={() => {
                                onDelete(client);
                                onClose();
                            }}
                        >
                            Delete Permanently
                        </GlassButton>
                    )}
                </div>
            </div>
        </GlassModal>
    );
}

/* ------------------------------- Preferred Contact Badge ------------------------------- */
function PreferredContactBadge({ method }) {
    const norm = (method || 'email').toLowerCase();
    if (norm === 'sms' || norm === 'text') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                <MessageSquare className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>SMS</span>
            </span>
        );
    }
    if (norm === 'phone') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Phone</span>
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Email</span>
        </span>
    );
}

/* ==============================================================================
 * MAIN CLIENTS INDEX COMPONENT
 * ============================================================================== */
export default function ClientsIndex({ clients = [], stats = null, filters = {} }) {
    const { errors, flash } = usePage().props;

    // Filters and search state
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [sortBy, setSortBy] = useState('name_asc'); // name_asc, name_desc, dob_desc, dob_asc, visits_desc, visits_asc

    // Modals
    const [modalClient, setModalClient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteTargetClient, setDeleteTargetClient] = useState(null);

    // Pagination state (client-side 15 per page)
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    // Sync search and status filters to URL with debouncing
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (filters.search || '') || statusFilter !== (filters.status || 'all')) {
                router.get(
                    '/app/clients',
                    {
                        search: search || undefined,
                        status: statusFilter !== 'all' ? statusFilter : undefined,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                    }
                );
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [search, statusFilter]);

    // Reset pagination when search or status changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, sortBy]);

    // Quick stats overview data (from props or computed from clients list)
    const computedStats = useMemo(() => {
        if (stats) return stats;
        const total = clients.length;
        const active = clients.filter((c) => c.is_active).length;
        const inactive = clients.filter((c) => !c.is_active).length;
        return {
            total,
            active,
            inactive,
            new_this_month: 0,
            upcoming_appointments: 0,
        };
    }, [clients, stats]);

    // Live search filtering & sorting
    const filteredClients = useMemo(() => {
        let result = [...clients];

        // Apply tab status filter if not already filtered by backend
        if (statusFilter === 'active') {
            result = result.filter((c) => c.is_active);
        } else if (statusFilter === 'inactive') {
            result = result.filter((c) => !c.is_active);
        }

        // Apply instant live client-side search query
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((c) => {
                const name = getClientDisplayName(c).toLowerCase();
                const email = (c.email || '').toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                return name.includes(q) || email.includes(q) || phone.includes(q);
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            const nameA = getClientDisplayName(a).toLowerCase();
            const nameB = getClientDisplayName(b).toLowerCase();

            switch (sortBy) {
                case 'name_desc':
                    return nameB.localeCompare(nameA);
                case 'name_asc':
                    return nameA.localeCompare(nameB);
                case 'dob_desc': // Oldest first
                    if (!a.date_of_birth) return 1;
                    if (!b.date_of_birth) return -1;
                    return a.date_of_birth.localeCompare(b.date_of_birth);
                case 'dob_asc': // Youngest first
                    if (!a.date_of_birth) return 1;
                    if (!b.date_of_birth) return -1;
                    return b.date_of_birth.localeCompare(a.date_of_birth);
                case 'visits_desc':
                    return (b.appointments_count || 0) - (a.appointments_count || 0);
                case 'visits_asc':
                    return (a.appointments_count || 0) - (b.appointments_count || 0);
                default:
                    return nameA.localeCompare(nameB);
            }
        });

        return result;
    }, [clients, statusFilter, search, sortBy]);

    // Pagination calculations
    const totalCount = filteredClients.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredClients.slice(start, start + pageSize);
    }, [filteredClients, currentPage, pageSize]);

    // Tab counts
    const activeCount = clients.filter((c) => c.is_active).length;
    const inactiveCount = clients.filter((c) => !c.is_active).length;

    const filterTabs = [
        { id: 'all', label: 'All Clients', count: clients.length },
        { id: 'active', label: 'Active', count: activeCount },
        { id: 'inactive', label: 'Inactive', count: inactiveCount },
    ];

    const openCreateModal = () => {
        setModalClient(null);
        setIsModalOpen(true);
    };

    const openEditModal = (client) => {
        setModalClient(client);
        setIsModalOpen(true);
    };

    const handleToggle = (client) => {
        router.patch(`/app/clients/${client.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = (client) => {
        router.delete(`/app/clients/${client.id}`, { preserveScroll: true });
    };

    const handleSortHeader = (field) => {
        if (field === 'name') {
            setSortBy((prev) => (prev === 'name_asc' ? 'name_desc' : 'name_asc'));
        } else if (field === 'dob') {
            setSortBy((prev) => (prev === 'dob_desc' ? 'dob_asc' : 'dob_desc'));
        } else if (field === 'visits') {
            setSortBy((prev) => (prev === 'visits_desc' ? 'visits_asc' : 'visits_desc'));
        }
    };

    return (
        <AuthenticatedLayout title="Clients & Patients">
            <Head title="Clients & Patients — UMAHZ" />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header & Primary Action */}
                <PageHeader
                    category="CLINIC • DIRECTORY"
                    title="Clients & Patients"
                    subtitle="Manage registered patient profiles, communication preferences, and care records."
                    actions={
                        <GlassButton
                            variant="primary"
                            icon={Plus}
                            onClick={openCreateModal}
                        >
                            New Client
                        </GlassButton>
                    }
                />

                {/* Success Banner */}
                {flash?.success && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 text-sm font-semibold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Error banner if deletion blocked */}
                {errors?.client && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Action restricted</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{errors.client}</p>
                        </div>
                    </div>
                )}

                {/* 1. Quick Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {computedStats.total}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Total Clients
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {computedStats.active}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Active Patients
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-500/15 border border-slate-500/20 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-inner">
                            <UserX className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {computedStats.inactive}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Inactive
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {computedStats.new_this_month}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                New This Month
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5 col-span-2 sm:col-span-1">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                            <CalendarCheck2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                {computedStats.upcoming_appointments}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                Upcoming Visits
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* 2. Main GlassCard Container: Search, Filters & Table */}
                <GlassCard className="p-0 sm:p-0 overflow-hidden">
                    {/* Search and Filters Bar */}
                    <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/[0.08] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative w-full lg:w-96">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <GlassInput
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by patient name, email, or phone..."
                                className="pl-10"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Right side: Filter Tabs + Sort Dropdown */}
                        <div className="flex flex-wrap items-center gap-3">
                            <Tabs
                                tabs={filterTabs}
                                activeTab={statusFilter}
                                onChange={setStatusFilter}
                            />

                            {/* Sort Selector */}
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    aria-label="Sort clients by"
                                    className="pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 backdrop-blur-md appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-purple-500/20"
                                >
                                    <option value="name_asc">Sort: Name (A-Z)</option>
                                    <option value="name_desc">Sort: Name (Z-A)</option>
                                    <option value="dob_desc">Sort: Oldest First</option>
                                    <option value="dob_asc">Sort: Youngest First</option>
                                    <option value="visits_desc">Sort: Most Visits</option>
                                    <option value="visits_asc">Sort: Least Visits</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Table or Empty States */}
                    {paginatedClients.length > 0 ? (
                        <>
                            <GlassTable>
                                <GlassThead>
                                    <tr>
                                        <GlassTh className="pl-6">
                                            <button
                                                type="button"
                                                onClick={() => handleSortHeader('name')}
                                                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <span>Client Name</span>
                                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </button>
                                        </GlassTh>
                                        <GlassTh>Contact Details</GlassTh>
                                        <GlassTh>
                                            <button
                                                type="button"
                                                onClick={() => handleSortHeader('dob')}
                                                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <span>Date of Birth</span>
                                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </button>
                                        </GlassTh>
                                        <GlassTh>Preferred Contact</GlassTh>
                                        <GlassTh>Status</GlassTh>
                                        <GlassTh align="right" className="pr-6">Actions</GlassTh>
                                    </tr>
                                </GlassThead>
                                <GlassTbody>
                                    {paginatedClients.map((client) => {
                                        const displayName = getClientDisplayName(client);
                                        const initials = ((client.first_name?.[0] || '') + (client.last_name?.[0] || '')).toUpperCase() || 'P';
                                        const age = calculateAge(client.date_of_birth);

                                        // Actions menu items
                                        const menuItems = [
                                            {
                                                label: 'View Profile',
                                                icon: Eye,
                                                href: `/app/clients/${client.id}`,
                                                title: `View ${displayName}'s profile`,
                                            },
                                            {
                                                label: 'Edit Details',
                                                icon: Pencil,
                                                onClick: () => openEditModal(client),
                                                title: `Edit ${displayName}'s details`,
                                            },
                                            {
                                                label: client.is_active ? 'Deactivate Client' : 'Reactivate Client',
                                                icon: Power,
                                                onClick: () => handleToggle(client),
                                                title: client.is_active ? 'Deactivate client account' : 'Reactivate client account',
                                            },
                                            {
                                                label: 'Delete Record',
                                                icon: Trash2,
                                                danger: true,
                                                onClick: () => setDeleteTargetClient(client),
                                                title: `Delete ${displayName}`,
                                            },
                                        ];

                                        return (
                                            <GlassTr
                                                key={client.id}
                                                onClick={() => router.visit(`/app/clients/${client.id}`)}
                                                className="group cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                                            >
                                                {/* Client Name + Avatar + Visits */}
                                                <GlassTd className="pl-6 font-medium">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-white/20">
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/app/clients/${client.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate block"
                                                            >
                                                                {displayName}
                                                            </Link>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                {client.appointments_count > 0 ? (
                                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                                        <Calendar className="w-3 h-3 text-purple-500" />
                                                                        {client.appointments_count} {client.appointments_count === 1 ? 'visit' : 'visits'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="italic text-slate-400 dark:text-slate-500">No visits yet</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </GlassTd>

                                                {/* Contact Details (Email & Phone) */}
                                                <GlassTd>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        {client.email ? (
                                                            <span className="truncate max-w-[190px]">{client.email}</span>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 mt-1">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        {client.phone ? (
                                                            <span>{client.phone}</span>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>
                                                        )}
                                                    </div>
                                                </GlassTd>

                                                {/* Date of Birth & Age */}
                                                <GlassTd>
                                                    {client.date_of_birth ? (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                            <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                                            <span>{client.date_of_birth}</span>
                                                            {age !== null && (
                                                                <span className="ml-1 px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                                                                    {age}y
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Not set</span>
                                                    )}
                                                </GlassTd>

                                                {/* Preferred Contact Channel */}
                                                <GlassTd>
                                                    <PreferredContactBadge method={client.preferred_contact_method} />
                                                </GlassTd>

                                                {/* Status Badge */}
                                                <GlassTd>
                                                    <StatusBadge
                                                        status={client.is_active ? 'active' : 'inactive'}
                                                        label={client.is_active ? 'Active' : 'Inactive'}
                                                    />
                                                </GlassTd>

                                                {/* Actions Column: Labeled Tooltip buttons + Kebab Menu */}
                                                <GlassTd align="right" className="pr-6">
                                                    <div
                                                        className="flex items-center justify-end gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {/* View Profile */}
                                                        <Link
                                                            href={`/app/clients/${client.id}`}
                                                            title={`View ${displayName}'s profile`}
                                                            aria-label={`View ${displayName}'s profile`}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>

                                                        {/* Edit Client */}
                                                        <button
                                                            type="button"
                                                            title={`Edit ${displayName}'s details`}
                                                            aria-label={`Edit ${displayName}'s details`}
                                                            onClick={() => openEditModal(client)}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>

                                                        {/* Toggle Active / Deactivate */}
                                                        <button
                                                            type="button"
                                                            title={client.is_active ? `Deactivate ${displayName}` : `Reactivate ${displayName}`}
                                                            aria-label={client.is_active ? `Deactivate ${displayName}` : `Reactivate ${displayName}`}
                                                            onClick={() => handleToggle(client)}
                                                            className={`p-2 rounded-xl transition-colors ${
                                                                client.is_active
                                                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-500/10'
                                                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10'
                                                            }`}
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>

                                                        {/* Actions Kebab Menu for extra actions & Guarded Delete */}
                                                        <ActionsMenu
                                                            items={menuItems}
                                                            ariaLabel={`More actions for ${displayName}`}
                                                        />
                                                    </div>
                                                </GlassTd>
                                            </GlassTr>
                                        );
                                    })}
                                </GlassTbody>
                            </GlassTable>

                            {/* 5. Pagination & Showing X of Y count */}
                            <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <div>
                                    Showing <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {Math.min(currentPage * pageSize, totalCount)}
                                    </span>{' '}
                                    of <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> registered client{totalCount === 1 ? '' : 's'}
                                    {search && <span> (filtered)</span>}
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            aria-label="Previous page"
                                            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/10 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                                            // Show first, last, and pages around current
                                            if (
                                                pg === 1 ||
                                                pg === totalPages ||
                                                Math.abs(pg - currentPage) <= 1
                                            ) {
                                                const isCurrent = pg === currentPage;
                                                return (
                                                    <button
                                                        key={pg}
                                                        type="button"
                                                        onClick={() => setCurrentPage(pg)}
                                                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-colors ${
                                                            isCurrent
                                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                                                                : 'border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {pg}
                                                    </button>
                                                );
                                            }
                                            if (
                                                (pg === 2 && currentPage > 3) ||
                                                (pg === totalPages - 1 && currentPage < totalPages - 2)
                                            ) {
                                                return <span key={pg} className="px-1 text-slate-400">...</span>;
                                            }
                                            return null;
                                        })}

                                        <button
                                            type="button"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            aria-label="Next page"
                                            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-white/10 transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                icon={Users}
                                title={search ? 'No clients match your search' : 'Add your first client'}
                                description={
                                    search
                                        ? `No patient records found matching "${search}". Try checking for spelling errors or clear your search.`
                                        : 'Get started by creating your clinic’s first patient profile to manage intake forms, clinical charts, and bookings.'
                                }
                                action={
                                    search ? (
                                        <GlassButton variant="secondary" onClick={() => setSearch('')}>
                                            Clear search
                                        </GlassButton>
                                    ) : (
                                        <GlassButton variant="primary" icon={Plus} onClick={openCreateModal}>
                                            New Client
                                        </GlassButton>
                                    )
                                }
                            />
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Create / Edit Client Modal */}
            {isModalOpen && (
                <ClientModal
                    client={modalClient}
                    onClose={() => {
                        setIsModalOpen(false);
                        setModalClient(null);
                    }}
                />
            )}

            {/* Confirm Delete / Deactivate Guarded Modal */}
            {deleteTargetClient && (
                <ConfirmDeleteModal
                    client={deleteTargetClient}
                    onClose={() => setDeleteTargetClient(null)}
                    onDeactivate={handleToggle}
                    onDelete={handleDelete}
                />
            )}
        </AuthenticatedLayout>
    );
}
