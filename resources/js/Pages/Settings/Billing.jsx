import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { GlassTable, GlassThead, GlassTh, GlassTbody, GlassTr, GlassTd } from '@/Components/UI/GlassTable';
import { GlassModal } from '@/Components/UI/GlassModal';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    CreditCard,
    Check,
    AlertCircle,
    Download,
    ExternalLink,
    ShieldCheck,
    Calendar,
    Users,
    ArrowUpRight,
    Lock,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Activity,
    Mic,
    MapPin,
    RotateCcw,
    XCircle,
    Sparkles,
    Clock,
    X
} from 'lucide-react';

function loadStripeJs() {
    return new Promise((resolve, reject) => {
        if (window.Stripe) return resolve(window.Stripe);

        let checkCount = 0;
        const interval = setInterval(() => {
            if (window.Stripe) {
                clearInterval(interval);
                return resolve(window.Stripe);
            }
            checkCount++;
            if (checkCount > 50) {
                clearInterval(interval);
            }
        }, 100);

        const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
        if (existing) {
            existing.addEventListener('load', () => {
                clearInterval(interval);
                resolve(window.Stripe);
            });
            existing.addEventListener('error', (e) => {
                clearInterval(interval);
                reject(e);
            });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
            clearInterval(interval);
            resolve(window.Stripe);
        };
        script.onerror = (e) => {
            clearInterval(interval);
            reject(e);
        };
        document.head.appendChild(script);
    });
}

