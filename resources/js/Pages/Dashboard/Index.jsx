import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Calendar, Users, Building, DollarSign, Clock, CheckCircle2, User, Sparkles } from 'lucide-react';

export default function Dashboard({ stats, appointments }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const tenant = auth.tenant;

    return (
        <AuthenticatedLayout title="Practitioner Dashboard">
            <Head title="Dashboard" />

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 rounded-2xl p-6 text-white shadow-md mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Multi-Tenant Practice Workspace</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
                    <p className="text-stone-300 text-sm mt-1">
                        Here is today's practice overview for <span className="font-semibold text-white">{tenant?.name || 'Your Clinic'}</span>.
                    </p>
                </div>
            </div>

            {/* Overview Stats Cards */}
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
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">MDR / Revenue (MTD)</p>
                        <h3 className="text-2xl font-bold text-stone-900 mt-1">{stats?.monthlyRevenue || '$0'}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Today's Appointments Card (Requirement #8) */}
            <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden mb-8">
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
                                        <p className="text-xs text-stone-500 mt-0.5">{appt.service} • <span className="text-stone-700 font-medium">{appt.practitioner}</span></p>
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
        </AuthenticatedLayout>
    );
}
