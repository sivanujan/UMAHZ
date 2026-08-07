import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Building2, Users, UserSquare2, ShieldCheck } from 'lucide-react';

export default function AdminDashboard({ stats, tenants }) {
    return (
        <AdminLayout title="Platform Overview">
            <Head title="Admin Dashboard" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tenants</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats.totalTenants}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Tenants</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats.activeTenants}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Staff</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats.totalStaff}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                        <UserSquare2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Clients</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stats.totalClients}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="font-semibold text-white text-base">Recent Tenants</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="py-3 px-6">Clinic</th>
                                <th className="py-3 px-6">Staff</th>
                                <th className="py-3 px-6">Clients</th>
                                <th className="py-3 px-6">Currency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {tenants && tenants.length > 0 ? (
                                tenants.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-white">{t.name}</div>
                                            <div className="text-xs text-slate-500">{t.slug}</div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-300">{t.staff_memberships_count}</td>
                                        <td className="py-4 px-6 text-slate-300">{t.clients_count}</td>
                                        <td className="py-4 px-6 text-slate-400">{t.currency}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">
                                        No tenants yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
