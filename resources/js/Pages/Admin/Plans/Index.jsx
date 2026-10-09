import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    CreditCard, Check, Plus, Trash2, Shield, Sparkles, Zap,
    AlertCircle, Loader2, DollarSign, Users, Calendar, ArrowRight,
    RefreshCw, Layers, CheckCircle2, XCircle, AlertTriangle, Edit3,
    ArrowUpRight, HelpCircle, Eye, EyeOff
} from 'lucide-react';

export default function PlansIndex({ plans = [], features = [], stripeConfigured = false }) {
    const { flash, errors } = usePage().props;

    const [selectedPlan, setSelectedPlan] = useState(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [migrateModalPlan, setMigrateModalPlan] = useState(null);
    const [priceConfirmOpen, setPriceConfirmOpen] = useState(false);
    const [pendingFormSubmit, setPendingFormSubmit] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [syncingId, setSyncingId] = useState(null);
    const [syncingAll, setSyncingAll] = useState(false);

    // Form state for plan editor
    const [formData, setFormData] = useState({
        name: '',
        tagline: '',
        description: '',
        badge: '',
        display_order: 1,
        is_active: true,
        trial_days: 14,
        monthly_price: 99,
        annual_price: 990,
        included_practitioners: 1,
        max_practitioners: '',
        allows_extra_practitioners: true,
        extra_practitioner_monthly_price: 49,
        extra_practitioner_annual_price: 490,
        appointment_limit_monthly: '',
        appointment_limit_behavior: 'warn',
        location_limit: '',
        scribe_allowance_unit: 'minutes',
        scribe_allowance_amount: 300,
        scribe_limit_behavior: 'warn',
        features: {}, // featureId -> boolean
    });

    const openCreateModal = () => {
        setIsCreating(true);
        setSelectedPlan(null);
        const featureMap = {};
        features.forEach((f) => {
            featureMap[f.id] = false;
        });
        setFormData({
            name: '',
            tagline: '',
            description: '',
            badge: '',
            display_order: (plans.length + 1) * 10,
            is_active: true,
            trial_days: 14,
            monthly_price: 99,
            annual_price: 990,
            included_practitioners: 1,
            max_practitioners: '',
            allows_extra_practitioners: true,
            extra_practitioner_monthly_price: 49,
            extra_practitioner_annual_price: 490,
            appointment_limit_monthly: '',
            appointment_limit_behavior: 'warn',
            location_limit: '',
            scribe_allowance_unit: 'minutes',
            scribe_allowance_amount: 300,
            scribe_limit_behavior: 'warn',
            features: featureMap,
        });
        setEditorOpen(true);
    };

    const openEditModal = (plan) => {
        setIsCreating(false);
        setSelectedPlan(plan);
        const featureMap = {};
        features.forEach((f) => {
            const planFeature = (plan.features || []).find((pf) => pf.id === f.id || pf.key === f.key);
            featureMap[f.id] = planFeature ? Boolean(planFeature.is_enabled) : false;
        });

        setFormData({
            name: plan.name || '',
            tagline: plan.tagline || '',
            description: plan.description || '',
            badge: plan.badge || '',
            display_order: plan.display_order ?? 1,
            is_active: Boolean(plan.is_active),
            trial_days: plan.trial_days ?? 14,
            monthly_price: plan.monthly_price?.base_price ?? 0,
            annual_price: plan.annual_price?.base_price ?? 0,
            included_practitioners: plan.included_practitioners ?? 1,
            max_practitioners: plan.max_practitioners !== null ? plan.max_practitioners : '',
            allows_extra_practitioners: Boolean(plan.allows_extra_practitioners),
            extra_practitioner_monthly_price: plan.monthly_price?.extra_practitioner_price ?? 0,
            extra_practitioner_annual_price: plan.annual_price?.extra_practitioner_price ?? 0,
            appointment_limit_monthly: plan.appointment_limit_monthly !== null ? plan.appointment_limit_monthly : '',
            appointment_limit_behavior: plan.appointment_limit_behavior || 'warn',
            location_limit: plan.location_limit !== null ? plan.location_limit : '',
            scribe_allowance_unit: plan.scribe_allowance_unit || 'minutes',
            scribe_allowance_amount: plan.scribe_allowance_amount !== null ? plan.scribe_allowance_amount : '',
            scribe_limit_behavior: plan.scribe_limit_behavior || 'warn',
            features: featureMap,
        });
        setEditorOpen(true);
    };

    const handleFormSubmit = (e) => {
        if (e) e.preventDefault();

        // Check if price changed on existing plan
        if (!isCreating && selectedPlan) {
            const oldMonthly = Number(selectedPlan.monthly_price?.base_price ?? 0);
            const newMonthly = Number(formData.monthly_price);
            const oldAnnual = Number(selectedPlan.annual_price?.base_price ?? 0);
            const newAnnual = Number(formData.annual_price);

            if ((oldMonthly !== newMonthly || oldAnnual !== newAnnual) && selectedPlan.subscriber_count > 0 && !priceConfirmOpen) {
                setPriceConfirmOpen(true);
                return;
            }
        }

        executeSave();
    };

    const executeSave = () => {
        setProcessing(true);
        const payload = {
            ...formData,
            monthly_base_price: Number(formData.monthly_price),
            monthly_extra_seat_price: Number(formData.extra_practitioner_monthly_price),
            annual_base_price: Number(formData.annual_price),
            annual_extra_seat_price: Number(formData.extra_practitioner_annual_price),
            monthly_price: Number(formData.monthly_price),
            annual_price: Number(formData.annual_price),
            extra_practitioner_monthly_price: Number(formData.extra_practitioner_monthly_price),
            extra_practitioner_annual_price: Number(formData.extra_practitioner_annual_price),
            max_practitioners: formData.max_practitioners === '' ? null : Number(formData.max_practitioners),
            appointment_limit_monthly: formData.appointment_limit_monthly === '' ? null : Number(formData.appointment_limit_monthly),
            location_limit: formData.location_limit === '' ? null : Number(formData.location_limit),
            scribe_allowance_amount: formData.scribe_allowance_amount === '' ? null : Number(formData.scribe_allowance_amount),
            feature_ids: Object.keys(formData.features).filter((id) => formData.features[id]),
        };

        if (isCreating) {
            router.post('/admin/plans', payload, {
                onSuccess: () => {
                    setEditorOpen(false);
                    setPriceConfirmOpen(false);
                },
                onFinish: () => setProcessing(false),
            });
        } else {
            router.put(`/admin/plans/${selectedPlan.id}`, payload, {
                onSuccess: () => {
                    setEditorOpen(false);
                    setPriceConfirmOpen(false);
                },
                onFinish: () => setProcessing(false),
            });
        }
    };

    const handleSyncStripe = (planId) => {
        setSyncingId(planId);
        router.post(`/admin/plans/${planId}/sync-stripe`, {}, {
            preserveScroll: true,
            onFinish: () => setSyncingId(null),
        });
    };

    const handleSyncAllStripe = () => {
        setSyncingAll(true);
        router.post('/admin/plans/sync-all-stripe', {}, {
            preserveScroll: true,
            onFinish: () => setSyncingAll(false),
        });
    };

    const handleMigrateSubscribers = (planId) => {
        setProcessing(true);
        router.post(`/admin/plans/${planId}/migrate-subscribers`, {}, {
            preserveScroll: true,
            onSuccess: () => setMigrateModalPlan(null),
            onFinish: () => setProcessing(false),
        });
    };

    // Group features by category
    const categorizedFeatures = features.reduce((acc, feat) => {
        const cat = feat.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(feat);
        return acc;
    }, {});

    return (
        <AdminLayout title="Pricing & Plans">
            <Head title="Admin — Plans & Pricing" />

            {/* Flash & Alert messages */}
            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                </div>
            )}

            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                    <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Please fix the following validation errors:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                        {Object.entries(errors).map(([key, msg]) => (
                            <li key={key}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Header with Stats & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-normal leading-tight">Platform Plans & Pricing</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Manage subscription tiers, feature entitlements, usage limits, and Stripe synchronization.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSyncAllStripe}
                        disabled={syncingAll}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors disabled:opacity-50"
                        title="Synchronize all active plans and prices with Stripe"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${syncingAll ? 'animate-spin' : ''}`} />
                        <span>{syncingAll ? 'Syncing...' : 'Sync All to Stripe'}</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New Plan</span>
                    </button>
                </div>
            </div>

            {/* Plans List Table */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th className="py-3.5 px-6">Plan Identity</th>
                                <th className="py-3.5 px-4">Monthly / Annual</th>
                                <th className="py-3.5 px-4">Subscribers</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4">Needs Review</th>
                                <th className="py-3.5 px-4">Stripe Sync</th>
                                <th className="py-3.5 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {plans.map((plan) => {
                                const hasReview = plan.needs_review || (plan.needs_review_fields && plan.needs_review_fields.length > 0);
                                const hasSubscribers = plan.subscriber_count > 0;

                                return (
                                    <tr key={plan.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                                                    {plan.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-white">{plan.name}</span>
                                                        {plan.badge && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                                                {plan.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate max-w-xs">{plan.tagline || plan.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 font-mono text-xs">
                                            <div className="text-white font-medium">
                                                ${plan.monthly_price?.base_price ?? '—'}/mo
                                            </div>
                                            <div className="text-slate-400 text-[11px]">
                                                ${plan.annual_price?.base_price ?? '—'}/yr
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="font-semibold text-white">{plan.subscriber_count}</span>
                                                <span className="text-xs text-slate-400">({plan.active_subscriber_count} active)</span>
                                            </div>
                                            {plan.subscribers && plan.subscribers.some((s) => s.is_grandfathered) && (
                                                <button
                                                    onClick={() => setMigrateModalPlan(plan)}
                                                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span>Grandfathered clinics exist</span>
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            {plan.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Deactivated
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            {hasReview ? (
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        <AlertCircle className="w-3 h-3" />
                                                        needs_review
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {plan.needs_review_fields?.join(', ') || 'fields pending review'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    Confirmed
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            {plan.has_stripe_sync ? (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    <span>Synced</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleSyncStripe(plan.id)}
                                                    disabled={syncingId === plan.id}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${syncingId === plan.id ? 'animate-spin' : ''}`} />
                                                    <span>{syncingId === plan.id ? 'Syncing...' : 'Retry sync'}</span>
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {hasSubscribers && (
                                                    <button
                                                        onClick={() => setMigrateModalPlan(plan)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                                                        title="Preview or move subscribers to latest price"
                                                    >
                                                        <Users className="w-3.5 h-3.5 text-violet-400" />
                                                        <span>Subscribers</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditModal(plan)}
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                                    title="Edit Plan"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Plan Editor Modal */}
            {editorOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {isCreating ? 'Create Subscription Plan' : `Edit Plan: ${selectedPlan?.name}`}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Configuring identity, pricing, limits, and feature entitlements.
                                </p>
                            </div>
                            <button
                                onClick={() => setEditorOpen(false)}
                                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Section 1: Identity */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2">
                                    1. Plan Identity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Plan Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Badge (e.g. Most Popular)</label>
                                        <input
                                            type="text"
                                            value={formData.badge}
                                            onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Display Order</label>
                                        <input
                                            type="number"
                                            value={formData.display_order}
                                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Tagline</label>
                                        <input
                                            type="text"
                                            value={formData.tagline}
                                            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                            placeholder="Short marketing headline"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pt-5">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                            <span className="ml-3 text-xs font-medium text-slate-300">
                                                {formData.is_active ? 'Active (Visible for new signups)' : 'Deactivated (Hidden)'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        placeholder="Full plan description"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Pricing & Trial */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2">
                                    2. Pricing & Trial
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Base Price (CAD) *</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.monthly_price}
                                                onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Annual Base Price (CAD) *</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.annual_price}
                                                onChange={(e) => setFormData({ ...formData, annual_price: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Trial Period Days</label>
                                        <input
                                            type="number"
                                            value={formData.trial_days}
                                            onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Practitioner Seats */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2">
                                    3. Practitioner Seats & Extra Seat Pricing
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Included Practitioners *</label>
                                        <input
                                            type="number"
                                            min={1}
                                            required
                                            value={formData.included_practitioners}
                                            onChange={(e) => setFormData({ ...formData, included_practitioners: parseInt(e.target.value) || 1 })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Max Practitioners (Blank = Unlimited)</label>
                                        <input
                                            type="number"
                                            value={formData.max_practitioners}
                                            onChange={(e) => setFormData({ ...formData, max_practitioners: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pt-5">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.allows_extra_practitioners}
                                                onChange={(e) => setFormData({ ...formData, allows_extra_practitioners: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                                            <span className="ml-3 text-xs font-medium text-slate-300">Allows Extra Practitioner Seats</span>
                                        </label>
                                    </div>
                                    {formData.allows_extra_practitioners && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-300 mb-1">Extra Seat Monthly (CAD)</label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.extra_practitioner_monthly_price}
                                                        onChange={(e) => setFormData({ ...formData, extra_practitioner_monthly_price: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-300 mb-1">Extra Seat Annual (CAD)</label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.extra_practitioner_annual_price}
                                                        onChange={(e) => setFormData({ ...formData, extra_practitioner_annual_price: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Section 4: Usage Limits & Limit Behaviours */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2">
                                    4. Usage Limits & Enforcement Behaviours
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Appointment Limit / Month (Blank = Unlimited)</label>
                                        <input
                                            type="number"
                                            value={formData.appointment_limit_monthly}
                                            onChange={(e) => setFormData({ ...formData, appointment_limit_monthly: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Appointment Limit Behaviour</label>
                                        <select
                                            value={formData.appointment_limit_behavior}
                                            onChange={(e) => setFormData({ ...formData, appointment_limit_behavior: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        >
                                            <option value="warn">Warn Only (Allow booking with notification)</option>
                                            <option value="block">Hard Block (Prevent booking when limit reached)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Location Limit (Blank = Unlimited)</label>
                                        <input
                                            type="number"
                                            value={formData.location_limit}
                                            onChange={(e) => setFormData({ ...formData, location_limit: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Scribe Allowance Amount (Blank = None)</label>
                                        <input
                                            type="number"
                                            value={formData.scribe_allowance_amount}
                                            onChange={(e) => setFormData({ ...formData, scribe_allowance_amount: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                                            placeholder="e.g. 300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Scribe Unit</label>
                                        <select
                                            value={formData.scribe_allowance_unit}
                                            onChange={(e) => setFormData({ ...formData, scribe_allowance_unit: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        >
                                            <option value="minutes">Minutes</option>
                                            <option value="words">Words</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">Scribe Limit Behaviour</label>
                                        <select
                                            value={formData.scribe_limit_behavior}
                                            onChange={(e) => setFormData({ ...formData, scribe_limit_behavior: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        >
                                            <option value="warn">Warn Only</option>
                                            <option value="block">Hard Block</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Feature Entitlements */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-slate-800/80 pb-2">
                                    5. Feature Entitlements (Grouped by Category)
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(categorizedFeatures).map(([category, catFeatures]) => (
                                        <div key={category} className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
                                            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                                                <Layers className="w-3.5 h-3.5 text-violet-400" />
                                                <span>{category}</span>
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {catFeatures.map((feat) => {
                                                    const checked = Boolean(formData.features[feat.id]);
                                                    return (
                                                        <label
                                                            key={feat.id}
                                                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                                                                checked
                                                                    ? 'bg-violet-950/20 border-violet-500/40 text-white'
                                                                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        features: {
                                                                            ...formData.features,
                                                                            [feat.id]: e.target.checked,
                                                                        },
                                                                    })
                                                                }
                                                                className="mt-1 rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-violet-500"
                                                            />
                                                            <div className="text-xs">
                                                                <div className="font-medium text-slate-200">{feat.name}</div>
                                                                <div className="text-[10px] text-slate-500 font-mono">{feat.key}</div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                <div className="text-xs text-slate-400">
                                    Saving clears <span className="font-mono text-amber-400">needs_review</span> flags on the modified fields.
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditorOpen(false)}
                                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-violet-600/20 disabled:opacity-50"
                                    >
                                        {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        <span>{isCreating ? 'Create Plan' : 'Save Plan Changes'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Price Change Grandfathering Confirmation Dialog */}
            {priceConfirmOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <h3 className="text-base font-bold text-white">Price Change Confirmation</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            You are changing the price for <span className="font-semibold text-white">{selectedPlan?.name}</span>.
                            A new price will be registered in Stripe, and <span className="font-semibold text-amber-300">all existing subscribers will keep their current price (grandfathered)</span> until you explicitly migrate them.
                        </p>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono text-slate-300">
                            <div>Monthly: ${selectedPlan?.monthly_price?.base_price} → ${formData.monthly_price}</div>
                            <div>Annual: ${selectedPlan?.annual_price?.base_price} → ${formData.annual_price}</div>
                            <div className="text-[11px] text-slate-500 font-sans mt-2">
                                Active Subscribers on old price: {selectedPlan?.active_subscriber_count ?? 0}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setPriceConfirmOpen(false)}
                                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                            >
                                Back to Edit
                            </button>
                            <button
                                onClick={executeSave}
                                disabled={processing}
                                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white flex items-center gap-2"
                            >
                                {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Save & Keep Existing Grandfathered</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Migrate Subscribers Preview & Confirmation Modal */}
            {migrateModalPlan && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-400" />
                                <h3 className="text-base font-bold text-white">
                                    Move Subscribers to New Price — {migrateModalPlan.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setMigrateModalPlan(null)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-slate-400">
                            Below is the list of active clinic subscribers for this plan. Migrating them will update their assigned plan price to the latest active rate and synchronize with Stripe.
                        </p>

                        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                                        <th className="py-2.5 px-4">Clinic</th>
                                        <th className="py-2.5 px-4">Interval</th>
                                        <th className="py-2.5 px-4 font-mono">Current Price</th>
                                        <th className="py-2.5 px-4 font-mono">New Price</th>
                                        <th className="py-2.5 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {(migrateModalPlan.subscribers || []).map((sub) => (
                                        <tr key={sub.id} className="hover:bg-slate-900/40">
                                            <td className="py-2.5 px-4 font-medium text-white">
                                                <div>{sub.name}</div>
                                                <div className="text-[10px] text-slate-500">{sub.subdomain}.umahz.com</div>
                                            </td>
                                            <td className="py-2.5 px-4 capitalize text-slate-300">{sub.interval}ly</td>
                                            <td className="py-2.5 px-4 font-mono text-slate-300">${sub.old_price}</td>
                                            <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">${sub.new_price}</td>
                                            <td className="py-2.5 px-4">
                                                {sub.is_grandfathered ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        Grandfathered
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-500">Current</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!migrateModalPlan.subscribers || migrateModalPlan.subscribers.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                                                No active subscribers on this plan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-slate-400">
                                Total subscribers: {migrateModalPlan.subscribers?.length || 0}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setMigrateModalPlan(null)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleMigrateSubscribers(migrateModalPlan.id)}
                                    disabled={processing || !migrateModalPlan.subscribers?.length}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Migrate All to New Price</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
