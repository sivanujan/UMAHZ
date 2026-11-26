import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Mail, Lock, Check, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, Building2, Globe } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Logo from '@/Components/Common/Logo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import AuthVisualPanel from '@/Components/Auth/AuthVisualPanel';
import { ThemeProvider } from '@/Contexts/ThemeContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm({
    status,
    canRegisterClient = false,
    canRegisterClinic = true,
    isCentral = false,
    clinic = null,
    clinicNotFound = false,
    centralLoginUrl = '/login',
    centralDomain = 'umahz.com',
    appScheme = 'https',
    appPort = '',
    step = 'password',
    prefilledEmail = null,
    lookupEmail = '',
    clinics = [],
    neutralMessage = null,
    lastClinic = null,
}) {
    const shouldReduceMotion = useReducedMotion();
    const initialEmail = prefilledEmail || lookupEmail || '';

    const { data, setData, post, processing, errors } = useForm({
        email: initialEmail,
        password: '',
        remember: false,
    });

    const [touchedEmail, setTouchedEmail] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [choosingTenantId, setChoosingTenantId] = useState(null);
    const [clinicSlugInput, setClinicSlugInput] = useState('');
    const [clinicSlugError, setClinicSlugError] = useState('');

    useEffect(() => {
        if (prefilledEmail) {
            setData('email', prefilledEmail);
        } else if (lookupEmail) {
            setData('email', lookupEmail);
        }
    }, [prefilledEmail, lookupEmail]);

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

    const isEmailReadOnly = Boolean(prefilledEmail);
    const isEmailStep = isCentral && !clinic && step === 'email';
    const isChooseClinicStep = step === 'choose_clinic' && Array.isArray(clinics) && clinics.length > 0;
    const isNotFoundStep = step === 'not_found';

    const submitEmailLookup = (e) => {
        e.preventDefault();
        if (clinicNotFound) return;
        post('/login/lookup', {
            preserveState: true,
        });
    };

    const submitPasswordLogin = (e) => {
        e.preventDefault();
        if (clinicNotFound) return;
        post('/login');
    };

    const handleChooseClinic = (tenantId) => {
        setChoosingTenantId(tenantId);
        router.post(
            '/login/choose-clinic',
            {
                email: lookupEmail || data.email,
                tenant_id: tenantId,
            },
            {
                onFinish: () => setChoosingTenantId(null),
            }
        );
    };

    const handleManualClinicSubmit = (e) => {
        e.preventDefault();
        const cleaned = clinicSlugInput
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
            .replace(new RegExp(`\\.${centralDomain.replace('.', '\\.')}(:\\d+)?$`), '');

        if (!cleaned || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(cleaned)) {
            setClinicSlugError('Enter your clinic subdomain (letters, numbers, and hyphens only).');
            return;
        }

        setClinicSlugError('');
        const portSuffix = appPort ? `:${appPort}` : '';
        window.location.href = `${appScheme}://${cleaned}.${centralDomain}${portSuffix}/login`;
    };

    const pageTitle = clinicNotFound
        ? 'Clinic Not Found — UMAHZ'
        : clinic
            ? `Sign In — ${clinic.name}`
            : isChooseClinicStep
                ? 'Choose Your Clinic — UMAHZ'
                : 'Sign In — UMAHZ';

    const headingTitle = clinicNotFound
        ? 'Clinic Not Found'
        : isChooseClinicStep
            ? 'Choose your clinic'
            : isNotFoundStep
                ? 'Find your clinic'
                : clinic
                    ? `Welcome back to ${clinic.name}`
                    : 'Welcome Back';

    const headingSubtitle = clinicNotFound
        ? 'This clinic workspace does not exist or is currently inactive.'
        : isChooseClinicStep
            ? `Select which clinic workspace you want to sign in to as ${lookupEmail || data.email}.`
            : isNotFoundStep
                ? 'Continue directly using your clinic web address.'
                : clinic
                    ? `Sign in to your ${clinic.name} workspace.`
                    : isEmailStep
                        ? 'Enter your email address to continue to your workspace.'
                        : 'Sign in to your UMAHZ workspace';

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
                        {/* Heading & Subtext */}
                        <div className="space-y-1.5">
                            <h1 className="text-2xl sm:text-[28px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
                                {headingTitle}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 [word-spacing:0.02em]">
                                {headingSubtitle}
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

                        {/* Last Clinic Shortcut (Main domain email step only) */}
                        {isEmailStep && lastClinic && (
                            <a
                                href={lastClinic.login_url}
                                className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/70 transition-all"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                            Recent workspace
                                        </p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            Continue to {lastClinic.name}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </a>
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

                        {/* STEP: Choose Clinic (>1 active clinic) */}
                        {isChooseClinicStep && (
                            <div className="space-y-3">
                                <div className="space-y-2.5">
                                    {clinics.map((c) => {
                                        const isLoading = choosingTenantId === c.tenant_id;
                                        return (
                                            <button
                                                key={c.tenant_id}
                                                type="button"
                                                disabled={choosingTenantId !== null}
                                                onClick={() => handleChooseClinic(c.tenant_id)}
                                                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between gap-3 text-left cursor-pointer disabled:opacity-60"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {c.logo_url ? (
                                                        <img
                                                            src={c.logo_url}
                                                            alt={c.name}
                                                            className="w-10 h-10 rounded-lg object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div
                                                            style={c.accent_color ? { backgroundColor: c.accent_color } : undefined}
                                                            className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0"
                                                        >
                                                            {c.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {c.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {c.subdomain}.{centralDomain}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
                                                ) : (
                                                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="pt-2 text-center">
                                    <a
                                        href={centralLoginUrl || '/login'}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        Use a different email
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* STEP: Neutral fallback when email not found */}
                        {isNotFoundStep && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 space-y-1.5">
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                                        {neutralMessage || "If this email has a UMAHZ account, continue to your clinic's login page."}
                                    </p>
                                </div>

                                <form onSubmit={handleManualClinicSubmit} className="space-y-3">
                                    <div>
                                        <label
                                            htmlFor="clinic-slug"
                                            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
                                        >
                                            Clinic web address
                                        </label>
                                        <div className="relative flex items-center">
                                            <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                                            <input
                                                id="clinic-slug"
                                                type="text"
                                                value={clinicSlugInput}
                                                onChange={(e) => setClinicSlugInput(e.target.value)}
                                                placeholder="your-clinic"
                                                className="w-full pl-10 pr-28 py-3 rounded-xl text-sm outline-none bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15"
                                            />
                                            <span className="absolute right-3.5 text-xs font-medium text-slate-400 pointer-events-none">
                                                .{centralDomain}
                                            </span>
                                        </div>
                                        {clinicSlugError && (
                                            <p className="text-xs text-rose-500 font-medium mt-1.5">{clinicSlugError}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-3 px-4 font-semibold text-sm rounded-full text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span>Continue to clinic login</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>

                                <div className="flex items-center justify-between text-xs pt-1">
                                    <a
                                        href={centralLoginUrl || '/login'}
                                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        ← Try another email
                                    </a>
                                    <Link
                                        href="/clinics/register"
                                        className="font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                    >
                                        Register a new clinic
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* STEP: Main Domain Email-Only Form */}
                        {isEmailStep && (
                            <form onSubmit={submitEmailLookup} className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label
                                            htmlFor="email"
                                            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                        >
                                            Email address
                                        </label>
                                        <Link
                                            href={
                                                data.email
                                                    ? `/forgot-password?email=${encodeURIComponent(data.email)}`
                                                    : '/forgot-password'
                                            }
                                            className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
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
                                            autoFocus
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

                                <button
                                    type="submit"
                                    disabled={processing || clinicNotFound}
                                    className="w-full py-3.5 px-4 font-semibold text-sm rounded-full text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{processing ? 'Checking…' : 'Continue'}</span>
                                    {!processing && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </form>
                        )}

                        {/* STEP: Password Login (Subdomain, Portal, or Central Admin/Pending Owner) */}
                        {!isEmailStep && !isChooseClinicStep && !isNotFoundStep && (
                            <form onSubmit={submitPasswordLogin} className="space-y-4">
                                {/* Email Field */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label
                                            htmlFor="email"
                                            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                        >
                                            Email address
                                        </label>
                                        {isEmailReadOnly && (
                                            <a
                                                href={centralLoginUrl || '/login'}
                                                className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                Not you? Use a different email
                                            </a>
                                        )}
                                    </div>
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
                                            readOnly={isEmailReadOnly}
                                            disabled={clinicNotFound || processing}
                                            autoComplete="email"
                                            placeholder="name@clinic.com"
                                            className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200 border ${
                                                isEmailReadOnly
                                                    ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-default'
                                                    : 'bg-white dark:bg-slate-800/70'
                                            } ${
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
                                            required
                                            autoFocus={isEmailReadOnly}
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
                        )}
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
