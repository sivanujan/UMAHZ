import React from 'react';
import Navbar from '@/Components/Layout/Navbar';

export default function HeroSection() {
    return (
        <section id="home" className="bg-[#F9F5FB] relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl" />
            </div>

            <Navbar />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">

                {/* HERO CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center pb-20 pt-6 lg:pt-10">

                    {/* Left */}
                    <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
                        <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full">
                            <span style={{width:6,height:6,borderRadius:'50%',background:'#ec4899',flexShrink:0,display:'inline-block'}}></span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-600">Integrated Practice Management</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                            One Platform For Your{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF]">Wellness</em>{' '}
                            Practice{' '}
                            <em className="not-italic font-light font-serif text-[#5B2EFF]">Growth!</em>
                        </h1>

                        <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                            UMAHZ unifies scheduling, SOAP notes, billing, and client management for Massage Therapy, Acupuncture, Personal Training, Nutrition, and Colon Hydrotherapy studios.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                            <a href="#booking" className="inline-flex justify-center items-center bg-[#5B2EFF] hover:bg-purple-700 text-white font-semibold px-8 py-4 rounded-full shadow-xl shadow-purple-500/25 transition-colors text-sm">
                                Book a Demo
                            </a>
                            <a href="#about" className="inline-flex justify-center items-center gap-3 text-[#1E0B3C] font-semibold text-sm group">
                                <span className="w-10 h-10 rounded-full bg-white border border-purple-200 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="#5B2EFF">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </span>
                                Watch Overview
                            </a>
                        </div>

                    </div>

                    {/* Right */}
                    <div className="relative order-1 lg:order-2">
                        <div className="absolute inset-6 bg-gradient-to-br from-purple-300/40 to-pink-300/30 rounded-[2rem] rotate-3 scale-105 -z-10" />
                        <div className="relative bg-white rounded-[2rem] p-3 shadow-2xl border border-purple-100 overflow-hidden">
                            <div style={{background:'linear-gradient(135deg,#2A1054,#5B2EFF,#9C40FF)',borderRadius:'1.6rem',minHeight:440,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',padding:'2rem'}}>
                                <div style={{position:'absolute',top:24,right:24,width:80,height:80,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)'}} />
                                <div style={{position:'absolute',bottom:60,left:30,width:50,height:50,borderRadius:'50%',border:'1px solid rgba(244,114,182,0.3)',background:'rgba(244,114,182,0.15)'}} />

                                <div style={{textAlign:'center',zIndex:1}}>
                                    <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                        </svg>
                                    </div>
                                    <p style={{color:'#fff',fontSize:20,fontWeight:700,marginBottom:8}}>Multi-Modality<br/>Practice Suite</p>
                                    <p style={{color:'#c4b5fd',fontSize:14}}>Booking · SOAP Notes · Billing</p>
                                </div>

                                <div style={{position:'absolute',top:32,left:-12,background:'#fff',borderRadius:12,padding:'6px 12px',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',fontSize:12,fontWeight:700,color:'#1E0B3C',zIndex:2}}>
                                    <span style={{color:'#5B2EFF'}}>↑ 38%</span> Revenue
                                </div>
                                <div style={{position:'absolute',bottom:48,right:-12,background:'#fff',borderRadius:12,padding:'6px 12px',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',fontSize:12,fontWeight:700,color:'#1E0B3C',zIndex:2}}>
                                    <span style={{color:'#10b981'}}>●</span> Live Dashboard
                                </div>
                            </div>

                            <div style={{position:'absolute',bottom:20,left:20,background:'rgba(255,255,255,0.92)',backdropFilter:'blur(8px)',padding:'10px 16px',borderRadius:12,boxShadow:'0 4px 12px rgba(0,0,0,0.1)',border:'1px solid #f3e8ff',maxWidth:'55%'}}>
                                <p style={{fontSize:10,color:'#5B2EFF',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>All-in-One Platform</p>
                                <p style={{fontSize:12,fontWeight:700,color:'#1E0B3C',marginTop:2}}>Clinical · Admin · Revenue</p>
                            </div>

                            <a href="#services" className="absolute bottom-5 right-5 w-10 h-10 rounded-full bg-[#5B2EFF] flex items-center justify-center shadow-lg shadow-purple-500/40">
                                <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
