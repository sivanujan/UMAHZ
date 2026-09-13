import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { PROFESSIONS } from '@/Data/professions';
import Logo from '@/Components/Common/Logo';
import { openComingSoonModal } from '@/Components/Common/ComingSoonModal';

const LINKS = {
    'Quick Links': [
        { label: 'Home', href: '/' },
        { label: 'Features', href: '/features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: "What's Coming", action: 'coming-soon' },
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
        <footer className="pt-20 pb-10 relative overflow-hidden bg-[#1E0B3C] dark:bg-[#070A10] dark:border-t dark:border-slate-800/80 text-[#c4b5fd] dark:text-slate-400 transition-colors duration-300">
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
            />
            <div className="absolute top-0 left-0 rounded-full blur-3xl pointer-events-none w-64 h-64 bg-purple-700/15 dark:bg-purple-900/10" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 pb-14 border-b border-purple-800/50 dark:border-slate-800">

                    {/* Brand — 2 cols */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="flex items-center">
                            <Logo size="md" theme="dark" />
                        </div>

                        <p className="text-sm leading-relaxed max-w-xs text-purple-300/90 dark:text-slate-300 font-normal">
                            The all-in-one practice management platform for multi-modality holistic wellness studios — from solo practitioners to enterprise clinics.
                        </p>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-200 dark:text-slate-300">Product Updates</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="your@practice.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 text-xs px-4 py-2.5 rounded-full outline-none min-w-0 transition-all duration-200 placeholder:text-purple-300/50 dark:placeholder:text-slate-500 bg-white/5 dark:bg-slate-900/80 border border-purple-500/30 dark:border-slate-700 text-white focus:bg-white/[0.08] focus:ring-2 focus:ring-[#5B2EFF]"
                                />
                                <button
                                    type="button"
                                    className="text-white font-semibold text-xs px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer flex-shrink-0 bg-gradient-to-r from-[#5B2EFF] to-[#2E9BE6] shadow-md shadow-purple-500/25"
                                >
                                    Subscribe
                                </button>
                            </div>
                            <p className="text-[10px] text-purple-400 dark:text-slate-500">No spam. Unsubscribe any time.</p>
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(LINKS).map(([heading, items]) => (
                        <div key={heading} className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-white dark:text-slate-200">{heading}</h4>
                            <ul className="space-y-2.5">
                                {items.map((item) => (
                                    <li key={item.label}>
                                        {item.action === 'coming-soon' ? (
                                            <button
                                                type="button"
                                                onClick={openComingSoonModal}
                                                className="text-purple-300/85 dark:text-slate-400 hover:text-white dark:hover:text-white transition-colors cursor-pointer text-left text-xs inline-flex items-center"
                                            >
                                                <span>{item.label}</span>
                                                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/80 dark:bg-purple-950 text-purple-300 border border-purple-700/60 dark:border-purple-800/60">
                                                    New
                                                </span>
                                            </button>
                                        ) : item.href === '#' ? (
                                            <a href="#" className="text-purple-300/85 dark:text-slate-400 hover:text-white dark:hover:text-white transition-colors text-xs">{item.label}</a>
                                        ) : (
                                            <Link href={item.href} className="text-purple-300/85 dark:text-slate-400 hover:text-white dark:hover:text-white transition-colors text-xs">{item.label}</Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-purple-300/75 dark:text-slate-400">
                    <p>© {new Date().getFullYear()} UMAHZ Technology Inc. All rights reserved.</p>
                    <div className="flex flex-wrap items-center justify-center gap-5">
                        {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Accessibility'].map((l) => (
                            <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        aria-label="Scroll to top"
                        className="w-9 h-9 rounded-full bg-purple-900/60 dark:bg-slate-800 border border-violet-700/50 dark:border-slate-700 flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-purple-800 dark:hover:bg-slate-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </footer>
    );
}
