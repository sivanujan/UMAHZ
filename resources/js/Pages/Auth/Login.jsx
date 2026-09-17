import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock, Check, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Logo from '@/Components/Common/Logo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import AuthVisualPanel from '@/Components/Auth/AuthVisualPanel';
import { ThemeProvider } from '@/Contexts/ThemeContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

function LoginForm({
    status,
    canRegisterClient = false,
    canRegisterClinic = true,
    clinic = null,
    clinicNotFound = false,
    centralLoginUrl = '/login',
}) {
    const shouldReduceMotion = useReducedMotion();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [touchedEmail, setTouchedEmail] = useState(false);
    const [touchedPassword, setTouchedPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [oauthNotice, setOauthNotice] = useState('');

    // Strict validation: hex color only (#RGB or #RRGGBB) to prevent CSS injection
    const validAccent =
        clinic?.accent_color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clinic.accent_color.trim())
            ? clinic.accent_color.trim()
            : null;

    const emailFormatValid = touchedEmail && data.email && EMAIL_RE.test(data.email);
    const emailFormatError =
        touchedEmail && data.email && !EMAIL_RE.test(data.email)
            ? 'Enter a valid email address'
            : null;
    const emailError = errors.email || emailFormatError;

    const passwordValid = touchedPassword && data.password && data.password.length >= 8;

    const submit = (e) => {
        e.preventDefault();
        if (clinicNotFound) return;
        post('/login');
    };

    const pageTitle = clinicNotFound
        ? 'Clinic Not Found — UMAHZ'
        : clinic
            ? `Sign In — ${clinic.name}`
            : 'Sign In — UMAHZ';

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
                                    <span className="font-extrabold tracking-tight text-lg sm:text-xl text-slate-900 dark:text-white">
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
                        {/* Heading & Subtext */}
                        <div className="space-y-1.5">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-normal text-slate-900 dark:text-white [word-spacing:0.04em]">
                                {clinicNotFound
                                    ? 'Clinic Not Found'
                                    : clinic
                                        ? `Welcome back to ${clinic.name}`
                                        : 'Welcome Back'}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 [word-spacing:0.02em]">
                                {clinicNotFound
                                    ? 'This clinic workspace does not exist or is currently inactive.'
                                    : clinic
                                        ? `Sign in to your ${clinic.name} workspace.`
                                        : 'Sign in to your UMAHZ workspace'}
                            </p>
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

                        {/* Status Message */}
                        {status && (
                            <div className="p-3.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <span>{status}</span>
                            </div>
                        )}

                        {/* Graceful Clinic Not Found Notification */}
                        {clinicNotFound && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-3">
                                <div className="flex items-start gap-2.5">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                            The requested clinic could not be found.
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                            Please verify the clinic subdomain in your browser address bar or sign in directly from the main UMAHZ portal.
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <a
                                        href={centralLoginUrl || '/login'}
                                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-2 rounded-xl transition-all shadow-xs"
                                    >
                                        Go to Main UMAHZ Login →
                                    </a>
                                </div>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            {/* Email Field */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
                                >
                                    Email address
                                </label>
                                <div className="relative group">
                                    <Mail
                                        className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${
                                            emailError
                                                ? 'text-rose-500'
                                                : 'text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'
                                        }`}
                                    />
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        onBlur={() => setTouchedEmail(true)}
                                        required
                                        disabled={clinicNotFound || processing}
                                        autoComplete="email"
                                        placeholder="name@clinic.com"
                                        className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-white dark:bg-slate-800/70 border ${
                                            emailError
                                                ? 'border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100 focus:ring-4 focus:ring-rose-500/15'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                    />
                                    {emailFormatValid && !emailError && (
                                        <Check
                                            className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                                            strokeWidth={2.5}
                                        />
                                    )}
                                    {emailError && (
                                        <AlertCircle
                                            className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2"
                                            strokeWidth={2}
                                        />
                                    )}
                                </div>
                                {emailError && (
                                    <p className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                                        {emailError}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label
                                        htmlFor="password"
                                        className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                    >
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        style={validAccent ? { color: validAccent } : undefined}
                                        className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <Lock
                                        className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${
                                            errors.password
                                                ? 'text-rose-500'
                                                : 'text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'
                                        }`}
                                    />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        onBlur={() => setTouchedPassword(true)}
                                        required
                                        disabled={clinicNotFound || processing}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-white dark:bg-slate-800/70 border ${
                                            errors.password
                                                ? 'border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100 focus:ring-4 focus:ring-rose-500/15'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        tabIndex={-1}
                                        disabled={clinicNotFound || processing}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 disabled:opacity-50"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        disabled={clinicNotFound || processing}
                                        className="sr-only"
                                    />
                                    <span
                                        style={
                                            validAccent && data.remember
                                                ? { backgroundColor: validAccent, borderColor: validAccent }
                                                : undefined
                                        }
                                        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-all duration-200 ${
                                            data.remember
                                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-indigo-600 text-white shadow-xs'
                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-indigo-400'
                                        }`}
                                    >
                                        {data.remember && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        Remember me
                                    </span>
                                </label>
                            </div>

                            {/* Sign In Primary Button */}
                            <button
                                type="submit"
                                disabled={processing || clinicNotFound}
                                style={
                                    validAccent
                                        ? {
                                              backgroundColor: validAccent,
                                              backgroundImage: `linear-gradient(135deg, ${validAccent}, #4338ca)`,
                                              boxShadow: `0 10px 25px -5px ${validAccent}40`,
                                          }
                                        : undefined
                                }
                                className="w-full py-3.5 px-4 font-semibold text-sm rounded-full text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{processing ? 'Signing in…' : 'Sign In'}</span>
                            </button>
                        </form>

                        {/* Social Sign-In */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    or continue with
                                </span>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                            </div>

                            <button
                                type="button"
                                disabled={clinicNotFound || processing}
                                onClick={() =>
                                    setOauthNotice("Google sign-in isn't connected yet — please use your email above.")
                                }
                                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2.5 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <GoogleIcon />
                                <span>Continue with Google</span>
                            </button>

                            {oauthNotice && (
                                <p className="text-[12px] text-center text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl py-2 px-3">
                                    {oauthNotice}
                                </p>
                            )}
                        </div>
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
                    {clinic && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {clinic.name} &bull; Protected by UMAHZ Security
                        </p>
                    )}
                </div>
            </div>

            {/* Right Column: Branded Visual Panel (Hidden on Mobile) */}
            <AuthVisualPanel clinic={clinic} />
        </div>
    );
}

export default function Login(props) {
    return (
        <ThemeProvider>
            <LoginForm {...props} />
        </ThemeProvider>
    );
}
