import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

const ROYAL_BLUE = '#2563EB';
const DEEP_NAVY = '#0D1B2A';
const MANROPE = "'Manrope', system-ui, -apple-system, sans-serif";

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 9 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function iconColorClass(showError) {
    return showError ? 'text-rose-400' : 'text-[#2563EB]/45 group-focus-within:text-[#2563EB]';
}

function inputBorderClass(showError) {
    return showError
        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15'
        : 'border-slate-200/80 focus:border-[#2563EB] focus:ring-[#2563EB]/20';
}

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });
    const [touched, setTouched] = useState(false);

    const formatError = touched && data.email && !EMAIL_RE.test(data.email) ? 'Enter a valid email address' : null;
    const emailError = errors.email || formatError;

    const submit = (e) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <div
            className="min-h-screen antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden"
            style={{ fontFamily: MANROPE, background: '#F8FAFC' }}
        >
            <Head title="Forgot Password" />

            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 45%, #ECFDF5 100%)' }} />
                <div className="absolute top-[-120px] right-[-100px] w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(37,99,235,0.22)', filter: 'blur(110px)' }} />
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
                        boxShadow: '0 25px 70px -25px rgba(13,27,42,0.25), 0 8px 24px -12px rgba(37,99,235,0.15)',
                    }}
                >
                    <div className="text-center">
                        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: DEEP_NAVY }}>Forgot Your Password?</h1>
                        <p className="mt-2 text-sm text-slate-400">Enter your email and we'll send you a link to reset it.</p>
                    </div>

                    {status && (
                        <div className="p-3 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label style={labelStyle}>Email</label>
                            <div className="relative group">
                                <Mail className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(!!emailError)}`} />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    onBlur={() => setTouched(true)}
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    className={`w-full pl-11 pr-10 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#0D1B2A] focus:bg-white focus:ring-4 ${inputBorderClass(!!emailError)}`}
                                />
                                {emailError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />}
                            </div>
                            {emailError && <div className="text-xs text-rose-600 font-medium mt-1.5">{emailError}</div>}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                            style={{
                                background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #7C3AED 100%)`,
                                boxShadow: '0 10px 30px -8px rgba(37,99,235,0.45)',
                            }}
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400">
                        <Link href="/login" className="font-semibold inline-flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
