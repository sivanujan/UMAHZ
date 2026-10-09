import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Tag, Plus, CheckCircle2, XCircle, AlertCircle, Loader2,
    Calendar, Users, Percent, DollarSign, Clock, ShieldAlert,
    ExternalLink, AlertTriangle, Info
} from 'lucide-react';

export default function PromoCodesIndex({ promoCodes = [], plans = [] }) {
    const { flash, errors } = usePage().props;

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [deactivatingId, setDeactivatingId] = useState(null);

    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percent',
        discount_value: 20,
        duration: 'once',
        duration_in_months: '',
        expires_at: '',
        max_redemptions: '',
        plan_ids: [],
    });

    const openCreateModal = () => {
        setFormData({
            code: '',
            discount_type: 'percent',
            discount_value: 20,
            duration: 'once',
            duration_in_months: '',
            expires_at: '',
            max_redemptions: '',
            plan_ids: [],
        });
        setCreateModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            ...formData,
            code: formData.code.toUpperCase().trim(),
            discount_value: Number(formData.discount_value),
            duration_in_months: formData.duration === 'repeating' && formData.duration_in_months ? Number(formData.duration_in_months) : null,
            max_redemptions: formData.max_redemptions ? Number(formData.max_redemptions) : null,
            expires_at: formData.expires_at || null,
        };

        router.post('/admin/promo-codes', payload, {
            onSuccess: () => setCreateModalOpen(false),
            onFinish: () => setProcessing(false),
        });
    };

    const handleDeactivate = (promo) => {
        if (!confirm(`Are you sure you want to deactivate code "${promo.code}"? It will immediately stop accepting new redemptions.`)) return;
        setDeactivatingId(promo.id);
        router.post(`/admin/promo-codes/${promo.id}/deactivate`, {}, {
            preserveScroll: true,
            onFinish: () => setDeactivatingId(null),
        });
    };

    return (
        <AdminLayout title="Promotion Codes">
            <Head title="Admin — Promo Codes" />

            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}

            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                    <ul className="list-disc list-inside text-xs space-y-0.5">
                        {Object.entries(errors).map(([key, msg]) => (
                            <li key={key}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-normal leading-tight">Promo Codes & Discounts</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Create clinic discount coupons, duration rules, and monitor clinic redemption history.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Promo Code</span>
                    </button>
                </div>
            </div>

            {/* Immutability Notice Banner */}
            <div className="mb-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Info className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <div className="font-semibold text-white">Stripe Promotion Code Immutability</div>
                    <p className="text-slate-400 leading-relaxed">
                        In accordance with Stripe's API guarantees, promotion codes and coupons cannot be modified once created. If you need to adjust discount rates, duration, or terms, simply <strong>deactivate the existing code</strong> and <strong>create a new one</strong>. Existing clinic subscriptions already redeemed will remain unaffected.
                    </p>
                </div>
            </div>

            {/* Promo Codes Table */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th className="py-3.5 px-6">Code & Discount</th>
                                <th className="py-3.5 px-4">Duration</th>
                                <th className="py-3.5 px-4">Usage Limits</th>
                                <th className="py-3.5 px-4">Applicable Plans</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {promoCodes.map((promo) => (
                                <tr key={promo.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-mono font-bold text-white tracking-wide text-base">
                                                    {promo.code}
                                                </div>
                                                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                                    {promo.discount_type === 'percent' ? (
                                                        <span>{promo.discount_value}% OFF</span>
                                                    ) : (
                                                        <span>${promo.discount_value} CAD OFF</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-xs">
                                        <div className="capitalize text-slate-200 font-medium">
                                            {promo.duration === 'repeating'
                                                ? `Repeating (${promo.duration_in_months} mo)`
                                                : promo.duration}
                                        </div>
                                        {promo.expires_at ? (
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                Exp: {new Date(promo.expires_at).toLocaleDateString()}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-slate-500">No expiration</div>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-xs">
                                        <div className="flex items-center gap-1.5 text-white font-medium">
                                            <Users className="w-3.5 h-3.5 text-slate-500" />
                                            <span>{promo.times_redeemed} redeemed</span>
                                            {promo.max_redemptions && (
                                                <span className="text-slate-400">/ {promo.max_redemptions} max</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-xs">
                                        {promo.applicable_plans && promo.applicable_plans.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {promo.applicable_plans.map((p) => (
                                                    <span key={p.id} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">All Plans</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4">
                                        {promo.is_active && !promo.is_expired ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Active
                                            </span>
                                        ) : promo.is_expired ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                Expired
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                Deactivated
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/promo-codes/${promo.id}/redemptions`}
                                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                                                title="View clinic redemptions"
                                            >
                                                <Users className="w-3.5 h-3.5 text-violet-400" />
                                                <span>Redemptions ({promo.tenant_count})</span>
                                            </Link>
                                            {promo.is_active && (
                                                <button
                                                    onClick={() => handleDeactivate(promo)}
                                                    disabled={deactivatingId === promo.id}
                                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-xs font-medium text-rose-400 hover:text-rose-300 border border-transparent hover:border-rose-800/40 transition-colors"
                                                    title="Deactivate code"
                                                >
                                                    {deactivatingId === promo.id ? 'Deactivating...' : 'Deactivate'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {promoCodes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                                        No promotion codes created yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Promo Code Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white">Create Promotion Code</h3>
                                <p className="text-xs text-slate-400">Created directly on Stripe coupons & promotion codes.</p>
                            </div>
                            <button
                                onClick={() => setCreateModalOpen(false)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Code (Alphanumeric uppercase) *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. FOUNDER50"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold tracking-wider focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Discount Type *</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                    >
                                        <option value="percent">Percentage Off (%)</option>
                                        <option value="fixed_amount">Fixed Amount ($ CAD)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">
                                        Discount Value ({formData.discount_type === 'percent' ? '%' : '$ CAD'}) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Duration *</label>
                                    <select
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                    >
                                        <option value="once">Once (Applies to 1st billing period)</option>
                                        <option value="repeating">Repeating (N months)</option>
                                        <option value="forever">Forever (Lifetime of subscription)</option>
                                    </select>
                                </div>
                                {formData.duration === 'repeating' && (
                                    <div>
                                        <label className="block text-slate-300 font-medium mb-1">Repeating Duration (Months) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={formData.duration_in_months}
                                            onChange={(e) => setFormData({ ...formData, duration_in_months: e.target.value })}
                                            placeholder="e.g. 3"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Max Redemptions (Blank = Unlimited)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.max_redemptions}
                                        onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                                        placeholder="Unlimited"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Expiration Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.expires_at}
                                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Applicable Plans (Leave empty for all plans)</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                    {plans.map((p) => {
                                        const checked = formData.plan_ids.includes(p.id);
                                        return (
                                            <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, plan_ids: [...formData.plan_ids, p.id] });
                                                        } else {
                                                            setFormData({ ...formData, plan_ids: formData.plan_ids.filter((id) => id !== p.id) });
                                                        }
                                                    }}
                                                    className="rounded bg-slate-900 border-slate-700 text-violet-600 focus:ring-violet-500"
                                                />
                                                <span>{p.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Create & Sync Stripe</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
