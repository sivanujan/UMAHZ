import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, ChevronRight } from 'lucide-react';

const ROLE_LABELS = {
    clinic_owner: 'Clinic Owner',
    practitioner: 'Practitioner',
    receptionist: 'Receptionist',
};

export default function SelectWorkspace({ workspaces }) {
    const selectWorkspace = (tenantId) => {
        router.post('/select-workspace', { tenant_id: tenantId });
    };

    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <Head title="Select Workspace" />

            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#5B2EFF,#a855f7)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>U</span>
                    <span className="text-2xl font-bold text-[#1E0B3C] tracking-tight">UMAHZ<span className="text-[#5B2EFF]">.</span></span>
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[#1E0B3C] tracking-tight">Select a Workspace</h1>
                        <p className="mt-1 text-sm text-slate-500">You have staff access at more than one clinic. Choose one to continue.</p>
                    </div>

                    <div className="space-y-3">
                        {workspaces.map((ws) => (
                            <button
                                key={ws.tenant_id}
                                type="button"
                                onClick={() => selectWorkspace(ws.tenant_id)}
                                className="w-full flex items-center gap-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-[#5B2EFF] rounded-2xl px-5 py-4 text-left transition-colors group"
                            >
                                <span className="w-11 h-11 rounded-xl bg-white border border-purple-100 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-5 h-5 text-[#5B2EFF]" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-bold text-[#1E0B3C] truncate">{ws.tenant_name}</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">{ROLE_LABELS[ws.role] || ws.role}</span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#5B2EFF] transition-colors flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
