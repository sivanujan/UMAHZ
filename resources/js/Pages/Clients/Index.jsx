import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Users, Plus, Search, Mail, Phone, Calendar, Pencil, Power,
    Trash2, Eye, X, Check, AlertCircle, ShieldAlert, HeartHandshake
} from 'lucide-react';

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

function ClientModal({ client, onClose }) {
    const editing = Boolean(client);

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        first_name: client?.first_name || '',
        last_name: client?.last_name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        date_of_birth: client?.date_of_birth || '',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--umahz-text-primary)' }}>
                            {editing ? 'Edit Client' : 'Add New Client'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {editing ? 'Update client contact and basic details' : 'Register a new patient or client in this clinic'}
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

                <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                First Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                                placeholder="Jane"
                                required
                                autoFocus
                            />
                            {errors.first_name && <p className="text-xs mt-1 text-rose-500">{errors.first_name}</p>}
                        </div>

                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Last Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                                placeholder="Doe"
                                required
                            />
                            {errors.last_name && <p className="text-xs mt-1 text-rose-500">{errors.last_name}</p>}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="jane.doe@example.com"
                            />
                            {errors.email && <p className="text-xs mt-1 text-rose-500">{errors.email}</p>}
                        </div>

                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="+1 (555) 234-5678"
                            />
                            {errors.phone && <p className="text-xs mt-1 text-rose-500">{errors.phone}</p>}
                        </div>
                    </div>

                    {/* Demographics & Preferences */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.date_of_birth}
                                onChange={(e) => setData('date_of_birth', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            {errors.date_of_birth && <p className="text-xs mt-1 text-rose-500">{errors.date_of_birth}</p>}
                        </div>

                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                Preferred Contact
                            </label>
                            <select
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.preferred_contact_method}
                                onChange={(e) => setData('preferred_contact_method', e.target.value)}
                            >
                                <option value="email">Email</option>
                                <option value="phone">Phone Call</option>
                                <option value="sms">SMS / Text</option>
                            </select>
                            {errors.preferred_contact_method && (
                                <p className="text-xs mt-1 text-rose-500">{errors.preferred_contact_method}</p>
                            )}
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <HeartHandshake className="w-4 h-4 text-violet-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Emergency Contact (Optional)
                            </h3>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                        Contact Name
                                    </label>
                                    <input
                                        className={fieldClass}
                                        style={fieldStyle}
                                        value={data.emergency_contact_name}
                                        onChange={(e) => setData('emergency_contact_name', e.target.value)}
                                        placeholder="John Doe"
                                    />
                                    {errors.emergency_contact_name && (
                                        <p className="text-xs mt-1 text-rose-500">{errors.emergency_contact_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                        Relationship
                                    </label>
                                    <input
                                        className={fieldClass}
                                        style={fieldStyle}
                                        value={data.emergency_contact_relationship}
                                        onChange={(e) => setData('emergency_contact_relationship', e.target.value)}
                                        placeholder="Spouse / Parent / Sibling"
                                    />
                                    {errors.emergency_contact_relationship && (
                                        <p className="text-xs mt-1 text-rose-500">{errors.emergency_contact_relationship}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>
                                    Emergency Phone
                                </label>
                                <input
                                    type="tel"
                                    className={fieldClass}
                                    style={fieldStyle}
                                    value={data.emergency_contact_phone}
                                    onChange={(e) => setData('emergency_contact_phone', e.target.value)}
                                    placeholder="+1 (555) 987-6543"
                                />
                                {errors.emergency_contact_phone && (
                                    <p className="text-xs mt-1 text-rose-500">{errors.emergency_contact_phone}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[var(--umahz-hover)] text-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-violet-800 hover:bg-violet-900 transition shadow-sm disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : editing ? 'Save Changes' : 'Create Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ClientsIndex({ clients = [], filters = {} }) {
    const { errors, flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [modalClient, setModalClient] = useState(null); // null = closed, {} = new, client obj = edit
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        if (confirm(`Are you sure you want to remove client "${client.name}"?`)) {
            router.delete(`/app/clients/${client.id}`, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout title="Client Directory">
            <Head title="Clients" />

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-800" />
                        Client Directory
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage patient contact profiles, status, and communication details.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center px-4 py-2 bg-violet-800 hover:bg-violet-900 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Client
                </button>
            </div>

            {/* Error banner if deletion blocked */}
            {errors?.client && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Action restricted</p>
                        <p className="text-xs text-amber-700 mt-0.5">{errors.client}</p>
                    </div>
                </div>
            )}

            {/* Main Table Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Search and Filters bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, or phone..."
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-violet-600 focus:border-violet-600 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-stretch sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${statusFilter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All ({clients.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${statusFilter === 'active' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${statusFilter === 'inactive' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="py-3 px-6">Client Name</th>
                                <th className="py-3 px-6">Contact Info</th>
                                <th className="py-3 px-6">Date of Birth</th>
                                <th className="py-3 px-6">Preferred Contact</th>
                                <th className="py-3 px-6">Status</th>
                                <th className="py-3 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {clients && clients.length > 0 ? (
                                clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-4 px-6 font-medium text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {client.first_name?.[0]}{client.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/app/clients/${client.id}`}
                                                        className="hover:text-violet-800 transition font-semibold text-slate-900 flex items-center gap-1.5"
                                                    >
                                                        {client.name}
                                                    </Link>
                                                    {client.appointments_count > 0 && (
                                                        <span className="text-[11px] text-slate-400">
                                                            {client.appointments_count} {client.appointments_count === 1 ? 'appointment' : 'appointments'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            <div className="flex items-center space-x-1.5">
                                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[180px]">{client.email || '—'}</span>
                                            </div>
                                            <div className="flex items-center space-x-1.5 mt-1">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{client.phone || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600">
                                            {client.date_of_birth ? (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {client.date_of_birth}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600 capitalize">
                                            {client.preferred_contact_method || 'Email'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusPill active={client.is_active} />
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/app/clients/${client.id}`}
                                                    title="View Profile"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-800 hover:bg-violet-50 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    title="Edit Client"
                                                    onClick={() => openEditModal(client)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-800 hover:bg-violet-50 transition"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    title={client.is_active ? 'Deactivate Client' : 'Reactivate Client'}
                                                    onClick={() => handleToggle(client)}
                                                    className={`p-1.5 rounded-lg transition ${client.is_active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Delete Client"
                                                    onClick={() => handleDelete(client)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-400 text-sm">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="font-medium text-slate-600">No clients found</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {search ? 'Try clearing your search query' : 'Get started by adding a new client above'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Client Modal */}
            {isModalOpen && (
                <ClientModal
                    client={modalClient}
                    onClose={() => {
                        setIsModalOpen(false);
                        setModalClient(null);
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}
