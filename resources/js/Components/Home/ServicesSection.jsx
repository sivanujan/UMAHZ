import React from 'react';

const SERVICES = [
    { title:'Massage Therapy', desc:'Body-map charting, multi-room scheduling, treatment packages, and automated reminders for RMTs.', iconPath:'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg:'#ede9fe', stroke:'#5B2EFF' },
    { title:'Acupuncture & TCM', desc:'Meridian charts, herbal formula inventory, custom tongue/pulse forms, and TCM-specific SOAP templates.', iconPath:'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', bg:'#fce7f3', stroke:'#db2777' },
    { title:'Personal Training', desc:'Fitness assessments, workout plan assignments, progress tracking, package management, and commissions.', iconPath:'M13 10V3L4 14h7v7l9-11h-7z', bg:'#fef3c7', stroke:'#d97706' },
    { title:'Nutrition & Dietetics', desc:'Meal plan builders, macronutrient templates, telehealth consultations, and secure client messaging.', iconPath:'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', bg:'#ccfbf1', stroke:'#0f766e' },
];

export default function ServicesSection() {
    return (
        <section id="services" className="py-16 md:py-24 bg-[#F9F5FB]">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end mb-12">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">Supported Modalities</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            Purpose-Built for Modern Health &{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF]">Wellness</em>{' '}
                            Professionals
                        </h2>
                    </div>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed lg:text-right">
                        Whether you run a solo practice or an integrated multi-practitioner clinic, UMAHZ adapts to your specific clinical and administrative needs.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* 2×2 service cards */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {SERVICES.map((svc) => (
                            <div key={svc.title} className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0" style={{background:svc.bg}}>
                                    <svg className="w-5 h-5" fill="none" stroke={svc.stroke} strokeWidth="1.8" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={svc.iconPath} />
                                    </svg>
                                </div>
                                <h3 className="text-[#1E0B3C] font-bold text-base mb-2">{svc.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed flex-1 mb-5">{svc.desc}</p>
                                <a href="#booking" className="inline-flex items-center gap-1 text-xs font-bold text-[#5B2EFF] hover:text-purple-800 transition-colors group/link">
                                    Learn More
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </a>
                            </div>
                        ))}
                    </div>

                    {/* Dark CTA card */}
                    <div className="lg:col-span-4 rounded-3xl p-8 shadow-xl text-white flex flex-col justify-between relative overflow-hidden" style={{background:'#1E0B3C'}}>
                        <div className="absolute -bottom-8 -right-8 rounded-full blur-2xl pointer-events-none" style={{width:160,height:160,background:'rgba(124,58,237,0.25)'}} />

                        <div className="space-y-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="#c4b5fd" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                </svg>
                            </div>
                            <span className="block text-[10px] font-bold tracking-[0.14em] uppercase text-pink-300">Also Available</span>
                            <h3 className="text-xl font-bold text-white leading-snug">Colon Hydrotherapy Management</h3>
                            <p className="text-purple-200 text-sm leading-relaxed">
                                Sterilization logs, equipment tracking, session protocols, and privacy-first consent management for colon hydrotherapy centers.
                            </p>
                        </div>

                        <div className="pt-8 relative z-10">
                            <a href="#booking" className="block w-full text-center bg-[#5B2EFF] hover:bg-purple-600 text-white font-medium py-3.5 px-6 rounded-full transition-colors text-sm shadow-lg">
                                Schedule a Demo
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
