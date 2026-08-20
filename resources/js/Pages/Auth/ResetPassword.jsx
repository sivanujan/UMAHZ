import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Lock, Check, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';

const ROYAL_BLUE = '#5B2EFF';
const DEEP_NAVY = '#1E0B3C';
const MANROPE = "'Manrope', system-ui, -apple-system, sans-serif";

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 9 };

function iconColorClass(showError) {
    return showError ? 'text-rose-400' : 'text-[#5B2EFF]/45 group-focus-within:text-[#5B2EFF]';
}

function inputBorderClass(showError) {
    return showError
        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15'
        : 'border-slate-200/80 focus:border-[#5B2EFF] focus:ring-[#5B2EFF]/20';
}

function PasswordField({ label, value, onChange, onBlur, error, valid, helper, show, onToggleShow, autoComplete }) {
    const showError = !!error;
    const showValid = valid && !showError;
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <div className="relative group">
                <Lock className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(showError)}`} />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    autoComplete={autoComplete}
                    className={`w-full pl-11 pr-16 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#1E0B3C] focus:bg-white focus:ring-4 ${inputBorderClass(showError)}`}
                />
                {showValid && <Check className="w-4 h-4 text-emerald-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2.5} />}
                {showError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2} />}
                <button
                    type="button"
                    onClick={onToggleShow}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5B2EFF] transition-colors duration-200"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {showError ? (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

export default function ResetPassword({ email, token }) {
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

    const passwordFormatError = touched.password && data.password.length < 12 ? 'At least 12 characters' : null;
    const passwordError = errors.password || passwordFormatError;
    const passwordValid = data.password.length >= 12 && !errors.password;

    const confirmFormatError = touched.password_confirmation && data.password_confirmation && data.password_confirmation !== data.password ? 'Passwords must match' : null;
    const confirmError = errors.password_confirmation || confirmFormatError;
    const confirmValid = !!data.password_confirmation && data.password_confirmation === data.password && !errors.password_confirmation;

    const submit = (e) => {
        e.preventDefault();
        post('/reset-password');
    };

    return (
        <div
            className="min-h-screen antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden"
            style={{ fontFamily: MANROPE, background: '#F8FAFC' }}
        >
            <Head title="Reset Password" />

            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 45%, #ECFDF5 100%)' }} />
                <div className="absolute top-[-120px] right-[-100px] w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(91,46,255,0.22)', filter: 'blur(110px)' }} />
                <div className="absolute bottom-[-100px] left-[-80px] w-[420px] h-[420px] rounded-full" style={{ background: 'rgba(34,197,94,0.16)', filter: 'blur(110px)' }} />
            </div>

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-10">
                    <Logo size="lg" tagline />
                </Link>

                <div
                    className="rounded-[20px] p-8 sm:p-9 space-y-7 border border-white/60 backdrop-blur-xl"
                    style={{
                        background: 'rgba(255,255,255,0.78)',
                        boxShadow: '0 25px 70px -25px rgba(13,27,42,0.25), 0 8px 24px -12px rgba(91,46,255,0.15)',
                    }}
                >
                    <div className="text-center">
                        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: DEEP_NAVY }}>Reset Your Password</h1>
                        <p className="mt-2 text-sm text-slate-400">Choose a new password for {data.email || 'your account'}.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <PasswordField
                                label="New Password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                onBlur={() => markTouched('password')}
                                error={passwordError}
                                valid={passwordValid}
                                show={showPassword}
                                onToggleShow={() => setShowPassword((s) => !s)}
                                autoComplete="new-password"
                                helper="Minimum 12 characters."
                            />
                            <PasswordStrengthMeter password={data.password} />
                        </div>

                        <PasswordField
                            label="Confirm New Password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            onBlur={() => markTouched('password_confirmation')}
                            error={confirmError}
                            valid={confirmValid}
                            show={showConfirm}
                            onToggleShow={() => setShowConfirm((s) => !s)}
                            autoComplete="new-password"
                        />

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                            style={{
                                background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`,
                                boxShadow: '0 10px 30px -8px rgba(91,46,255,0.45)',
                            }}
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400">
                        <Link href="/login" className="font-semibold transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>Back to sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
