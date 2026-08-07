import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Clock, CheckCircle2, User, Sparkles, FileWarning, ShieldAlert } from 'lucide-react';

export default function PractitionerDashboard({ appointments, unsignedNotes, formAlerts }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    return (
        <AuthenticatedLayout title="Practitioner Dashboard">
            <Head title="Dashboard" />

            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 rounded-2xl p-6 text-white shadow-md mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Multi-Tenant Practice Workspace</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
                    <p className="text-stone-300 text-sm mt-1">
                        Here is today's schedule for <span className="font-semibold text-white">{tenant?.name || 'Your Clinic'}</span>.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-teal-700" />
                            <h2 className="font-semibold text-stone-800 text-base">Today's Appointments</h2>
                        </div>
                        <span className="text-xs font-medium text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                            {tenant?.timezone || 'America/New_York'}
                        </span>
                    </div>

                    <div className="divide-y divide-stone-100">
                        {appointments && appointments.length > 0 ? (
                            appointments.map((appt) => (
                                <div key={appt.id} className="p-5 hover:bg-stone-50/80 transition-colors flex items-center justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className="h-10 w-10 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-medium text-sm border border-stone-200">
                                            <User className="w-5 h-5 text-stone-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-stone-900 text-sm">{appt.client_name}</h4>
                                            <p className="text-xs text-stone-500 mt-0.5">{appt.service}</p>
                                            <p className="text-xs text-stone-400 mt-1">{appt.room}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="inline-flex items-center text-xs font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-md">
                                            <Clock className="w-3 h-3 mr-1.5 text-stone-500" />
                                            {appt.time}
                                        </span>
                                        <div className="mt-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                                                {appt.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-stone-500 text-sm">
                                No appointments scheduled for today.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-100 flex items-center space-x-2 bg-stone-50/50">
                            <FileWarning className="w-4 h-4 text-amber-600" />
                            <h2 className="font-semibold text-stone-800 text-sm">Unsigned Notes</h2>
                        </div>
                        <div className="divide-y divide-stone-100">
                            {unsignedNotes && unsignedNotes.length > 0 ? unsignedNotes.map((n, i) => (
                                <div key={i} className="p-4">
                                    <p className="text-sm font-medium text-stone-900">{n.client_name}</p>
                                    <p className="text-xs text-stone-500 mt-0.5">{n.service} · {n.date}</p>
                                </div>
                            )) : (
                                <div className="p-4 text-center text-stone-400 text-xs">All notes signed.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-100 flex items-center space-x-2 bg-stone-50/50">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            <h2 className="font-semibold text-stone-800 text-sm">Form & Consent Alerts</h2>
                        </div>
                        <div className="divide-y divide-stone-100">
                            {formAlerts && formAlerts.length > 0 ? formAlerts.map((f, i) => (
                                <div key={i} className="p-4">
                                    <p className="text-sm font-medium text-stone-900">{f.client_name}</p>
                                    <p className="text-xs text-stone-500 mt-0.5">{f.form}</p>
                                    <p className="text-xs text-rose-600 mt-1">{f.status}</p>
                                </div>
                            )) : (
                                <div className="p-4 text-center text-stone-400 text-xs">No alerts.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
