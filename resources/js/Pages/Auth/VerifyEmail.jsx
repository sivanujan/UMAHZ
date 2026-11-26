import React, { useEffect, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { MailCheck, Check, Loader2, RefreshCw, LogOut } from 'lucide-react';
import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';

const COOLDOWN_SECONDS = 60;

export default function VerifyEmail({
    status,
    email,
    clinic = null,
    clinicNotFound = false,
    canRegisterClinic = false,
    canRegisterClient = false,
}) {
    const { post, processing } = useForm({});
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (status === 'verification-link-sent') {
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

    const validAccent =
        clinic?.accent_color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clinic.accent_color.trim())
            ? clinic.accent_color.trim()
            : null;

    const resend = (e) => {
        e.preventDefault();
        if (processing || cooldown > 0) return;
        post('/verify-email/resend', { preserveScroll: true });
    };

    const pageTitle = clinic ? `Verify Email — ${clinic.name}` : 'Verify Email — UMAHZ';

    return (
        <AuthSplitLayout
            pageTitle={pageTitle}
            headingTitle="Check your email"
            headingSubtitle={`We sent a verification link to ${email || 'your email'}.`}
            clinic={clinic}
            clinicNotFound={clinicNotFound}
            canRegisterClinic={canRegisterClinic}
            canRegisterClient={canRegisterClient}
        >
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <MailCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        Click the link we sent to{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{email}</span>{' '}
                        to activate your workspace access.
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        The verification link expires in 60 minutes.
                    </p>
                </div>
            </div>

            {status === 'verification-link-sent' && (
                <div
                    role="status"
                    className="p-3.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2"
                >
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>A new verification link has been sent to your email address.</span>
                </div>
            )}

            <form onSubmit={resend}>
                <button
                    type="submit"
                    disabled={processing || cooldown > 0}
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
                    {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    <span>
                        {processing
                            ? 'Sending…'
                            : cooldown > 0
                                ? `Resend verification email (${cooldown}s)`
                                : 'Resend verification email'}
                    </span>
                </button>
            </form>

            <div className="pt-1 text-center">
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                </Link>
            </div>
        </AuthSplitLayout>
    );
}
