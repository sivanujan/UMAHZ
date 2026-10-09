import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Layers, Plus, Edit3, Trash2, CheckCircle2, XCircle,
    AlertCircle, Loader2, RefreshCw, DollarSign, Users,
    AlertTriangle, Sparkles, Check
} from 'lucide-react';

export default function AddOnsIndex({ addOns = [] }) {
    const { flash, errors } = usePage().props;

    const [editorOpen, setEditorOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedAddOn, setSelectedAddOn] = useState(null);
    const [priceConfirmOpen, setPriceConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [syncingId, setSyncingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        pricing_type: 'per_seat',
        price_monthly: 29,
        price_annual: 290,
        description: '',
        is_active: true,
    });

    const openCreateModal = () => {
        setIsCreating(true);
        setSelectedAddOn(null);
        setFormData({
            name: '',
            slug: '',
            pricing_type: 'per_seat',
            price_monthly: 29,
            price_annual: 290,
            description: '',
            is_active: true,
        });
        setEditorOpen(true);
    };

    const openEditModal = (addOn) => {
        setIsCreating(false);
        setSelectedAddOn(addOn);
        setFormData({
            name: addOn.name,
            slug: addOn.slug,
            pricing_type: addOn.pricing_type || 'per_seat',
            price_monthly: addOn.price_monthly,
            price_annual: addOn.price_annual,
            description: addOn.description || '',
            is_active: Boolean(addOn.is_active),
        });
        setEditorOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        // Check if price changed on existing add-on with subscribers
        if (!isCreating && selectedAddOn && selectedAddOn.active_subscribers_count > 0) {
            const oldM = Number(selectedAddOn.price_monthly);
            const newM = Number(formData.price_monthly);
            const oldA = Number(selectedAddOn.price_annual);
            const newA = Number(formData.price_annual);

            if ((oldM !== newM || oldA !== newA) && !priceConfirmOpen) {
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
            price_monthly: Number(formData.price_monthly),
            price_annual: Number(formData.price_annual),
        };

        if (isCreating) {
            router.post('/admin/addons', payload, {
                onSuccess: () => {
                    setEditorOpen(false);
                    setPriceConfirmOpen(false);
                },
                onFinish: () => setProcessing(false),
            });
        } else {
            router.put(`/admin/addons/${selectedAddOn.id}`, payload, {
                onSuccess: () => {
                    setEditorOpen(false);
                    setPriceConfirmOpen(false);
                },
                onFinish: () => setProcessing(false),
            });
        }
    };

    const handleSyncStripe = (id) => {
        setSyncingId(id);
        router.post(`/admin/addons/${id}/sync-stripe`, {}, {
            preserveScroll: true,
            onFinish: () => setSyncingId(null),
        });
    };

    const handleDelete = (addOn) => {
        if (!confirm(`Are you sure you want to delete "${addOn.name}"?`)) return;
        router.delete(`/admin/addons/${addOn.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout title="Add-on Management">
            <Head title="Admin — Add-ons" />

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-normal leading-tight">Platform Add-ons</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Configure optional paid clinic modules (e.g. Scribe+), billing frequency, and Stripe sync.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New Add-on</span>
                    </button>
                </div>
            </div>

            {/* Add-ons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addOns.map((addOn) => (
                    <div
                        key={addOn.id}
                        className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors"
                    >
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">{addOn.name}</h3>
                                        <code className="text-[11px] text-slate-500 font-mono">{addOn.slug}</code>
                                    </div>
                                </div>
                                <div>
                                    {addOn.is_active ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                            Deactivated
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                                {addOn.description || 'No description provided.'}
                            </p>

                            <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Monthly</span>
                                    <span className="font-mono text-white font-semibold">${addOn.price_monthly} / mo</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Annual</span>
                                    <span className="font-mono text-slate-300 font-medium">${addOn.price_annual} / yr</span>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                                    <span className="text-slate-400">Pricing Model</span>
                                    <span className="capitalize text-violet-300 font-medium">{addOn.pricing_type.replace('_', ' ')}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{addOn.active_subscribers_count} active subscriber(s)</span>
                                </div>
                                <div>
                                    {addOn.has_stripe_sync ? (
                                        <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Stripe Synced
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleSyncStripe(addOn.id)}
                                            disabled={syncingId === addOn.id}
                                            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-[11px] underline"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${syncingId === addOn.id ? 'animate-spin' : ''}`} />
                                            Retry Stripe Sync
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-5 border-t border-slate-800/80 mt-4">
                            <button
                                onClick={() => openEditModal(addOn)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                            >
                                Edit Add-on
                            </button>
                            {addOn.active_subscribers_count === 0 && (
                                <button
                                    onClick={() => handleDelete(addOn)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Delete Add-on"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {editorOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">
                                {isCreating ? 'Create Add-on' : `Edit: ${selectedAddOn?.name}`}
                            </h3>
                            <button
                                onClick={() => setEditorOpen(false)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Add-on Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Scribe+ Unlimited"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            {isCreating && (
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Slug (Identifier)</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="e.g. scribe-plus (auto-generated if blank)"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Billing Model *</label>
                                <select
                                    value={formData.pricing_type}
                                    onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="per_seat">Per Seat (e.g. Per practitioner using Scribe+)</option>
                                    <option value="flat_monthly">Flat Fee (Entire clinic)</option>
                                    <option value="usage_metered">Usage Metered</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Monthly Price ($ CAD) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.price_monthly}
                                        onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Annual Price ($ CAD) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.price_annual}
                                        onChange={(e) => setFormData({ ...formData, price_annual: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Explain what this add-on unlocks for the clinic"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    <span className="ml-3 font-medium text-slate-300">
                                        {formData.is_active ? 'Active (Purchasable)' : 'Deactivated (Hidden)'}
                                    </span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditorOpen(false)}
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
                                    <span>{isCreating ? 'Create Add-on' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Price Change Confirmation Dialog */}
            {priceConfirmOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <h3 className="text-base font-bold text-white">Price Change Confirmation</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Changing the price of <span className="font-semibold text-white">{selectedAddOn?.name}</span> will create a new price in Stripe. Existing clinics with this add-on active will <span className="font-semibold text-amber-300">keep their current grandfathered price</span> until moved.
                        </p>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setPriceConfirmOpen(false)}
                                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                            >
                                Back
                            </button>
                            <button
                                onClick={executeSave}
                                disabled={processing}
                                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white flex items-center gap-2"
                            >
                                {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Save & Grandfather</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