function UsageGauge({ icon: Icon, title, used, limit, unlimited, unit = '', color = 'violet' }) {
    const isOver = !unlimited && limit && used > limit;
    const isWarning = !unlimited && limit && used >= limit * 0.8 && used <= limit;
    const percentage = unlimited ? 0 : (limit ? Math.min(100, Math.round((used / limit) * 100)) : 0);

    const colorClasses = {
        violet: 'from-violet-500 to-purple-600',
        emerald: 'from-emerald-500 to-teal-600',
        amber: 'from-amber-500 to-orange-600',
        rose: 'from-rose-500 to-red-600',
    };

    const barGradient = isOver
        ? colorClasses.rose
        : isWarning
            ? colorClasses.amber
            : colorClasses[color] || colorClasses.violet;

    return (
        <div className="p-4 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {title}
                    </span>
                </div>
                {unlimited ? (
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Unlimited
                    </span>
                ) : (
                    <span className={`text-xs font-extrabold ${isOver ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                        {used} / {limit} {unit}
                    </span>
                )}
            </div>

            {!unlimited && (
                <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>{percentage}% utilized</span>
                        {isOver ? (
                            <span className="text-rose-500 font-bold">Limit reached</span>
                        ) : isWarning ? (
                            <span className="text-amber-500 font-bold">Approaching limit</span>
                        ) : (
                            <span>{limit - used > 0 ? `${limit - used} remaining` : ''}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Billing({
    tenant,
    subscription,
    paymentMethod,
    setupIntentSecret,
    stripeKey,
    invoices = [],
    plans = [],
    usage = {},
    tiers = [],
    practitioners = [],
    scribeAddon = null,
    scheduledPlanChange = null,
}) {
    const { flash, errors } = usePage().props;
    const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
    const [isUpdateCardOpen, setIsUpdateCardOpen] = useState(false);
    const [isScribeConfirmOpen, setIsScribeConfirmOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelScheduledOpen, setIsCancelScheduledOpen] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [cancelingScheduled, setCancelingScheduled] = useState(false);
    const [resuming, setResuming] = useState(false);
    const [selectedScribePractitioners, setSelectedScribePractitioners] = useState(() =>
        practitioners.filter((p) => p.has_scribe_plus).map((p) => p.id)
    );
    const [savingScribe, setSavingScribe] = useState(false);

    useEffect(() => {
        setSelectedScribePractitioners(practitioners.filter((p) => p.has_scribe_plus).map((p) => p.id));
    }, [practitioners]);

    const addedScribePractitioners = practitioners.filter(
        (p) => selectedScribePractitioners.includes(p.id) && !p.has_scribe_plus
    );
    const removedScribePractitioners = practitioners.filter(
        (p) => !selectedScribePractitioners.includes(p.id) && p.has_scribe_plus
    );
    const hasScribeChanges = addedScribePractitioners.length > 0 || removedScribePractitioners.length > 0;

    const handleSaveScribe = () => {
        if (!hasScribeChanges) return;
        setIsScribeConfirmOpen(true);
    };

    const handleConfirmScribe = () => {
        setSavingScribe(true);
        router.post('/app/billing/scribe-addon', {
            practitioner_ids: selectedScribePractitioners,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsScribeConfirmOpen(false);
            },
            onFinish: () => setSavingScribe(false),
        });
    };

    const handleConfirmCancelSubscription = ({ reason, details } = {}) => {
        setCanceling(true);
        const reasonPayload = [reason, details].filter(Boolean).join(': ');
        router.post('/app/billing/cancel', {
            reason: reasonPayload || undefined,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCancelModalOpen(false);
            },
            onFinish: () => setCanceling(false),
        });
    };

    const handleConfirmCancelScheduled = () => {
        setCancelingScheduled(true);
        router.delete('/app/billing/scheduled-change', {
            preserveScroll: true,
            onSuccess: () => {
                setIsCancelScheduledOpen(false);
            },
            onFinish: () => setCancelingScheduled(false),
        });
    };

    const handleResumeSubscription = () => {
        setResuming(true);
        router.post('/app/billing/resume', {}, {
            preserveScroll: true,
            onFinish: () => setResuming(false),
        });
    };

    const isAnnual = subscription?.billing_interval === 'year';
    const cadenceLabel = isAnnual ? 'Annual' : 'Monthly';

    return (
        <AuthenticatedLayout title="Subscription & Billing">
            <Head title="Subscription & Billing" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <PageHeader
                    eyebrow="Clinic Operations"
                    title="Subscription & Billing"
                    subtitle="Manage your clinic plan, practitioner licenses, payment methods, and invoice history."
                    actions={
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                {cadenceLabel} Cadence
                            </span>
                            <StatusBadge variant={subscription?.status === 'active' ? 'success' : subscription?.status === 'past_due' ? 'warning' : 'danger'}>
                                {subscription?.status === 'active'
                                    ? 'Subscription Active'
                                    : subscription?.status === 'past_due'
                                        ? 'Payment Past Due'
                                        : subscription?.status === 'restricted_overdue'
                                            ? 'Restricted Overdue'
                                            : subscription?.status === 'canceled'
                                                ? 'Canceled'
                                                : 'Active'}
                            </StatusBadge>
                        </div>
                    }
                />

                {flash?.success && (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {(flash?.error || errors?.card || errors?.scribe) && (
                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{flash?.error || errors?.card || errors?.scribe}</span>
                    </div>
                )}

                {/* Scheduled Plan Change Banner */}
                {scheduledPlanChange && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                                    Scheduled Plan Change: {scheduledPlanChange.plan_name} ({scheduledPlanChange.billing_interval})
                                </span>
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                    Takes effect on {scheduledPlanChange.change_at} at period end. You maintain full access on your current plan until then.
                                </span>
                            </div>
                        </div>
                        <GlassButton
                            variant="secondary"
                            onClick={() => setIsCancelScheduledOpen(true)}
                            className="text-xs shrink-0"
                            icon={<X className="w-3.5 h-3.5 text-rose-500" />}
                        >
                            Cancel Scheduled Change
                        </GlassButton>
                    </div>
                )}

                {subscription?.on_grace_period && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="space-y-1">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Subscription Cancellation Pending</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                        Grace Period Active
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Your subscription is scheduled to terminate on <span className="font-semibold text-slate-900 dark:text-white underline">{subscription.ends_at}</span>. 
                                    Following this date, <span className="font-semibold text-rose-600 dark:text-rose-400">clinic workspace write access will be locked</span> and all clinic records will be permanently removed after 30 days {subscription?.data_deletion_date ? `(${subscription.data_deletion_date})` : 'if not reactivated'}.
                                </p>
                            </div>
                        </div>
                        <GlassButton
                            variant="secondary"
                            onClick={handleResumeSubscription}
                            disabled={resuming}
                            className="text-xs shrink-0 self-start sm:self-center"
                            icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
                        >
                            {resuming ? 'Resuming...' : 'Resume Subscription'}
                        </GlassButton>
                    </div>
                )}

                {subscription?.status === 'canceled' && !subscription?.on_grace_period && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                                <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="space-y-1">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Clinic Workspace Locked</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30">
                                        Access Locked
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Your subscription has been canceled and workspace write features are locked. All clinic records will be permanently purged 30 days after cancellation unless reactivated. Select a plan to restore full access.
                                </p>
                            </div>
                        </div>
                        <GlassButton
                            variant="primary"
                            onClick={() => setIsChangePlanOpen(true)}
                            className="text-xs shrink-0 self-start sm:self-center"
                            icon={<Sparkles className="w-3.5 h-3.5" />}
                        >
                            Reactivate Plan
                        </GlassButton>
                    </div>
                )}

                {/* Top Row: Current Plan & Payment Method */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Plan Overview Card (2 cols) */}
                    <GlassCard className="lg:col-span-2 p-6 sm:p-7 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                            Current Plan
                                        </span>
                                        {isAnnual && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                Annual (~17% savings)
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-normal capitalize">
                                        {subscription?.plan_name || 'Practice Plan'}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Billed {isAnnual ? 'annually' : 'monthly'} in Canadian Dollars (CAD)
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-normal">
                                        {subscription?.breakdown?.total_due_formatted || `$${subscription?.breakdown?.total ? Number(subscription.breakdown.total).toFixed(2) : '79.00'} CAD`}
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        per {isAnnual ? 'year' : 'month'}
                                    </div>
                                </div>
                            </div>

                            {/* Plan Breakdown & Practitioners Seats */}
                            <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-white/40 dark:bg-white/[0.03] rounded-xl border border-white/40 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span>Included Seats</span>
                                    </div>
                                    <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 tracking-normal">
                                        {(() => {
                                            const incCount = usage?.practitioners?.included_count || 1;
                                            return `${incCount} ${incCount === 1 ? 'Practitioner' : 'Practitioners'}`;
                                        })()}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Covered in base plan
                                    </p>
                                </div>

                                <div className="p-4 bg-white/40 dark:bg-white/[0.03] rounded-xl border border-white/40 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                        <span>Extra Seats</span>
                                    </div>
                                    <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 tracking-normal">
                                        {(() => {
                                            const extraCount = subscription?.extra_practitioner_seats || 0;
                                            return `${extraCount} ${extraCount === 1 ? 'Extra Seat' : 'Extra Seats'}`;
                                        })()}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        {subscription?.breakdown?.extra_seats_formatted ? `+${subscription.breakdown.extra_seats_formatted}` : 'None added'}
                                    </p>
                                </div>

                                <div className="p-4 bg-white/40 dark:bg-white/[0.03] rounded-xl border border-white/40 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Next Renewal</span>
                                    </div>
                                    <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 tracking-normal">
                                        {subscription?.current_period_end || '—'}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Auto-renews {isAnnual ? 'yearly' : 'monthly'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Upgrades apply immediately with prorated billing. Downgrades and billing-cycle changes take effect at the end of your current period.</span>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {subscription?.is_active && !subscription?.on_grace_period && (
                                    <button
                                        type="button"
                                        onClick={() => setIsCancelModalOpen(true)}
                                        disabled={canceling}
                                        className="text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                                    >
                                        Cancel Subscription
                                    </button>
                                )}
                                <GlassButton
                                    variant="primary"
                                    onClick={() => setIsChangePlanOpen(true)}
                                    icon={<ArrowUpRight className="w-4 h-4" />}
                                    className="w-full sm:w-auto justify-center"
                                >
                                    Change Plan or Seats
                                </GlassButton>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Payment Method Card (1 col) */}
                    <GlassCard className="p-6 sm:p-7 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 flex items-center justify-center text-[#8200db] dark:text-purple-300">
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                        Payment Method
                                    </h3>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                    Default
                                </span>
                            </div>

                            {paymentMethod ? (
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950 text-white shadow-lg space-y-4 border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold tracking-wider uppercase text-purple-300">
                                            {paymentMethod.brand}
                                        </span>
                                        <Lock className="w-3.5 h-3.5 text-purple-300/70" />
                                    </div>
                                    <div className="text-lg font-mono tracking-widest text-slate-100">
                                        •••• •••• •••• {paymentMethod.last4}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Expires {paymentMethod.exp_month ? `${String(paymentMethod.exp_month).padStart(2, '0')}/${paymentMethod.exp_year}` : 'Active'}</span>
                                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Verified
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 text-center space-y-2 bg-white/30 dark:bg-white/[0.02]">
                                    <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        No default payment card registered yet.
                                    </p>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-medium">
                                Used for subscription renewals and practitioner seat billing.
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10">
                            <GlassButton
                                variant="secondary"
                                onClick={() => setIsUpdateCardOpen(true)}
                                icon={<RefreshCw className="w-3.5 h-3.5" />}
                                className="w-full justify-center text-xs"
                            >
                                {paymentMethod ? 'Update Payment Card' : 'Add Payment Card'}
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>

                {/* Usage Gauges Section */}
                <GlassCard className="p-6 sm:p-7 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span>Monthly Plan Usage & Limits</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Current cycle usage reset automatically on the 1st of each calendar month.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <UsageGauge
                            icon={Calendar}
                            title="Monthly Bookings"
                            used={usage?.appointments?.count ?? 0}
                            limit={usage?.appointments?.limit}
                            unlimited={usage?.appointments?.unlimited}
                            unit="appts"
                            color="violet"
                        />
                        <UsageGauge
                            icon={Mic}
                            title="AI Scribe"
                            used={usage?.scribe?.used_minutes ?? 0}
                            limit={usage?.scribe?.allowance_minutes}
                            unlimited={usage?.scribe?.unlimited}
                            unit="mins"
                            color="emerald"
                        />
                        <UsageGauge
                            icon={Users}
                            title="Practitioners"
                            used={usage?.practitioners?.current_count ?? 1}
                            limit={usage?.practitioners?.max_count || (usage?.practitioners?.included_count + usage?.practitioners?.extra_seats)}
                            unlimited={!usage?.practitioners?.max_count}
                            unit="seats"
                            color="amber"
                        />
                        <UsageGauge
                            icon={MapPin}
                            title="Clinic Locations"
                            used={usage?.locations?.current_count ?? 1}
                            limit={usage?.locations?.limit}
                            unlimited={usage?.locations?.unlimited}
                            unit="locs"
                            color="violet"
                        />
                    </div>
                </GlassCard>

                {/* AI Scribe+ Add-on Section */}
                <GlassCard className="p-6 sm:p-7 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-white/10 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <Sparkles className="w-4 h-4" />
                                </span>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                    AI Scribe+ Add-on Management
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    Per Practitioner
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Give individual practitioners unlimited AI Scribe minutes. Synced at your plan's {cadenceLabel.toLowerCase()} interval (+${isAnnual ? (scribeAddon?.price_annual || 150) : (scribeAddon?.price_monthly || 15)} CAD/seat/{isAnnual ? 'yr' : 'mo'}).
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Active Scribe+ Seats</span>
                                <span className="text-lg font-bold tracking-normal text-slate-900 dark:text-white">
                                    {selectedScribePractitioners.length} / {practitioners.length}
                                </span>
                            </div>
                            <GlassButton
                                variant="primary"
                                onClick={handleSaveScribe}
                                disabled={savingScribe || !hasScribeChanges}
                                className="text-xs shrink-0"
                            >
                                {savingScribe ? 'Saving...' : 'Update Scribe+ Seats'}
                            </GlassButton>
                        </div>
                    </div>

                    {practitioners.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {practitioners.map((practitioner) => {
                                const isChecked = selectedScribePractitioners.includes(practitioner.id);
                                return (
                                    <label
                                        key={practitioner.id}
                                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                            isChecked
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                                                : 'bg-white/40 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-xs truncate text-slate-900 dark:text-white">
                                                {practitioner.name}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {practitioner.role === 'clinic_owner' ? 'Clinic Owner & Practitioner' : 'Practitioner'}
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedScribePractitioners((prev) => [...prev, practitioner.id]);
                                                } else {
                                                    setSelectedScribePractitioners((prev) => prev.filter((id) => id !== practitioner.id));
                                                }
                                            }}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 italic">No eligible practitioners found in your clinic team.</p>
                    )}
                </GlassCard>

                {/* Invoices & Billing History Section */}
                <GlassCard className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span>Billing History & Invoices</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                View and download all past monthly invoices and payment receipts.
                            </p>
                        </div>
                    </div>

                    {invoices && invoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <GlassTable>
                                <GlassThead>
                                    <tr>
                                        <GlassTh>Invoice</GlassTh>
                                        <GlassTh>Date</GlassTh>
                                        <GlassTh>Amount</GlassTh>
                                        <GlassTh>Status</GlassTh>
                                        <GlassTh className="text-right">Actions</GlassTh>
                                    </tr>
                                </GlassThead>
                                <GlassTbody>
                                    {invoices.map((inv) => (
                                        <GlassTr key={inv.id}>
                                            <GlassTd>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {inv.number || inv.id}
                                                </span>
                                            </GlassTd>
                                            <GlassTd>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {inv.date}
                                                </span>
                                            </GlassTd>
                                            <GlassTd>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {inv.total} {inv.currency}
                                                </span>
                                            </GlassTd>
                                            <GlassTd>
                                                <StatusBadge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                                                    {inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : 'Paid'}
                                                </StatusBadge>
                                            </GlassTd>
                                            <GlassTd className="text-right space-x-2">
                                                <a
                                                    href={inv.download_url}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/10 transition-colors shadow-xs"
                                                >
                                                    <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                    <span>Download PDF</span>
                                                </a>

                                                {inv.hosted_invoice_url && (
                                                    <a
                                                        href={inv.hosted_invoice_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                                    >
                                                        <span>Receipt</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </GlassTd>
                                        </GlassTr>
                                    ))}
                                </GlassTbody>
                            </GlassTable>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <EmptyState
                                icon={FileText}
                                title="No billing invoices yet"
                                description="Once your clinic is billed, your official PDF invoices and payment receipts will appear here."
                            />
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Change Plan & Seats Modal */}
            {isChangePlanOpen && (
                <ChangePlanModal
                    isOpen={isChangePlanOpen}
                    onClose={() => setIsChangePlanOpen(false)}
                    currentPlanId={subscription?.plan_id}
                    currentInterval={subscription?.billing_interval || 'month'}
                    currentExtraSeats={subscription?.extra_practitioner_seats || 0}
                    plans={plans}
                    onCancelSubscription={() => setIsCancelModalOpen(true)}
                />
            )}

            {/* Update Card Modal with Stripe Elements */}
            {isUpdateCardOpen && (
                <UpdateCardModal
                    isOpen={isUpdateCardOpen}
                    onClose={() => setIsUpdateCardOpen(false)}
                    stripeKey={stripeKey}
                    setupIntentSecret={setupIntentSecret}
                    hasExistingCard={!!paymentMethod}
                />
            )}

            {/* AI Scribe+ Seats Confirmation Modal */}
            {isScribeConfirmOpen && (
                <ScribeConfirmModal
                    isOpen={isScribeConfirmOpen}
                    onClose={() => setIsScribeConfirmOpen(false)}
                    onConfirm={handleConfirmScribe}
                    submitting={savingScribe}
                    addedPractitioners={addedScribePractitioners}
                    removedPractitioners={removedScribePractitioners}
                    totalSelectedCount={selectedScribePractitioners.length}
                    seatPrice={isAnnual ? (scribeAddon?.price_annual || 150) : (scribeAddon?.price_monthly || 15)}
                    unitLabel={isAnnual ? 'year' : 'month'}
                    intervalShort={isAnnual ? 'yr' : 'mo'}
                    paymentMethod={paymentMethod}
                    onOpenUpdateCard={() => setIsUpdateCardOpen(true)}
                />
            )}

            {/* Cancel Subscription Warning & Confirmation Modal */}
            {isCancelModalOpen && (
                <CancelSubscriptionModal
                    isOpen={isCancelModalOpen}
                    onClose={() => setIsCancelModalOpen(false)}
                    onConfirm={handleConfirmCancelSubscription}
                    submitting={canceling}
                    currentPlanName={subscription?.plan_name || 'Current Plan'}
                    endsAt={subscription?.ends_at || subscription?.current_period_end}
                    dataDeletionDate={subscription?.data_deletion_date}
                    clinicName={tenant?.name}
                />
            )}

            {/* Cancel Scheduled Plan Change Confirmation Modal */}
            {isCancelScheduledOpen && (
                <CancelScheduledChangeModal
                    isOpen={isCancelScheduledOpen}
                    onClose={() => setIsCancelScheduledOpen(false)}
                    onConfirm={handleConfirmCancelScheduled}
                    submitting={cancelingScheduled}
                    scheduledPlanChange={scheduledPlanChange}
                />
            )}
        </AuthenticatedLayout>
    );
}

function ChangePlanModal({ isOpen, onClose, currentPlanId, currentInterval, currentExtraSeats, plans, onCancelSubscription }) {
    const defaultPlan = plans.find((p) => p.id === currentPlanId) || plans[0] || {};
    const [selectedPlanId, setSelectedPlanId] = useState(defaultPlan.id || '');
    const [billingInterval, setBillingInterval] = useState(currentInterval || 'month');
    const [extraSeats, setExtraSeats] = useState(currentExtraSeats || 0);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const activePlan = plans.find((p) => p.id === selectedPlanId) || defaultPlan;

    // Reset extra seats if plan doesn't allow them
    useEffect(() => {
        if (!activePlan.allows_extra_practitioners) {
            setExtraSeats(0);
        }
    }, [selectedPlanId]);

    // Live preview fetch
    useEffect(() => {
        if (!selectedPlanId) return;

        let active = true;
        setPreviewLoading(true);
        setError(null);

        window.axios.get('/app/billing/preview-change', {
            params: {
                plan_id: selectedPlanId,
                billing_interval: billingInterval,
                extra_practitioner_seats: extraSeats,
            },
        })
            .then(({ data }) => {
                if (active) {
                    setPreview(data);
                    setPreviewLoading(false);
                }
            })
            .catch((err) => {
                if (active) {
                    const msg = err?.response?.data?.reason || err?.response?.data?.message || 'Could not preview plan change.';
                    setError(msg);
                    setPreview(null);
                    setPreviewLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [selectedPlanId, billingInterval, extraSeats]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        if (activePlan.downgrade_blocked) {
            setError(activePlan.block_reason || 'This plan change is blocked by current usage.');
            return;
        }

        setSubmitting(true);
        router.put('/app/billing/plan', {
            plan_id: selectedPlanId,
            billing_interval: billingInterval,
            extra_practitioner_seats: extraSeats,
        }, {
            onSuccess: () => {
                setSubmitting(false);
                onClose();
            },
            onError: (errs) => {
                setSubmitting(false);
                setError(errs.plan_id || errs.extra_practitioner_seats || errs.billing_interval || 'Could not update plan.');
            },
        });
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Subscription Plan & Seats"
            maxWidth="max-w-4xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Direct Downgrade Prevention Warning */}
                {activePlan.downgrade_blocked && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                        <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="font-bold text-sm">Direct Downgrades Are Not Permitted</div>
                                <div className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
                                    {activePlan.block_reason || "To switch to a lower plan, please cancel your current subscription. You will retain access until the end of your billing cycle, after which you can activate the lower plan."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sticky Cadence Toggle at top of modal */}
                <div className="sticky -top-5 sm:-top-6 z-20 -mt-5 sm:-mt-6 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3 bg-white/95 dark:bg-[#191426]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Billing Cadence
                        </span>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                            Switching to annual billing saves ~17% every year.
                        </span>
                    </div>

                    <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-white/10 shrink-0">
                        <button
                            type="button"
                            onClick={() => setBillingInterval('month')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                billingInterval === 'month'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingInterval('year')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                billingInterval === 'year'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <span>Annual</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold tracking-wider uppercase">
                                Save 17%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plan Selection Cards */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            1. Select Plan
                        </label>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                            {billingInterval === 'year' ? 'Annual Pricing (Saved ~17%)' : 'Monthly Pricing'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plans.map((p) => {
                            const isSelected = selectedPlanId === p.id;
                            const price = billingInterval === 'year'
                                ? p.annual_monthly_equivalent
                                : (typeof p.monthly_price === 'object' && p.monthly_price !== null ? p.monthly_price.base_price : p.monthly_price);
                            const isBlocked = p.downgrade_blocked;

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        if (!isBlocked) {
                                            setSelectedPlanId(p.id);
                                        }
                                    }}
                                    className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between h-full ${
                                        isBlocked
                                            ? 'opacity-60 cursor-not-allowed border-rose-300 dark:border-rose-900/40 bg-rose-500/[0.02]'
                                            : isSelected
                                                ? 'border-[#8200db] bg-purple-500/10 dark:bg-purple-900/25 shadow-md cursor-pointer'
                                                : 'border-slate-200/80 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-800 bg-white/40 dark:bg-white/[0.02] cursor-pointer'
                                    }`}
                                >
                                    {/* Most Popular Ribbon Badge (Top edge only) */}
                                    {p.is_popular && (
                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                                                <Sparkles className="w-2.5 h-2.5 text-white" />
                                                <span>Most Popular</span>
                                            </span>
                                        </div>
                                    )}

                                    {isSelected && !isBlocked && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#8200db] text-white flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}

                                    {isBlocked && (
                                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                                            Blocked
                                        </div>
                                    )}

                                    <div className="flex flex-col flex-1">
                                        {!p.is_popular && p.badge && (
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8200db] dark:text-purple-300">
                                                {p.badge}
                                            </div>
                                        )}
                                        <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                                            {p.name}
                                        </div>
                                        <div className="text-2xl font-bold tracking-normal text-slate-900 dark:text-white mt-2">
                                            ${price !== null && price !== undefined ? Number(price).toFixed(0) : '—'}
                                            <span className="text-xs font-normal text-slate-500">
                                                CAD/mo {billingInterval === 'year' ? '(billed annually)' : ''}
                                            </span>
                                        </div>
                                        {billingInterval === 'year' && p.annual_base_price && (
                                            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                                                ${Number(p.annual_base_price).toFixed(0)} CAD / year
                                            </div>
                                        )}
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                            {p.description}
                                        </p>

                                        {/* 1. Limit lines at top of card */}
                                        {p.limit_lines && p.limit_lines.length > 0 && (
                                            <div className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-white/10 space-y-1 text-[11px]">
                                                {p.limit_lines.map((limit, idx) => (
                                                    <div key={`limit-${idx}`} className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                                                        <Check className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" strokeWidth={3} />
                                                        <span className="truncate">{limit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 3. Everything in X, plus: pattern */}
                                        {p.parent_tier_name && (
                                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                                Everything in {p.parent_tier_name}, plus:
                                            </div>
                                        )}

                                        {/* Feature Highlights - full list expanded */}
                                        <ul className="mt-1 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 flex-1">
                                            {(p.parent_tier_name ? (p.delta_features || []) : (p.features || [])).map((f, idx) => (
                                                <li key={idx} className="flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-purple-500 shrink-0" />
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {isBlocked ? (
                                        <div className="mt-3 p-2 bg-rose-500/10 rounded-lg text-[10px] text-rose-700 dark:text-rose-300 font-medium mt-auto">
                                            {p.block_reason}
                                        </div>
                                    ) : (
                                        <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 mt-auto">
                                            Includes {p.included_practitioners} practitioner seat{p.included_practitioners > 1 ? 's' : ''}
                                            {p.allows_extra_practitioners ? (
                                                p.show_extra_seat_price && (billingInterval === 'year' ? p.extra_seat_annual : p.extra_seat_monthly) ? (
                                                    <span> · +${billingInterval === 'year' ? p.extra_seat_annual : p.extra_seat_monthly} CAD/seat</span>
                                                ) : (
                                                    <span> · Additional practitioners available</span>
                                                )
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Practitioner Team Configuration */}
                {activePlan.allows_extra_practitioners ? (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                            2. Configure Practitioner Team
                        </label>

                        <div className="p-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] space-y-3">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/40 dark:border-white/10">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">Included with plan</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {activePlan.included_practitioners} {activePlan.included_practitioners === 1 ? 'practitioner' : 'practitioners'} included
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                        Additional practitioners
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {activePlan.show_extra_seat_price && (billingInterval === 'year' ? activePlan.extra_seat_annual : activePlan.extra_seat_monthly)
                                            ? `+$${billingInterval === 'year' ? activePlan.extra_seat_annual : activePlan.extra_seat_monthly} CAD per seat/${billingInterval === 'year' ? 'yr' : 'mo'}`
                                            : "Additional practitioner pricing will be confirmed before you're charged"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={extraSeats <= 0}
                                        onClick={() => setExtraSeats((c) => Math.max(0, c - 1))}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center font-bold text-sm text-slate-900 dark:text-white">
                                        {extraSeats}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (activePlan.max_practitioners && (activePlan.included_practitioners + extraSeats + 1) > activePlan.max_practitioners) {
                                                setError(`Maximum practitioner limit for ${activePlan.name} is ${activePlan.max_practitioners}.`);
                                                return;
                                            }
                                            setExtraSeats((c) => c + 1);
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                            2. Practitioner Team
                        </label>
                        <div className="p-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] text-xs text-slate-600 dark:text-slate-300">
                            <strong className="text-slate-900 dark:text-white block mb-0.5">1 practitioner (solo plan)</strong>
                            The {activePlan.name} plan includes 1 practitioner seat. Additional practitioner seats are not available on this tier.
                        </div>
                    </div>
                )}

                {/* Proration Preview & Order Summary */}
                {preview?.breakdown && !activePlan.downgrade_blocked && (
                    <div className="space-y-3">
                        {preview.proration && preview.proration.is_upgrade && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            Prorated Upgrade Breakdown
                                        </span>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                            {preview.proration.summary}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Due Today</span>
                                        <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                                            {preview.proration.net_amount_due_formatted}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                                    <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Usage So Far</div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {preview.proration.units_used} {preview.proration.units_label}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Rate</div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                            ${preview.proration.unit_rate}/{preview.proration.period_type === 'year' ? 'yr' : preview.proration.period_type === 'month' ? 'mo' : 'day'}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Credit Threshold</div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {preview.proration.threshold} {preview.proration.units_label}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Unused Credit</div>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {preview.proration.unused_credit > 0 ? `-$${Number(preview.proration.unused_credit).toFixed(2)} CAD` : '$0.00 CAD'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-medium">
                                        {preview.proration && preview.proration.is_upgrade && preview.proration.unused_credit > 0
                                            ? `New Plan Rate (${billingInterval === 'year' ? 'Annual' : 'Monthly'})`
                                            : `Estimated ${billingInterval === 'year' ? 'Annual' : 'Monthly'} Total`}
                                    </span>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <span className="text-2xl font-bold tracking-normal text-slate-900 dark:text-white">
                                            {preview.breakdown.total_formatted}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            / {billingInterval === 'year' ? 'year' : 'month'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right text-xs text-slate-600 dark:text-slate-400 font-medium space-y-0.5">
                                    <div>Base: {preview.breakdown.base_price_formatted}</div>
                                    {extraSeats > 0 && (
                                        <div>
                                            {activePlan.show_extra_seat_price !== false && !preview.breakdown.extra_seat_price_under_review
                                                ? `Extra Seats (${extraSeats}): +${preview.breakdown.extra_seats_price_formatted || '$' + Number(preview.breakdown.extra_practitioners_cost || 0).toFixed(2)}`
                                                : `Extra Seats (${extraSeats}): Pending review`}
                                        </div>
                                    )}
                                    {preview.breakdown.discount_amount_cents > 0 && (
                                        <div className="text-emerald-500 font-bold">
                                            Promo Discount: -{preview.breakdown.discount_formatted}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-purple-500/20 pt-2 leading-relaxed">
                                {billingInterval !== currentInterval
                                    ? 'Billing cadence changes take effect at the end of your current billing period. Upgrades take effect immediately with calculated proration.'
                                    : 'Upgrades take effect immediately with calculated day/month proration deduction.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200/50 dark:border-white/10">
                    <div>
                        {activePlan.downgrade_blocked && onCancelSubscription && (
                            <GlassButton
                                type="button"
                                variant="secondary"
                                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/40 hover:bg-rose-500/10"
                                onClick={() => {
                                    onClose();
                                    onCancelSubscription();
                                }}
                            >
                                Cancel Current Subscription
                            </GlassButton>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <GlassButton type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </GlassButton>
                        <GlassButton
                            type="submit"
                            variant="primary"
                            disabled={submitting || previewLoading || activePlan.downgrade_blocked}
                        >
                            {submitting ? 'Updating Plan...' : 'Confirm & Update Plan'}
                        </GlassButton>
                    </div>
                </div>
            </form>
        </GlassModal>
    );
}

function UpdateCardModal({ isOpen, onClose, stripeKey, setupIntentSecret, hasExistingCard }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [clientSecret, setClientSecret] = useState(setupIntentSecret || null);
    const cardRef = useRef(null);
    const stripeRef = useRef(null);
    const cardElementRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                if (!stripeKey) {
                    setError('Stripe publishable key is not configured.');
                    setLoading(false);
                    return;
                }

                let secret = setupIntentSecret;
                if (!secret) {
                    try {
                        const { data } = await window.axios.post('/app/billing/setup-intent');
                        secret = data.client_secret;
                        if (mounted) {
                            setClientSecret(secret);
                        }
                    } catch (fetchErr) {
                        if (mounted) {
                            const msg = fetchErr?.response?.data?.error || 'Could not initialize payment setup. Please try again.';
                            setError(msg);
                            setLoading(false);
                            return;
                        }
                    }
                } else {
                    setClientSecret(secret);
                }

                const Stripe = await loadStripeJs();
                if (!mounted) return;

                stripeRef.current = Stripe(stripeKey);
                const elements = stripeRef.current.elements();
                const card = elements.create('card', {
                    style: {
                        base: {
                            fontSize: '15px',
                            color: '#0F172A',
                            fontFamily: 'Outfit, Inter, system-ui, sans-serif',
                            '::placeholder': { color: '#94A3B8' },
                        },
                    },
                });
                cardElementRef.current = card;

                setLoading(false);

                // Safari safe mounting with requestAnimationFrame
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (mounted && cardRef.current && card) {
                            try {
                                card.mount(cardRef.current);
                            } catch (mountErr) {
                                console.warn('Card mount warning:', mountErr);
                            }
                        }
                    }, 50);
                });
            } catch (err) {
                if (mounted) {
                    setError('Failed to initialize secure payment form. Please try again.');
                    setLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
            if (cardElementRef.current) {
                try {
                    cardElementRef.current.destroy();
                } catch (e) {
                    // Ignore cleanup error
                }
            }
        };
    }, [stripeKey, setupIntentSecret]);

    const handleConfirmCard = async (e) => {
        e.preventDefault();
        setError(null);

        let activeSecret = clientSecret;

        if (!activeSecret) {
            setSubmitting(true);
            try {
                const { data } = await window.axios.post('/app/billing/setup-intent');
                activeSecret = data.client_secret;
                setClientSecret(activeSecret);
            } catch (fetchErr) {
                setSubmitting(false);
                setError('Payment setup is not ready. Please refresh.');
                return;
            }
        }

        if (!stripeRef.current || !cardElementRef.current || !activeSecret) {
            setError('Payment setup is not ready. Please refresh.');
            setSubmitting(false);
            return;
        }

        setSubmitting(true);

        try {
            const { setupIntent, error: stripeError } = await stripeRef.current.confirmCardSetup(
                activeSecret,
                { payment_method: { card: cardElementRef.current } }
            );

            if (stripeError) {
                setError(stripeError.message || 'Could not verify your card.');
                setSubmitting(false);
                return;
            }

            if (setupIntent && setupIntent.status === 'succeeded') {
                router.post('/app/billing/payment-method', {
                    payment_method_id: setupIntent.payment_method,
                }, {
                    onSuccess: () => {
                        setSubmitting(false);
                        onClose();
                    },
                    onError: (errs) => {
                        setSubmitting(false);
                        setError(errs.card || 'Could not save payment method.');
                    },
                });
            } else {
                setSubmitting(false);
                setError('Card verification was not completed. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred while confirming your card.');
            setSubmitting(false);
        }
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title={hasExistingCard ? 'Update Payment Card' : 'Add Payment Card'}
            maxWidth="max-w-md"
        >
            <form onSubmit={handleConfirmCard} className="space-y-5">
                {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        Card Information
                    </label>
                    <div className="relative">
                        <div
                            ref={cardRef}
                            className="p-3.5 bg-white/70 dark:bg-white/10 rounded-xl border border-slate-300 dark:border-white/15 min-h-[44px]"
                        />
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center text-xs text-slate-500 gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                                <span>Initializing secure payment form...</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>End-to-end encrypted directly with Stripe.</span>
                    </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200/50 dark:border-white/10">
                    <GlassButton type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton
                        type="submit"
                        variant="primary"
                        disabled={loading || submitting}
                    >
                        {submitting
                            ? (hasExistingCard ? 'Updating Card...' : 'Saving Card...')
                            : (hasExistingCard ? 'Update Card' : 'Save Card')}
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
    );
}

function ScribeConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    submitting,
    addedPractitioners = [],
    removedPractitioners = [],
    totalSelectedCount = 0,
    seatPrice = 15,
    unitLabel = 'month',
    intervalShort = 'mo',
    paymentMethod = null,
    onOpenUpdateCard,
}) {
    const isAdding = addedPractitioners.length > 0;
    const isRemovingOnly = !isAdding && removedPractitioners.length > 0;
    const additionalCost = addedPractitioners.length * seatPrice;
    const totalNewCost = totalSelectedCount * seatPrice;
    const hasCard = Boolean(paymentMethod?.last4);

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={submitting ? undefined : onClose}
            title={isRemovingOnly ? 'Confirm Scribe+ Seat Reduction' : 'Confirm AI Scribe+ Seats & Payment'}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                {/* Intro summary banner */}
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#8200db] dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {isRemovingOnly ? 'Seat Reduction Review' : 'Add-on License & Payment Confirmation'}
                        </p>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                            {isRemovingOnly
                                ? 'Review practitioner seat removals before updating your clinic subscription.'
                                : 'Review license additions and confirm payment for unlimited AI Scribe.'}
                        </p>
                    </div>
                </div>

                {/* Added Practitioners list */}
                {addedPractitioners.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Activating Scribe+ (+{addedPractitioners.length} {addedPractitioners.length === 1 ? 'Seat' : 'Seats'})
                        </span>
                        <div className="space-y-1.5">
                            {addedPractitioners.map((p) => (
                                <div
                                    key={p.id}
                                    className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs"
                                >
                                    <div className="min-w-0">
                                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                                            {p.name}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {p.role === 'clinic_owner' ? 'Clinic Owner & Practitioner' : 'Practitioner'}
                                        </span>
                                    </div>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs shrink-0">
                                        +${seatPrice} CAD/{intervalShort}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Removed Practitioners list */}
                {removedPractitioners.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Removing Scribe+ (-{removedPractitioners.length} {removedPractitioners.length === 1 ? 'Seat' : 'Seats'})
                        </span>
                        <div className="space-y-1.5">
                            {removedPractitioners.map((p) => (
                                <div
                                    key={p.id}
                                    className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-2 text-xs"
                                >
                                    <div className="min-w-0">
                                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                                            {p.name}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Reverts to standard plan Scribe allowance
                                        </span>
                                    </div>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 text-xs shrink-0">
                                        Removed
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pricing & Billing Summary Card */}
                <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">New Active Scribe+ Seats</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {totalSelectedCount} {totalSelectedCount === 1 ? 'seat' : 'seats'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Add-on Rate</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            ${seatPrice} CAD / seat / {unitLabel}
                        </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between font-bold">
                        <span className="text-slate-900 dark:text-white">New Scribe+ Recurring Total</span>
                        <span className="text-sm text-purple-700 dark:text-purple-300">
                            ${totalNewCost} CAD / {unitLabel}
                        </span>
                    </div>
                </div>

                {/* Payment Method on file / Charge Notice */}
                {isAdding && (
                    <div className="space-y-2">
                        {hasCard ? (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900 dark:text-white block">
                                            {paymentMethod.brand} ending in {paymentMethod.last4}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Default payment method on file
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Ready to Charge
                                </span>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                    <span>No payment card saved on file.</span>
                                </div>
                                <GlassButton
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        onClose();
                                        onOpenUpdateCard();
                                    }}
                                >
                                    Add Card
                                </GlassButton>
                            </div>
                        )}

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {hasCard
                                ? 'Your saved payment method will be charged an immediate prorated amount for the remaining days of your current billing period.'
                                : 'A saved card is required to activate paid add-on seats.'}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/50 dark:border-white/10">
                    <GlassButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </GlassButton>
                    <GlassButton
                        type="button"
                        variant="primary"
                        onClick={onConfirm}
                        disabled={submitting || (isAdding && !hasCard)}
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Processing Payment...
                            </span>
                        ) : isAdding ? (
                            `Confirm & Charge (+$${additionalCost} CAD)`
                        ) : (
                            'Confirm Seat Removal'
                        )}
                    </GlassButton>
                </div>
            </div>
        </GlassModal>
    );
}

function CancelSubscriptionModal({
    isOpen,
    onClose,
    onConfirm,
    submitting = false,
    currentPlanName = 'Current Plan',
    endsAt,
    dataDeletionDate,
    clinicName,
}) {
    const [selectedReason, setSelectedReason] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isAcknowledged, setIsAcknowledged] = useState(false);

    const reasons = [
        'Cost / Pricing is too high',
        'Missing features we need',
        'Clinic closing or temporary hiatus',
        'Switching to another EHR / platform',
        'Other reasons',
    ];

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!isAcknowledged || submitting) return;
        onConfirm({
            reason: selectedReason,
            details: feedback,
        });
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={submitting ? undefined : onClose}
            title="Cancel Clinic Subscription"
            maxWidth="max-w-xl"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Warning Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-500/10 border border-rose-500/30 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Subscription Cancellation Notice
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            We're sorry to see you go. Canceling your <strong className="text-slate-900 dark:text-white">{currentPlanName}</strong> subscription initiates an account closure workflow. Please review what happens next:
                        </p>
                    </div>
                </div>

                {/* Important Key Points & Timelines */}
                <div className="space-y-2.5">
                    {/* Item 1: Active until cycle end */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                1. Full Access Until Billing Cycle Ends
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed block">
                                You and your staff retain complete access until <span className="font-semibold text-slate-900 dark:text-white underline">{endsAt || 'the end of your current cycle'}</span>. No further renewal charges will occur.
                            </span>
                        </div>
                    </div>

                    {/* Item 2: Everything Locked After Cycle Ends */}
                    <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Lock className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
                                2. Workspace Access Locked ("Everything Locked")
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed block">
                                Following your billing period end date, <span className="font-semibold text-rose-700 dark:text-rose-300">your entire clinic workspace will be locked</span>. You and your practitioners will no longer be able to create or edit patient records, chart notes, schedule appointments, or generate invoices unless a plan is reactivated.
                            </span>
                        </div>
                    </div>

                    {/* Item 3: 30-Day Permanent Data Deletion */}
                    <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                                3. Permanent Data Removal After 30 Days
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed block">
                                In accordance with healthcare data safety standards, clinic data (patients, charts, clinical notes, files, invoices, intake forms) is retained for a <span className="font-semibold text-amber-700 dark:text-amber-300">30-day retention period</span> {dataDeletionDate ? `(until ${dataDeletionDate})` : 'following access lockout'}. After 30 days, <span className="font-semibold text-rose-600 dark:text-rose-400">all clinic records will be permanently and irreversibly purged</span>.
                            </span>
                        </div>
                    </div>

                    {/* Item 4: Resume anytime */}
                    <div className="p-3.5 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                            <RotateCcw className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                4. Reactivate Anytime
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed block">
                                You can resume your subscription before your cycle ends or reactivate at any time within the 30-day window to restore all records with zero data loss.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Optional Reason Selection */}
                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Reason for Cancellation <span className="text-slate-400 font-normal">(Optional feedback)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {reasons.map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setSelectedReason(r === selectedReason ? '' : r)}
                                className={`p-2 rounded-lg text-left text-xs transition border ${
                                    selectedReason === r
                                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-900 dark:text-purple-200 font-semibold'
                                        : 'bg-white/40 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    {selectedReason && (
                        <textarea
                            rows={2}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Tell us what we could improve (optional)..."
                            className="w-full mt-1.5 p-2 rounded-lg text-xs bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    )}
                </div>

                {/* Mandatory Acknowledgment Checkbox */}
                <label className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 flex items-start gap-3 cursor-pointer select-none hover:bg-rose-500/10 transition">
                    <input
                        type="checkbox"
                        checked={isAcknowledged}
                        onChange={(e) => setIsAcknowledged(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-rose-600 border-rose-300 focus:ring-rose-500 dark:border-rose-600/50 dark:bg-black/40"
                    />
                    <div className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                        <span className="font-bold text-rose-700 dark:text-rose-300">I understand the consequences:</span>{' '}
                        My clinic workspace will be <strong className="font-semibold">locked</strong> when the billing cycle ends, and all clinic data will be <strong className="font-semibold text-rose-600 dark:text-rose-400">permanently removed after 30 days</strong> if not reactivated.
                    </div>
                </label>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
                    <GlassButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                        className="w-full sm:w-auto text-xs"
                    >
                        Keep My Subscription
                    </GlassButton>
                    <GlassButton
                        type="submit"
                        variant="danger"
                        disabled={!isAcknowledged || submitting}
                        className="w-full sm:w-auto text-xs font-semibold"
                        icon={submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    >
                        {submitting ? 'Canceling Subscription...' : 'Confirm Cancellation'}
                    </GlassButton>
                </div>
            </form>
        </GlassModal>
    );
}

function CancelScheduledChangeModal({
    isOpen,
    onClose,
    onConfirm,
    submitting = false,
    scheduledPlanChange,
}) {
    return (
        <GlassModal
            isOpen={isOpen}
            onClose={submitting ? undefined : onClose}
            title="Cancel Scheduled Plan Change"
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Keep Current Subscription
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Are you sure you want to cancel the scheduled switch to{' '}
                            <strong>{scheduledPlanChange?.plan_name} ({scheduledPlanChange?.billing_interval})</strong>?
                            Your clinic will continue on its current active subscription without any change at renewal.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
                    <GlassButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                        className="w-full sm:w-auto text-xs"
                    >
                        Keep Scheduled Switch
                    </GlassButton>
                    <GlassButton
                        type="button"
                        variant="danger"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="w-full sm:w-auto text-xs font-semibold"
                        icon={submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    >
                        {submitting ? 'Canceling Switch...' : 'Confirm Cancellation'}
                    </GlassButton>
                </div>
            </div>
        </GlassModal>
    );
}

