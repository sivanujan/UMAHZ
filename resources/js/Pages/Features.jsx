import React from 'react';
import { Head } from '@inertiajs/react';
import { CalendarCheck, FolderHeart, FileText, ShieldCheck, CreditCard, BarChart3 } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { IconCard } from '@/Components/UI/Card';
import CTABanner from '@/Components/Home/CTABanner';

const FEATURES = [
    { icon: CalendarCheck, title: 'Online Booking', bg: '#ede9fe', stroke: '#5B2EFF', description: 'Client-facing self-booking with smart intake forms, room and practitioner availability, and automated reminders.' },
    { icon: FolderHeart, title: 'Client Records', bg: '#fce7f3', stroke: '#db2777', description: 'A single unified client chart across every modality — history, documents, and communication in one place.' },
    { icon: FileText, title: 'Profession-Specific Notes', bg: '#fef3c7', stroke: '#d97706', description: 'Purpose-built charting templates for massage, TCM, training, nutrition, and hydrotherapy — not generic forms.' },
    { icon: ShieldCheck, title: 'Consent Management', bg: '#e0e7ff', stroke: '#4338ca', description: 'Digitally capture, store, and track signed consent forms with a full audit trail per client.' },
    { icon: CreditCard, title: 'Payments & Invoicing', bg: '#ccfbf1', stroke: '#0f766e', description: 'Process payments, manage prepaid packages, and automate invoicing with staff commission tracking.' },
    { icon: BarChart3, title: 'Reporting', bg: '#fee2e2', stroke: '#dc2626', description: 'Real-time revenue, utilization, and client retention dashboards across every location.' },
];

export default function Features() {
    return (
        <PublicLayout>
            <Head title="Features" />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-pink-600">Platform Features</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                        Everything Your Practice Needs,{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Unified</em>
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
                        Booking, records, consent, billing, and reporting — UMAHZ replaces a stack of disconnected tools with one platform built for multi-modality wellness practices.
                    </p>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f) => (
                        <IconCard key={f.title} icon={f.icon} iconBg={f.bg} iconColor={f.stroke} title={f.title} description={f.description} />
                    ))}
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
