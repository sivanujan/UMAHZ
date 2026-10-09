import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Puzzle, Plus, Edit3, Trash2, CheckCircle2, XCircle,
    AlertCircle, Loader2, Search, Filter, Layers, Code2
} from 'lucide-react';

export default function FeaturesIndex({ featuresByCategory = {}, categories = {} }) {
    const { flash, errors } = usePage().props;

    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [editorOpen, setEditorOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [processing, setProcessing] = useState(false);

    const [formData, setFormData] = useState({
        key: '',
        name: '',
        description: '',
        category: 'clinical',
        is_implemented: true,
    });

    const openCreateModal = () => {
        setIsCreating(true);
        setSelectedFeature(null);
        setFormData({
            key: '',
            name: '',
            description: '',
            category: 'clinical',
            is_implemented: true,
        });
        setEditorOpen(true);
    };

    const openEditModal = (feat) => {
        setIsCreating(false);
        setSelectedFeature(feat);
        setFormData({
            key: feat.key,
            name: feat.name,
            description: feat.description || '',
            category: feat.category,
            is_implemented: Boolean(feat.is_implemented),
        });
        setEditorOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);

        if (isCreating) {
            router.post('/admin/features', formData, {
                onSuccess: () => setEditorOpen(false),
                onFinish: () => setProcessing(false),
            });
        } else {
            router.put(`/admin/features/${selectedFeature.id}`, formData, {
                onSuccess: () => setEditorOpen(false),
                onFinish: () => setProcessing(false),
            });
        }
    };

    const handleDelete = (feat) => {
        if (!confirm(`Are you sure you want to delete "${feat.name}"?`)) return;
        router.delete(`/admin/features/${feat.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout title="Feature Catalog">
            <Head title="Admin — Feature Catalog" />

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

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-normal leading-tight">Feature Catalog</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Master dictionary of granular platform features, implementation readiness, and plan assignments.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add New Feature</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search features by name or key..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                    >
                        <option value="all">All Categories</option>
                        {Object.entries(categories).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Categorized Features */}
            <div className="space-y-6">
                {Object.entries(featuresByCategory).map(([catKey, feats]) => {
                    if (selectedCategory !== 'all' && selectedCategory !== catKey) return null;

                    const filteredFeats = feats.filter((f) => {
                        if (!search) return true;
                        const s = search.toLowerCase();
                        return f.name.toLowerCase().includes(s) || f.key.toLowerCase().includes(s) || (f.description && f.description.toLowerCase().includes(s));
                    });

                    if (filteredFeats.length === 0) return null;

                    const catLabel = categories[catKey] || catKey.replace('_', ' ').toUpperCase();

                    return (
                        <div key={catKey} className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-lg">
                            <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Layers className="w-4 h-4 text-violet-400" />
                                    <h2 className="text-sm font-bold text-white capitalize">{catLabel}</h2>
                                    <span className="text-xs text-slate-500 font-mono">({filteredFeats.length})</span>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-800/60">
                                {filteredFeats.map((feat) => (
                                    <div key={feat.id} className="p-4 px-6 hover:bg-slate-800/20 transition-colors flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <span className="font-semibold text-white text-sm">{feat.name}</span>
                                                <code className="text-[11px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-violet-300">
                                                    {feat.key}
                                                </code>
                                                {feat.is_implemented ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Implemented
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <AlertCircle className="w-3 h-3" />
                                                        In Roadmap
                                                    </span>
                                                )}
                                            </div>
                                            {feat.description && (
                                                <p className="text-xs text-slate-400">{feat.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">
                                                In {feat.plans_count} {feat.plans_count === 1 ? 'plan' : 'plans'}
                                            </span>
                                            <button
                                                onClick={() => openEditModal(feat)}
                                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                                title="Edit Feature"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            {feat.plans_count === 0 && (
                                                <button
                                                    onClick={() => handleDelete(feat)}
                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                                                    title="Delete Feature"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create/Edit Feature Modal */}
            {editorOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">
                                {isCreating ? 'Add Feature Key' : `Edit: ${selectedFeature?.name}`}
                            </h3>
                            <button
                                onClick={() => setEditorOpen(false)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            {isCreating && (
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Feature Key *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.key}
                                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                        placeholder="e.g. chart_custom_templates"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                                    />
                                    <span className="text-[10px] text-slate-500 mt-1 block">Used in code checks: $tenant-&gt;hasFeature('key')</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Feature Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Custom Charting Templates"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                >
                                    {Object.entries(categories).map(([k, label]) => (
                                        <option key={k} value={k}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Explain what this feature unlocks for the clinic"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_implemented}
                                        onChange={(e) => setFormData({ ...formData, is_implemented: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    <span className="ml-3 font-medium text-slate-300">
                                        {formData.is_implemented ? 'Implemented (Live)' : 'In Roadmap (Not live)'}
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
                                    <span>{isCreating ? 'Create Feature' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
