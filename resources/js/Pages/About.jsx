import React from 'react';
import { Head } from '@inertiajs/react';
import { Target, Eye, HeartHandshake, ShieldCheck, Layers, Users2, LayoutDashboard, ClipboardCheck, Stethoscope, Mountain } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import CTABanner from '@/Components/Home/CTABanner';

const VALUES = [
    { icon: HeartHandshake, bg: '#ede9fe', stroke: '#5B2EFF', title: 'Practitioner-First', description: 'Every workflow is designed with real practitioners, not just imagined personas.' },
    { icon: ShieldCheck, bg: '#fce7f3', stroke: '#db2777', title: 'Privacy By Design', description: 'Client trust is earned by treating consent and data protection as core features, not afterthoughts.' },
    { icon: Layers, bg: '#fef3c7', stroke: '#d97706', title: 'Built For Every Modality', description: "We don't force massage, TCM, training, and nutrition into one generic form." },
    { icon: Users2, bg: '#ccfbf1', stroke: '#0f766e', title: 'Continuous Partnership', description: "Onboarding doesn't end at go-live — our team stays close as your practice grows." },
];

const NAME_MEANING = [
    { letter: 'U', word: 'Unified', icon: Layers, color: '#5B2EFF', image: '/imags/about/unified.jpg' },
    { letter: 'M', word: 'Management', icon: LayoutDashboard, color: '#db2777', image: '/imags/about/management.jpg' },
    { letter: 'A', word: 'Assessment', icon: ClipboardCheck, color: '#d97706', image: '/imags/about/assessment.jpg' },
    { letter: 'H', word: 'Healthcare', icon: Stethoscope, color: '#0f766e', image: '/imags/about/healthcare.jpg' },
    { letter: 'Z', word: 'Zenith', icon: Mountain, color: '#dc2626', image: '/imags/about/zenith.jpg' },
];

const TEAM = [
    { initials: 'JM', name: 'Jordan Mercer', role: 'Co-Founder & CEO', bg: 'linear-gradient(135deg,#a78bfa,#6366f1)' },
    { initials: 'PK', name: 'Priya Kapoor', role: 'Co-Founder & Head of Product', bg: 'linear-gradient(135deg,#f472b6,#f43f5e)' },
    { initials: 'DO', name: 'Daniel Osei', role: 'Head of Clinical Design', bg: 'linear-gradient(135deg,#fbbf24,#f97316)' },
    { initials: 'RL', name: 'Rachel Lindqvist', role: 'Head of Security & Compliance', bg: 'linear-gradient(135deg,#34d399,#06b6d4)' },
];

export default function About() {
    return (
        <PublicLayout>
            <Head title="About" />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">About UMAHZ</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                        Built By People Who{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Understand</em> Wellness Practices
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
                        UMAHZ is a cloud-native, multi-tenant platform that replaces fragmented tools with one unified workspace for holistic health practices.
                    </p>
                </div>
            </section>

            {/* Mission / Vision */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    <div className="lg:col-span-8 relative rounded-3xl overflow-hidden shadow-xl border border-purple-100 p-10 flex flex-col justify-center" style={{ background: '#1E0B3C', minHeight: 320 }}>
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mb-5">
                                <Target className="w-7 h-7 text-white" strokeWidth={1.8} />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-purple-300 mb-3">Our Mission</p>
                            <p className="text-white text-xl md:text-2xl font-bold leading-snug max-w-lg">
                                Give every wellness practitioner one unified system of record — so administration never gets in the way of care.
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-5">
                        <div className="flex-1 bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4 flex-shrink-0">
                                <Eye className="w-5 h-5" style={{ color: '#5B2EFF' }} strokeWidth={1.8} />
                            </div>
                            <h3 className="text-[#1E0B3C] font-bold text-base mb-2">Our Vision</h3>
                            <p className="text-slate-500 text-sm leading-relaxed flex-1">A world where every modality — from massage to TCM to nutrition — has documentation tools built for how it actually practices.</p>
                        </div>

                        <div className="flex-1 bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-4 flex-shrink-0">
                                <ShieldCheck className="w-5 h-5" style={{ color: '#db2777' }} strokeWidth={1.8} />
                            </div>
                            <h3 className="text-[#1E0B3C] font-bold text-base mb-2">Our Approach</h3>
                            <p className="text-slate-500 text-sm leading-relaxed flex-1">Profession-specific charting, privacy-first consent, and multi-tenant architecture built from the ground up — not bolted on.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why we built UMAHZ */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                        Why We Built{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">UMAHZ</em>
                    </h2>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6">
                        UMAHZ started after watching a multi-modality clinic run their massage, acupuncture, and nutrition practitioners on five different tools — one for booking, one for charting, one for billing, and spreadsheets to hold it all together. Every new modality meant another workaround. We built UMAHZ so clinics never have to choose between the right software for one profession and a single source of truth for the whole practice.
                    </p>
                </div>
            </section>

            {/* The Meaning Behind UMAHZ */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                        The Meaning Behind <em className="not-italic font-light font-serif text-[#5B2EFF]">UMAHZ</em>
                    </h2>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6">
                        UMAHZ stands for our mission — bringing wellness practice management together in one place.
                    </p>
                </div>

                <ul className="max-w-5xl mx-auto mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 list-none">
                    {NAME_MEANING.map((n) => (
                        <li
                            key={n.letter}
                            className="bg-[#F9F5FB] border border-purple-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center group"
                        >
                            <div className="relative mb-4">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-1.5 bg-white border border-purple-100 shadow-sm transition-transform duration-300 group-hover:scale-105">
                                    <img
                                        src={n.image}
                                        alt={`${n.letter} - ${n.word}`}
                                        className="w-full h-full object-cover rounded-xl"
                                        loading="lazy"
                                    />
                                </div>
                                <span
                                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full text-white text-xs font-black shadow-md flex items-center justify-center ring-2 ring-white"
                                    style={{ background: n.color }}
                                >
                                    {n.letter}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black px-1.5 py-0.5 rounded bg-white border border-purple-100 shadow-xs" style={{ color: n.color }}>
                                    {n.letter}
                                </span>
                                <h3 className="text-[#1E0B3C] font-bold text-sm md:text-base">{n.word}</h3>
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="max-w-2xl mx-auto mt-12">
                    <div className="rounded-2xl border border-purple-100 bg-white px-6 py-5 shadow-sm text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B2EFF] mb-2">In Full</p>
                        <p className="text-lg md:text-xl font-bold text-[#1E0B3C] leading-snug">
                            Unified Management, Assessment &amp; Healthcare at its{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF]">Zenith</em>.
                        </p>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            What We <em className="not-italic font-light font-serif text-[#5B2EFF]">Value</em>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {VALUES.map((v) => (
                            <div key={v.title} className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0" style={{ background: v.bg }}>
                                    <v.icon className="w-5 h-5" style={{ color: v.stroke }} strokeWidth={1.8} />
                                </div>
                                <h3 className="text-[#1E0B3C] font-bold text-base mb-2">{v.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{v.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            Meet The <em className="not-italic font-light font-serif text-[#5B2EFF]">Team</em>
                        </h2>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-4">
                            A small team of clinicians, engineers, and privacy specialists building UMAHZ full-time.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TEAM.map((t) => (
                            <div key={t.name} className="bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm text-center">
                                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: t.bg }}>
                                    {t.initials}
                                </div>
                                <h3 className="text-[#1E0B3C] font-bold text-sm">{t.name}</h3>
                                <p className="text-slate-400 text-xs mt-1">{t.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
