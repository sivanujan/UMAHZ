import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, ArrowRight, Sun, Moon } from 'lucide-react';
import { PROFESSIONS } from '@/Data/professions';
import Logo from '@/Components/Common/Logo';
import ComingSoonModal from '@/Components/Common/ComingSoonModal';
import { useTheme } from '@/Contexts/ThemeContext';

const BRAND_GRADIENT = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)';

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

function ThemeToggle({ className = '' }) {
    let theme = null;
    try {
        theme = useTheme();
    } catch (e) {
        // Safe fallback if rendered without provider
    }
    if (!theme) return null;
    const { resolved, toggle } = theme;

    return (
        <button
            type="button"
            onClick={toggle}
            className={`flex items-center justify-center w-9 h-9 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] cursor-pointer shadow-2xs ${className}`}
            aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
        >
            {resolved === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
            )}
        </button>
    );
}

/** Desktop link with a quiet brand-gradient underline for the active/hover state */
function NavLink({ item, active }) {
    return (
        <Link
            href={item.href}
            className={`group relative py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-[#2563EB]/40 rounded ${
                active
                    ? 'text-[#2563EB] dark:text-[#5B9BFF] font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium'
            }`}
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
                    className="absolute -bottom-0.5 left-0 h-[2px] w-0 rounded-full bg-slate-300 dark:bg-slate-600 transition-all duration-300 ease-out group-hover:w-full motion-reduce:transition-none"
                />
            )}
        </Link>
    );
}

function ProfessionsMega({ onNavigate }) {
    return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[380px] z-50">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-2 shadow-[0_24px_48px_-16px_rgba(13,27,42,0.25)] dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]">
                <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    By profession
                </p>
                {PROFESSIONS.map((p) => (
                    <Link
                        key={p.slug}
                        href={`/professions/${p.slug}`}
                        onClick={onNavigate}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/80 focus-visible:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800"
                    >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#5B9BFF] transition-colors duration-150">
                            <p.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">{p.name}</span>
                            <span className="block truncate text-xs leading-tight mt-0.5 text-slate-500 dark:text-slate-400">{p.tagline}</span>
                        </span>
                    </Link>
                ))}
                <Link
                    href="/professions"
                    onClick={onNavigate}
                    className="mt-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#2563EB] dark:text-[#5B9BFF] transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                >
                    <span>See all professions</span>
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
            className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-md ${
                scrolled
                    ? 'bg-white/92 dark:bg-[#0B0F19]/92 border-b border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_24px_-18px_rgba(13,27,42,0.12)] dark:shadow-[0_8px_24px_-18px_rgba(0,0,0,0.6)]'
                    : 'bg-white/75 dark:bg-[#0B0F19]/75 border-b border-transparent'
            }`}
        >
            <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-24">
                <nav className="flex items-center justify-between gap-6 py-4">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-4"
                    >
                        <Logo size="md" />
                    </Link>

                    {/* Desktop Navigation Links */}
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
                                    className={`group relative flex items-center gap-1 py-1.5 text-sm transition-colors duration-200 ${
                                        isActive(item.href) || professionsOpen
                                            ? 'text-[#2563EB] dark:text-[#5B9BFF] font-semibold'
                                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium'
                                    }`}
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

                    {/* Desktop Action Group */}
                    <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
                        <ThemeToggle />

                        <Link
                            href="/login"
                            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/clinics/register"
                            className="rounded-full border border-blue-600/35 dark:border-blue-400/40 text-blue-600 dark:text-blue-400 px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                        >
                            Register as clinic
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] cursor-pointer"
                            style={{ background: BRAND_GRADIENT, boxShadow: '0 10px 22px -12px rgba(37,99,235,0.6)' }}
                        >
                            Book a demo
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center gap-2 lg:hidden">
                        <ThemeToggle />
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                            className="rounded-lg p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 cursor-pointer"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                {mobileOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                            </svg>
                        </button>
                    </div>
                </nav>

                {/* Mobile Dropdown Drawer */}
                {mobileOpen && (
                    <div className="mb-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xl lg:hidden">
                        {NAV_LINKS.map((item) => item.mega ? (
                            <div key={item.href}>
                                <button
                                    onClick={() => setMobileProfessionsOpen(!mobileProfessionsOpen)}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200"
                                >
                                    {item.label}
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 text-slate-500 ${mobileProfessionsOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {mobileProfessionsOpen && (
                                    <div className="space-y-1 pb-1 pl-2">
                                        {PROFESSIONS.map((p) => (
                                            <Link
                                                key={p.slug}
                                                href={`/professions/${p.slug}`}
                                                onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                                            >
                                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#5B9BFF]">
                                                    <p.icon className="h-4 w-4" />
                                                </span>
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
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
                                className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${
                                    isActive(item.href)
                                        ? 'text-[#2563EB] dark:text-[#5B9BFF]'
                                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="mt-2 border-t border-slate-200/90 dark:border-slate-800 pt-3 space-y-2">
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/clinics/register"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-lg border border-blue-600/35 dark:border-blue-400/40 px-3 py-2.5 text-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/40"
                            >
                                Register as clinic
                            </Link>
                            <Link
                                href="/contact"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md cursor-pointer"
                                style={{ background: BRAND_GRADIENT }}
                            >
                                Book a demo
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Global Coming Soon announcement modal */}
            <ComingSoonModal />
        </header>
    );
}
