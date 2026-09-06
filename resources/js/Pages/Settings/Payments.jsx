import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CreditCard, CheckCircle2, Clock, AlertCircle, ExternalLink, ShieldCheck, Banknote } from 'lucide-react';

const STATUS = {
    none: { label: 'Not connected', icon: AlertCircle, cls: 'text-slate-500', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
    pending: { label: 'Pending — finish onboarding', icon: Clock, cls: 'text-amber-600', badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
    connected: { label: 'Connected', icon: CheckCircle2, cls: 'text-emerald-600', badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
};

export default function Payments({ connect, platform_fee }) {
    const [starting, setStarting] = useState(false);
    const s = STATUS[connect.status] || STATUS.none;
    const StatusIcon = s.icon;

    const startOnboarding = () => {
        setStarting(true);
        router.post('/app/settings/payments/connect', {}, { onFinish: () => setStarting(false) });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Connect payments" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Connect payments</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Connect your clinic's own Stripe account so patients can pay you by card. Funds settle
                        <span className="font-semibold"> directly into your account</span>.
                    </p>
                </div>

                {/* Status card */}
                <div className="rounded-2xl border shadow-sm p-6" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Stripe Connect</h2>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.badge}`}>{s.label}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                    <StatusIcon className={`w-3.5 h-3.5 ${s.cls}`} />
                                    {connect.status === 'connected'
                                        ? 'Your clinic can take card payments from patients.'
                                        : connect.status === 'pending'
                                            ? 'Stripe still needs a few details before you can take cards.'
                                            : 'Not yet accepting card payments.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {connect.status === 'connected' ? (
                        <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
                            <Flag label="Charges" ok={connect.charges_enabled} />
                            <Flag label="Payouts" ok={connect.payouts_enabled} />
                            <Flag label="Details" ok={connect.details_submitted} />
                        </div>
                    ) : (
                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={startOnboarding}
                                disabled={starting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm disabled:opacity-50"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {starting ? 'Redirecting…' : connect.status === 'pending' ? 'Continue Stripe onboarding' : 'Connect with Stripe'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Fee policy */}
                <div className="rounded-2xl border shadow-sm p-6" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Platform fee</h2>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {platform_fee.enabled
                            ? `UMAHZ applies a ${(platform_fee.bps / 100).toFixed(2)}% platform fee to card payments.`
                            : 'UMAHZ takes 0% — 100% of every patient payment goes to your clinic.'}
                    </p>
                </div>

                {/* Manual payments note */}
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Banknote className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>You can always record cash / e-transfer payments on an invoice, even before connecting Stripe.</span>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Flag({ label, ok }) {
    return (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--umahz-border)' }}>
            <div className={`flex items-center justify-center ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{label}</div>
            <div className="text-[10px] text-slate-400">{ok ? 'Enabled' : 'Pending'}</div>
        </div>
    );
}
