import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Home, RefreshCw, LayoutDashboard, LogOut, ShieldAlert, Clock } from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { ThemeProvider } from '@/Contexts/ThemeContext';

function StatusIllustration({ status }) {
    const common = 'w-20 h-20 mx-auto';
    if (status === 404) {
        return (
            <svg viewBox="0 0 96 96" fill="none" className={common} aria-hidden="true">
                <circle cx="48" cy="48" r="42" className="fill-indigo-500/10 dark:fill-indigo-400/10" />
                <circle cx="44" cy="44" r="18" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="4" />
                <path d="M57 57L70 70" className="stroke-violet-600 dark:stroke-violet-400" strokeWidth="5" strokeLinecap="round" />
                <path d="M38 44h12" className="stroke-indigo-400" strokeWidth="3" strokeLinecap="round" />
            </svg>
        );
    }
    if (status === 403) {
        return (
            <svg viewBox="0 0 96 96" fill="none" className={common} aria-hidden="true">
                <circle cx="48" cy="48" r="42" className="fill-rose-500/10 dark:fill-rose-400/10" />
                <rect x="30" y="42" width="36" height="28" rx="7" className="stroke-rose-600 dark:stroke-rose-400" strokeWidth="4" />
                <path d="M37 42v-7a11 11 0 0 1 22 0v7" className="stroke-violet-600 dark:stroke-violet-400" strokeWidth="4" strokeLinecap="round" />
                <circle cx="48" cy="56" r="3" className="fill-rose-600 dark:fill-rose-400" />
            </svg>
        );
    }
    if (status === 419 || status === 429) {
        return (
            <svg viewBox="0 0 96 96" fill="none" className={common} aria-hidden="true">
                <circle cx="48" cy="48" r="42" className="fill-amber-500/10 dark:fill-amber-400/10" />
                <circle cx="48" cy="48" r="22" className="stroke-amber-600 dark:stroke-amber-400" strokeWidth="4" />
                <path d="M48 35v14l9 6" className="stroke-violet-600 dark:stroke-violet-400" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (status === 503) {
        return (
            <svg viewBox="0 0 96 96" fill="none" className={common} aria-hidden="true">
                <circle cx="48" cy="48" r="42" className="fill-cyan-500/10 dark:fill-cyan-400/10" />
                <path d="M32 58h32M36 44l12-12 12 12" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="48" cy="58" r="4" className="fill-violet-600 dark:fill-violet-400" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 96 96" fill="none" className={common} aria-hidden="true">
            <circle cx="48" cy="48" r="42" className="fill-violet-500/10 dark:fill-violet-400/10" />
            <path d="M48 30l20 34H28L48 30z" className="stroke-violet-600 dark:stroke-violet-400" strokeWidth="4" strokeLinejoin="round" />
            <path d="M48 43v10" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="4" strokeLinecap="round" />
            <circle cx="48" cy="59" r="2.5" className="fill-indigo-600 dark:fill-indigo-400" />
        </svg>
    );
}

const COPY = {
    404: {
        title: 'This page took a day off',
        description: "We couldn't find the page you're looking for. It may have moved or no longer exists.",
    },
    403: {
        title: "You don't have access to this page",
        description: 'Your current account does not have permission to view this workspace or resource.',
    },
    419: {
        title: 'Your session expired',
        description: 'Your session expired for security. Please refresh and try again.',
    },
    429: {
        title: 'Too many requests',
        description: 'Too many attempts. Please wait a moment before trying again.',
    },
    500: {
        title: 'Something went wrong on our side',
        description: "Something went wrong on our side. We've been notified.",
    },
    503: {
        title: "We'll be right back",
        description: "UMAHZ is getting an update. We'll be back in a few minutes.",
    },
};

function ErrorPageInner({
    status = 404,
    message = null,
    requestId = null,
    retryAfter = null,
    clinic = null,
    authContext = {},
    centralHomeUrl = '/',
    links = [],
}) {
    const shouldReduceMotion = useReducedMotion();
    const meta = COPY[status] || COPY[500];
    const homeLabel = clinic?.name ? `Back to ${clinic.name} home` : 'Go to home';
    const homeHref = clinic?.homeUrl || centralHomeUrl || '/';
    const isAuthenticated = Boolean(authContext?.isAuthenticated);
    const isPlatformAdmin = Boolean(authContext?.isPlatformAdmin);
    const dashboardUrl = authContext?.dashboardUrl;

    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 px-4 py-6 sm:p-8 transition-colors duration-300 relative overflow-hidden">
            <Head title={`${status} — ${meta.title}`} />

            {/* Subtle background glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
                <a
                    href={homeHref}
                    className="inline-flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    {clinic?.name ? (
                        <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                            {clinic.name}
                            <span className="text-indigo-600 dark:text-indigo-400">.</span>
                        </span>
                    ) : (
                        <Logo size="md" />
                    )}
                </a>
                <ThemeToggle size="sm" />
            </header>

            {/* Centered Card */}
            <main className="relative z-10 w-full max-w-lg mx-auto my-auto py-8">
                <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl dark:shadow-black/50 p-6 sm:p-10 text-center space-y-6"
                >
                    {/* Illustration */}
                    <motion.div
                        animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
                        transition={shouldReduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <StatusIllustration status={status} />
                    </motion.div>

                    {/* Soft status code + Title + Description */}
                    <div className="space-y-2">
                        <p
                            className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400"
                            aria-label={`Error ${status}`}
                        >
                            {status}
                        </p>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                            {meta.title}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                            {message || meta.description}
                        </p>
                    </div>

                    {/* 403 context explanation */}
                    {status === 403 && isAuthenticated && (
                        <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <span>
                                {isPlatformAdmin
                                    ? 'You are currently signed in as Platform Admin.'
                                    : authContext?.clinicName
                                        ? `You are currently signed in to ${authContext.clinicName}.`
                                        : 'You are currently signed in with a different account.'}
                            </span>
                        </div>
                    )}

                    {/* 429 retry info */}
                    {status === 429 && retryAfter && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs font-semibold text-amber-800 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Retry available in {retryAfter} seconds</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        {status === 404 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Go back</span>
                                </button>
                                {isAuthenticated && dashboardUrl ? (
                                    <a
                                        href={dashboardUrl}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>Go to dashboard</span>
                                    </a>
                                ) : (
                                    <a
                                        href={homeHref}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        <Home className="w-4 h-4" />
                                        <span>{homeLabel}</span>
                                    </a>
                                )}
                            </>
                        )}

                        {status === 403 && (
                            <>
                                {isAuthenticated && dashboardUrl ? (
                                    <a
                                        href={dashboardUrl}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span>{isPlatformAdmin ? 'Go to admin' : 'Go to my clinic'}</span>
                                    </a>
                                ) : (
                                    <a
                                        href={homeHref}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        <Home className="w-4 h-4" />
                                        <span>{homeLabel}</span>
                                    </a>
                                )}
                                {isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => router.post('/logout')}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Sign out and switch account</span>
                                    </button>
                                )}
                            </>
                        )}

                        {status === 419 && (
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Refresh page</span>
                            </button>
                        )}

                        {(status === 429 || status === 500 || status === 503) && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Try again</span>
                                </button>
                                {status !== 503 && (
                                    <a
                                        href={homeHref}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        <Home className="w-4 h-4" />
                                        <span>{clinic?.name ? homeLabel : 'Go home'}</span>
                                    </a>
                                )}
                            </>
                        )}
                    </div>

                    {/* 404 Popular Links */}
                    {status === 404 && Array.isArray(links) && links.length > 0 && (
                        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                                Popular pages
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                                {links.map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 500 Reference ID */}
                    {status === 500 && requestId && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                            Reference ID: <code className="font-mono text-slate-600 dark:text-slate-300">#{requestId}</code>
                        </p>
                    )}
                </motion.div>
            </main>

            <footer className="relative z-10 text-center text-xs text-slate-400 dark:text-slate-500">
                {clinic?.name ? `${clinic.name} • Powered by UMAHZ` : 'UMAHZ Wellness Platform'}
            </footer>
        </div>
    );
}

export default function ErrorPage(props) {
    return (
        <ThemeProvider>
            <ErrorPageInner {...props} />
        </ThemeProvider>
    );
}
