import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { PROFESSIONS } from '@/Data/professions';
import Logo from '@/Components/Common/Logo';

const INK = '#0D1B2A';
const ROYAL = '#2563EB';
const SLATE = '#475569'; // darker slate — legible on the frosted bar (≈7:1)
const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';

// Logo is home, so it isn't repeated here. "Security & Privacy" shortens to
// "Security" in the bar; the page keeps its full title.
const NAV_LINKS = [
    { label: 'Features', href: '/features' },
    { label: 'Professions', href: '/professions', mega: true },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
    { label: 'About', href: '/about' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
];

function useScrolled(threshold = 8) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);
    return scrolled;
}

/** Desktop link with a quiet brand-gradient underline for the active/hover
 *  state — the one moving part, kept subtle and reduced-motion friendly. */
function NavLink({ item, active }) {
    return (
        <Link
            href={item.href}
            className="group relative py-1.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-[#2563EB]/40 rounded"
            style={{ color: active ? INK : SLATE, fontWeight: active ? 600 : 500 }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = INK; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = SLATE; }}
        >
            {item.label}
            <span
                aria-hidden="true"
                className="absolute -bottom-0.5 left-0 h-[2px] rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
                style={{ background: BRAND_GRADIENT, width: active ? '100%' : '0%' }}
            />
            {!active && (
                <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 left-0 h-[2px] w-0 rounded-full bg-slate-300 transition-all duration-300 ease-out group-hover:w-full motion-reduce:transition-none"
                />
            )}
        </Link>
    );
}

/** The signature: professions shown as the distinct clinical worlds UMAHZ
 *  serves, each with its real tagline — not a generic link list. */
