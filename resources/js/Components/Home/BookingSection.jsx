import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PillBadge from '@/Components/Common/PillBadge';
import {
    EASING,
    VIEWPORT_ONCE,
    createFadeInUp,
    createFadeInScale,
    createButtonHover,
} from '@/Utils/motion';

function Field({ label, type = 'text', placeholder, value, onChange, required }) {
    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-200 dark:text-slate-300 mb-1.5">{label}</label>
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

export default function BookingSection() {
    const [done, setDone] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', service: 'Massage Therapy Suite', date: '', time: '', message: '' });
    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const shouldReduceMotion = useReducedMotion();

    const formEntrance = createFadeInScale(0.97, 0.5, shouldReduceMotion);
    const buttonHover = createButtonHover(1.02, shouldReduceMotion);

    const contactItems = [
        { label: 'Our Location', value: '[Your Business Address]', iconContent: '📍' },
        { label: 'Email Us', value: '[Your Support Email] · [Your Phone Number]', iconContent: '✉' },
    ];

    return (
        <section id="booking" className="py-16 md:py-24 relative overflow-hidden bg-[#1E0B3C] dark:bg-[#0B0F19] dark:border-y dark:border-slate-800/80 transition-colors duration-300">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 rounded-full blur-3xl pointer-events-none w-96 h-96 bg-purple-600/20 dark:bg-purple-900/15" />
            <div className="absolute bottom-0 left-0 rounded-full blur-3xl pointer-events-none w-80 h-80 bg-pink-600/10 dark:bg-pink-900/10" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

                    {/* Left content */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="text-white space-y-6 pt-2"
                    >
                        <PillBadge text="Get Started Today" />

                        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
                            Book A{' '}
                            <em className="not-italic font-light font-serif text-purple-300">Personalised</em>{' '}
                            Platform Demo
                        </h2>
                        <p className="text-purple-200 dark:text-slate-300 text-base leading-relaxed font-normal">
                            See how UMAHZ unifies scheduling, charting, billing, and multi-room management — tailored live to your specific wellness modalities.
                        </p>

                        <div className="space-y-5 pt-2">
                            {contactItems.map(({ label, value, iconContent }) => (
                                <div key={label} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center flex-shrink-0 text-base">
                                        {iconContent}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{label}</p>
                                        <p className="text-purple-300 dark:text-slate-400 text-xs mt-0.5 leading-relaxed font-normal">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Availability badge */}
                        <div className="flex items-center justify-between rounded-2xl px-5 py-4 mt-4 bg-purple-950/60 dark:bg-[#131B2B] border border-purple-800/60 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                                <span className="text-purple-100 dark:text-slate-200 text-xs font-semibold">Demo Specialists Available Now</span>
                            </div>
                            <span className="text-purple-400 dark:text-slate-400 text-xs ml-3 flex-shrink-0">Mon–Fri · 8am–7pm EST</span>
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
                        <h3 className="text-xl font-bold text-[#1E0B3C] dark:text-white mb-1 tracking-tight">Schedule Your 1-on-1 Demo</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 font-normal">We'll personalise the walkthrough to your practice type.</p>

                        {done ? (
                            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/50 rounded-2xl p-8 text-center space-y-4">
                                <div className="w-12 h-12 rounded-full bg-[#5B2EFF] dark:bg-[#6D3BFF] flex items-center justify-center mx-auto flex-shrink-0 shadow-md">
                                    <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-bold text-[#1E0B3C] dark:text-white">Request Received!</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm font-normal">A UMAHZ specialist will reach out within 1 business hour to confirm your demo.</p>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-4">
                                <Field label="Full Name" placeholder="Dr. Sarah Jenkins" value={form.name} onChange={set('name')} required />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Work Email" type="email" placeholder="sarah@clinic.com" value={form.email} onChange={set('email')} required />
                                    <Field label="Phone" type="tel" placeholder="(555) 234-5678" value={form.phone} onChange={set('phone')} required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Primary Modality</label>
                                    <select
                                        value={form.service}
                                        onChange={(e) => set('service')(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#0E1422] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5B2EFF] dark:focus:ring-purple-400 transition-colors"
                                    >
                                        {['Massage Therapy Suite', 'Acupuncture & TCM', 'Personal Training', 'Nutrition Counseling', 'Colon Hydrotherapy', 'Multi-Modality Clinic'].map((o) => (
                                            <option key={o} value={o} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                {o}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Preferred Date" type="date" value={form.date} onChange={set('date')} required />
                                    <Field label="Preferred Time" type="time" value={form.time} onChange={set('time')} required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Practice Notes</label>
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
                                    <span>Confirm Demo Request</span>
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
    );
}
