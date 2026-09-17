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
    FileText
} from 'lucide-react';

function loadStripeJs() {
    return new Promise((resolve, reject) => {
        if (window.Stripe) return resolve(window.Stripe);
        const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Stripe));
            existing.addEventListener('error', reject);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => resolve(window.Stripe);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

const DEFAULT_TIERS = [
    {
        tier_key: 'balance',
        name: 'Balance',
        badge: 'Solo Practitioner',
        monthly_base_price: 54,
        included_ft_practitioners: 1,
        max_total_practitioners: 1,
        addon_ft_price: 0,
        addon_pt_price: 0,
        features: [
            '1 practitioner only (capped)',
            'Up to 20 appointments / month',
            'Full charting & SOAP notes',
            'Online booking & client portal',
            'Automated email reminders',
        ],
    },
    {
        tier_key: 'practice',
        name: 'Practice',
        badge: 'Most Popular',
        monthly_base_price: 79,
        included_ft_practitioners: 1,
        max_total_practitioners: null,
        addon_ft_price: 35,
        addon_pt_price: 17.5,
        features: [
            'Includes 1 full-time practitioner',
            'Unlimited appointments & clients',
            'Multi-practitioner scheduling',
            'Chart locking & digital signatures',
            'Custom intake & consent forms',
            '+$35/mo per extra FT, +$17.50/mo per PT',
        ],
    },
    {
        tier_key: 'thrive',
        name: 'Thrive',
        badge: 'Full Featured',
        monthly_base_price: 99,
        included_ft_practitioners: 1,
        max_total_practitioners: null,
        addon_ft_price: 40,
        addon_pt_price: 20,
        features: [
            'Includes 1 full-time practitioner',
            'Unlimited appointments & rooms',
            'Multi-location support',
            'Dedicated account manager',
            'Priority support & API access',
            '+$40/mo per extra FT, +$20/mo per PT',
        ],
    },
];

export default function Billing({
    tenant,
    subscription,
    paymentMethod,
    setupIntentSecret,
    stripeKey,
    invoices = [],
    tiers = DEFAULT_TIERS,
}) {
    const { flash } = usePage().props;
    const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
    const [isUpdateCardOpen, setIsUpdateCardOpen] = useState(false);

    const activeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_TIERS;

    return (
        <AuthenticatedLayout title="Subscription & Billing">
            <Head title="Subscription & Billing" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <PageHeader
                    eyebrow="Clinic Operations"
                    title="Subscription & Billing"
                    subtitle="Manage your clinic plan, practitioner licenses, payment methods, and invoice history."
                    actions={
                        <StatusBadge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                            {subscription?.status === 'active'
                                ? 'Subscription Active'
                                : subscription?.status === 'pending_review'
                                    ? 'Pending Approval'
                                    : 'Active Account'}
                        </StatusBadge>
                    }
                />

                {flash?.success && (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Top Row: Current Plan & Payment Method Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Plan Overview Card (2 cols) */}
                    <GlassCard className="lg:col-span-2 p-6 sm:p-7 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                            Current Tier
                                        </span>
                                        {subscription?.on_grace_period && (
                                            <StatusBadge variant="warning">Canceling Soon</StatusBadge>
                                        )}
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize">
                                        {subscription?.plan_name || 'Practice Plan'}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Billed monthly in Canadian Dollars (CAD)
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                        ${subscription?.breakdown?.total ? Number(subscription.breakdown.total).toFixed(2) : '79.00'}
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        per month
                                    </div>
                                </div>
                            </div>

                            {/* Plan Breakdown & Practitioners Stats */}
                            <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-white/40 dark:bg-white/[0.03] rounded-xl border border-white/40 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span>Full-Time</span>
                                    </div>
                                    <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                                        {subscription?.full_time_practitioners_count || 1} Seat{subscription?.full_time_practitioners_count > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        1 included {subscription?.breakdown?.additional_ft_cost > 0 ? `+ $${subscription.breakdown.additional_ft_cost.toFixed(2)}` : ''}
                                    </p>
                                </div>

                                <div className="p-4 bg-white/40 dark:bg-white/[0.03] rounded-xl border border-white/40 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                        <span>Part-Time</span>
                                    </div>
                                    <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                                        {subscription?.part_time_practitioners_count || 0} Seat{subscription?.part_time_practitioners_count !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        {subscription?.breakdown?.pt_cost > 0 ? `+$${subscription.breakdown.pt_cost.toFixed(2)}/mo` : 'No add-on'}
                                    </p>
                                </div>

                                <div className="p-4 bg-white/40 dark:bg-white/[0.03] rounded-xl border border-white/40 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Renewal Date</span>
                                    </div>
                                    <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                                        {subscription?.current_period_end || 'Next Cycle'}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Auto-renews monthly
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Modify practitioner seats or upgrade tier at any time with prorated billing.</span>
                            </div>

                            <GlassButton
                                variant="primary"
                                onClick={() => setIsChangePlanOpen(true)}
                                icon={<ArrowUpRight className="w-4 h-4" />}
                                className="w-full sm:w-auto justify-center"
                            >
                                Change Plan or Seats
                            </GlassButton>
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
                                Used for monthly subscription renewals and licensed practitioner seats.
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
                                description="Once your clinic is billed monthly, your official PDF invoices and payment receipts will appear here."
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
                    currentPlan={subscription?.plan_tier || 'practice'}
                    currentFt={subscription?.full_time_practitioners_count || 1}
                    currentPt={subscription?.part_time_practitioners_count || 0}
                    tiers={activeTiers}
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
        </AuthenticatedLayout>
    );
}

function ChangePlanModal({ isOpen, onClose, currentPlan, currentFt, currentPt, tiers }) {
    const [selectedTier, setSelectedTier] = useState(currentPlan || 'practice');
    const [ftCount, setFtCount] = useState(Number(currentFt) || 1);
    const [ptCount, setPtCount] = useState(Number(currentPt) || 0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const activeTierObj = tiers.find((t) => (t.tier_key || t.tier || t.id) === selectedTier) || tiers[0] || {};

    useEffect(() => {
        if (selectedTier === 'balance') {
            setFtCount(1);
            setPtCount(0);
        }
    }, [selectedTier]);

    const basePrice = Number(activeTierObj.monthly_base_price ?? activeTierObj.base_price ?? 0);
    const includedFt = Number(activeTierObj.included_ft_practitioners ?? activeTierObj.included_full_time ?? 1);
    const addonFt = Number(activeTierObj.addon_ft_price ?? activeTierObj.addon_price_ft ?? 0);
    const addonPt = Number(activeTierObj.addon_pt_price ?? activeTierObj.addon_price_pt ?? 0);

    const extraFt = Math.max(0, ftCount - includedFt);
    const ftCost = extraFt * addonFt;
    const ptCost = ptCount * addonPt;
    const totalMonthly = basePrice + ftCost + ptCost;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        if (selectedTier === 'balance' && (ftCount + ptCount) > 1) {
            setError('The Balance plan is limited to 1 practitioner only.');
            return;
        }

        setSubmitting(true);
        router.put('/app/billing/plan', {
            plan_tier: selectedTier,
            full_time_practitioners_count: ftCount,
            part_time_practitioners_count: ptCount,
        }, {
            onSuccess: () => {
                setSubmitting(false);
                onClose();
            },
            onError: (errs) => {
                setSubmitting(false);
                setError(errs.plan_tier || errs.full_time_practitioners_count || 'Could not update plan.');
            },
        });
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Subscription Plan & Seats"
            maxWidth="max-w-3xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Tier Selection Cards */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                        1. Select Plan Tier
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {tiers.map((t) => {
                            const tierKey = t.tier_key || t.tier || t.id;
                            const tierBasePrice = Number(t.monthly_base_price ?? t.base_price ?? 0);
                            const isSelected = selectedTier === tierKey;
                            return (
                                <div
                                    key={tierKey}
                                    onClick={() => setSelectedTier(tierKey)}
                                    className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'border-[#8200db] bg-purple-500/10 dark:bg-purple-900/25 shadow-sm'
                                            : 'border-slate-200/80 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-800 bg-white/40 dark:bg-white/[0.02]'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#8200db] text-white flex items-center justify-center">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#8200db] dark:text-purple-300">
                                        {t.badge || t.name}
                                    </div>
                                    <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                                        {t.name}
                                    </div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                        ${tierBasePrice.toFixed(0)}
                                        <span className="text-xs font-normal text-slate-500">/mo</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                        {t.features?.[0] || 'Full practice features'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Practitioner Seats Configuration */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                        2. Configure Practitioner Licenses
                    </label>

                    {selectedTier === 'balance' ? (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <div>
                                <span className="font-bold">Solo Practitioner Tier:</span> The Balance plan includes exactly 1 practitioner license. To add more staff practitioners, please select the Practice or Thrive plan.
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                            Full-Time Practitioners
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            1 included (+${addonFt.toFixed(2)}/mo each extra)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={ftCount <= 1}
                                            onClick={() => setFtCount((c) => Math.max(1, c - 1))}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center font-bold text-sm text-slate-900 dark:text-white">
                                            {ftCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setFtCount((c) => c + 1)}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                            Part-Time Practitioners
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            +${addonPt.toFixed(2)}/mo each
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={ptCount <= 0}
                                            onClick={() => setPtCount((c) => Math.max(0, c - 1))}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center font-bold text-sm text-slate-900 dark:text-white">
                                            {ptCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPtCount((c) => c + 1)}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Summary & Pricing Total */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 block font-medium">
                            Estimated Monthly Total
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">
                                ${totalMonthly.toFixed(2)} CAD
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                        </div>
                    </div>

                    <div className="text-right text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <div>Base: ${basePrice.toFixed(2)}</div>
                        {ftCost > 0 && <div>FT Addons: +${ftCost.toFixed(2)}</div>}
                        {ptCost > 0 && <div>PT Addons: +${ptCost.toFixed(2)}</div>}
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200/50 dark:border-white/10">
                    <GlassButton type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton type="submit" variant="primary" disabled={submitting}>
                        {submitting ? 'Updating...' : 'Confirm & Update Plan'}
                    </GlassButton>
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
                    setError('Stripe publishable key is not configured. Please ensure STRIPE_KEY is set in your environment.');
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
                setTimeout(() => {
                    if (mounted && cardRef.current) {
                        card.mount(cardRef.current);
                    }
                }, 50);
            } catch (err) {
                if (mounted) {
                    setError('Failed to initialize secure payment form. Please try again.');
                    setLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
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
