import React from 'react';

const MODULES = [
    { initials:'MT', name:'Massage Therapy Module', specialty:'Body mapping · Room scheduling · SOAP charting', bg:'linear-gradient(135deg,#a78bfa,#6366f1)' },
    { initials:'AC', name:'Acupuncture & TCM Module', specialty:'Meridian charts · Herbal inventory · Pulse assessment', bg:'linear-gradient(135deg,#f472b6,#f43f5e)' },
    { initials:'PT', name:'Personal Training Module', specialty:'Workout plans · Progress tracking · Commissions', bg:'linear-gradient(135deg,#fbbf24,#f97316)' },
];

const SOCIAL_PATHS = [
    'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z',
    'M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z',
    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
];

export default function DoctorsSection() {
    return (
        <section id="team" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">

                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">Platform Modules</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            Explore Our{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF]">Specialty</em>{' '}
                            Practice Modules
                        </h2>
                    </div>
                    <a href="#services" className="inline-flex items-center bg-[#F9F5FB] hover:bg-purple-50 text-[#5B2EFF] border border-purple-200 font-medium px-6 py-3 rounded-full transition-colors text-sm" style={{flexShrink:0}}>
                        View All Modules
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {MODULES.map((m) => (
                        <div key={m.name} className="bg-[#F9F5FB] rounded-3xl p-4 border border-purple-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden">

                            {/* Card image area — gradient with initials, NO SVG */}
                            <div style={{borderRadius:16,height:256,background:m.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',marginBottom:20}}>
                                <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'20px 20px'}} />
                                <div style={{width:72,height:72,borderRadius:16,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,zIndex:1,flexShrink:0}}>
                                    <span style={{color:'#fff',fontSize:28,fontWeight:800}}>{m.initials}</span>
                                </div>
                                <span style={{color:'rgba(255,255,255,0.75)',fontSize:12,fontWeight:600,zIndex:1}}>Module</span>
                            </div>

                            <div className="px-2 pb-2 space-y-2">
                                <h3 className="text-[#1E0B3C] text-lg font-bold">{m.name}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{m.specialty}</p>

                                <div className="flex items-center gap-3 pt-3">
                                    {SOCIAL_PATHS.map((path, idx) => (
                                        <button key={idx} className="w-8 h-8 rounded-full border border-purple-200 flex items-center justify-center bg-transparent cursor-pointer flex-shrink-0">
                                            <svg className="w-3.5 h-3.5" fill="#64748b" viewBox="0 0 24 24">
                                                <path d={path} />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
