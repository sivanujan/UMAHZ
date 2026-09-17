import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Building2,
    MapPin,
    LogOut,
    UserCheck,
    ChevronDown,
    Sun,
    Moon,
    CreditCard,
    Wallet,
    BarChart3,
    Search,
    Bell,
    Plus,
    Menu,
    X,
    ExternalLink,
    FileText,
    Receipt,
    Loader2,
    ArrowRight,
    Clock,
    Compass,
    User,
    Settings,
    AlertCircle,
    BellRing,
    CheckCheck,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/Contexts/ThemeContext';
import AuroraBackground from '@/Components/AuroraBackground';

function isActive(currentUrl, href) {
    if (!href || href === '#') return false;
    if (href === '/app/reports/appointments' && currentUrl.startsWith('/app/reports')) return true;
    if ((href === '/app/calendar' || href === '/app/appointments') && (currentUrl.startsWith('/app/calendar') || currentUrl.startsWith('/app/appointments'))) return true;
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
}

function ThemeTogglePill() {
    const { resolved, toggle } = useTheme();
    const isDark = resolved === 'dark';

    return (
        <button
            onClick={toggle}
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ caretColor: 'transparent' }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60"
        >
            {isDark ? (
                <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light Mode</span>
                </>
            ) : (
                <>
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dark Mode</span>
                </>
            )}
        </button>
    );
}

