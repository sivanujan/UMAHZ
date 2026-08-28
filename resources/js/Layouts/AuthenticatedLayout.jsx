import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Building2,
    MapPin,
    LogOut,
    Activity,
    UserCheck,
    ChevronDown,
    Sun,
    Moon,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/Contexts/ThemeContext';

function isActive(currentUrl, href) {
    if (!href || href === '#') return false;
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
}

function ThemeToggleButton() {
    const { resolved, toggle } = useTheme();
    return (
        <button
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--umahz-accent)]"
            style={{ color: 'var(--umahz-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--umahz-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
            {resolved === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}

function NavLink({ item, active }) {
    return (
        <Link
            href={item.href}
            className="group relative flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--umahz-sidebar-active-bar)]"
            style={active
                ? { background: 'var(--umahz-sidebar-active-bg)', color: '#FFFFFF', fontWeight: 600 }
                : { color: 'var(--umahz-sidebar-text)', fontWeight: 500 }}
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
            <item.icon
                className="mr-3 h-4 w-4 flex-shrink-0 transition-colors"
                style={{ color: active ? '#FFFFFF' : 'var(--umahz-sidebar-text-muted)' }}
            />
            {item.name}
        </Link>
    );
}

function NavGroup({ label, items, currentUrl }) {
    if (items.length === 0) return null;
    return (
        <div className="px-3">
            <p
                className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--umahz-sidebar-heading)' }}
            >
                {label}
            </p>
            <div className="space-y-1">
                {items.map((item) => (
                    <NavLink key={item.name} item={item} active={isActive(currentUrl, item.href)} />
                ))}
            </div>
        </div>
    );
}

function AppShell({ children, title }) {
    const { auth, app } = usePage().props;
    const { url: currentUrl } = usePage();
    const { resolved } = useTheme();
    const user = auth.user;
    const tenant = auth.tenant;

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const isOwnerOrAdmin = user?.role === 'clinic_owner' || user?.is_platform_admin;

    const overview = [
        { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, show: true },
        { name: 'Clients', href: '/app/clients', icon: Users, show: true },
        { name: 'Appointments', href: '/app/calendar', icon: Calendar, show: true },
    ].filter((i) => i.show);

    const management = [
        { name: 'Locations & Rooms', href: '/app/locations', icon: MapPin, show: isOwnerOrAdmin },
        { name: 'Staff Members', href: '/app/staff', icon: UserCheck, show: isOwnerOrAdmin },
        { name: 'Clinic Settings', href: '/app/settings', icon: Building2, show: isOwnerOrAdmin },
    ].filter((i) => i.show);

    return (
        <div
            className={`umahz-app min-h-screen flex antialiased transition-colors duration-300 ${resolved === 'dark' ? 'dark' : ''}`}
            style={{ background: 'var(--umahz-bg)', color: 'var(--umahz-text-primary)' }}
        >
            {/* Sidebar */}
            <aside
                className="w-64 flex flex-col border-r transition-colors duration-300"
                style={{ background: 'var(--umahz-sidebar-bg)', borderColor: 'var(--umahz-sidebar-border)' }}
            >
                {/* Brand */}
                <div
                    className="h-16 flex items-center px-6 border-b"
                    style={{ borderColor: 'var(--umahz-sidebar-border)' }}
                >
                    <div className="flex items-center space-x-3">
                        <img src="/imags/logo.png" alt="UMAHZ" className="h-9 w-9 object-contain flex-shrink-0" />
                        <div>
                            <h1 className="font-semibold text-sm tracking-wide leading-none" style={{ color: '#FFFFFF' }}>UMAHZ</h1>
                            <span className="text-xs font-medium leading-none block mt-1" style={{ color: 'var(--umahz-accent-teal)' }}>Wellness Platform</span>
                        </div>
                    </div>
                </div>

                {/* Tenant badge */}
                {tenant && (
                    <div
                        className="px-4 py-3 mx-3 my-3 rounded-lg border"
                        style={{ background: 'var(--umahz-sidebar-hover)', borderColor: 'var(--umahz-sidebar-border)' }}
                    >
                        <div className="flex items-center space-x-2 text-xs">
                            <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--umahz-accent-teal)' }} />
                            <span className="font-medium truncate" style={{ color: '#FFFFFF' }}>{tenant.name}</span>
                        </div>
                        <div className="mt-1 text-[11px] flex items-center justify-between" style={{ color: 'var(--umahz-sidebar-text-muted)' }}>
                            <span>{tenant.currency} ({tenant.timezone})</span>
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: 'rgba(34,197,94,0.14)', color: '#4ADE80' }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
                                Active
                            </span>
                        </div>
                    </div>
                )}

                {/* Grouped navigation */}
                <nav className="flex-1 py-1 overflow-y-auto">
                    <NavGroup label="Overview" items={overview} currentUrl={currentUrl} />
                    {management.length > 0 && (
                        <>
                            <div className="mx-6 my-3 border-t" style={{ borderColor: 'var(--umahz-sidebar-border)' }} />
                            <NavGroup label="Management" items={management} currentUrl={currentUrl} />
                        </>
                    )}
                </nav>

                {/* User + logout */}
                <div
                    className="p-4 border-t"
                    style={{ borderColor: 'var(--umahz-sidebar-border)' }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div
                                className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0"
                                style={{ background: 'var(--umahz-sidebar-active-bg)', color: '#FFFFFF' }}
                            >
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="truncate">
                                <div className="text-xs font-medium truncate" style={{ color: '#FFFFFF' }}>{user?.name}</div>
                                <div className="text-[11px] font-medium capitalize" style={{ color: 'var(--umahz-accent-teal)' }}>
                                    {user?.is_platform_admin ? 'Platform Admin' : (user?.role || 'Staff').replace('_', ' ')}
                                </div>
                            </div>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="p-1.5 rounded-md transition-colors"
                            style={{ color: 'var(--umahz-sidebar-text-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'var(--umahz-sidebar-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--umahz-sidebar-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header
                    className="h-16 px-8 flex items-center justify-between border-b transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>{title || 'Dashboard'}</h2>

                    <div className="flex items-center gap-3">
                        {/* Dev-only tenant-scope indicator (hidden in production) */}
                        {app?.isLocal && (
                            <div
                                className="hidden sm:inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium"
                                style={{ background: 'var(--umahz-hover)', color: 'var(--umahz-text-tertiary)' }}
                                title="Developer indicator — visible in local environment only"
                            >
                                <Activity className="w-3 h-3 mr-1" />
                                Tenant Scoped Engine
                            </div>
                        )}

                        <ThemeToggleButton />

                        <div className="h-6 w-px" style={{ background: 'var(--umahz-border)' }} />

                        {/* User identity — primary */}
                        <div className="relative">
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--umahz-accent)]"
                                style={{ color: 'var(--umahz-text-primary)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--umahz-hover)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: 'color-mix(in srgb, var(--umahz-accent) 15%, transparent)', color: 'var(--umahz-accent)' }}
                                >
                                    {user?.name?.charAt(0) || 'U'}
                                </span>
                                <span className="hidden sm:flex flex-col items-start leading-tight">
                                    <span className="font-semibold max-w-[160px] truncate">{user?.name}</span>
                                    <span className="text-[11px]" style={{ color: 'var(--umahz-text-tertiary)' }}>{user?.email}</span>
                                </span>
                                <ChevronDown className="w-4 h-4" style={{ color: 'var(--umahz-text-tertiary)' }} />
                            </button>

                            {userDropdownOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg border py-1 z-50"
                                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                                >
                                    <div className="px-4 py-2 text-xs border-b" style={{ color: 'var(--umahz-text-secondary)', borderColor: 'var(--umahz-border)' }}>
                                        Signed in as <span className="font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>{user?.name}</span>
                                    </div>
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="w-full text-left px-4 py-2 text-xs flex items-center hover:bg-rose-500/10"
                                        style={{ color: 'var(--umahz-danger)' }}
                                    >
                                        <LogOut className="w-3.5 h-3.5 mr-2" />
                                        Sign out
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AuthenticatedLayout({ children, title }) {
    return (
        <ThemeProvider storageKey="umahz-app-theme" initialPreference="light">
            <AppShell title={title}>{children}</AppShell>
        </ThemeProvider>
    );
}
