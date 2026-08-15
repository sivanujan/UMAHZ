import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

export default function Login({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: 'owner@lotuswellness.com',
        password: 'password',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <Head title="Sign In" />

            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-8">
                    <Logo size="lg" tagline />
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[#1E0B3C] tracking-tight">Welcome Back</h1>
                        <p className="mt-1 text-sm text-slate-500">Sign in to your UMAHZ workspace.</p>
                    </div>

                    {status && (
                        <div className="p-3 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                Work Email
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            {errors.email && <div className="text-xs text-rose-600 mt-1">{errors.email}</div>}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            {errors.password && <div className="text-xs text-rose-600 mt-1">{errors.password}</div>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-slate-300 text-[#5B2EFF] focus:ring-[#5B2EFF] h-4 w-4"
                                />
                                <span className="ml-2 text-xs text-slate-600">Remember me</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-semibold text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors flex items-center justify-center"
                        >
                            Sign In
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-[#5B2EFF] font-semibold hover:text-purple-700">Create one</Link>
                    </p>

                    <p className="text-center text-xs text-slate-400">
                        Own a wellness clinic?{' '}
                        <Link href="/clinics/register" className="text-[#5B2EFF] font-semibold hover:text-purple-700">Set up your clinic</Link>
                    </p>

                    <div className="pt-4 border-t border-purple-50 text-xs text-slate-500 space-y-1">
                        <p className="font-semibold text-slate-700">Demo Test Credentials:</p>
                        <p>• Owner: <code className="bg-slate-100 px-1 py-0.5 rounded text-[#1E0B3C]">owner@lotuswellness.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">password</code>)</p>
                        <p>• Practitioner: <code className="bg-slate-100 px-1 py-0.5 rounded text-[#1E0B3C]">julian@lotuswellness.com</code> (pass: <code className="bg-slate-100 px-1 py-0.5 rounded">password</code>)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
