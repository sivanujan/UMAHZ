import React, { useEffect, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Mail, Check, AlertCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

export default function ForgotPassword({
    status,
    prefilledEmail = '',
    clinic = null,
    clinicNotFound = false,
    canRegisterClinic = false,
    canRegisterClient = false,
}) {
    const { data, setData, post, processing, errors } = useForm({
        email: prefilledEmail || '',
    });

    const [touched, setTouched] = useState(false);
    const [cooldown, setCooldown] = useState(status ? COOLDOWN_SECONDS : 0);

    useEffect(() => {
        if (prefilledEmail) {
            setData('email', prefilledEmail);
        }
    }, [prefilledEmail]);

    useEffect(() => {
        if (status) {
            setCooldown(COOLDOWN_SECONDS);
        }
    }, [status]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((c) => (c <= 1 ? 0 : c - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const formatValid = touched && data.email && EMAIL_RE.test(data.email);
    const formatError =
        touched && data.email && !EMAIL_RE.test(data.email)
            ? 'Enter a valid email address'
            : null;
    const emailError = errors.email || formatError;

    const validAccent =
        clinic?.accent_color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clinic.accent_color.trim())
            ? clinic.accent_color.trim()
            : null;

    const submit = (e) => {
        e.preventDefault();
        if (processing) return;
        post('/forgot-password', {
            preserveScroll: true,
        });
    };

    const handleResend = () => {
        if (processing || cooldown > 0 || !data.email) return;
        post('/forgot-password', {
            preserveScroll: true,
        });
    };

    const pageTitle = clinic
        ? `Reset Password — ${clinic.name}`
        : 'Forgot Password — UMAHZ';

    const headingTitle = clinic
        ? `Reset your password for ${clinic.name}`
        : 'Forgot your password?';

    const headingSubtitle = status
        ? 'Check your inbox for next steps.'
        : 'Enter your email address and we will send you a password reset link.';

    const backLabel = clinic ? `Back to ${clinic.name} sign in` : 'Back to sign in';

    return (
        <AuthSplitLayout
            pageTitle={pageTitle}
            headingTitle={headingTitle}
            headingSubtitle={headingSubtitle}
            clinic={clinic}
            clinicNotFound={clinicNotFound}
            canRegisterClinic={canRegisterClinic}
            canRegisterClient={canRegisterClient}
        >
            {status && (
                <div
                    role="status"
                    className="p-4 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5"
                >
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="leading-relaxed">{status}</p>
                        <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80">
                            The link expires in 60 minutes. Check your spam folder if you do not see it.
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label
                        htmlFor="forgot-email"
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
                            id="forgot-email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            onBlur={() => setTouched(true)}
                            required
                            autoFocus
                            disabled={processing}
                            autoComplete="email"
                            placeholder="name@clinic.com"
                            className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-white dark:bg-slate-800/70 border ${
                                emailError
                                    ? 'border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100 focus:ring-4 focus:ring-rose-500/15'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                        />
                        {formatValid && !emailError && (
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
                        <p className="text-xs text-rose-500 dark:text-rose-400 font-medium mt-1.5">
                            {emailError}
                        </p>
                    )}
                </div>

                {!status ? (
                    <button
                        type="submit"
                        disabled={processing}
                        style={
                            validAccent
                                ? {
                                      backgroundColor: validAccent,
                                      backgroundImage: `linear-gradient(135deg, ${validAccent}, #4338ca)`,
                                      boxShadow: `0 10px 25px -5px ${validAccent}40`,
                                  }
                                : undefined
                        }
                        className="w-full py-3.5 px-4 font-semibold text-sm rounded-full text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{processing ? 'Sending reset link…' : 'Send Reset Link'}</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={processing || cooldown > 0}
                        className="w-full py-3.5 px-4 font-semibold text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        {processing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        <span>
                            {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
                        </span>
                    </button>
                )}
            </form>

            <div className="pt-1 text-center">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{backLabel}</span>
                </Link>
            </div>
        </AuthSplitLayout>
    );
}
