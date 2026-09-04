import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    CreditCard,
    Check,
    AlertCircle,
    Download,
    ExternalLink,
    ChevronRight,
    Sparkles,
    ShieldCheck,
    Calendar,
    Users,
    ArrowUpRight,
    X,
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

    // Dynamic tiers fallback
    const activeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_TIERS;

    return (
        <AuthenticatedLayout title="Subscription & Billing">
            <Head title="Subscription & Billing" />

            <div className="max-w-6xl mx-auto space-y-8 font-sans">
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Subscription & Billing
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage your clinic plan, practitioner licenses, payment methods, and invoice history.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {subscription?.status === 'active' ? 'Subscription Active' : subscription?.status === 'pending_review' ? 'Pending Approval' : 'Active Account'}
                        </span>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-4 text-sm font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Top Row: Current Plan & Payment Method Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Plan Overview Card (2 cols) */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                            Current Tier
                                        </span>
                                        {subscription?.on_grace_period && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                Canceling Soon
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize mt-2">
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
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        per month
                                    </div>
                                </div>
                            </div>

                            {/* Plan Breakdown & Practitioners Stats */}
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Full-Time</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                        {subscription?.full_time_practitioners_count || 1} Seat{subscription?.full_time_practitioners_count > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        1 included {subscription?.breakdown?.additional_ft_cost > 0 ? `+ $${subscription.breakdown.additional_ft_cost.toFixed(2)}` : ''}
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                        <span>Part-Time</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                        {subscription?.part_time_practitioners_count || 0} Seat{subscription?.part_time_practitioners_count !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {subscription?.breakdown?.pt_cost > 0 ? `+$${subscription.breakdown.pt_cost.toFixed(2)}/mo` : 'No add-on'}
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Renewal Date</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                        {subscription?.current_period_end || 'Next Billing Cycle'}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Auto-renews monthly
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Modify practitioner seats or upgrade tier at any time with prorated billing.</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsChangePlanOpen(true)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                            >
                                <span>Change Plan or Seats</span>
                                <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Payment Method Card (1 col) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                        Payment Method
                                    </h3>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    Default
                                </span>
                            </div>

                            {paymentMethod ? (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
                                            {paymentMethod.brand}
                                        </span>
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="text-lg font-mono tracking-widest text-slate-100">
                                        •••• •••• •••• {paymentMethod.last4}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Expires {paymentMethod.exp_month ? `${String(paymentMethod.exp_month).padStart(2, '0')}/${paymentMethod.exp_year}` : 'Active'}</span>
                                        <span className="text-emerald-400 font-medium">Verified</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                                    <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        No default payment card registered yet.
                                    </p>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                                Used for monthly subscription renewals and licensed practitioner seats.
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                            <button
                                type="button"
                                onClick={() => setIsUpdateCardOpen(true)}
                                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{paymentMethod ? 'Update Payment Card' : 'Add Payment Card'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Invoices & Billing History Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>Billing History & Invoices</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                View and download all past monthly invoices and payment receipts.
                            </p>
                        </div>
                    </div>

                    {invoices && invoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
                                    <tr>
                                        <th className="py-3 px-6">Invoice</th>
                                        <th className="py-3 px-6">Date</th>
                                        <th className="py-3 px-6">Amount</th>
                                        <th className="py-3 px-6">Status</th>
                                        <th className="py-3 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">
                                                {inv.number || inv.id}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                                {inv.date}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                                                {inv.total} {inv.currency}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    inv.status === 'paid'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                }`}>
                                                    {inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : 'Paid'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right space-x-2">
                                                <a
                                                    href={inv.download_url}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Download PDF</span>
                                                </a>

                                                {inv.hosted_invoice_url && (
                                                    <a
                                                        href={inv.hosted_invoice_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        <span>Receipt</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-2">
                            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                No billing invoices yet
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Once your clinic is billed monthly, your official PDF invoices and payment receipts will appear here.
                            </p>
                        </div>
                    )}
                </div>
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
                />
            )}
        </AuthenticatedLayout>
    );
}

/**
 * Modal for upgrading/modifying plan tier and practitioner seats
 */
function ChangePlanModal({ isOpen, onClose, currentPlan, currentFt, currentPt, tiers }) {
    const [selectedTier, setSelectedTier] = useState(currentPlan || 'practice');
    const [ftCount, setFtCount] = useState(Number(currentFt) || 1);
    const [ptCount, setPtCount] = useState(Number(currentPt) || 0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const activeTierObj = tiers.find((t) => (t.tier_key || t.tier || t.id) === selectedTier) || tiers[0] || {};

    // When balance is selected, force FT=1, PT=0 (Balance plan hardcap)
    useEffect(() => {
        if (selectedTier === 'balance') {
            setFtCount(1);
            setPtCount(0);
        }
    }, [selectedTier]);

    // Live Calculation with safe number conversions
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Change Subscription Plan & Seats
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Choose your clinic tier and configure the number of practitioner licenses.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                        }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
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
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Solo Practitioner Tier:</span> The Balance plan includes exactly 1 practitioner license. To add more staff practitioners, please select the Practice or Thrive plan.
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
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
                                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
                                            >
                                                -
                                            </button>
                                            <span className="w-6 text-center font-bold text-sm text-slate-900 dark:text-white">
                                                {ftCount}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFtCount((c) => c + 1)}
                                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
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
                                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
                                            >
                                                -
                                            </button>
                                            <span className="w-6 text-center font-bold text-sm text-slate-900 dark:text-white">
                                                {ptCount}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setPtCount((c) => c + 1)}
                                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold"
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
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block">
                                Estimated Monthly Total
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                    ${totalMonthly.toFixed(2)} CAD
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                            </div>
                        </div>

                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                            <div>Base: ${basePrice.toFixed(2)}</div>
                            {ftCost > 0 && <div>FT Addons: +${ftCost.toFixed(2)}</div>}
                            {ptCost > 0 && <div>PT Addons: +${ptCost.toFixed(2)}</div>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <span>Confirm & Update Plan</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Modal for updating payment card with Stripe Elements
 */
function UpdateCardModal({ isOpen, onClose, stripeKey, setupIntentSecret }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const cardRef = useRef(null);
    const stripeRef = useRef(null);
    const cardElementRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const Stripe = await loadStripeJs();
                if (!mounted) return;

                stripeRef.current = Stripe(stripeKey);
                const elements = stripeRef.current.elements();
                const card = elements.create('card', {
                    style: {
                        base: {
                            fontSize: '15px',
                            color: '#0F172A',
                            fontFamily: 'Inter, system-ui, sans-serif',
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
    }, [stripeKey]);

    const handleConfirmCard = async (e) => {
        e.preventDefault();
        if (!stripeRef.current || !cardElementRef.current || !setupIntentSecret) {
            setError('Payment setup is not ready. Please refresh.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const { setupIntent, error: stripeError } = await stripeRef.current.confirmCardSetup(
                setupIntentSecret,
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
            }
        } catch (err) {
            setError('An unexpected error occurred while confirming your card.');
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            Update Payment Card
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleConfirmCard} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-medium flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                            Card Information
                        </label>
                        <div
                            ref={cardRef}
                            className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700 min-h-[44px]"
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>End-to-end encrypted directly with Stripe.</span>
                        </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || submitting}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving Card...</span>
                                </>
                            ) : (
                                <span>Save Card</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
