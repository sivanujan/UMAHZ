import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Calendar, Users, Building, DollarSign, Sparkles, ReceiptText, UserCog } from 'lucide-react';

const AVAILABILITY_STYLES = {
    'Available': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Session': 'bg-amber-50 text-amber-700 border-amber-200',
    'Off Today': 'bg-stone-100 text-stone-500 border-stone-200',
};

export default function OwnerDashboard({ stats, outstandingInvoices, staff }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    return (
        <AuthenticatedLayout title="Owner Dashboard">
            <Head title="Dashboard" />

            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 rounded-2xl p-6 text-white shadow-md mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Multi-Tenant Practice Workspace</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
                    <p className="text-stone-300 text-sm mt-1">
                        Here is today's business overview for <span className="font-semibold text-white">{tenant?.name || 'Your Clinic'}</span>.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Today's Appointments</p>
                        <h3 className="text-2xl font-bold text-stone-900 mt-1">{stats?.todayAppointments || 0}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Active Clients</p>
                        <h3 className="text-2xl font-bold text-stone-900 mt-1">{stats?.totalClients || 0}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Clinic Locations</p>
                        <h3 className="text-2xl font-bold text-stone-900 mt-1">{stats?.activeLocations || 0}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Building className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Revenue (MTD)</p>
                        <h3 className="text-2xl font-bold text-stone-900 mt-1">{stats?.monthlyRevenue || '$0'}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100 flex items-center space-x-2 bg-stone-50/50">
                        <ReceiptText className="w-4 h-4 text-rose-600" />
                        <h2 className="font-semibold text-stone-800 text-base">Outstanding Invoices</h2>
                    </div>
                    <div className="divide-y divide-stone-100">
                        {outstandingInvoices && outstandingInvoices.length > 0 ? outstandingInvoices.map((inv, i) => (
                            <div key={i} className="p-5 flex items-center justify-between">
                                <p className="text-sm font-medium text-stone-900">{inv.client}</p>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-stone-900">{inv.amount}</p>
                                    <p className="text-xs text-stone-500">{inv.due}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-stone-500 text-sm">No outstanding invoices.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100 flex items-center space-x-2 bg-stone-50/50">
                        <UserCog className="w-4 h-4 text-teal-700" />
                        <h2 className="font-semibold text-stone-800 text-base">Staff Availability</h2>
                    </div>
                    <div className="divide-y divide-stone-100">
                        {staff && staff.length > 0 ? staff.map((s, i) => (
                            <div key={i} className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-stone-900">{s.name}</p>
                                    <p className="text-xs text-stone-500 capitalize">{s.role.replace('_', ' ')}</p>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${AVAILABILITY_STYLES[s.availability]}`}>
                                    {s.availability}
                                </span>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-stone-500 text-sm">No staff yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
