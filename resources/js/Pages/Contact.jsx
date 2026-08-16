import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { PROFESSIONS } from '@/Data/professions';

function Field({ label, type = 'text', placeholder, value, onChange, required }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 }}>{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required={required}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
            />
        </div>
    );
}

const CONTACT_ITEMS = [
    { label: 'Email Us', value: '[Your Support Email]', iconContent: '✉' },
    { label: 'Call Us', value: '[Your Phone Number]', iconContent: '📞' },
    { label: 'Office Hours', value: '[Your Office Hours]', iconContent: '🕐' },
];

export default function Contact() {
    const [done, setDone] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', clinic: '', time: '', message: '' });
    const [professions, setProfessions] = useState([]);
    const set = k => v => setForm(f => ({ ...f, [k]: v }));

    const toggleProfession = (name) => {
        setProfessions((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name]);
    };

    return (
        <PublicLayout>
            <Head title="Book a Demo" />

            <section className="py-16 md:py-24 relative overflow-hidden" style={{ background: '#1E0B3C' }}>
                <div className="absolute top-0 right-0 rounded-full blur-3xl pointer-events-none" style={{ width: 380, height: 380, background: 'rgba(91,46,255,0.2)' }} />
                <div className="absolute bottom-0 left-0 rounded-full blur-3xl pointer-events-none" style={{ width: 320, height: 320, background: 'rgba(219,39,119,0.08)' }} />

                <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

                        {/* Left */}
                        <div className="text-white space-y-6 pt-2">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-300">Get In Touch</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                                Book Your{' '}
                                <em className="not-italic font-light font-serif text-purple-300">Personalised</em>{' '}
                                Demo
                            </h1>
                            <p className="text-purple-200 text-base md:text-lg leading-relaxed">
                                See how UMAHZ unifies scheduling, charting, billing, and multi-room management — tailored live to your specific wellness modalities.
                            </p>

                            <div className="space-y-5 pt-2">
                                {CONTACT_ITEMS.map(({ label, value, iconContent }) => (
                                    <div key={label} className="flex items-start gap-4">
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                                            {iconContent}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm">{label}</p>
                                            <p className="text-purple-300 text-xs mt-0.5 leading-relaxed">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between rounded-2xl px-5 py-4 mt-4" style={{ background: 'rgba(88,28,135,0.4)', border: '1px solid rgba(139,92,246,0.25)' }}>
                                <div className="flex items-center gap-3">
                                    <span className="relative flex" style={{ width: 10, height: 10, flexShrink: 0 }}>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ width: 10, height: 10 }} />
                                        <span className="relative inline-flex rounded-full" style={{ width: 10, height: 10, background: '#10b981' }} />
                                    </span>
                                    <span className="text-purple-100 text-xs font-semibold">Demo Specialists Available Now</span>
                                </div>
                            </div>
                        </div>

                        {/* Right — form */}
                        <div className="bg-white rounded-3xl p-7 shadow-2xl border border-purple-100">
                            <h3 className="text-xl font-bold text-[#1E0B3C] mb-1">Request a Demo</h3>
                            <p className="text-slate-400 text-xs mb-6">We'll personalise the walkthrough to your practice type.</p>

                            {done ? (
                                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-8 text-center space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-[#5B2EFF] flex items-center justify-center mx-auto flex-shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-bold text-[#1E0B3C]">Request Received!</h4>
                                    <p className="text-slate-500 text-sm">A UMAHZ specialist will reach out within 1 business hour to schedule your demo.</p>
                                </div>
                            ) : (
                                <form onSubmit={e => { e.preventDefault(); setDone(true); }} className="space-y-4">
                                    <Field label="Name" placeholder="Dr. Sarah Jenkins" value={form.name} onChange={set('name')} required />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Email" type="email" placeholder="sarah@clinic.com" value={form.email} onChange={set('email')} required />
                                        <Field label="Clinic Name" placeholder="Lotus Wellness Studio" value={form.clinic} onChange={set('clinic')} required />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 }}>Profession(s)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {PROFESSIONS.map((p) => (
                                                <button
                                                    key={p.slug}
                                                    type="button"
                                                    onClick={() => toggleProfession(p.name)}
                                                    className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-colors ${professions.includes(p.name)
                                                        ? 'bg-[#5B2EFF] border-[#5B2EFF] text-white'
                                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-[#5B2EFF]'}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Field label="Preferred Demo Time" type="datetime-local" value={form.time} onChange={set('time')} required />

                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 }}>Message</label>
                                        <textarea rows={3} placeholder="Tell us about your team size, current software, or specific pain points…" value={form.message} onChange={e => set('message')(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[#5B2EFF] resize-none" />
                                    </div>

                                    <button type="submit" className="w-full bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium py-4 rounded-full shadow-xl shadow-purple-500/20 transition-colors text-sm uppercase tracking-wide">
                                        Request Demo →
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
