import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { CreditCard, CheckCircle2, Clock, AlertCircle, ExternalLink, ShieldCheck, Banknote } from 'lucide-react';

const STATUS = {
    none: { label: 'Not connected', variant: 'neutral', icon: AlertCircle },
    pending: { label: 'Pending onboarding', variant: 'warning', icon: Clock },
    connected: { label: 'Connected', variant: 'success', icon: CheckCircle2 },
};

export default function Payments({ connect = {}, platform_fee = {} }) {
    const [starting, setStarting] = useState(false);
    const statusKey = connect?.status || 'none';
    const s = STATUS[statusKey] || STATUS.none;
    const StatusIcon = s.icon;

    const startOnboarding = () => {
        setStarting(true);
        router.post('/app/settings/payments/connect', {}, { onFinish: () => setStarting(false) });
    };

    return (
        <AuthenticatedLayout title="Connect payments">
            <Head title="Connect payments" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <PageHeader
                    eyebrow="Settings"
                    title="Connect payments"
                    subtitle="Connect your clinic's Stripe account so patients can pay by card directly into your bank account."
                />

                {/* Stripe Connect Card */}
                <GlassCard className="p-6 sm:p-7">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-sm">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Stripe Connect</h2>
                                    <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                                    <StatusIcon className="w-4 h-4 shrink-0" />
                                    {statusKey === 'connected'
                                        ? 'Your clinic is active and ready to accept patient card payments.'
                                        : statusKey === 'pending'
                                            ? 'Stripe still requires additional details to activate your account.'
                                            : 'Not yet connected. Start onboarding to accept credit and debit cards.'}
                                </p>
                            </div>
                        </div>

                        {statusKey !== 'connected' && (
                            <GlassButton
                                variant="primary"
                                onClick={startOnboarding}
                                disabled={starting}
                                icon={<ExternalLink className="w-4 h-4" />}
                                className="w-full sm:w-auto shrink-0 justify-center"
                            >
                                {starting ? 'Redirecting…' : statusKey === 'pending' ? 'Continue Stripe onboarding' : 'Connect with Stripe'}
                            </GlassButton>
                        )}
                    </div>

                    {statusKey === 'connected' && (
                        <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Flag label="Card Charges" ok={connect.charges_enabled} />
                            <Flag label="Bank Payouts" ok={connect.payouts_enabled} />
                            <Flag label="Account Details" ok={connect.details_submitted} />
                        </div>
                    )}
                </GlassCard>

                {/* Platform Fee Policy */}
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Platform Fee Policy</h2>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 pl-11 leading-relaxed">
                        {platform_fee?.enabled
                            ? `UMAHZ applies a ${(platform_fee.bps / 100).toFixed(2)}% platform fee to online card transactions.`
                            : 'UMAHZ takes 0% commission — 100% of every patient transaction settles directly to your connected bank account.'}
                    </p>
                </GlassCard>

                {/* Cash / Manual Payment notice */}
                <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Banknote className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>You can always record cash, check, or direct e-transfer payments on any invoice without Stripe.</span>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Flag({ label, ok }) {
    return (
        <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-3.5 flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                ok
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
            }`}>
                {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{label}</div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{ok ? 'Active & verified' : 'Pending completion'}</div>
            </div>
        </div>
    );
}
