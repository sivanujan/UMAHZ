import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import PublicLayout from '@/Layouts/PublicLayout';
import { PROFESSIONS } from '@/Data/professions';
import PillBadge from '@/Components/Common/PillBadge';
import {
    VIEWPORT_ONCE,
    createFadeInUp,
    createFadeInScale,
    createButtonHover,
} from '@/Utils/motion';

function Field({ label, type = 'text', placeholder, value, onChange, required }) {
    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {label}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full bg-slate-50 dark:bg-[#0E1422] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5B2EFF] dark:focus:ring-purple-400 transition-colors"
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
    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const shouldReduceMotion = useReducedMotion();

    const formEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);

    const toggleProfession = (name) => {
        setProfessions((p) =>
            p.includes(name) ? p.filter((x) => x !== name) : [...p, name]
        );
    };

    return (
        <PublicLayout>
            <Head title="Book a Demo — Get In Touch With UMAHZ" />

            <section className="py-16 md:py-24 relative overflow-hidden bg-[#1E0B3C] dark:bg-[#0B0F19] dark:border-y dark:border-slate-800/80 transition-colors duration-300">
                <div
                    className="absolute top-0 right-0 rounded-full blur-3xl pointer-events-none w-96 h-96 bg-purple-600/20 dark:bg-purple-900/15"
                    aria-hidden="true"
                />
                <div
                    className="absolute bottom-0 left-0 rounded-full blur-3xl pointer-events-none w-80 h-80 bg-pink-600/10 dark:bg-pink-900/10"
                    aria-hidden="true"
                />

                <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

                        {/* Left column */}
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={VIEWPORT_ONCE}
                            variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                            className="text-white space-y-6 pt-2"
                        >
                            <PillBadge text="Get In Touch" />

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
                                Book Your{' '}
                                <em className="not-italic font-light font-serif text-purple-300">Personalised</em>{' '}
                                Demo
                            </h1>
                            <p className="text-purple-200 dark:text-slate-300 text-base md:text-lg leading-relaxed font-normal">
                                See how UMAHZ unifies scheduling, charting, billing, and multi-room management — tailored live to your specific wellness modalities.
                            </p>

                            <div className="space-y-5 pt-2">
                                {CONTACT_ITEMS.map(({ label, value, iconContent }) => (
                                    <div key={label} className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center flex-shrink-0 text-base shadow-2xs">
                                            {iconContent}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm">{label}</p>
                                            <p className="text-purple-300 dark:text-slate-400 text-xs mt-0.5 leading-relaxed font-normal">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between rounded-2xl px-5 py-4 mt-4 bg-purple-950/60 dark:bg-[#131B2B] border border-purple-800/60 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                    </span>
                                    <span className="text-purple-100 dark:text-slate-200 text-xs font-semibold">Demo Specialists Available Now</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right — form card */}
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={VIEWPORT_ONCE}
                            variants={formEntrance}
                            className="bg-white dark:bg-[#131B2B] rounded-2xl p-7 shadow-2xl border border-purple-100 dark:border-slate-800 transition-colors duration-300"
                        >
                            <h2 className="text-xl font-bold text-[#1E0B3C] dark:text-white mb-1 tracking-tight">Request a Demo</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 font-normal">We'll personalise the walkthrough to your practice type.</p>

                            {done ? (
                                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/50 rounded-2xl p-8 text-center space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-[#5B2EFF] dark:bg-[#6D3BFF] flex items-center justify-center mx-auto flex-shrink-0 shadow-md">
                                        <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1E0B3C] dark:text-white">Request Received!</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm font-normal">A UMAHZ specialist will reach out within 1 business hour to schedule your demo.</p>
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-4">
                                    <Field label="Name" placeholder="Dr. Sarah Jenkins" value={form.name} onChange={set('name')} required />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Email" type="email" placeholder="sarah@clinic.com" value={form.email} onChange={set('email')} required />
                                        <Field label="Clinic Name" placeholder="Lotus Wellness Studio" value={form.clinic} onChange={set('clinic')} required />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                                            Profession(s)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {PROFESSIONS.map((p) => {
                                                const isSelected = professions.includes(p.name);
                                                return (
                                                    <button
                                                        key={p.slug}
                                                        type="button"
                                                        onClick={() => toggleProfession(p.name)}
                                                        className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-[#5B2EFF] dark:bg-[#6D3BFF] border-[#5B2EFF] dark:border-[#6D3BFF] text-white shadow-xs'
                                                                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#5B2EFF] dark:hover:border-purple-400'
                                                        }`}
                                                    >
                                                        {p.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <Field label="Preferred Demo Time" type="datetime-local" value={form.time} onChange={set('time')} required />

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                            Message
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Tell us about your team size, current software, or specific pain points…"
                                            value={form.message}
                                            onChange={(e) => set('message')(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#0E1422] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5B2EFF] dark:focus:ring-purple-400 resize-none transition-colors"
                                        />
                                    </div>

                                    <motion.button
                                        type="submit"
                                        initial="rest"
                                        whileHover="hover"
                                        whileTap="tap"
                                        variants={buttonHover}
                                        className="group w-full bg-[#5B2EFF] hover:bg-purple-700 dark:bg-[#6D3BFF] dark:hover:bg-[#5B2EFF] text-white font-medium py-4 rounded-full shadow-xl shadow-purple-500/20 transition-colors text-sm uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <span>Request Demo</span>
                                        <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                                            →
                                        </span>
                                    </motion.button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
