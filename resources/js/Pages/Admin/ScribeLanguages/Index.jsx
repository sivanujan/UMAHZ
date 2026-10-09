import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Globe, Plus, Edit2, ArrowUp, ArrowDown, Check, X, Shield, Sparkles, EyeOff } from 'lucide-react';

export default function ScribeLanguagesIndex({ languages = [] }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLang, setEditingLang] = useState(null);
    const [form, setForm] = useState({
        code: '',
        label: '',
        native_name: '',
        provider: 'assemblyai',
        provider_code: '',
        supports_transcription: true,
        supports_note_output: false,
        status: 'active',
        sort_order: 0,
    });
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const openAddModal = () => {
        setEditingLang(null);
        setForm({
            code: '',
            label: '',
            native_name: '',
            provider: 'assemblyai',
            provider_code: '',
            supports_transcription: true,
            supports_note_output: false,
            status: 'active',
            sort_order: languages.length + 1,
        });
        setErrorMsg(null);
        setModalOpen(true);
    };

    const openEditModal = (lang) => {
        setEditingLang(lang);
        setForm({
            code: lang.code,
            label: lang.label,
            native_name: lang.native_name,
            provider: lang.provider,
            provider_code: lang.provider_code,
            supports_transcription: Boolean(lang.supports_transcription),
            supports_note_output: Boolean(lang.supports_note_output),
            status: lang.status,
            sort_order: lang.sort_order,
        });
        setErrorMsg(null);
        setModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);

        if (editingLang) {
            router.patch(`/admin/scribe-languages/${editingLang.id}`, form, {
                onSuccess: () => setModalOpen(false),
                onError: (err) => setErrorMsg(Object.values(err)[0] || 'Could not update language.'),
                onFinish: () => setSubmitting(false),
            });
        } else {
            router.post('/admin/scribe-languages', form, {
                onSuccess: () => setModalOpen(false),
                onError: (err) => setErrorMsg(Object.values(err)[0] || 'Could not create language.'),
                onFinish: () => setSubmitting(false),
            });
        }
    };

    const handleMove = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= languages.length) return;

        const newLangs = [...languages];
        const temp = newLangs[index];
        newLangs[index] = newLangs[targetIndex];
        newLangs[targetIndex] = temp;

        const orders = newLangs.map((item, idx) => ({
            id: item.id,
            sort_order: idx + 1,
        }));

        router.patch('/admin/scribe-languages/reorder', { orders }, { preserveScroll: true });
    };

    return (
        <AdminLayout title="AI Scribe Languages">
            <Head title="AI Scribe Languages — Platform Admin" />

            <div className="py-8 px-8 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
                            <Globe className="w-5 h-5 text-violet-400" /> AI Scribe Languages Registry
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Configure languages supported for encounter recording and clinical note drafting across clinics.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Language
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4 w-16">Order</th>
                                    <th className="py-3.5 px-4">Language & Code</th>
                                    <th className="py-3.5 px-4">Native Name</th>
                                    <th className="py-3.5 px-4">STT Provider Code</th>
                                    <th className="py-3.5 px-4 text-center">Encounter Recording</th>
                                    <th className="py-3.5 px-4 text-center">Note Output</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-medium">
                                {languages.map((lang, idx) => (
                                    <tr key={lang.id} className="hover:bg-slate-800/40 transition">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => handleMove(idx, -1)}
                                                    className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === languages.length - 1}
                                                    onClick={() => handleMove(idx, 1)}
                                                    className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-white flex items-center gap-2">
                                                {lang.label}
                                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                                    {lang.code}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-300">
                                            {lang.native_name}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                                            {lang.provider}: <span className="text-violet-300">{lang.provider_code}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {lang.supports_transcription ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400">
                                                    <Check className="w-4 h-4" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-500">
                                                    <X className="w-4 h-4" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {lang.supports_note_output ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400">
                                                    <Check className="w-4 h-4" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-500">
                                                    <X className="w-4 h-4" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {lang.status === 'active' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Active
                                                </span>
                                            )}
                                            {lang.status === 'beta' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    <Sparkles className="w-3 h-3" /> Beta
                                                </span>
                                            )}
                                            {lang.status === 'hidden' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                                    <EyeOff className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(lang)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" /> Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Globe className="w-4 h-4 text-violet-400" />
                                {editingLang ? `Edit Language: ${editingLang.label}` : 'Add New Scribe Language'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {errorMsg && (
                                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Language Code (ISO)
                                    </label>
                                    <input
                                        type="text"
                                        disabled={Boolean(editingLang)}
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().trim() })}
                                        placeholder="e.g. es"
                                        required
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-violet-500 disabled:opacity-50 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-violet-500"
                                    >
                                        <option value="active">Active (Visible)</option>
                                        <option value="beta">Beta (Badge displayed)</option>
                                        <option value="hidden">Hidden (Admin only)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        English Label
                                    </label>
                                    <input
                                        type="text"
                                        value={form.label}
                                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                                        placeholder="e.g. Spanish"
                                        required
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Native Name
                                    </label>
                                    <input
                                        type="text"
                                        value={form.native_name}
                                        onChange={(e) => setForm({ ...form, native_name: e.target.value })}
                                        placeholder="e.g. Español"
                                        required
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Provider
                                    </label>
                                    <input
                                        type="text"
                                        value={form.provider}
                                        onChange={(e) => setForm({ ...form, provider: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-violet-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Provider Language Code
                                    </label>
                                    <input
                                        type="text"
                                        value={form.provider_code}
                                        onChange={(e) => setForm({ ...form, provider_code: e.target.value })}
                                        placeholder="e.g. es"
                                        required
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-violet-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.supports_transcription}
                                        onChange={(e) => setForm({ ...form, supports_transcription: e.target.checked })}
                                        className="rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500"
                                    />
                                    <div>
                                        <div className="text-xs font-semibold text-white">Supports Encounter Recording (STT)</div>
                                        <div className="text-[11px] text-slate-400">Audio spoken in this language can be transcribed</div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.supports_note_output}
                                        onChange={(e) => setForm({ ...form, supports_note_output: e.target.checked })}
                                        className="rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500"
                                    />
                                    <div>
                                        <div className="text-xs font-semibold text-white">Supports Clinical Note Output</div>
                                        <div className="text-[11px] text-slate-400">Clinical notes can be drafted in this language</div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
                                >
                                    {submitting ? 'Saving…' : (editingLang ? 'Update Language' : 'Create Language')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
