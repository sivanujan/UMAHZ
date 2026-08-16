import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { PROFESSIONS } from '@/Data/professions';
import Logo from '@/Components/Common/Logo';

const LINKS = {
    'Quick Links': [
        { label: 'Home', href: '/' },
        { label: 'Features', href: '/features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
    ],
    'Modalities': PROFESSIONS.map((p) => ({ label: p.name, href: `/professions/${p.slug}` })),
    'Help Center': [
        { label: 'FAQ', href: '/faq' },
        { label: 'Security & Privacy', href: '/security' },
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'System Status', href: '#' },
    ],
    'Follow Us': [
        { label: 'LinkedIn', href: '#' },
        { label: 'Twitter / X', href: '#' },
        { label: 'Instagram', href: '#' },
        { label: 'YouTube', href: '#' },
        { label: 'Facebook', href: '#' },
    ],
};

export default function FooterSection() {
    const [email, setEmail] = useState('');

    return (
        <footer className="pt-20 pb-10 relative overflow-hidden" style={{background:'#1E0B3C',color:'#c4b5fd'}}>
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            <div className="absolute top-0 left-0 rounded-full blur-3xl pointer-events-none" style={{width:256,height:256,background:'rgba(109,40,217,0.15)'}} />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 pb-14 border-b border-purple-800/50">

                    {/* Brand — 2 cols */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="flex items-center">
                            <Logo size="md" theme="dark" />
                        </div>

                        <p className="text-sm leading-relaxed max-w-xs" style={{color:'#a78bfa'}}>
                            The all-in-one practice management platform for multi-modality holistic wellness studios — from solo practitioners to enterprise clinics.
                        </p>

                        <div className="space-y-2">
                            <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.14em',color:'#e9d5ff'}}>Product Updates</p>
                            <div className="flex gap-2">
                                <input type="email" placeholder="your@practice.com" value={email} onChange={e=>setEmail(e.target.value)}
                                    className="flex-1 text-xs px-4 py-2.5 rounded-full outline-none min-w-0 transition-all duration-200 placeholder:text-purple-300/50 focus:bg-white/[0.08] focus:ring-4 focus:ring-[#7C3AED]/25"
                                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(139,92,246,0.35)',color:'#fff'}} />
                                <button
                                    className="text-white font-semibold text-xs px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                                    style={{flexShrink:0, background:'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', boxShadow:'0 6px 18px -6px rgba(37,99,235,0.5)'}}
                                >
                                    Subscribe
                                </button>
                            </div>
                            <p style={{fontSize:10,color:'#7c3aed'}}>No spam. Unsubscribe any time.</p>
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(LINKS).map(([heading, items]) => (
                        <div key={heading} className="space-y-4">
                            <h4 style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.14em',color:'#fff'}}>{heading}</h4>
                            <ul className="space-y-2.5">
                                {items.map(item => (
                                    <li key={item.label}>
                                        {item.href === '#' ? (
                                            <a href="#" className="hover:text-white transition-colors" style={{fontSize:12,color:'#a78bfa'}}>{item.label}</a>
                                        ) : (
                                            <Link href={item.href} className="hover:text-white transition-colors" style={{fontSize:12,color:'#a78bfa'}}>{item.label}</Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style={{fontSize:12,color:'#6d28d9'}}>
                    <p>© {new Date().getFullYear()} UMAHZ Technology Inc. All rights reserved.</p>
                    <div className="flex flex-wrap items-center justify-center gap-5">
                        {['Privacy Policy','Terms of Service','Cookie Policy','Accessibility'].map(l => (
                            <a key={l} href="#" className="hover:text-purple-300 transition-colors">{l}</a>
                        ))}
                    </div>
                    <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}
                        className="w-9 h-9 rounded-full bg-purple-900/60 border border-violet-700/50 flex items-center justify-center cursor-pointer flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </footer>
    );
}