function TopNavShell({ children, title }) {
    const { auth, app } = usePage().props;
    const { url: currentUrl } = usePage();
    const { resolved } = useTheme();
    const user = auth.user;
    const tenant = auth.tenant;

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [clinicNotifications, setClinicNotifications] = useState([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [readNotifIds, setReadNotifIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('umahz_read_notifications') || '[]');
        } catch {
            return [];
        }
    });
    const [browserPermission, setBrowserPermission] = useState(() => {
        return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
    });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({
        clients: [],
        appointments: [],
        invoices: [],
        navigation: [],
    });
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef(null);

    const userMenuRef = useRef(null);
    const moreMenuRef = useRef(null);
    const notifMenuRef = useRef(null);

    // Fetch dynamic clinic notifications
    const loadNotifications = () => {
        setIsLoadingNotifications(true);
        fetch('/app/notifications', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .then((data) => {
                setClinicNotifications(data.notifications || []);
                setIsLoadingNotifications(false);
            })
            .catch(() => setIsLoadingNotifications(false));
    };

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Mark notifications as read
    const markAllNotificationsAsRead = () => {
        const allIds = clinicNotifications.map((n) => n.id);
        const updated = Array.from(new Set([...readNotifIds, ...allIds]));
        setReadNotifIds(updated);
        try {
            localStorage.setItem('umahz_read_notifications', JSON.stringify(updated));
        } catch {}
    };

    const markSingleNotificationAsRead = (id) => {
        if (!readNotifIds.includes(id)) {
            const updated = [...readNotifIds, id];
            setReadNotifIds(updated);
            try {
                localStorage.setItem('umahz_read_notifications', JSON.stringify(updated));
            } catch {}
        }
    };

    // Request browser notification permission
    const requestBrowserPermission = () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        Notification.requestPermission().then((perm) => {
            setBrowserPermission(perm);
            if (perm === 'granted') {
                try {
                    new Notification('Clinic Notifications Activated 🔔', {
                        body: 'You will now receive desktop alerts for client appointments and clinic updates.',
                        icon: '/favicon.ico',
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        });
    };

    const sendTestNotification = () => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Test Clinic Alert 🩺', {
                    body: 'Desktop notifications are working! You will be alerted for bookings and clinic updates.',
                    icon: '/favicon.ico',
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const unreadCount = clinicNotifications.filter((n) => !readNotifIds.includes(n.id)).length;

    // Derive isDark early — needed by both the body-bg effect and the JSX
    const isDark = resolved === 'dark';

    // Focus input on searchOpen and reset query on close
    useEffect(() => {
        if (searchOpen) {
            const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        } else {
            setSearchQuery('');
            setSearchResults({ clients: [], appointments: [], invoices: [], navigation: [] });
            setIsSearching(false);
        }
    }, [searchOpen]);

    // Live search query with debouncing
    useEffect(() => {
        if (!searchOpen) return;
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults({ clients: [], appointments: [], invoices: [], navigation: [] });
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/app/search?q=${encodeURIComponent(trimmed)}`, {
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
                .then((res) => (res.ok ? res.json() : Promise.reject(res)))
                .then((data) => {
                    setSearchResults({
                        clients: data.clients || [],
                        appointments: data.appointments || [],
                        invoices: data.invoices || [],
                        navigation: data.navigation || [],
                    });
                    setIsSearching(false);
                })
                .catch((err) => {
                    if (err.name !== 'AbortError') {
                        setIsSearching(false);
                    }
                });
        }, 180);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery, searchOpen]);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserDropdownOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
                setMoreDropdownOpen(false);
            }
            if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
                setNotificationsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync body background and dark class with theme so the margin around the shell
    // never shows the default white body background and Tailwind dark: matches isDark.
    // Sync dark class and base canvas color with theme
    useEffect(() => {
        const baseColor = isDark ? '#0E0B14' : '#FBF7FD';
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.style.backgroundColor = baseColor;
        document.body.style.backgroundColor = baseColor;
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        return () => {
            document.documentElement.style.backgroundColor = '';
            document.body.style.backgroundColor = '';
        };
    }, [isDark]);

    // Add Cmd+K / Ctrl+K keyboard shortcut to toggle quick search and Escape to close
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isOwnerOrAdmin = user?.role === 'clinic_owner' || user?.is_platform_admin;
    const appointmentsHref = user?.role === 'practitioner' ? '/app/practitioner/appointments' : '/app/calendar';

    // Primary horizontal nav items
    const primaryNav = [
        { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
        { name: 'Clients', href: '/app/clients', icon: Users },
        { name: 'Appointments', href: appointmentsHref, icon: Calendar },
        { name: 'Reports', href: '/app/reports/appointments', icon: BarChart3 },
        { name: 'Locations & Rooms', href: '/app/locations', icon: MapPin, show: isOwnerOrAdmin },
        { name: 'Staff Members', href: '/app/staff', icon: UserCheck, show: isOwnerOrAdmin },
    ].filter((item) => item.show !== false);

    // Secondary items under "More" dropdown
    const moreNav = [
        { name: 'Clinic Settings', href: '/app/settings', icon: Building2, desc: 'Profile, disciplines & logo' },
        { name: 'Subscription & Billing', href: '/app/billing', icon: CreditCard, desc: 'Plans, seats & invoices' },
        { name: 'Connect payments', href: '/app/settings/payments', icon: Wallet, desc: 'Stripe gateway & payouts' },
    ].filter(() => isOwnerOrAdmin);

    const isMoreActive = moreNav.some((item) => isActive(currentUrl, item.href));

    return (
        <div
            className={`umahz-app min-h-screen antialiased transition-colors duration-300 relative ${isDark ? 'dark' : ''}`}
            style={{
                caretColor: 'transparent',
                color: 'var(--umahz-text-primary)',
                background: 'transparent',
                margin: 0,
                padding: 0,
            }}
        >
            {/* Brand-derived Aurora Glassmorphism Background Layer (-z-10) */}
            <AuroraBackground isDark={isDark} />

            {/* ── APP CONTENT CONTAINER ──────────────────────────────────── */}
            {/* 100% transparent centered container — no background or border */}
            {/* so the single full-viewport Aurora background is completely   */}
            {/* seamless edge to edge across all screen widths.              */}
            <div
                className="relative z-10 mx-auto w-full px-4 sm:px-6 lg:px-8"
                style={{
                    maxWidth: '1440px',
                    background: 'transparent',
                }}
            >
            {/* TOP HORIZONTAL NAVIGATION BAR — clean airy glass aesthetic */}
            <header
                className="w-full transition-colors duration-200"
                style={{
                    background: 'transparent',
                    borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(139,124,246,0.14)',
                }}
            >
                <div className="py-3.5 sm:py-4">
                    <div className="flex items-center justify-between min-h-[48px] gap-4 sm:gap-6">
                        {/* ── LEFT ZONE: Logo + Clinic Identity + Subtle Status Pill ── */}
                        <div className="flex items-center gap-3 shrink-0 min-w-0">
                            <Link
                                href="/app/dashboard"
                                className="flex items-center gap-3 group"
                                style={{ caretColor: 'transparent' }}
                            >
                                <div className="relative flex items-center justify-center shrink-0">
                                    <img
                                        src="/imags/logo.png"
                                        alt="UMAHZ"
                                        className="h-7 w-7 sm:h-8 sm:w-8 object-contain transition-transform duration-200 group-hover:scale-105"
                                    />
                                    <span
                                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2"
                                        style={{ ringColor: isDark ? '#0E1525' : 'white' }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white shrink-0">
                                            UMAHZ
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600 shrink-0 font-normal">/</span>
                                        <span className="font-semibold text-xs sm:text-sm text-violet-600 dark:text-violet-400 max-w-[130px] sm:max-w-[180px] truncate">
                                            {tenant?.name || 'Astrogenapp'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 leading-4">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Active {app?.isLocal ? '· Scoped' : ''}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* ── CENTER ZONE: Navigation Tabs (Comfortable Gaps, Soft White Pill for Active) ── */}
                        <nav className="hidden xl:flex items-center gap-1.5 lg:gap-2 flex-1 justify-center" aria-label="Primary navigation">
                            {primaryNav.map((item) => {
                                const active = isActive(currentUrl, item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        style={{
                                            caretColor: 'transparent',
                                            ...(active ? {
                                                background: isDark ? 'rgba(255,255,255,0.14)' : '#FFFFFF',
                                                color: isDark ? '#FFFFFF' : '#0F172A',
                                                boxShadow: isDark
                                                    ? '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                                                    : '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                                                border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.90)',
                                            } : {}),
                                        }}
                                        className={`relative flex items-center px-4 py-2 text-xs sm:text-[13px] font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                                            active
                                                ? 'font-semibold'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}

                            {/* "More" Dropdown for Management routes */}
                            {moreNav.length > 0 && (
                                <div className="relative" ref={moreMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-[13px] font-medium rounded-full transition-all duration-200 ${
                                            isMoreActive
                                                ? 'font-semibold'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                                        }`}
                                        style={{
                                            caretColor: 'transparent',
                                            ...(isMoreActive ? {
                                                background: isDark ? 'rgba(255,255,255,0.14)' : '#FFFFFF',
                                                color: isDark ? '#FFFFFF' : '#0F172A',
                                                boxShadow: isDark
                                                    ? '0 2px 10px rgba(0,0,0,0.35)'
                                                    : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
                                                border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.90)',
                                            } : {}),
                                        }}
                                    >
                                        <span>More</span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {moreDropdownOpen && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 w-64 rounded-2xl border p-2 z-50 animate-in fade-in duration-150"
                                            style={{
                                                background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.96)',
                                                backdropFilter: 'blur(20px)',
                                                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(148,163,184,0.35)',
                                                boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
                                            }}
                                        >
                                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Clinic Management
                                            </div>
                                            {moreNav.map((item) => {
                                                const active = isActive(currentUrl, item.href);
                                                const Icon = item.icon;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        onClick={() => setMoreDropdownOpen(false)}
                                                        style={{ caretColor: 'transparent' }}
                                                        className={`flex items-start gap-2.5 p-2 rounded-xl text-xs transition-colors ${
                                                            active
                                                                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                                                                : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                                                        }`}
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold">{item.name}</div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                {item.desc}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </nav>

                        {/* ── RIGHT ZONE: Evenly-spaced Rounded Icon Buttons (~40px) + Profile Pill ── */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                            {/* 1. Compact Rounded Search Button/Pill */}
                            <button
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                aria-label="Search clients, appointments, or invoices"
                                style={{
                                    caretColor: 'transparent',
                                    backdropFilter: 'blur(12px)',
                                }}
                                className="h-10 px-3 sm:px-3.5 rounded-full border flex items-center gap-2 text-xs transition-all duration-200 bg-white/70 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200/80 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.16] shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white group"
                            >
                                <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                                <span className="font-medium text-xs hidden md:inline">Search…</span>
                                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-slate-400">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* 2. Calendar Icon Button (~40px Rounded Circle) */}
                            <Link
                                href="/app/calendar"
                                title="Calendar & Appointments"
                                aria-label="Calendar & Appointments"
                                style={{
                                    caretColor: 'transparent',
                                    backdropFilter: 'blur(12px)',
                                }}
                                className="w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 bg-white/70 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200/80 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.16] shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                            >
                                <Calendar className="w-4 h-4" />
                            </Link>

                            {/* 3. Notifications Icon Button (~40px Rounded Circle with Dot Badge) */}
                            <div className="relative" ref={notifMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNotificationsOpen(!notificationsOpen);
                                        if (!notificationsOpen) {
                                            loadNotifications();
                                        }
                                    }}
                                    aria-label="Notifications"
                                    style={{
                                        caretColor: 'transparent',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                    className="relative w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 bg-white/70 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200/80 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.16] shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                >
                                    <Bell className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-black text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm tabular-nums">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {notificationsOpen && (
                                    <div
                                        className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded-2xl border p-3.5 z-50 animate-in fade-in duration-150 shadow-2xl"
                                        style={{
                                            background: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
                                            backdropFilter: 'blur(24px)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(148,163,184,0.35)',
                                            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                                        }}
                                    >
                                        {/* Dropdown Header */}
                                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    Clinic Notifications
                                                </span>
                                                {unreadCount > 0 ? (
                                                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                                        {unreadCount} New
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                        All read
                                                    </span>
                                                )}
                                            </div>
                                            {unreadCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={markAllNotificationsAsRead}
                                                    className="text-[11px] font-semibold text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300 transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCheck className="w-3.5 h-3.5" />
                                                    <span>Mark all read</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Browser Desktop Push Activation Card */}
                                        <div className="mt-2.5">
                                            {browserPermission === 'default' && (
                                                <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-purple-500/10 border border-violet-500/20 flex flex-col gap-2">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                                                            <BellRing className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                                Activate Desktop Notifications
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                                                Allow browser alerts to get instant popups for bookings, patient check-ins, and payments.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={requestBrowserPermission}
                                                        className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5"
                                                    >
                                                        <BellRing className="w-3.5 h-3.5" />
                                                        <span>Allow Notifications</span>
                                                    </button>
                                                </div>
                                            )}

                                            {browserPermission === 'granted' && (
                                                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Desktop Notifications Active
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={sendTestNotification}
                                                        className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
                                                    >
                                                        Send Test Alert
                                                    </button>
                                                </div>
                                            )}

                                            {browserPermission === 'denied' && (
                                                <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Desktop notifications are blocked in your browser site permissions.</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notifications Feed */}
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-2 max-h-64 overflow-y-auto text-xs pr-0.5">
                                            {isLoadingNotifications && clinicNotifications.length === 0 ? (
                                                <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                                                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                                                    <span>Loading activity…</span>
                                                </div>
                                            ) : clinicNotifications.length === 0 ? (
                                                <div className="py-8 text-center text-slate-400 space-y-1">
                                                    <Bell className="w-6 h-6 mx-auto opacity-40 mb-1" />
                                                    <p className="font-semibold text-slate-700 dark:text-slate-300">No notifications yet</p>
                                                    <p className="text-[11px]">You're all caught up with your practice activity.</p>
                                                </div>
                                            ) : (
                                                clinicNotifications.map((item) => {
                                                    const isRead = readNotifIds.includes(item.id);
                                                    const IconComponent =
                                                        item.icon === 'calendar'
                                                            ? Calendar
                                                            : item.icon === 'receipt'
                                                            ? Receipt
                                                            : item.icon === 'clock'
                                                            ? Clock
                                                            : item.icon === 'user'
                                                            ? User
                                                            : Settings;

                                                    const toneClasses = {
                                                        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                                        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                                                        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                                        indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                                                    }[item.tone] || 'bg-violet-500/10 text-violet-600 dark:text-violet-400';

                                                    return (
                                                        <Link
                                                            key={item.id}
                                                            href={item.url}
                                                            onClick={() => {
                                                                markSingleNotificationAsRead(item.id);
                                                                setNotificationsOpen(false);
                                                            }}
                                                            className={`py-2.5 px-2 rounded-xl flex items-start gap-2.5 transition-colors group ${
                                                                isRead
                                                                    ? 'hover:bg-slate-100/60 dark:hover:bg-white/[0.04] opacity-85'
                                                                    : 'hover:bg-violet-50/60 dark:hover:bg-violet-950/30 bg-violet-50/20 dark:bg-violet-950/10'
                                                            }`}
                                                        >
                                                            {/* Unread Status Dot */}
                                                            <span
                                                                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                                                    isRead
                                                                        ? 'bg-slate-300 dark:bg-slate-700'
                                                                        : 'bg-violet-600 ring-2 ring-violet-400/40'
                                                                }`}
                                                            />

                                                            {/* Icon Box */}
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${toneClasses}`}>
                                                                <IconComponent className="w-3.5 h-3.5" />
                                                            </div>

                                                            {/* Text */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                        {item.title}
                                                                    </p>
                                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                                        {item.time_ago}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                                                                    {item.message}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Dropdown Footer */}
                                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                                            <Link
                                                href="/app/calendar"
                                                onClick={() => setNotificationsOpen(false)}
                                                className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                                            >
                                                View Schedule & Bookings →
                                            </Link>
                                            <span className="text-slate-400 text-[10px]">
                                                {clinicNotifications.length} updates
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. Profile Grouped Container (Avatar Circle + Name + Chevron in one Rounded Pill) */}
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    aria-label="User menu"
                                    style={{
                                        caretColor: 'transparent',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                    className="h-10 p-1 pl-1.5 pr-3 rounded-full border flex items-center gap-2.5 transition-all duration-200 bg-white/70 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200/80 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.16] shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer group"
                                >
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xs shrink-0">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                    <span className="hidden md:block text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                                        {user?.name?.split(' ')[0] || 'Doctor'}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {userDropdownOpen && (
                                    <div
                                        className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl border p-2 z-50 animate-in fade-in duration-150"
                                        style={{
                                            background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.96)',
                                            backdropFilter: 'blur(20px)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(148,163,184,0.35)',
                                            boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
                                        }}
                                    >
                                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {user?.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {user?.email}
                                            </p>
                                            <div className="mt-1.5 flex items-center justify-between text-[10px]">
                                                <span className="font-semibold text-violet-600 dark:text-violet-400 capitalize">
                                                    {user?.is_platform_admin ? 'Platform Admin' : (user?.role || 'Staff').replace('_', ' ')}
                                                </span>
                                                <span className="text-slate-400">
                                                    {tenant?.currency || 'CAD'} ({tenant?.timezone || 'America/Toronto'})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Theme Toggle Pill in Menu */}
                                        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Appearance</span>
                                            <ThemeTogglePill />
                                        </div>

                                        <div className="py-1">
                                            <Link
                                                href="/app/settings"
                                                onClick={() => setUserDropdownOpen(false)}
                                                style={{ caretColor: 'transparent' }}
                                                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl font-medium"
                                            >
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Clinic Settings</span>
                                            </Link>
                                            <Link
                                                href="/app/billing"
                                                onClick={() => setUserDropdownOpen(false)}
                                                style={{ caretColor: 'transparent' }}
                                                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl font-medium"
                                            >
                                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Subscription & Billing</span>
                                            </Link>
                                        </div>

                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                style={{ caretColor: 'transparent' }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors font-medium"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                <span>Sign Out</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 5. Mobile Hamburger Toggle (~40px Rounded Button) */}
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                style={{
                                    caretColor: 'transparent',
                                    backdropFilter: 'blur(12px)',
                                }}
                                className="w-10 h-10 rounded-full border xl:hidden flex items-center justify-center transition-all duration-200 bg-white/70 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300"
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Collapsible Navigation Drawer */}
                {mobileMenuOpen && (
                    <div
                        className="xl:hidden border-t px-5 pt-3 pb-5 space-y-2"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(139,124,246,0.03)',
                            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(139,124,246,0.10)',
                        }}
                    >
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <Link
                                href="/app/calendar"
                                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600 text-white font-bold text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Book Appointment</span>
                            </Link>
                            <Link
                                href="/app/clients"
                                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs"
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>New Client</span>
                            </Link>
                        </div>

                        <div className="space-y-1">
                            {[...primaryNav, ...moreNav].map((item) => {
                                const active = isActive(currentUrl, item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        style={{ caretColor: 'transparent' }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                                            active
                                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <ThemeTogglePill />
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="text-xs text-rose-600 font-semibold flex items-center gap-1"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign Out</span>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Global Search & Command Palette Modal */}
            {searchOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 animate-in fade-in duration-150"
                    style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setSearchOpen(false)}
                >
                    <div
                        className="w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl transition-all"
                        style={{
                            background: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
                            backdropFilter: 'blur(28px)',
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(148,163,184,0.35)',
                            boxShadow: '0 25px 80px -10px rgba(0,0,0,0.35)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input Bar */}
                        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80">
                            {isSearching ? (
                                <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
                            ) : (
                                <Search className="w-4 h-4 text-violet-500 shrink-0" />
                            )}
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search clients, appointments, or invoices…"
                                style={{ caretColor: 'auto' }}
                                className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    title="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSearchOpen(false)}
                                style={{ caretColor: 'transparent' }}
                                className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
                            >
                                ESC
                            </button>
                        </div>

                        {/* Search Results Area */}
                        <div className="max-h-[60vh] overflow-y-auto p-3 text-xs space-y-4">
                            {/* State 1: Query is Empty -> Quick Suggestions */}
                            {searchQuery.trim() === '' && (
                                <div className="space-y-3 py-1">
                                    <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] px-2">
                                        Quick Suggestions
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        <Link
                                            href="/app/clients"
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">Registered Clients</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">View roster & client profiles</div>
                                            </div>
                                        </Link>

                                        <Link
                                            href="/app/calendar"
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20 transition-colors shrink-0">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">Calendar & Bookings</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">Schedule appointments</div>
                                            </div>
                                        </Link>

                                        <Link
                                            href="/app/reports/utilization"
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 transition-colors shrink-0">
                                                <BarChart3 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">Capacity Utilization</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">Operating hours & bottlenecks</div>
                                            </div>
                                        </Link>

                                        <Link
                                            href="/app/settings"
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition-colors shrink-0">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">Clinic Settings</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">Hours, profile & branding</div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* State 2: Searching with No Results */}
                            {searchQuery.trim() !== '' && !isSearching &&
                                searchResults.clients.length === 0 &&
                                searchResults.appointments.length === 0 &&
                                searchResults.invoices.length === 0 &&
                                searchResults.navigation.length === 0 && (
                                    <div className="py-10 text-center space-y-2">
                                        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                            <Search className="w-6 h-6 opacity-60" />
                                        </div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                            No matches found for "{searchQuery}"
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
                                            Check your spelling or try searching by client first/last name, email, phone number, or appointment service.
                                        </p>
                                    </div>
                            )}

                            {/* State 3: Searching Spinner Indicator */}
                            {isSearching && (
                                <div className="flex items-center justify-center py-8 gap-2.5 text-slate-500 dark:text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                                    <span>Searching clinic records…</span>
                                </div>
                            )}

                            {/* State 4: Navigation / Pages Results */}
                            {searchResults.navigation.length > 0 && (
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] px-2">
                                        Pages & Shortcuts
                                    </p>
                                    {searchResults.navigation.map((item, idx) => (
                                        <Link
                                            key={idx}
                                            href={item.url}
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                                                    <Compass className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {item.title}
                                                    </span>
                                                    {item.subtitle && (
                                                        <span className="text-slate-400 text-[11px] ml-2">
                                                            {item.subtitle}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                {item.category}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* State 5: Clients Results */}
                            {searchResults.clients.length > 0 && (
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] px-2">
                                        Clients ({searchResults.clients.length})
                                    </p>
                                    {searchResults.clients.map((client) => (
                                        <Link
                                            key={client.id}
                                            href={client.url}
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-indigo-500 text-white font-bold text-[10px] shrink-0">
                                                    {client.name
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {client.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        {client.email || client.phone || 'No contact info'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {client.is_active ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500">
                                                        Inactive
                                                    </span>
                                                )}
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* State 6: Appointments Results */}
                            {searchResults.appointments.length > 0 && (
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] px-2">
                                        Appointments ({searchResults.appointments.length})
                                    </p>
                                    {searchResults.appointments.map((appt) => (
                                        <Link
                                            key={appt.id}
                                            href={appt.url}
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {appt.service_name} • <span className="text-slate-600 dark:text-slate-300 font-normal">{appt.client_name}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                                        <span>{appt.starts_at_formatted}</span>
                                                        <span>•</span>
                                                        <span>{appt.practitioner_name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {appt.status.replace('_', ' ')}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* State 7: Invoices Results */}
                            {searchResults.invoices.length > 0 && (
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] px-2">
                                        Invoices ({searchResults.invoices.length})
                                    </p>
                                    {searchResults.invoices.map((inv) => (
                                        <Link
                                            key={inv.id}
                                            href={inv.url}
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    <Receipt className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {inv.invoice_number} • <span className="text-slate-600 dark:text-slate-300 font-normal">{inv.client_name}</span>
                                                    </div>
                                                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                        {inv.total_amount}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {inv.status}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-white/[0.03] border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-mono text-[10px]">ESC</kbd>
                                to close
                            </span>
                            <span>
                                Quick search across clinic records
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MAIN CONTENT AREA inside shell ─────────────────────── */}
            <main className="px-5 sm:px-7 py-6 sm:py-8" style={{ background: 'transparent' }}>
                {children}
            </main>

            </div>
        </div>
    );
}

export default function TopNavLayout({ children, title }) {
    return (
        <ThemeProvider storageKey="umahz-app-theme" initialPreference="light">
            {title && <Head title={title.includes('UMAHZ') ? title : `${title} — UMAHZ`} />}
            <TopNavShell title={title}>{children}</TopNavShell>
        </ThemeProvider>
    );
}
