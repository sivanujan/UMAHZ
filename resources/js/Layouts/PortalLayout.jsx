import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard, CalendarDays, FileText, CreditCard, MessageSquare, Settings as SettingsIcon,
    LogOut, ChevronDown, Search, Bell, Plus, Menu, X, Sun, Moon,
} from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import { ThemeProvider, useTheme } from '@/Contexts/ThemeContext';

const MANROPE = "'Manrope', system-ui, -apple-system, sans-serif";

/* Grouped so navigation state reads at a glance and matches the Owner
   dashboard's sidebar structure (headings + divider + active accent bar). */
const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
            { name: 'Appointments', href: '#', icon: CalendarDays },
            { name: 'Forms', href: '#', icon: FileText },
        ],
    },
    {
        label: 'Account',
        items: [
            { name: 'Billing', href: '#', icon: CreditCard },
            { name: 'Messages', href: '#', icon: MessageSquare },
            { name: 'Settings', href: '/portal/settings', icon: SettingsIcon },
        ],
    },
];

function isActive(currentUrl, href) {
    if (href === '#') return false;
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
}

function SidebarNavLink({ item, active, onNavigate }) {
    return (
        <Link
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--umahz-sidebar-active-bar)] ${
                active ? 'font-bold' : 'font-medium'
            }`}
            style={active
                ? { background: 'var(--umahz-sidebar-active-bg)', color: '#FFFFFF' }
                : { color: 'var(--umahz-sidebar-text)' }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--umahz-sidebar-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
            {active && (
                <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                    style={{ background: 'var(--umahz-sidebar-active-bar)' }}
                />
            )}
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {item.name}
        </Link>
    );
}

function SidebarContent({ currentUrl, onNavigate }) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-5 pt-6 pb-5">
                <Link href="/portal/dashboard" className="flex items-center" onClick={onNavigate}>
                    <Logo size="sm" theme="dark" />
                </Link>
            </div>

            <div className="px-4 mb-5">
                <Link
                    href="#"
                    onClick={onNavigate}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-white font-semibold text-sm rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)', boxShadow: '0 10px 24px -10px rgba(37,99,235,0.6)' }}
                >
                    <Plus className="w-4 h-4" />
                    Book Appointment
                </Link>
            </div>

            <nav className="flex-1 px-3 overflow-y-auto">
                {NAV_GROUPS.map((group, gi) => (
                    <div key={group.label}>
                        {gi > 0 && (
                            <div className="mx-3 my-3 border-t" style={{ borderColor: 'var(--umahz-sidebar-border)' }} />
                        )}
                        <p
                            className="px-3.5 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: 'var(--umahz-sidebar-heading)' }}
                        >
                            {group.label}
                        </p>
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <SidebarNavLink
                                    key={item.name}
                                    item={item}
                                    active={isActive(currentUrl, item.href)}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="px-4 pb-5 pt-3">
                <div className="rounded-xl border px-4 py-3.5" style={{ background: 'var(--umahz-sidebar-hover)', borderColor: 'var(--umahz-sidebar-border)' }}>
                    <p className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>Need help?</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--umahz-sidebar-text-muted)' }}>Reach out to your clinic's front desk anytime.</p>
                </div>
            </div>
        </div>
    );
}

function ThemeToggleButton() {
    const { resolved, toggle } = useTheme();
    return (
        <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="relative p-2 rounded-full transition-colors duration-200 hover:bg-[var(--umahz-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            style={{ color: 'var(--umahz-text-secondary)' }}
        >
            {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}

function PortalShell({ children, title }) {
    const { props, url: currentUrl } = usePage();
    const { auth } = props;
    const user = auth.user;
    const { resolved } = useTheme();
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div
            className={`umahz-portal min-h-screen font-sans antialiased transition-colors duration-300 ${resolved === 'dark' ? 'dark' : ''}`}
            style={{ fontFamily: MANROPE, background: 'var(--umahz-bg)', color: 'var(--umahz-text-primary)' }}
        >
            {/* Desktop sidebar */}
            <aside
                className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r flex-col z-30 transition-colors duration-300"
                style={{ background: 'var(--umahz-sidebar-bg)', borderColor: 'var(--umahz-sidebar-border)' }}
            >
                <SidebarContent currentUrl={currentUrl} />
            </aside>

            {/* Mobile sidebar drawer */}
            {mobileSidebarOpen && (
                <div className="md:hidden fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileSidebarOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl flex flex-col" style={{ background: 'var(--umahz-sidebar-bg)' }}>
                        <div className="flex justify-end px-4 pt-4">
                            <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <SidebarContent currentUrl={currentUrl} onNavigate={() => setMobileSidebarOpen(false)} />
                    </aside>
                </div>
            )}

            <div className="md:pl-64">
                <header
                    className="sticky top-0 z-20 backdrop-blur-sm border-b transition-colors duration-300"
                    style={{ background: resolved === 'dark' ? 'rgba(22,27,34,0.9)' : 'rgba(255,255,255,0.9)', borderColor: 'var(--umahz-border)' }}
                >
                    <div className="px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                onClick={() => setMobileSidebarOpen(true)}
                                className="md:hidden p-1.5 -ml-1"
                                style={{ color: 'var(--umahz-text-secondary)' }}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="relative hidden sm:block w-full max-w-xs">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--umahz-text-tertiary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-4 py-2.5 border border-transparent rounded-xl text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/40"
                                    style={{ background: 'var(--umahz-hover)', color: 'var(--umahz-text-primary)' }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <ThemeToggleButton />

                            <button
                                className="relative p-2 rounded-full transition-colors duration-200 hover:bg-[var(--umahz-hover)]"
                                style={{ color: 'var(--umahz-text-secondary)' }}
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#06B6D4] ring-2 ring-[var(--umahz-surface)]" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    className="flex items-center gap-2 text-sm font-semibold pl-1.5 pr-1 py-1 rounded-full transition-colors duration-200 hover:bg-[var(--umahz-hover)]"
                                    style={{ color: 'var(--umahz-text-primary)' }}
                                >
                                    <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 text-[#2563EB] dark:text-[#5B9BFF] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {user?.name?.charAt(0) || 'C'}
                                    </span>
                                    <span className="hidden sm:inline max-w-[120px] truncate">{user?.name}</span>
                                    <ChevronDown className="w-4 h-4" style={{ color: 'var(--umahz-text-tertiary)' }} />
                                </button>

                                {userDropdownOpen && (
                                    <div
                                        className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg border py-1 z-50 transition-colors duration-300"
                                        style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                                    >
                                        <div className="px-4 py-2 text-xs border-b" style={{ color: 'var(--umahz-text-secondary)', borderColor: 'var(--umahz-border)' }}>
                                            Signed in as <span className="font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>{user?.name}</span>
                                        </div>
                                        <Link
                                            href="/portal/settings"
                                            className="w-full text-left px-4 py-2 text-xs flex items-center hover:bg-[var(--umahz-hover)]"
                                            style={{ color: 'var(--umahz-text-secondary)' }}
                                        >
                                            <SettingsIcon className="w-3.5 h-3.5 mr-2" />
                                            Settings
                                        </Link>
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="w-full text-left px-4 py-2 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center"
                                        >
                                            <LogOut className="w-3.5 h-3.5 mr-2" />
                                            Sign out
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="px-4 sm:px-6 py-8">
                    {title && <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--umahz-text-primary)' }}>{title}</h1>}
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function PortalLayout({ children, title, themePreference = 'system' }) {
    return (
        <ThemeProvider initialPreference={themePreference} persistUrl="/portal/settings/theme">
            <PortalShell title={title}>{children}</PortalShell>
        </ThemeProvider>
    );
}
