import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import Logo from '@/Components/Common/Logo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import AuthVisualPanel from '@/Components/Auth/AuthVisualPanel';
import { ThemeProvider } from '@/Contexts/ThemeContext';

function AuthSplitShell({
    pageTitle,
    headingTitle,
    headingSubtitle,
    clinic = null,
    clinicNotFound = false,
    canRegisterClinic = false,
    canRegisterClient = false,
    children,
}) {
    const shouldReduceMotion = useReducedMotion();

    const validAccent =
        clinic?.accent_color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clinic.accent_color.trim())
            ? clinic.accent_color.trim()
            : null;

    return (
        <div
            style={validAccent ? { '--brand-accent': validAccent } : undefined}
            className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden"
        >
            <Head title={pageTitle} />

            {/* Left Column: Form Surface */}
            <div className="flex flex-col justify-between p-6 sm:p-10 lg:pl-12 lg:pr-14 xl:pl-16 xl:pr-20 min-h-screen relative z-10">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        {clinic ? (
                            <div className="flex items-center gap-3">
                                {clinic.logo_url ? (
                                    <img
                                        src={clinic.logo_url}
                                        alt={clinic.name}
                                        className="h-9 w-auto max-w-[140px] sm:max-w-[180px] object-contain rounded-lg"
                                    />
                                ) : (
                                    <img
                                        src="/imags/logo.png"
                                        alt={clinic.name}
                                        className="w-9 h-9 object-contain drop-shadow-xs"
                                    />
                                )}
                                <div className="flex flex-col leading-tight">
                                    <span className="font-bold tracking-normal text-lg sm:text-xl text-slate-900 dark:text-white">
                                        {clinic.name}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
                                        {clinic.tagline || 'Practice Management on UMAHZ'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <Logo size="md" tagline />
                        )}
                    </Link>

                    <div className="flex items-center gap-3">
                        {canRegisterClinic && !clinic && (
                            <Link
                                href="/clinics/register"
                                className="hidden sm:inline-flex text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                            >
                                Set up your clinic →
                            </Link>
                        )}
                        <ThemeToggle size="sm" />
                    </div>
                </div>

                {/* Form Center Wrapper */}
                <motion.div
                    className="w-full max-w-[420px] mx-auto my-auto py-8"
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <h1 className="text-2xl sm:text-[28px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
                                {headingTitle}
                            </h1>
                            {headingSubtitle && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 [word-spacing:0.02em]">
                                    {headingSubtitle}
                                </p>
                            )}
                            {!clinicNotFound && clinic?.tagline && (
                                <div className="pt-0.5">
                                    <span
                                        style={
                                            validAccent
                                                ? { color: validAccent, borderColor: `${validAccent}33` }
                                                : undefined
                                        }
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40"
                                    >
                                        {clinic.tagline}
                                    </span>
                                </div>
                            )}
                        </div>

                        {children}
                    </div>
                </motion.div>

                {/* Bottom Footer Links */}
                <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 text-center space-y-1">
                    {canRegisterClinic && !clinic && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Own a wellness clinic?{' '}
                            <Link
                                href="/clinics/register"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Set up your clinic
                            </Link>
                        </p>
                    )}
                    {canRegisterClient && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Looking to book an appointment?{' '}
                            <Link
                                href="/register"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Create client account
                            </Link>
                        </p>
                    )}
                    {clinic ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {clinic.name} &bull; Protected by UMAHZ Security
                        </p>
                    ) : (
                        !canRegisterClinic && !canRegisterClient && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Protected by UMAHZ Security
                            </p>
                        )
                    )}
                </div>
            </div>

            {/* Right Column: Branded Visual Panel (Hidden on Mobile) */}
            <AuthVisualPanel clinic={clinic} />
        </div>
    );
}

export default function AuthSplitLayout(props) {
    return (
        <ThemeProvider>
            <AuthSplitShell {...props} />
        </ThemeProvider>
    );
}