function ProfessionsMega({ onNavigate }) {
    return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[380px]">
            <div
                className="rounded-2xl border bg-white p-2 shadow-[0_24px_48px_-16px_rgba(13,27,42,0.22)]"
                style={{ borderColor: '#E6EBF1' }}
            >
                <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#94A3B8' }}>
                    By profession
                </p>
                {PROFESSIONS.map((p) => (
                    <Link
                        key={p.slug}
                        href={`/professions/${p.slug}`}
                        onClick={onNavigate}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:bg-[#F1F5F9]"
                    >
                        <span
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-150"
                            style={{ background: 'rgba(37,99,235,0.09)', color: ROYAL }}
                        >
                            <p.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-tight" style={{ color: INK }}>{p.name}</span>
                            <span className="block truncate text-xs leading-tight mt-0.5" style={{ color: SLATE }}>{p.tagline}</span>
                        </span>
                    </Link>
                ))}
                <Link
                    href="/professions"
                    onClick={onNavigate}
                    className="mt-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-[#F1F5F9]"
                    style={{ color: ROYAL }}
                >
                    See all professions
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
            </div>
        </div>
    );
}

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [professionsOpen, setProfessionsOpen] = useState(false);
    const [mobileProfessionsOpen, setMobileProfessionsOpen] = useState(false);
    const { url } = usePage();
    const scrolled = useScrolled();

    const isActive = (href) => (href === '/' ? url === '/' : url.startsWith(href));

    return (
        <header
            className="sticky top-0 z-50 transition-all duration-300"
            style={{
                background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)',
                backdropFilter: 'saturate(180%) blur(12px)',
                WebkitBackdropFilter: 'saturate(180%) blur(12px)',
                borderBottom: `1px solid ${scrolled ? '#E6EBF1' : 'transparent'}`,
                boxShadow: scrolled ? '0 8px 24px -18px rgba(13,27,42,0.5)' : 'none',
            }}
        >
            <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-8 xl:px-12">
                <nav className="flex items-center justify-between gap-6 py-4">
                    <Link href="/" className="flex shrink-0 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-4">
                        <Logo size="md" />
                    </Link>

                    <div className="hidden items-center gap-5 text-[15px] lg:flex">
                        {NAV_LINKS.map((item) => item.mega ? (
                            <div
                                key={item.href}
                                className="relative"
                                onMouseEnter={() => setProfessionsOpen(true)}
                                onMouseLeave={() => setProfessionsOpen(false)}
                            >
                                <Link
                                    href={item.href}
                                    className="group relative flex items-center gap-1 py-1.5 transition-colors duration-200"
                                    style={{ color: isActive(item.href) ? INK : SLATE, fontWeight: isActive(item.href) ? 600 : 500 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = INK; }}
                                    onMouseLeave={(e) => { if (!isActive(item.href)) e.currentTarget.style.color = SLATE; }}
                                >
                                    {item.label}
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${professionsOpen ? 'rotate-180' : ''}`} />
                                    <span
                                        aria-hidden="true"
                                        className="absolute -bottom-0.5 left-0 h-[2px] rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
                                        style={{ background: BRAND_GRADIENT, width: (isActive(item.href) || professionsOpen) ? '100%' : '0%' }}
                                    />
                                </Link>
                                {professionsOpen && <ProfessionsMega onNavigate={() => setProfessionsOpen(false)} />}
                            </div>
                        ) : (
                            <NavLink key={item.href} item={item} active={isActive(item.href)} />
                        ))}
                    </div>

                    <div className="hidden shrink-0 items-center gap-2 lg:flex">
                        <Link
                            href="/login"
                            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                            style={{ color: INK }}
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/clinics/register"
                            className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                            style={{ color: ROYAL, borderColor: 'rgba(37,99,235,0.35)' }}
                        >
                            Register as clinic
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
                            style={{ background: BRAND_GRADIENT, boxShadow: '0 10px 22px -12px rgba(37,99,235,0.6)' }}
                        >
                            Book a demo
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileOpen}
                        className="rounded-lg p-2 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                        style={{ color: INK }}
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            {mobileOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                        </svg>
                    </button>
                </nav>

                {mobileOpen && (
                    <div
                        className="mb-4 rounded-2xl border bg-white p-4 shadow-xl lg:hidden"
                        style={{ borderColor: '#E6EBF1' }}
                    >
                        {NAV_LINKS.map((item) => item.mega ? (
                            <div key={item.href}>
                                <button
                                    onClick={() => setMobileProfessionsOpen(!mobileProfessionsOpen)}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold"
                                    style={{ color: INK }}
                                >
                                    {item.label}
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileProfessionsOpen ? 'rotate-180' : ''}`} style={{ color: SLATE }} />
                                </button>
                                {mobileProfessionsOpen && (
                                    <div className="space-y-1 pb-1 pl-2">
                                        {PROFESSIONS.map((p) => (
                                            <Link
                                                key={p.slug}
                                                href={`/professions/${p.slug}`}
                                                onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2"
                                            >
                                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(37,99,235,0.09)', color: ROYAL }}>
                                                    <p.icon className="h-4 w-4" />
                                                </span>
                                                <span className="text-sm font-medium" style={{ color: INK }}>{p.name}</span>
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
                                className="block rounded-lg px-3 py-2.5 text-sm font-semibold"
                                style={{ color: isActive(item.href) ? ROYAL : INK }}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="mt-2 border-t pt-3" style={{ borderColor: '#E6EBF1' }}>
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-lg px-3 py-2.5 text-sm font-semibold"
                                style={{ color: INK }}
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/clinics/register"
                                onClick={() => setMobileOpen(false)}
                                className="mt-1 block rounded-lg border px-3 py-2.5 text-center text-sm font-semibold"
                                style={{ color: ROYAL, borderColor: 'rgba(37,99,235,0.35)' }}
                            >
                                Register as clinic
                            </Link>
                            <Link
                                href="/contact"
                                onClick={() => setMobileOpen(false)}
                                className="mt-1 flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold text-white"
                                style={{ background: BRAND_GRADIENT }}
                            >
                                Book a demo
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
