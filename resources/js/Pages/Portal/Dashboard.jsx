import React from 'react';
import { Head } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import { CalendarDays, FileText, CreditCard, MessageSquare, ArrowRight } from 'lucide-react';

export default function PortalDashboard({ client, upcomingAppointments, formsDue, balances, messages }) {
    return (
        <PortalLayout>
            <Head title="My Dashboard" />

            <div className="bg-gradient-to-br from-[#2A1054] via-[#5B2EFF] to-[#1E0B3C] rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10">
                    <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-2">Welcome Back</p>
                    <h1 className="text-2xl font-bold">Hi {client.first_name}, here's what's next</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="w-5 h-5 text-[#5B2EFF]" />
                        </span>
                        <h2 className="font-bold text-[#1E0B3C] text-base">Upcoming Appointments</h2>
                    </div>
                    <div className="space-y-3">
                        {upcomingAppointments.length > 0 ? upcomingAppointments.map((a, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#F9F5FB] rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-[#1E0B3C]">{a.service}</p>
                                    <p className="text-xs text-slate-500">{a.practitioner}</p>
                                </div>
                                <span className="text-xs font-semibold text-[#5B2EFF]">{a.time}</span>
                            </div>
                        )) : <p className="text-sm text-slate-400">No upcoming appointments.</p>}
                    </div>
                </div>

                <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-pink-600" />
                        </span>
                        <h2 className="font-bold text-[#1E0B3C] text-base">Forms Due</h2>
                    </div>
                    <div className="space-y-3">
                        {formsDue.length > 0 ? formsDue.map((f, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#F9F5FB] rounded-xl px-4 py-3">
                                <p className="text-sm font-semibold text-[#1E0B3C]">{f.name}</p>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                                    {f.status} <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        )) : <p className="text-sm text-slate-400">No forms pending.</p>}
                    </div>
                </div>

                <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-5 h-5 text-teal-700" />
                        </span>
                        <h2 className="font-bold text-[#1E0B3C] text-base">Balances</h2>
                    </div>
                    <div className="space-y-3">
                        {balances.length > 0 ? balances.map((b, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#F9F5FB] rounded-xl px-4 py-3">
                                <p className="text-sm text-slate-600">{b.description}</p>
                                <span className="text-sm font-bold text-[#1E0B3C]">{b.amount}</span>
                            </div>
                        )) : <p className="text-sm text-slate-400">No outstanding balances.</p>}
                    </div>
                </div>

                <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-amber-600" />
                        </span>
                        <h2 className="font-bold text-[#1E0B3C] text-base">Messages</h2>
                    </div>
                    <div className="space-y-3">
                        {messages.length > 0 ? messages.map((m, i) => (
                            <div key={i} className="bg-[#F9F5FB] rounded-xl px-4 py-3">
                                <p className="text-sm font-semibold text-[#1E0B3C]">{m.from}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{m.preview}</p>
                            </div>
                        )) : <p className="text-sm text-slate-400">No new messages.</p>}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
