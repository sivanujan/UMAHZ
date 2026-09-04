import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    CreditCard, Check, Plus, Trash2, Shield, Sparkles, Zap,
    AlertCircle, Loader2, DollarSign, Users, Calendar, ArrowRight,
} from 'lucide-react';

const TIER_ICONS = {
    balance: Shield,
    practice: Sparkles,
    thrive: Zap,
};

export default function PlansIndex({ tiers = [] }) {
    const { flash, errors } = usePage().props;
    const [activeTab, setActiveTab] = useState(tiers[0]?.id || 'balance');
    const [processing, setProcessing] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Sync active tab if deleted
    React.useEffect(() => {
        if (tiers.length > 0 && !tiers.some((t) => t.id === activeTab)) {
            setActiveTab(tiers[0].id);
        }
    }, [tiers, activeTab]);

    // Local form state for each tier
    const [formData, setFormData] = useState(() => {
        const initial = {};
        tiers.forEach((t) => {
            initial[t.id] = {
                name: t.name || '',
                badge: t.badge || '',
                tagline: t.tagline || '',
                base_price: t.base_price !== undefined ? t.base_price : 0,
                included_full_time: t.included_full_time !== undefined ? t.included_full_time : 1,
                max_practitioners: t.max_practitioners !== null ? t.max_practitioners : '',
                unlimited_practitioners: t.max_practitioners === null,
                max_appointments_per_month: t.max_appointments_per_month !== null ? t.max_appointments_per_month : '',
                unlimited_appointments: t.max_appointments_per_month === null,
                allows_addons: Boolean(t.allows_addons),
                addon_price_ft: t.addon_price_ft !== undefined ? t.addon_price_ft : 0,
                addon_price_pt: t.addon_price_pt !== undefined ? t.addon_price_pt : 0,
                stripe_price_id: t.stripe_price_id || '',
                stripe_addon_price_ft_id: t.stripe_addon_price_ft_id || '',
                stripe_addon_price_pt_id: t.stripe_addon_price_pt_id || '',
                features: Array.isArray(t.features) ? [...t.features] : [],
            };
        });
        return initial;
    });

    const [newFeatureText, setNewFeatureText] = useState('');

    const currentForm = formData[activeTab] || {};
    const Icon = TIER_ICONS[activeTab] || CreditCard;

    const handleDeletePlan = () => {
        setDeleting(true);
        router.delete(`/admin/plans/${activeTab}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDeleteOpen(false);
            },
        });
    };

    const handleFieldChange = (field, val) => {
        setFormData((prev) => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [field]: val,
            },
        }));
    };

    const handleAddFeature = () => {
        if (!newFeatureText.trim()) return;
        setFormData((prev) => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                features: [...(prev[activeTab].features || []), newFeatureText.trim()],
            },
        }));
        setNewFeatureText('');
    };

    const handleRemoveFeature = (index) => {
        setFormData((prev) => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                features: prev[activeTab].features.filter((_, i) => i !== index),
            },
        }));
    };

    const handleFeatureChange = (index, value) => {
        setFormData((prev) => {
            const updated = [...prev[activeTab].features];
            updated[index] = value;
            return {
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    features: updated,
                },
            };
        });
    };

    const handleSave = (e) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            name: currentForm.name,
            badge: currentForm.badge,
            tagline: currentForm.tagline,
            base_price: parseFloat(currentForm.base_price) || 0,
            included_full_time: parseInt(currentForm.included_full_time, 10) || 1,
            max_practitioners: currentForm.unlimited_practitioners ? null : (parseInt(currentForm.max_practitioners, 10) || null),
            max_appointments_per_month: currentForm.unlimited_appointments ? null : (parseInt(currentForm.max_appointments_per_month, 10) || null),
            allows_addons: Boolean(currentForm.allows_addons),
            addon_price_ft: parseFloat(currentForm.addon_price_ft) || 0,
            addon_price_pt: parseFloat(currentForm.addon_price_pt) || 0,
            stripe_price_id: currentForm.stripe_price_id || null,
            stripe_addon_price_ft_id: currentForm.stripe_addon_price_ft_id || null,
            stripe_addon_price_pt_id: currentForm.stripe_addon_price_pt_id || null,
            features: currentForm.features || [],
        };

        router.put(`/admin/plans/${activeTab}`, payload, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AdminLayout title="Subscription Plans & Pricing">
            <Head title="Subscription Plans & Pricing — Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Clinic Subscription Plans</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Customize tier names, monthly base pricing, practitioner limits, add-on rates, bullet features, and Stripe Price IDs.
                    </p>
                </div>

                {/* Feedback Alerts */}
                {flash?.success && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="font-medium">{flash.success}</span>
                    </div>
                )}

                {errors && Object.keys(errors).length > 0 && (
                    <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            {Object.values(errors).map((err, i) => (
                                <p key={i} className="font-medium">{err}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800 gap-2">
                    {tiers.map((t) => {
                        const TabIcon = TIER_ICONS[t.id] || CreditCard;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                                    isActive
                                        ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                            >
                                <TabIcon className="w-4 h-4" />
                                <span>{formData[t.id]?.name || t.name}</span>
                                <span className="text-xs text-slate-500 font-mono">
                                    ${formData[t.id]?.base_price || t.base_price} CAD
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Grid: Form (Col 1) + Live Preview (Col 2) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Edit {currentForm.name} Plan</h3>
                                        <p className="text-xs text-slate-400">Key: <code className="text-blue-400">{activeTab}</code></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={processing || deleting || tiers.length <= 1}
                                        onClick={() => setConfirmDeleteOpen(true)}
                                        className="px-4 py-2.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-sm transition-colors flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={tiers.length <= 1 ? "At least one plan must remain" : "Remove this plan"}
                                    >
                                        <Trash2 className="w-4 h-4 text-rose-400" />
                                        <span>Remove Plan</span>
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={processing || deleting}
                                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                                    >
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Save Plan Changes
                                    </button>
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Plan Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={currentForm.name}
                                        onChange={(e) => handleFieldChange('name', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="e.g. Balance"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Badge Label
                                    </label>
                                    <input
                                        type="text"
                                        value={currentForm.badge}
                                        onChange={(e) => handleFieldChange('badge', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="e.g. Most Popular"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Tagline / Description
                                </label>
                                <input
                                    type="text"
                                    value={currentForm.tagline}
                                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="e.g. For solo practitioners starting out"
                                />
                            </div>

                            {/* Pricing & Limits */}
                            <div className="border-t border-slate-800 pt-5 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Base Pricing & Usage Limits</h4>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Base Price */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                            Base Monthly Price (CAD)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={currentForm.base_price}
                                                onChange={(e) => handleFieldChange('base_price', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Max Practitioners */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold text-slate-400">Max Practitioners</label>
                                            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentForm.unlimited_practitioners}
                                                    onChange={(e) => handleFieldChange('unlimited_practitioners', e.target.checked)}
                                                    className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                                                />
                                                Unlimited
                                            </label>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            disabled={currentForm.unlimited_practitioners}
                                            value={currentForm.unlimited_practitioners ? '' : currentForm.max_practitioners}
                                            onChange={(e) => handleFieldChange('max_practitioners', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 disabled:opacity-40 focus:outline-none focus:border-blue-500"
                                            placeholder={currentForm.unlimited_practitioners ? 'Unlimited' : 'e.g. 1'}
                                        />
                                    </div>

                                    {/* Max Appointments per Month */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold text-slate-400">Max Appts / Month</label>
                                            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentForm.unlimited_appointments}
                                                    onChange={(e) => handleFieldChange('unlimited_appointments', e.target.checked)}
                                                    className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                                                />
                                                Unlimited
                                            </label>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            disabled={currentForm.unlimited_appointments}
                                            value={currentForm.unlimited_appointments ? '' : currentForm.max_appointments_per_month}
                                            onChange={(e) => handleFieldChange('max_appointments_per_month', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 disabled:opacity-40 focus:outline-none focus:border-blue-500"
                                            placeholder={currentForm.unlimited_appointments ? 'Unlimited' : 'e.g. 20'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Add-ons Configuration */}
                            <div className="border-t border-slate-800 pt-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Practitioner Add-ons</h4>
                                        <p className="text-[11px] text-slate-500">Allow clinics to add extra practitioners above the included tier base</p>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentForm.allows_addons}
                                            onChange={(e) => handleFieldChange('allows_addons', e.target.checked)}
                                            className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                                        />
                                        Enable Add-ons
                                    </label>
                                </div>

                                {currentForm.allows_addons && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                                Extra Full-Time Practitioner (+$/mo)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={currentForm.addon_price_ft}
                                                    onChange={(e) => handleFieldChange('addon_price_ft', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                                Extra Part-Time Practitioner (+$/mo)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={currentForm.addon_price_pt}
                                                    onChange={(e) => handleFieldChange('addon_price_pt', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Features List */}
                            <div className="border-t border-slate-800 pt-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Feature Bullet Points</h4>
                                    <span className="text-[11px] text-slate-500">Rendered on registration cards</span>
                                </div>

                                <div className="space-y-2">
                                    {(currentForm.features || []).map((feat, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={feat}
                                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFeature(index)}
                                                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                                title="Remove feature"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="text"
                                        value={newFeatureText}
                                        onChange={(e) => setNewFeatureText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                                        placeholder="Add a new feature bullet (e.g. Advanced analytics)..."
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddFeature}
                                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            </div>

                            {/* Stripe Price IDs */}
                            <div className="border-t border-slate-800 pt-5 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Stripe Price ID Mapping</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Base Price ID</label>
                                        <input
                                            type="text"
                                            value={currentForm.stripe_price_id}
                                            onChange={(e) => handleFieldChange('stripe_price_id', e.target.value)}
                                            placeholder="price_..."
                                            className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-400 mb-1">FT Addon Price ID</label>
                                        <input
                                            type="text"
                                            value={currentForm.stripe_addon_price_ft_id}
                                            onChange={(e) => handleFieldChange('stripe_addon_price_ft_id', e.target.value)}
                                            placeholder="price_..."
                                            className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-400 mb-1">PT Addon Price ID</label>
                                        <input
                                            type="text"
                                            value={currentForm.stripe_addon_price_pt_id}
                                            onChange={(e) => handleFieldChange('stripe_addon_price_pt_id', e.target.value)}
                                            placeholder="price_..."
                                            className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Live Preview Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Registration Card Preview</h3>
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-mono">Live Preview</span>
                        </div>

                        {/* Preview Card (Styled identically to registration wizard) */}
                        <div className="bg-white rounded-2xl p-5 border-2 border-[#2563EB] shadow-xl shadow-blue-500/10 text-slate-800" style={{ borderTopWidth: '4px', borderTopColor: '#2563EB' }}>
                            <div className="h-7 flex items-center justify-between mb-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[#2563EB] text-white shadow-xs">
                                    <Icon className="w-3 h-3 text-white" />
                                    {currentForm.badge || 'Plan'}
                                </span>
                                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                                    <Check className="w-3 h-3" strokeWidth={3} />
                                </span>
                            </div>

                            <h4 className="text-[18px] font-bold text-[#0D1B2A] tracking-tight">
                                {currentForm.name || 'Plan Name'}
                            </h4>
                            <p className="text-[12px] text-slate-500 min-h-[36px] mt-1 leading-snug">
                                {currentForm.tagline || 'Tagline description'}
                            </p>

                            <div className="mt-3 mb-4 pb-3.5 border-b border-slate-100">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[32px] font-extrabold text-[#0D1B2A] tracking-tight leading-none">
                                        ${parseFloat(currentForm.base_price || 0).toFixed(0)}
                                    </span>
                                    <span className="text-[12.5px] font-semibold text-slate-500">
                                        CAD / mo
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">
                                    {currentForm.unlimited_practitioners
                                        ? 'Includes 1 full-time practitioner'
                                        : `${currentForm.max_practitioners || 1} practitioner included`}
                                </p>
                            </div>

                            <ul className="space-y-2">
                                {(currentForm.features || []).map((feat, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-[12px] text-slate-600 leading-snug">
                                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-[#22C55E] flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                        </div>
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 text-xs text-slate-400 space-y-2">
                            <p className="font-semibold text-slate-300">How dynamic changes work:</p>
                            <p>1. Changing price/features updates new clinic signups at <code>/clinics/register</code> instantly.</p>
                            <p>2. Existing active subscriptions in Stripe will continue on their current billing until updated.</p>
                        </div>
                    </div>
                </div>

                {/* Confirm Delete Plan Modal */}
                {confirmDeleteOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-3 text-rose-400">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                                    <Trash2 className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Remove {currentForm.name} Plan?</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Tier key: <code className="text-rose-400">{activeTab}</code></p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                                Are you sure you want to permanently remove the <strong className="text-white">{currentForm.name}</strong> subscription tier?
                                New clinic signups will no longer be able to select this tier. Existing active clinic subscriptions will remain untouched.
                            </p>

                            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={handleDeletePlan}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Removing...</span>
                                        </>
                                    ) : (
                                        <span>Yes, Remove Plan</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
