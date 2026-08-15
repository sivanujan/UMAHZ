import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Lock, Building2 } from 'lucide-react';
import Logo from '@/Components/Common/Logo';

export default function ClinicRegister() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        clinic_name: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/clinics/register');
    };

    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <Head title="Set Up Your Clinic" />

            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-8">
                    <Logo size="lg" tagline />
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[#1E0B3C] tracking-tight">Set Up Your Clinic</h1>
                        <p className="mt-1 text-sm text-slate-500">Create your owner account to get started on UMAHZ.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                Your Full Name
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            {errors.name && <div className="text-xs text-rose-600 mt-1">{errors.name}</div>}
                        </div>

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
                                Clinic Name
                            </label>
                            <div className="relative">
                                <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={data.clinic_name}
                                    onChange={(e) => setData('clinic_name', e.target.value)}
                                    required
                                    placeholder="Lotus Wellness Studio"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            {errors.clinic_name && <div className="text-xs text-rose-600 mt-1">{errors.clinic_name}</div>}
                            <p className="text-[11px] text-slate-400 mt-1">You can add your logo, colours, and hours after signing up.</p>
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

                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-semibold text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors flex items-center justify-center"
                        >
                            Create Clinic Account
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#5B2EFF] font-semibold hover:text-purple-700">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
