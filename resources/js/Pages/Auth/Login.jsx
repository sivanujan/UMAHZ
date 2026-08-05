import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Lock, Mail, Shield, Sparkles } from 'lucide-react';

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
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
            <Head title="Sign In" />

            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-8 space-y-6">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-teal-900/20">
                        U
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-stone-900 tracking-tight">UMAHZ Wellness</h2>
                    <p className="mt-1 text-xs text-stone-500">Multi-Tenant Practice Management SaaS Scaffolding</p>
                </div>

                {status && (
                    <div className="p-3 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                            Work Email
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-300 text-stone-900 rounded-lg text-sm focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
                            />
                        </div>
                        {errors.email && <div className="text-xs text-rose-600 mt-1">{errors.email}</div>}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-300 text-stone-900 rounded-lg text-sm focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
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
                                className="rounded border-stone-300 text-teal-700 focus:ring-teal-700 h-4 w-4"
                            />
                            <span className="ml-2 text-xs text-stone-600">Remember me</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center"
                    >
                        Sign In to Practice
                    </button>
                </form>

                <div className="pt-4 border-t border-stone-100 text-xs text-stone-500 space-y-1">
                    <p className="font-semibold text-stone-700">Demo Test Credentials:</p>
                    <p>• Owner: <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">owner@lotuswellness.com</code> (pass: <code className="bg-stone-100 px-1 py-0.5 rounded">password</code>)</p>
                    <p>• Practitioner: <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">julian@lotuswellness.com</code> (pass: <code className="bg-stone-100 px-1 py-0.5 rounded">password</code>)</p>
                </div>
            </div>
        </div>
    );
}
