import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    History, Search, Filter, Calendar, Users, Building2,
    Shield, Code2, ChevronLeft, ChevronRight, Eye, RefreshCw
} from 'lucide-react';

export default function AuditLogsIndex({ events, filters = {}, adminUsers = [] }) {
    const [action, setAction] = useState(filters.action || '');
    const [category, setCategory] = useState(filters.category || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [selectedEvent, setSelectedEvent] = useState(null);

    const handleFilterSubmit = (e) => {
        if (e) e.preventDefault();
        router.get('/admin/audit-logs', {
            action: action || undefined,
            category: category || undefined,
            user_id: userId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setAction('');
        setCategory('');
        setUserId('');
        setDateFrom('');
        setDateTo('');
        router.get('/admin/audit-logs', {}, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout title="Platform Audit Trail">
            <Head title="Admin — Platform Audit Logs" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-normal leading-tight">System & Platform Audit Logs</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Immutable record of all platform admin actions, pricing updates, feature alterations, and clinic overrides.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 mb-6 shadow-lg">
                <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="lg:col-span-2">
                        <label className="block text-slate-400 mb-1">Action Name</label>
                        <input
                            type="text"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            placeholder="e.g. plan.* or promo_code"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                        >
                            <option value="">All Categories</option>
                            <option value="billing">Billing & Plans</option>
                            <option value="clinics">Clinics & Overrides</option>
                            <option value="settings">Platform Settings</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 mb-1">Admin User</label>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                        >
                            <option value="">All Admins</option>
                            {adminUsers.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-400 mb-1">From Date</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg transition-colors"
                        >
                            Filter
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2 rounded-lg transition-colors"
                            title="Reset filters"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {/* Audit Events Table */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th className="py-3.5 px-6">Timestamp</th>
                                <th className="py-3.5 px-4">Action</th>
                                <th className="py-3.5 px-4">Actor</th>
                                <th className="py-3.5 px-4">Clinic / Scope</th>
                                <th className="py-3.5 px-4">Metadata Preview</th>
                                <th className="py-3.5 px-6 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                            {events.data.map((event) => (
                                <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3.5 px-6 whitespace-nowrap">
                                        <div className="text-white font-medium">{event.time_ago}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{event.created_at}</div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-block px-2.5 py-1 rounded font-mono text-[11px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                            {event.action}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        {event.user ? (
                                            <div>
                                                <div className="text-white font-semibold">{event.user.name}</div>
                                                <div className="text-[10px] text-slate-500">{event.user.email}</div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500 italic">System Event</span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        {event.tenant ? (
                                            <div>
                                                <div className="text-white font-medium">{event.tenant.name}</div>
                                                <div className="text-[10px] text-slate-500">{event.tenant.subdomain}.umahz.com</div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">Global / Platform</span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4 max-w-xs truncate font-mono text-[11px] text-slate-400">
                                        {event.metadata ? JSON.stringify(event.metadata) : '—'}
                                    </td>
                                    <td className="py-3.5 px-6 text-right">
                                        <button
                                            onClick={() => setSelectedEvent(event)}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                            title="View Full Event Details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {events.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                                        No audit events found matching the specified criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {events.links && events.links.length > 3 && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <div>
                        Showing <strong>{events.from || 0}</strong> to <strong>{events.to || 0}</strong> of <strong>{events.total}</strong> events
                    </div>
                    <div className="flex items-center gap-1">
                        {events.links.map((link, idx) => (
                            <button
                                key={idx}
                                disabled={!link.url || link.active}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    link.active
                                        ? 'bg-violet-600 text-white'
                                        : link.url
                                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                        : 'opacity-40 cursor-not-allowed bg-slate-950 text-slate-600'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-violet-400" />
                                <h3 className="text-base font-bold text-white">Audit Event Details</h3>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-slate-300">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-0.5">Action:</span>
                                <span className="font-mono text-violet-300 font-bold">{selectedEvent.action}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Timestamp:</span>
                                <span className="text-white font-mono">{selectedEvent.created_at}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Actor:</span>
                                <span className="text-white">
                                    {selectedEvent.user ? `${selectedEvent.user.name} (${selectedEvent.user.email})` : 'System'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">IP Address:</span>
                                <span className="font-mono text-slate-300">{selectedEvent.ip_address || '—'}</span>
                            </div>
                            {selectedEvent.tenant && (
                                <div className="col-span-2">
                                    <span className="text-slate-400 block mb-0.5">Clinic Scope:</span>
                                    <span className="text-white">
                                        {selectedEvent.tenant.name} ({selectedEvent.tenant.subdomain}.umahz.com)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <span className="text-slate-400 block mb-1 text-xs">Full Metadata & Payload:</span>
                            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
                                {JSON.stringify(selectedEvent.metadata, null, 2)}
                            </pre>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
