import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Mail, Lock, Check, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import AuthSplitLayout from '@/Components/Auth/AuthSplitLayout';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';

function PasswordInput({
    id,
    label,
    value,
    onChange,
    onBlur,
    error,
    valid,
    helper,
    show,
    onToggleShow,
    autoComplete,
    disabled,
}) {
    const showError = Boolean(error);
    const showValid = valid && !showError;

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
            >
                {label}
            </label>
            <div className="relative group">
                <Lock
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${
                        showError
                            ? 'text-rose-500'
                            : 'text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'
                    }`}
                />
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    disabled={disabled}
                    autoComplete={autoComplete}
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-16 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-white dark:bg-slate-800/70 border ${
                        showError
                            ? 'border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                />
                {showValid && (
                    <Check
                        className="w-4 h-4 text-emerald-500 absolute right-10 top-1/2 -translate-y-1/2"
                        strokeWidth={2.5}
                    />
                )}
                {showError && (
                    <AlertCircle
                        className="w-4 h-4 text-rose-500 absolute right-10 top-1/2 -translate-y-1/2"
                        strokeWidth={2}
                    />
                )}
                <button
                    type="button"
                    onClick={onToggleShow}
                    aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {showError ? (
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

export default function ResetPassword({
    email,
    token,
    clinic = null,
    clinicNotFound = false,
    canRegisterClinic = false,
    canRegisterClient = false,
}) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));

    const passwordFormatError =
        touched.password && data.password.length < 12 ? 'At least 12 characters' : null;
    const passwordError = errors.password || passwordFormatError;
    const passwordValid = data.password.length >= 12 && !errors.password;

    const confirmFormatError =
        touched.password_confirmation &&
        data.password_confirmation &&
        data.password_confirmation !== data.password
            ? 'Passwords must match'
            : null;
    const confirmError = errors.password_confirmation || confirmFormatError;
    const confirmValid =
        Boolean(data.password_confirmation) &&
        data.password_confirmation === data.password &&
        !errors.password_confirmation;

    const tokenError = errors.token || errors.email;

    const validAccent =
        clinic?.accent_color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clinic.accent_color.trim())
            ? clinic.accent_color.trim()
            : null;

    const submit = (e) => {
        e.preventDefault();
        post('/reset-password');
    };

    const pageTitle = clinic ? `Reset Password — ${clinic.name}` : 'Reset Password — UMAHZ';
    const headingTitle = clinic
        ? `Reset your password for ${clinic.name}`
        : 'Set a new password';
    const headingSubtitle = 'Choose a strong password to protect your account.';
    const requestNewHref = data.email
        ? `/forgot-password?email=${encodeURIComponent(data.email)}`
        : '/forgot-password';
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
            {tokenError && (
                <div
                    role="alert"
                    className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 space-y-2.5"
                >
                    <div className="flex items-start gap-2.5 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span>{tokenError}</span>
                    </div>
                    <Link
                        href={requestNewHref}
                        className="inline-flex items-center justify-center w-full py-2 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-colors"
                    >
                        Request a new link
                    </Link>
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                {/* Read-only Email */}
                <div>
                    <label
                        htmlFor="reset-email"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
                    >
                        Account email
                    </label>
                    <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            id="reset-email"
                            type="email"
                            value={data.email}
                            readOnly
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-default"
                        />
                    </div>
                </div>

                <div>
                    <PasswordInput
                        id="reset-password"
                        label="New password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        onBlur={() => markTouched('password')}
                        error={passwordError}
                        valid={passwordValid}
                        helper="Minimum 12 characters. Include uppercase, lowercase, and a number or symbol."
                        show={showPassword}
                        onToggleShow={() => setShowPassword((s) => !s)}
                        autoComplete="new-password"
                        disabled={processing}
                    />
                    <PasswordStrengthMeter password={data.password} />
                </div>

                <PasswordInput
                    id="reset-password-confirmation"
                    label="Confirm new password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    onBlur={() => markTouched('password_confirmation')}
                    error={confirmError}
                    valid={confirmValid}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm((s) => !s)}
                    autoComplete="new-password"
                    disabled={processing}
                />

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
                    <span>{processing ? 'Updating password…' : 'Update Password'}</span>
                </button>
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
