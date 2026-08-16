import React, { useState } from 'react';

function Field({ label, type='text', placeholder, value, onChange, required }) {
    return (
        <div>
            <label style={{display:'block',fontSize:10,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.12em',color:'#64748b',marginBottom:6}}>{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} required={required}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                style={{focusRingColor:'rgba(91,46,255,0.4)'}}
            />
        </div>
    );
}

export default function BookingSection() {
    const [done, setDone] = useState(false);
    const [form, setForm] = useState({ name:'', email:'', phone:'', service:'Massage Therapy Suite', date:'', time:'', message:'' });
    const set = k => v => setForm(f=>({...f,[k]:v}));

    const contactItems = [
        { label:'Our Location', value:'[Your Business Address]', iconContent:'📍' },
        { label:'Email Us', value:'[Your Support Email] · [Your Phone Number]', iconContent:'✉' },
    ];

    return (
        <section id="booking" className="py-16 md:py-24 relative overflow-hidden" style={{background:'#1E0B3C'}}>
            <div className="absolute top-0 right-0 rounded-full blur-3xl pointer-events-none" style={{width:380,height:380,background:'rgba(91,46,255,0.2)'}} />
            <div className="absolute bottom-0 left-0 rounded-full blur-3xl pointer-events-none" style={{width:320,height:320,background:'rgba(219,39,119,0.08)'}} />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

                    {/* Left */}
                    <div className="text-white space-y-6 pt-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{background:'rgba(139,92,246,0.2)',border:'1px solid rgba(139,92,246,0.3)'}}>
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-300">Get Started Today</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                            Book A{' '}
                            <em className="not-italic font-light font-serif text-purple-300">Personalised</em>{' '}
                            Platform Demo
                        </h2>
                        <p className="text-purple-200 text-base leading-relaxed">
                            See how UMAHZ unifies scheduling, charting, billing, and multi-room management — tailored live to your specific wellness modalities.
                        </p>

                        <div className="space-y-5 pt-2">
                            {contactItems.map(({ label, value, iconContent }) => (
                                <div key={label} className="flex items-start gap-4">
                                    {/* Icon box — emoji text, no SVG */}
                                    <div style={{width:40,height:40,borderRadius:10,background:'rgba(139,92,246,0.2)',border:'1px solid rgba(139,92,246,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>
                                        {iconContent}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{label}</p>
                                        <p className="text-purple-300 text-xs mt-0.5 leading-relaxed">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Availability badge */}
                        <div className="flex items-center justify-between rounded-2xl px-5 py-4 mt-4" style={{background:'rgba(88,28,135,0.4)',border:'1px solid rgba(139,92,246,0.25)'}}>
                            <div className="flex items-center gap-3">
                                <span className="relative flex" style={{width:10,height:10,flexShrink:0}}>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{width:10,height:10}} />
                                    <span className="relative inline-flex rounded-full" style={{width:10,height:10,background:'#10b981'}} />
                                </span>
                                <span className="text-purple-100 text-xs font-semibold">Demo Specialists Available Now</span>
                            </div>
                            <span className="text-purple-400 text-xs" style={{flexShrink:0,marginLeft:12}}>Mon–Fri · 8am–7pm EST</span>
                        </div>
                    </div>

                    {/* Right — form */}
                    <div className="bg-white rounded-3xl p-7 shadow-2xl border border-purple-100">
                        <h3 className="text-xl font-bold text-[#1E0B3C] mb-1">Schedule Your 1-on-1 Demo</h3>
                        <p className="text-slate-400 text-xs mb-6">We'll personalise the walkthrough to your practice type.</p>

                        {done ? (
                            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-8 text-center space-y-4">
                                <div className="w-12 h-12 rounded-full bg-[#5B2EFF] flex items-center justify-center mx-auto flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-bold text-[#1E0B3C]">Request Received!</h4>
                                <p className="text-slate-500 text-sm">A UMAHZ specialist will reach out within 1 business hour to confirm your demo.</p>
                            </div>
                        ) : (
                            <form onSubmit={e=>{e.preventDefault();setDone(true);}} className="space-y-4">
                                <Field label="Full Name" placeholder="Dr. Sarah Jenkins" value={form.name} onChange={set('name')} required />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Work Email" type="email" placeholder="sarah@clinic.com" value={form.email} onChange={set('email')} required />
                                    <Field label="Phone" type="tel" placeholder="(555) 234-5678" value={form.phone} onChange={set('phone')} required />
                                </div>
                                <div>
                                    <label style={{display:'block',fontSize:10,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.12em',color:'#64748b',marginBottom:6}}>Primary Modality</label>
                                    <select value={form.service} onChange={e=>set('service')(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] focus:outline-none focus:ring-2 focus:border-[#5B2EFF]">
                                        {['Massage Therapy Suite','Acupuncture & TCM','Personal Training','Nutrition Counseling','Colon Hydrotherapy','Multi-Modality Clinic'].map(o=><option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Preferred Date" type="date" value={form.date} onChange={set('date')} required />
                                    <Field label="Preferred Time" type="time" value={form.time} onChange={set('time')} required />
                                </div>
                                <div>
                                    <label style={{display:'block',fontSize:10,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.12em',color:'#64748b',marginBottom:6}}>Practice Notes</label>
                                    <textarea rows={3} placeholder="Tell us about your team size, current software, or specific pain points…" value={form.message} onChange={e=>set('message')(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1E0B3C] placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-[#5B2EFF] resize-none" />
                                </div>
                                <button type="submit" className="w-full bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium py-4 rounded-full shadow-xl shadow-purple-500/20 transition-colors text-sm uppercase tracking-wide">
                                    Confirm Demo Request →
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
