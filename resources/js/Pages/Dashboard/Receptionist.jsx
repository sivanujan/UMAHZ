import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Sparkles, ClipboardList, Clock, CreditCard, User } from 'lucide-react';

const QUEUE_STYLES = {
    'Waiting': 'bg-amber-50 text-amber-700 border-amber-200',
    'Not Arrived': 'bg-slate-100 text-slate-500 border-slate-200',
    'Checked In': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ReceptionistDashboard({ checkInQueue, todaysSchedule, balancesDue }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    return (
        <AuthenticatedLayout title="Front Desk Dashboard">
            <Head title="Dashboard" />

            <div className="bg-gradient-to-r from-violet-900 via-violet-800 to-slate-900 rounded-2xl p-6 text-white shadow-md mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Front Desk Workspace</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
                    <p className="text-slate-300 text-sm mt-1">
                        Here is today's check-in queue for <span className="font-semibold text-white">{tenant?.name || 'Your Clinic'}</span>.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50/50">
                        <ClipboardList className="w-4 h-4 text-violet-700" />
                        <h2 className="font-semibold text-slate-800 text-sm">Check-In Queue</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {checkInQueue && checkInQueue.length > 0 ? checkInQueue.map((c, i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{c.client_name}</p>
                                    <p className="text-xs text-slate-500">{c.time}</p>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${QUEUE_STYLES[c.status] || QUEUE_STYLES['Not Arrived']}`}>
                                    {c.status}
                                </span>
                            </div>
                        )) : (
                            <div className="p-6 text-center text-slate-400 text-xs">No one in queue.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50/50">
                        <Clock className="w-4 h-4 text-violet-700" />
                        <h2 className="font-semibold text-slate-800 text-sm">Today's Schedule</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {todaysSchedule && todaysSchedule.length > 0 ? todaysSchedule.map((s, i) => (
                            <div key={i} className="p-4">
                                <div className="flex items-center space-x-2">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <p className="text-sm font-medium text-slate-900">{s.client_name}</p>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{s.practitioner} · {s.room}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{s.time}</p>
                            </div>
                        )) : (
                            <div className="p-6 text-center text-slate-400 text-xs">Nothing scheduled today.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50/50">
                        <CreditCard className="w-4 h-4 text-rose-600" />
                        <h2 className="font-semibold text-slate-800 text-sm">Balances Due</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {balancesDue && balancesDue.length > 0 ? balancesDue.map((b, i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <p className="text-sm text-slate-700">{b.client_name}</p>
                                <p className="text-sm font-bold text-slate-900">{b.amount}</p>
                            </div>
                        )) : (
                            <div className="p-6 text-center text-slate-400 text-xs">No balances due.</div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
