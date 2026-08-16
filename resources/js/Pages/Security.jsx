import React from 'react';
import { Head } from '@inertiajs/react';
import { Lock, Users, History, Flag, ShieldCheck } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import CTABanner from '@/Components/Home/CTABanner';

const SECTIONS = [
    {
        icon: Lock,
        bg: '#ede9fe',
        stroke: '#5B2EFF',
        title: 'Encryption',
        description: 'All client data is encrypted in transit with TLS 1.2+ and at rest with AES-256, from intake forms to SOAP notes and payment records.',
    },
    {
        icon: Users,
        bg: '#fce7f3',
        stroke: '#db2777',
        title: 'Role-Based Access',
        description: 'Every staff member sees only what their role requires — practitioners, front-desk, and clinic owners each have scoped permissions across locations.',
    },
    {
        icon: History,
        bg: '#fef3c7',
        stroke: '#d97706',
        title: 'Audit Logging',
        description: 'Every record view, edit, and export is logged with a timestamp and user ID, giving clinics a full audit trail for compliance reviews.',
    },
    {
        icon: Flag,
        bg: '#e0e7ff',
        stroke: '#4338ca',
        title: 'Canadian Data Hosting',
        description: 'Client data is hosted in Canadian data centres by default, giving clinics a local data residency option for their practice.',
    },
    {
        icon: ShieldCheck,
        bg: '#ccfbf1',
        stroke: '#0f766e',
        title: 'Privacy By Design',
        description: 'Signed consent tracking, configurable data retention policies, and scoped role-based access are built into the platform from the ground up — not bolted on after the fact.',
    },
];

export default function Security() {
    return (
        <PublicLayout>
            <Head title="Security & Privacy" />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">Trust & Security</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                        Security Built For{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Clinical</em> Data
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
                        Client records deserve more than a generic SaaS checklist. Here's how UMAHZ protects the data your practice depends on.
                    </p>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-4xl mx-auto space-y-6">
                    {SECTIONS.map((s) => (
                        <div key={s.title} className="flex items-start gap-5 bg-white border border-purple-100 rounded-3xl p-6 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                                <s.icon className="w-6 h-6" style={{ color: s.stroke }} strokeWidth={1.8} />
                            </div>
                            <div>
                                <h3 className="text-[#1E0B3C] font-bold text-lg mb-1.5">{s.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{s.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
