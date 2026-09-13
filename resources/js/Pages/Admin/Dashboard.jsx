import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Building2, Users, UserSquare2, ShieldCheck, AlertTriangle,
    Trash2, ExternalLink, Search, ArrowRight, Loader2, CheckCircle2,
    AlertCircle, DollarSign, TrendingUp, CreditCard, Sparkles
} from 'lucide-react';

const STATUS_CONFIG = {
    approved: {
        label: 'Approved',
        badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        dot: 'bg-emerald-400',
    },
    pending_review: {
        label: 'Pending Review',
        badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        dot: 'bg-violet-400',
    },
    needs_more_info: {
        label: 'Needs Info',
        badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        dot: 'bg-amber-400',
    },
    suspended: {
        label: 'Suspended',
        badge: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        dot: 'bg-slate-400',
    },
    rejected: {
        label: 'Rejected',
        badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        dot: 'bg-rose-400',
    },
};

export default function AdminDashboard({ stats, tenants = [] }) {
    const { flash, errors } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deletingTenant, setDeletingTenant] = useState(null);
    const [confirmName, setConfirmName] = useState('');
    const [processing, setProcessing] = useState(false);

    // Format money helper
    const formatMoney = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    // Filter and search tenants
    const filteredTenants = useMemo(() => {
        return tenants.filter((tenant) => {
            const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                tenant.name?.toLowerCase().includes(q) ||
                tenant.slug?.toLowerCase().includes(q) ||
                tenant.subdomain?.toLowerCase().includes(q) ||
                tenant.primary_contact_name?.toLowerCase().includes(q) ||
                tenant.primary_contact_email?.toLowerCase().includes(q) ||
                tenant.plan_name?.toLowerCase().includes(q);

            return matchesStatus && matchesSearch;
        });
    }, [tenants, statusFilter, searchQuery]);

    const handleDelete = (e) => {
        e.preventDefault();
        if (!deletingTenant) return;

        setProcessing(true);
        router.delete(`/admin/clinics/${deletingTenant.id}`, {
            data: { confirmation: confirmName },
            preserveScroll: true,
            onSuccess: () => {
                setDeletingTenant(null);
                setConfirmName('');
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <AdminLayout title="Platform Overview & Revenue">
            <Head title="Platform Dashboard" />

            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center gap-3 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}

            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        {Object.values(errors).map((err, i) => (
                            <p key={i} className="font-medium">{err}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* Platform Financial & Operational Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Total Clinics */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Clinics</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats?.totalTenants ?? tenants.length}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                            <span className="text-emerald-400 font-semibold">{stats?.activeTenants ?? 0}</span> active
                            {stats?.pendingTenants ? ` · ${stats.pendingTenants} pending` : ''}
                        </p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Platform Subscription MRR */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Platform MRR (Earnings)</p>
                        <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                            {formatMoney(stats?.totalMrr ?? 0)}
                            <span className="text-xs font-normal text-slate-400">/mo</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                            ARR: <span className="text-slate-200 font-medium">{formatMoney(stats?.totalArr ?? 0)}</span>
                        </p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>

                {/* Patient Payments Volume (Clinic Earnings) */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Clinics Patient Earnings</p>
                        <h3 className="text-2xl font-bold text-sky-400 mt-1">
                            {formatMoney(stats?.totalPatientGrossVolume ?? 0)}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">Total patient billings processed</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>

                {/* Staff & Clients Total */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Network</p>
                        <h3 className="text-2xl font-bold text-amber-400 mt-1">
                            {stats?.totalClients ?? 0}
                            <span className="text-xs font-normal text-slate-400"> patients</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                            <span className="text-slate-200 font-medium">{stats?.totalStaff ?? 0}</span> practitioners & staff
                        </p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Clinics Management & Financials Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold text-white text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-violet-400" />
                            All Clinics & Financial Breakdown
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Track subscription earnings, patient payment revenue, and workspace data for each clinic.
                        </p>
                    </div>

                    {/* Search bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search clinic, plan, contact..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="px-5 py-2.5 bg-slate-950/30 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
                    {['all', 'approved', 'pending_review', 'needs_more_info', 'suspended', 'rejected'].map((st) => {
                        const count = st === 'all'
                            ? tenants.length
                            : tenants.filter((t) => t.status === st).length;
                        const label = st === 'all' ? 'All Clinics' : (STATUS_CONFIG[st]?.label || st);
                        const isActive = statusFilter === st;

                        return (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                            >
                                <span>{label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isActive ? 'bg-violet-700 text-violet-100' : 'bg-slate-800 text-slate-400'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Clinics Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/40">
                                <th className="py-3 px-6">Clinic / Workspace</th>
                                <th className="py-3 px-6">Status</th>
                                <th className="py-3 px-6">Plan & Platform Fee</th>
                                <th className="py-3 px-6">Clinic Patient Earnings</th>
                                <th className="py-3 px-6">Staff / Patients</th>
                                <th className="py-3 px-6">Created</th>
                                <th className="py-3 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {filteredTenants.length > 0 ? (
                                filteredTenants.map((t) => {
                                    const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.approved;
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-800/40 transition-colors group">
                                            {/* Clinic name & URL */}
                                            <td className="py-4 px-6">
                                                <div className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                                                    {t.name}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-slate-400">
                                                        {t.subdomain || t.slug}
                                                    </span>
                                                    {t.app_url && (
                                                        <a
                                                            href={t.app_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-slate-500 hover:text-slate-300 inline-flex items-center"
                                                            title="Open clinic workspace"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                    {statusCfg.label}
                                                </span>
                                            </td>

                                            {/* Subscription Plan & Monthly Platform Revenue */}
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-slate-200 text-xs flex items-center gap-1">
                                                    <CreditCard className="w-3.5 h-3.5 text-violet-400" />
                                                    {t.plan_name || 'Practice Plan'}
                                                </div>
                                                <div className="text-xs font-bold text-emerald-400 mt-0.5">
                                                    {formatMoney(t.monthly_billable, t.currency)}
                                                    <span className="text-[10px] text-slate-500 font-normal"> /mo</span>
                                                </div>
                                            </td>

                                            {/* Total Patient Earnings Collected */}
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-sky-400 text-sm">
                                                    {formatMoney(t.patient_earnings, t.currency)}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Patient billing volume
                                                </div>
                                            </td>

                                            {/* Staff / Patients */}
                                            <td className="py-4 px-6 text-slate-300 text-xs">
                                                <div>
                                                    <span className="font-medium text-white">{t.staff_memberships_count ?? 0}</span> staff
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    <span className="font-medium text-slate-400">{t.clients_count ?? 0}</span> patients
                                                </div>
                                            </td>

                                            {/* Created date */}
                                            <td className="py-4 px-6 text-slate-400 text-xs">
                                                {t.created_at || '—'}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/clinics/${t.id}`}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-400 hover:text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        Manage <ArrowRight className="w-3 h-3" />
                                                    </Link>

                                                    <button
                                                        onClick={() => {
                                                            setDeletingTenant(t);
                                                            setConfirmName('');
                                                        }}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                                                        title={`Remove ${t.name}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-500 text-sm">
                                        <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                        <p className="font-medium text-slate-400">No clinics found</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {searchQuery ? 'Try adjusting your search query' : 'No clinics match the selected status'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Permanent Deletion Confirmation Modal */}
            {deletingTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center gap-3 text-rose-400 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">Remove Clinic Workspace</h3>
                                <p className="text-xs text-rose-300">Permanent and Irreversible Action</p>
                            </div>
                        </div>

                        <div className="my-4 text-xs text-slate-300 space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                            <p>
                                You are about to permanently remove{' '}
                                <strong className="text-white font-semibold">{deletingTenant.name}</strong>{' '}
                                (<span className="font-mono text-violet-400">{deletingTenant.slug}</span>).
                            </p>
                            <p className="text-slate-400">
                                This will completely wipe all associated workspace data, including:
                            </p>
                            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                                <li>Staff memberships and practitioner profiles</li>
                                <li>Client records, intake forms & medical notes</li>
                                <li>Appointments, calendars, and schedules</li>
                                <li>Billing history, invoices, and payment configurations</li>
                            </ul>
                        </div>

                        <form onSubmit={handleDelete}>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Type <span className="font-semibold text-white">"{deletingTenant.name}"</span> to confirm:
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={confirmName}
                                onChange={(e) => setConfirmName(e.target.value)}
                                placeholder={deletingTenant.name}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 mb-5"
                            />

                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={confirmName.trim() !== deletingTenant.name || processing}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Deleting Clinic...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Permanently Remove Clinic
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeletingTenant(null);
                                        setConfirmName('');
                                    }}
                                    disabled={processing}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
