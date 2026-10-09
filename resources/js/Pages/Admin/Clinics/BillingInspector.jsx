import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    CreditCard, ArrowLeft, Building2, ExternalLink, Calendar,
    Users, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2,
    Clock, Tag, Layers, RefreshCw, Loader2, DollarSign, Ban,
    ChevronRight, History
} from 'lucide-react';

export default function BillingInspector({ tenant, availablePlans = [], activePromos = [] }) {
    const { flash, errors } = usePage().props;

    // Modals
    const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
    const [applyPromoModalOpen, setApplyPromoModalOpen] = useState(false);
    const [extendGraceModalOpen, setExtendGraceModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form states
    const [changePlanForm, setChangePlanForm] = useState({
        plan_id: tenant.plan?.id || availablePlans[0]?.id || '',
        billing_interval: tenant.billing_interval || 'month',
        reason: '',
    });

    const [applyPromoForm, setApplyPromoForm] = useState({
        promo_code: '',
        reason: '',
    });

    const [extendGraceForm, setExtendGraceForm] = useState({
        days: 14,
        reason: '',
    });

    const handleChangePlanSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/billing/change-plan`, changePlanForm, {
            onSuccess: () => setChangePlanModalOpen(false),
            onFinish: () => setProcessing(false),
        });
    };

    const handleApplyPromoSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/billing/apply-promo`, applyPromoForm, {
            onSuccess: () => setApplyPromoModalOpen(false),
            onFinish: () => setProcessing(false),
        });
    };

    const handleExtendGraceSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/billing/extend-grace`, extendGraceForm, {
            onSuccess: () => setExtendGraceModalOpen(false),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AdminLayout title={`Billing Inspector — ${tenant.name}`}>
            <Head title={`Admin — Billing Inspector: ${tenant.name}`} />

            {/* Back link */}
            <div className="mb-6 flex items-center justify-between">
                <Link
                    href={`/admin/clinics/${tenant.id}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Clinic Overview</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Tenant ID: {tenant.id}</span>
                </div>
            </div>

            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}

            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                    <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Action failed due to validation errors:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                        {Object.entries(errors).map(([key, msg]) => (
                            <li key={key}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Top Banner: Clinic & Subscription Status */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 mb-8 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-normal leading-tight">{tenant.name}</h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {tenant.subdomain}.umahz.com
                                </span>
                                {tenant.is_grandfathered && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Grandfathered Price
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                                <span>Status: <strong className="text-white capitalize">{tenant.status}</strong></span>
                                <span>•</span>
                                <span>Subscription: <strong className="text-emerald-400 capitalize">{tenant.subscription_status}</strong></span>
                                {tenant.grace_period_ends_at && (
                                    <>
                                        <span>•</span>
                                        <span className="text-amber-400">
                                            Grace Period: active until {new Date(tenant.grace_period_ends_at).toLocaleDateString()}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Overrides Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => setChangePlanModalOpen(true)}
                            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
                        >
                            Change Plan
                        </button>
                        <button
                            onClick={() => setApplyPromoModalOpen(true)}
                            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
                        >
                            Apply Promo
                        </button>
                        <button
                            onClick={() => setExtendGraceModalOpen(true)}
                            className="px-3.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-colors"
                        >
                            Extend Grace Period
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid of Details: Plan & Seats, Stripe Links & Billing, Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Subscription & Seats */}
                <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2 flex items-center justify-between">
                        <span>Current Plan & Seats</span>
                        <CreditCard className="w-4 h-4 text-slate-500" />
                    </h3>
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Plan Tier:</span>
                            <span className="font-semibold text-white">{tenant.plan?.name || 'Custom'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Billing Interval:</span>
                            <span className="font-semibold text-white capitalize">{tenant.billing_interval}ly</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Base Price:</span>
                            <span className="font-mono text-emerald-400 font-semibold">
                                ${tenant.plan_price?.base_price ?? '—'} / {tenant.billing_interval}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Practitioner Seats:</span>
                            <span className="text-slate-200">
                                <strong>{tenant.seats.total}</strong> total ({tenant.seats.included} included + {tenant.seats.extra} extra)
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Scribe+ Module:</span>
                            <span className={tenant.scribe_plus.active ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                                {tenant.scribe_plus.active ? 'Active' : 'Not subscribed'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Applied Promo:</span>
                            <span className="font-mono text-violet-300 font-semibold">
                                {tenant.promo.code || 'None'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Stripe Gateway Links (Test Mode) */}
                <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2 flex items-center justify-between">
                        <span>Stripe Platform Links</span>
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                    </h3>
                    <div className="space-y-3 text-xs">
                        <div>
                            <div className="text-slate-400 mb-1">Stripe Customer:</div>
                            {tenant.stripe_customer_url ? (
                                <a
                                    href={tenant.stripe_customer_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-violet-400 hover:text-violet-300 underline flex items-center gap-1 truncate"
                                >
                                    <span>{tenant.stripe_id}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                            ) : (
                                <span className="text-slate-500 font-mono">No Stripe Customer ID</span>
                            )}
                        </div>

                        <div>
                            <div className="text-slate-400 mb-1">Stripe Subscription:</div>
                            {tenant.stripe_subscription_url ? (
                                <a
                                    href={tenant.stripe_subscription_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-violet-400 hover:text-violet-300 underline flex items-center gap-1 truncate"
                                >
                                    <span>{tenant.stripe_subscription_id}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                            ) : (
                                <span className="text-slate-500 font-mono">No Active Stripe Subscription</span>
                            )}
                        </div>

                        <div>
                            <div className="text-slate-400 mb-1">Saved Payment Method:</div>
                            <span className="font-mono text-slate-300">
                                {tenant.stripe_pm_id ? tenant.stripe_pm_id : 'None on file'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Monthly Usage & Limits */}
                <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-4 shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2 flex items-center justify-between">
                        <span>Current Month Usage</span>
                        <Calendar className="w-4 h-4 text-slate-500" />
                    </h3>
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Appointments (Month):</span>
                            <span className="font-semibold text-white">
                                {tenant.usage.appointments_this_month} / {tenant.plan?.appointment_limit_monthly ?? '∞'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Clinic Locations:</span>
                            <span className="font-semibold text-white">
                                {tenant.usage.locations_count} / {tenant.plan?.location_limit ?? '∞'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Scribe Usage (Min):</span>
                            <span className="font-semibold text-white">
                                {tenant.usage.scribe_usage_count} / {tenant.plan?.scribe_allowance_amount ?? '∞'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Blocked Action Log (entitlement.blocked events) */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl mb-8">
                <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Ban className="w-5 h-5 text-rose-400" />
                        <h2 className="text-sm font-bold text-white">Blocked Action Log (entitlement.blocked)</h2>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                        {tenant.blocked_events?.length || 0} events recorded
                    </span>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                    {(tenant.blocked_events || []).map((ev) => (
                        <div key={ev.id} className="p-4 px-6 hover:bg-slate-800/20 text-xs flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        {ev.action}
                                    </span>
                                    <span className="text-slate-400">{ev.time_ago}</span>
                                </div>
                                <div className="text-slate-300 font-mono text-[11px]">
                                    {JSON.stringify(ev.metadata)}
                                </div>
                            </div>
                            <span className="text-[11px] text-slate-500 whitespace-nowrap">{ev.created_at}</span>
                        </div>
                    ))}
                    {(!tenant.blocked_events || tenant.blocked_events.length === 0) && (
                        <div className="p-8 text-center text-slate-500 text-xs">
                            No entitlement blocked events recorded for this clinic.
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Override History */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-violet-400" />
                        <h2 className="text-sm font-bold text-white">Admin Billing Overrides History</h2>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                        {tenant.override_events?.length || 0} overrides recorded
                    </span>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                    {(tenant.override_events || []).map((ev) => (
                        <div key={ev.id} className="p-4 px-6 hover:bg-slate-800/20 text-xs flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                        {ev.action}
                                    </span>
                                    <span className="text-slate-300">by {ev.user_name}</span>
                                    <span className="text-slate-500">• {ev.time_ago}</span>
                                </div>
                                <div className="text-slate-300 text-[11px]">
                                    Reason: <span className="text-amber-300 font-medium">{ev.metadata?.reason || 'No reason provided'}</span>
                                </div>
                            </div>
                            <span className="text-[11px] text-slate-500 whitespace-nowrap">{ev.created_at}</span>
                        </div>
                    ))}
                    {(!tenant.override_events || tenant.override_events.length === 0) && (
                        <div className="p-8 text-center text-slate-500 text-xs">
                            No billing overrides recorded for this clinic yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Change Plan */}
            {changePlanModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Override Clinic Plan</h3>
                            <button onClick={() => setChangePlanModalOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
                        </div>
                        <form onSubmit={handleChangePlanSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Select New Plan *</label>
                                <select
                                    value={changePlanForm.plan_id}
                                    onChange={(e) => setChangePlanForm({ ...changePlanForm, plan_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                >
                                    {availablePlans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (${p.monthly_price}/mo, ${p.annual_price}/yr)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Billing Interval *</label>
                                <select
                                    value={changePlanForm.billing_interval}
                                    onChange={(e) => setChangePlanForm({ ...changePlanForm, billing_interval: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="month">Monthly</option>
                                    <option value="year">Annual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Reason for Override (Required) *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={changePlanForm.reason}
                                    onChange={(e) => setChangePlanForm({ ...changePlanForm, reason: e.target.value })}
                                    placeholder="Explain why this clinic's plan is being modified by admin..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setChangePlanModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Apply Plan Override</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Apply Promo */}
            {applyPromoModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Apply Promotion Code</h3>
                            <button onClick={() => setApplyPromoModalOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
                        </div>
                        <form onSubmit={handleApplyPromoSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Promo Code *</label>
                                <input
                                    type="text"
                                    required
                                    value={applyPromoForm.promo_code}
                                    onChange={(e) => setApplyPromoForm({ ...applyPromoForm, promo_code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. VIP2026"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Reason for Discount (Required) *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={applyPromoForm.reason}
                                    onChange={(e) => setApplyPromoForm({ ...applyPromoForm, reason: e.target.value })}
                                    placeholder="Explain why this promo is being assigned..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setApplyPromoModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Apply Promo Code</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Extend Grace Period */}
            {extendGraceModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Extend Grace Period</h3>
                            <button onClick={() => setExtendGraceModalOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
                        </div>
                        <form onSubmit={handleExtendGraceSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Days to Extend *</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    required
                                    value={extendGraceForm.days}
                                    onChange={(e) => setExtendGraceForm({ ...extendGraceForm, days: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Reason for Extension (Required) *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={extendGraceForm.reason}
                                    onChange={(e) => setExtendGraceForm({ ...extendGraceForm, reason: e.target.value })}
                                    placeholder="e.g. Clinic bank transfer delayed; approved by director..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setExtendGraceModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Extend Grace Period</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
