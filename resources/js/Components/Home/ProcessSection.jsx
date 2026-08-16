import React from 'react';

const STEPS = [
    { num:'01', title:'Quick Setup', desc:'Configure locations, treatment rooms, practitioner schedules, and branded consent forms in under 15 minutes.' },
    { num:'02', title:'Client Self-Booking', desc:'Embed your booking portal on your website or share a link — with smart intake forms collected automatically.' },
    { num:'03', title:'Integrated Care', desc:'Conduct sessions, complete SOAP notes, log body charts, and update treatment plans all in one place.' },
    { num:'04', title:'Grow & Automate', desc:'Process payments, track package balances, manage staff commissions, and view real-time revenue analytics.' },
];

export default function ProcessSection() {
    return (
        <section id="process" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">

                    {/* Left — decorative UI card, NO SVG icons */}
                    <div className="relative">
                        <div className="absolute -top-8 -left-8 rounded-full blur-3xl pointer-events-none" style={{width:256,height:256,background:'#ede9fe'}} />
                        <div className="relative rounded-3xl p-6 shadow-2xl text-white overflow-hidden" style={{background:'linear-gradient(135deg,#1E0B3C,#5B2EFF)',minHeight:360}}>
                            <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'24px 24px'}} />

                            <div className="relative z-10 space-y-3 mb-6">
                                <div className="flex items-center justify-between">
                                    <p style={{color:'#c4b5fd',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>Today's Schedule</p>
                                    <span style={{background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:999}}>Live</span>
                                </div>
                                {["10:00 – Sarah M. · Massage 60min","11:30 – James K. · Acupuncture","14:00 – Dana P. · Nutrition Consult"].map((line,i)=>(
                                    <div key={i} className="flex items-center gap-3" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:12,padding:'10px 16px'}}>
                                        <span style={{width:6,height:6,borderRadius:'50%',background:'#c4b5fd',flexShrink:0,display:'inline-block'}} />
                                        <p style={{color:'#fff',fontSize:13,fontWeight:500}}>{line}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="relative z-10" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:16,padding:16}}>
                                <p style={{color:'#c4b5fd',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Monthly Revenue</p>
                                <p style={{color:'#fff',fontSize:32,fontWeight:800}}>$24,850</p>
                                <p style={{color:'#10b981',fontSize:12,marginTop:4,fontWeight:600}}>↑ 23% vs last month</p>
                            </div>
                        </div>
                    </div>

                    {/* Right text */}
                    <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">Simple Onboarding</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            How UMAHZ Transforms Your{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF]">Daily</em>{' '}
                            Practice
                        </h2>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed">
                            Designed with licensed practitioners, UMAHZ removes technical friction so you spend more time on patient care and less on administration.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <a href="#booking" className="inline-flex items-center bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium px-7 py-3.5 rounded-full shadow-lg shadow-purple-500/20 transition-colors text-sm">
                                Book a Demo
                            </a>
                            <a href="#services" className="inline-flex items-center text-[#1E0B3C] hover:text-[#5B2EFF] font-medium px-7 py-3.5 rounded-full border border-purple-200 hover:border-[#5B2EFF] transition-colors text-sm">
                                Explore Features
                            </a>
                        </div>
                    </div>
                </div>

                {/* 4-column step cards — number badge with inline style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {STEPS.map((step) => (
                        <div key={step.num} className="bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                            <div style={{width:44,height:44,borderRadius:12,background:'#fff',color:'#5B2EFF',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',marginBottom:20,flexShrink:0}}>
                                {step.num}
                            </div>
                            <h3 className="text-[#1E0B3C] font-bold text-base mb-2">{step.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
