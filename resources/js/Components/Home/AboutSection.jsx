import React from 'react';

export default function AboutSection() {
    return (
        <section id="about" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                {/* Centered header */}
                <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-pink-600">About UMAHZ</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                        Built For Modern{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Holistic</em>{' '}
                        Health Practices
                    </h2>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed">
                        UMAHZ is a cloud-native, multi-tenant platform that replaces fragmented tools with one unified workspace — connecting practitioners, treatment rooms, and clients seamlessly.
                    </p>
                    <div className="pt-2">
                        <a href="#services" className="inline-flex items-center bg-[#5B2EFF] hover:bg-purple-700 text-white font-semibold px-7 py-3.5 rounded-full shadow-lg shadow-purple-500/20 transition-colors text-sm">
                            Explore Features
                        </a>
                    </div>
                </div>

                {/* Content row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                    {/* Video card — 8 cols */}
                    <div className="lg:col-span-8 relative group rounded-3xl overflow-hidden shadow-xl border border-purple-100" style={{background:'#1E0B3C',minHeight:360}}>
                        <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#2A1054,rgba(91,46,255,0.6),rgba(88,28,135,0.8))'}} />
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'28px 28px'}} />

                        <div className="relative z-10 flex flex-col items-center justify-center p-10 text-center" style={{minHeight:300}}>
                            {/* Play button */}
                            <div className="w-16 h-16 rounded-full bg-white/15 border border-white/30 flex items-center justify-center mb-5 flex-shrink-0">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <p style={{color:'#fff',fontSize:20,fontWeight:700,marginBottom:8}}>See UMAHZ In Action</p>
                            <p style={{color:'#c4b5fd',fontSize:14}}>2-minute product walkthrough</p>
                        </div>

                        <div className="relative z-10 flex items-center justify-between px-6 py-4" style={{background:'rgba(0,0,0,0.2)',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                            <div>
                                <p style={{color:'#c4b5fd',fontSize:10,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600}}>Interactive Demo</p>
                                <p style={{color:'#fff',fontSize:14,fontWeight:700}}>Unified Clinical Workspace</p>
                            </div>
                            <span style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',padding:'4px 12px',borderRadius:999,color:'#fff',fontSize:12,fontWeight:600,flexShrink:0}}>2:45 min</span>
                        </div>
                    </div>

                    {/* Stat cards — 4 cols */}
                    <div className="lg:col-span-4 flex flex-col gap-5">
                        {/* Card 1 */}
                        <div className="flex-1 bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4 flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="#5B2EFF" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <h3 className="text-[#1E0B3C] font-bold text-base mb-2">98% Admin Time Saved</h3>
                            <p className="text-slate-500 text-sm leading-relaxed flex-1">Automated intake forms, instant SOAP charting, and one-click online booking eliminate front-desk overhead.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="flex-1 bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-4 flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="#db2777" strokeWidth="1.8" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                            </div>
                            <h3 className="text-[#1E0B3C] font-bold text-base mb-2">HIPAA & GDPR Compliant</h3>
                            <p className="text-slate-500 text-sm leading-relaxed flex-1">Enterprise-grade security with role-based access, encrypted storage, and full audit trails across all locations.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
