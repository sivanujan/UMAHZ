import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Ban, Search, ShieldAlert, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function BlockedEmailsIndex({ blockedEmails = [] }) {
    const [search, setSearch] = useState('');
    const [unbanTarget, setUnbanTarget] = useState(null);
    const [unbanReason, setUnbanReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const filtered = blockedEmails.filter((item) => {
        const query = search.toLowerCase();
        return (
            item.email.toLowerCase().includes(query) ||
            item.reason?.toLowerCase().includes(query) ||
            item.tenant_name?.toLowerCase().includes(query) ||
            item.business_registration_number?.toLowerCase().includes(query) ||
            item.phone?.toLowerCase().includes(query)
        );
    });

    const handleUnban = (e) => {
        e.preventDefault();
        if (!unbanTarget || !unbanReason.trim()) return;

        setProcessing(true);
        setError(null);

        router.post(
            `/admin/blocked-emails/${unbanTarget.id}/unban`,
            { reason: unbanReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUnbanTarget(null);
                    setUnbanReason('');
                    setProcessing(false);
                },
                onError: (errs) => {
                    setError(errs.reason || 'Failed to unban applicant.');
                    setProcessing(false);
                },
            }
        );
    };

    return (
        <AdminLayout title="Blocked Applicants">
            <Head title="Blocked Applicants — Platform Admin" />

            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Ban className="w-5 h-5 text-rose-500" />
                            <span>Blocked Applicants</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Emails prevented from submitting clinic registration applications. Unbanning allows the applicant to submit again.
                        </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search email, reason, clinic..."
                            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    {filtered.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 space-y-2">
                            <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto" />
                            <p className="text-sm font-medium text-slate-400">No blocked applicants found</p>
                            <p className="text-xs text-slate-500">
                                {search ? 'Try clearing your search query' : 'Applications rejected permanently or after max attempts will appear here'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                                        <th className="py-3 px-4">Applicant Email</th>
                                        <th className="py-3 px-4">Associated Clinic</th>
                                        <th className="py-3 px-4">Reason</th>
                                        <th className="py-3 px-4">Blocked By</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {filtered.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-white">{item.email}</span>
                                                {(item.phone || item.business_registration_number) && (
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {[item.business_registration_number ? `Reg: ${item.business_registration_number}` : null, item.phone].filter(Boolean).join(' · ')}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-300">
                                                {item.tenant_name}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs text-slate-300 leading-snug">
                                                <span className="line-clamp-2">{item.reason}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400">
                                                {item.blocked_by_name}
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                                <span>{item.created_at}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setUnbanTarget(item);
                                                        setUnbanReason('');
                                                        setError(null);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                                                >
                                                    Unban
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Unban Modal */}
            {unbanTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-emerald-400" />
                                <span>Unban Applicant</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                This will lift the block for <strong className="text-white">{unbanTarget.email}</strong> and allow them to register again.
                            </p>
                        </div>

                        <form onSubmit={handleUnban} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Reason for Unbanning <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    value={unbanReason}
                                    onChange={(e) => setUnbanReason(e.target.value)}
                                    placeholder="Explain why this applicant is being unbanned (required for audit log)..."
                                    required
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                                {error && (
                                    <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>{error}</span>
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setUnbanTarget(null)}
                                    disabled={processing}
                                    className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !unbanReason.trim()}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Unbanning...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" /> Confirm Unban
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
