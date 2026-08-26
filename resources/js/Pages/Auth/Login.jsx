import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock, Check, Eye, EyeOff, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

const ROYAL_BLUE = '#5B2EFF';
const DEEP_NAVY = '#1E0B3C';
const UI_FONT = "'Satoshi', system-ui, -apple-system, sans-serif";

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 9 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function iconColorClass(showError) {
    return showError ? 'text-rose-400' : 'text-[#5B2EFF]/45 group-focus-within:text-[#5B2EFF]';
}

function inputBorderClass(showError) {
    return showError
        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15'
        : 'border-slate-200/80 focus:border-[#5B2EFF] focus:ring-[#5B2EFF]/20';
}

const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

export default function Login({ status, demoCredentialsEnabled }) {
    const { data, setData, post, processing, errors } = useForm({
        email: 'owner@lotuswellness.com',
        password: 'password',
        remember: false,
    });

    const [touchedEmail, setTouchedEmail] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [oauthNotice, setOauthNotice] = useState('');
    const [showDemo, setShowDemo] = useState(false);

    const emailFormatError = touchedEmail && data.email && !EMAIL_RE.test(data.email) ? 'Enter a valid email address' : null;
    const emailError = errors.email || emailFormatError;

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div
            className="min-h-screen antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden"
            style={{ fontFamily: UI_FONT, background: '#F8FAFC' }}
        >
            <Head title="Sign In" />

            {/* Gradient mesh background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 45%, #ECFDF5 100%)' }} />
                <div className="absolute top-[-120px] right-[-100px] w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(91,46,255,0.22)', filter: 'blur(110px)' }} />
                <div className="absolute bottom-[-100px] left-[-80px] w-[420px] h-[420px] rounded-full" style={{ background: 'rgba(34,197,94,0.16)', filter: 'blur(110px)' }} />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full" style={{ background: 'rgba(13,27,42,0.05)', filter: 'blur(130px)' }} />
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
                        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: DEEP_NAVY }}>Welcome Back</h1>
                        <p className="mt-2 text-sm text-slate-400">Sign in to your UMAHZ workspace.</p>
                    </div>

                    {status && (
                        <div className="p-3 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                            {status}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setOauthNotice("Google sign-in isn't connected yet — use the form below for now.")}
                            className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-[#1E0B3C] transition-all duration-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
                        >
                            <GoogleIcon /> Continue with Google
                        </button>
                        {oauthNotice && (
                            <p className="text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
                                {oauthNotice}
                            </p>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.12em] whitespace-nowrap">or sign in with email</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label style={labelStyle}>Email</label>
                            <div className="relative group">
                                <Mail className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(!!emailError)}`} />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    onBlur={() => setTouchedEmail(true)}
                                    required
                                    autoComplete="email"
                                    className={`w-full pl-11 pr-10 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#1E0B3C] focus:bg-white focus:ring-4 ${inputBorderClass(!!emailError)}`}
                                />
                                {emailError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />}
                            </div>
                            {emailError && <div className="text-xs text-rose-600 font-medium mt-1.5">{emailError}</div>}
                        </div>

                        <div>
                            <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                                <Link
                                    href="/forgot-password"
                                    className="text-[11px] font-semibold transition-opacity duration-200 hover:opacity-75"
                                    style={{ color: ROYAL_BLUE }}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(!!errors.password)}`} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className={`w-full pl-11 pr-11 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#1E0B3C] focus:bg-white focus:ring-4 ${inputBorderClass(!!errors.password)}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    tabIndex={-1}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5B2EFF] transition-colors duration-200"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <div className="text-xs text-rose-600 font-medium mt-1.5">{errors.password}</div>}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="sr-only"
                                />
                                <span
                                    className="w-[18px] h-[18px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-all duration-200"
                                    style={{
                                        borderColor: data.remember ? 'transparent' : '#cbd5e1',
                                        background: data.remember ? `linear-gradient(135deg, ${ROYAL_BLUE}, #2E9BE6)` : 'transparent',
                                    }}
                                >
                                    <Check className="w-3 h-3 text-white transition-opacity duration-150" style={{ opacity: data.remember ? 1 : 0 }} strokeWidth={3} />
                                </span>
                                <span className="ml-2.5 text-xs text-slate-500">Remember me</span>
                            </label>
                        </div>

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
                            {processing ? 'Signing In…' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400">
                        Don't have an account?{' '}
                        <Link href="/register" className="font-semibold transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>Create one</Link>
                    </p>

                    <p className="text-center text-xs text-slate-400">
                        Own a wellness clinic?{' '}
                        <Link href="/clinics/register" className="font-semibold transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>Set up your clinic</Link>
                    </p>

                    {demoCredentialsEnabled && (
                        <div className="pt-5 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowDemo((s) => !s)}
                                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors duration-200"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                    Demo Test Credentials (dev only)
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDemo ? 'rotate-180' : ''}`} />
                            </button>
                            {showDemo && (
                                <div className="mt-3 text-xs text-slate-400 space-y-1.5">
                                    <p>• Owner: <code className="bg-slate-100 px-1 py-0.5 rounded" style={{ color: DEEP_NAVY }}>owner@lotuswellness.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">password</code>)</p>
                                    <p>• Practitioner: <code className="bg-slate-100 px-1 py-0.5 rounded" style={{ color: DEEP_NAVY }}>julian@lotuswellness.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">password</code>)</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
