import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { PROFESSIONS } from '@/Data/professions';
import Button from '@/Components/UI/Button';

const NAV_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Features', href: '/features' },
    { label: 'Professions', href: '/professions', dropdown: true },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security & Privacy', href: '/security' },
    { label: 'About', href: '/about' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [professionsOpen, setProfessionsOpen] = useState(false);
    const [mobileProfessionsOpen, setMobileProfessionsOpen] = useState(false);
    const { url } = usePage();

    const isActive = (href) => (href === '/' ? url === '/' : url.startsWith(href));

    return (
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-40">
            <nav className="flex items-center justify-between py-5">
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#5B2EFF,#a855f7)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>U</span>
                    <span className="text-xl font-bold text-[#1E0B3C] tracking-tight">UMAHZ<span className="text-[#5B2EFF]">.</span></span>
                </Link>

                <div className="hidden xl:flex items-center gap-5 text-[13px] font-medium text-slate-600">
                    {NAV_LINKS.map((item) => item.dropdown ? (
                        <div
                            key={item.href}
                            className="relative"
                            onMouseEnter={() => setProfessionsOpen(true)}
                            onMouseLeave={() => setProfessionsOpen(false)}
                        >
                            <Link
                                href={item.href}
                                className={`flex items-center gap-1 transition-colors ${isActive(item.href) ? 'text-[#5B2EFF] font-semibold' : 'hover:text-[#5B2EFF]'}`}
                            >
                                {item.label}
                                <ChevronDown className="w-3.5 h-3.5" />
                            </Link>
                            {professionsOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-64">
                                    <div className="bg-white rounded-2xl shadow-xl border border-purple-100 p-2">
                                        {PROFESSIONS.map((p) => (
                                            <Link
                                                key={p.slug}
                                                href={`/professions/${p.slug}`}
                                                className="block px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-purple-50 hover:text-[#5B2EFF] transition-colors"
                                            >
                                                {p.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`transition-colors ${isActive(item.href) ? 'text-[#5B2EFF] font-semibold' : 'hover:text-[#5B2EFF]'}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                <div className="hidden xl:flex items-center gap-4 shrink-0">
                    <Link href="/login" className="text-sm font-semibold text-[#1E0B3C] hover:text-[#5B2EFF] transition-colors">
                        Login
                    </Link>
                    <Button href="/contact" size="sm">Book a Demo</Button>
                </div>

                <button onClick={() => setMobileOpen(!mobileOpen)} className="xl:hidden p-2 text-[#1E0B3C]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {mobileOpen
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                    </svg>
                </button>
            </nav>

            {mobileOpen && (
                <div className="xl:hidden bg-white rounded-2xl shadow-xl border border-purple-100 p-6 mb-6 space-y-1 text-sm font-medium text-slate-700">
                    {NAV_LINKS.map((item) => item.dropdown ? (
                        <div key={item.href}>
                            <button
                                onClick={() => setMobileProfessionsOpen(!mobileProfessionsOpen)}
                                className="w-full flex items-center justify-between py-2 hover:text-[#5B2EFF]"
                            >
                                {item.label}
                                <ChevronDown className={`w-4 h-4 transition-transform ${mobileProfessionsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {mobileProfessionsOpen && (
                                <div className="pl-4 space-y-1 pb-2">
                                    {PROFESSIONS.map((p) => (
                                        <Link
                                            key={p.slug}
                                            href={`/professions/${p.slug}`}
                                            onClick={() => setMobileOpen(false)}
                                            className="block py-1.5 text-slate-500 hover:text-[#5B2EFF]"
                                        >
                                            {p.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="block py-2 hover:text-[#5B2EFF]"
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 font-semibold hover:text-[#5B2EFF]"
                    >
                        Login
                    </Link>
                    <Link
                        href="/contact"
                        onClick={() => setMobileOpen(false)}
                        className="block text-center bg-[#5B2EFF] text-white font-semibold px-5 py-3 rounded-full mt-3"
                    >
                        Book a Demo
                    </Link>
                </div>
            )}
        </div>
    );
}
