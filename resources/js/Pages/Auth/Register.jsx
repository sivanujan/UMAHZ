import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Lock, Phone, Cake, Building2 } from 'lucide-react';

const CONTACT_METHODS = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'sms', label: 'SMS' },
];

export default function Register({ tenants, preselectedTenantSlug, tosVersion }) {
    const preselected = tenants?.find((t) => t.slug === preselectedTenantSlug);

    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        date_of_birth: '',
        preferred_contact_method: 'email',
        tenant_id: preselected?.id || '',
        tos_accepted: false,
        marketing_opt_in: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <Head title="Create Account" />

            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#5B2EFF,#a855f7)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>U</span>
                    <span className="text-2xl font-bold text-[#1E0B3C] tracking-tight">UMAHZ<span className="text-[#5B2EFF]">.</span></span>
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[#1E0B3C] tracking-tight">Create Your Client Account</h1>
                        <p className="mt-1 text-sm text-slate-500">Book appointments, fill forms, and manage your care.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                    First Name
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        required
                                        className="w-full pl-11 pr-3 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                    />
                                </div>
                                {errors.first_name && <div className="text-xs text-rose-600 mt-1">{errors.first_name}</div>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={data.last_name}
                                    onChange={(e) => setData('last_name', e.target.value)}
                                    required
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                                {errors.last_name && <div className="text-xs text-rose-600 mt-1">{errors.last_name}</div>}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                Email
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
                                Phone
                            </label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    required
                                    placeholder="(555) 234-5678"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            {errors.phone && <div className="text-xs text-rose-600 mt-1">{errors.phone}</div>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                    Date of Birth
                                </label>
                                <div className="relative">
                                    <Cake className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="date"
                                        value={data.date_of_birth}
                                        onChange={(e) => setData('date_of_birth', e.target.value)}
                                        required
                                        className="w-full pl-11 pr-3 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                    />
                                </div>
                                {errors.date_of_birth && <div className="text-xs text-rose-600 mt-1">{errors.date_of_birth}</div>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                    Contact Via
                                </label>
                                <select
                                    value={data.preferred_contact_method}
                                    onChange={(e) => setData('preferred_contact_method', e.target.value)}
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                >
                                    {CONTACT_METHODS.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 }}>
                                Clinic
                            </label>
                            <div className="relative">
                                <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <select
                                    value={data.tenant_id}
                                    onChange={(e) => setData('tenant_id', e.target.value)}
                                    required
                                    disabled={!!preselected}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors disabled:text-slate-400"
                                >
                                    <option value="" disabled>Select your clinic…</option>
                                    {(tenants || []).map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.tenant_id && <div className="text-xs text-rose-600 mt-1">{errors.tenant_id}</div>}
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
                                    minLength={12}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Minimum 12 characters.</p>
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

                        <div className="space-y-3 pt-1">
                            <label className="flex items-start gap-2.5">
                                <input
                                    type="checkbox"
                                    checked={data.tos_accepted}
                                    onChange={(e) => setData('tos_accepted', e.target.checked)}
                                    required
                                    className="mt-0.5 rounded border-slate-300 text-[#5B2EFF] focus:ring-[#5B2EFF] h-4 w-4 flex-shrink-0"
                                />
                                <span className="text-xs text-slate-600 leading-relaxed">
                                    I agree to the <a href="#" className="text-[#5B2EFF] font-semibold hover:text-purple-700">Terms of Service</a> and <a href="#" className="text-[#5B2EFF] font-semibold hover:text-purple-700">Privacy Policy</a> (v{tosVersion}).
                                </span>
                            </label>
                            {errors.tos_accepted && <div className="text-xs text-rose-600">{errors.tos_accepted}</div>}

                            <label className="flex items-start gap-2.5">
                                <input
                                    type="checkbox"
                                    checked={data.marketing_opt_in}
                                    onChange={(e) => setData('marketing_opt_in', e.target.checked)}
                                    className="mt-0.5 rounded border-slate-300 text-[#5B2EFF] focus:ring-[#5B2EFF] h-4 w-4 flex-shrink-0"
                                />
                                <span className="text-xs text-slate-600 leading-relaxed">
                                    Send me wellness tips and clinic offers by email. (Optional — separate from the Terms above.)
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-semibold text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors flex items-center justify-center"
                        >
                            Create Account
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
