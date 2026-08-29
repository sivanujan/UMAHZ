import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ShieldCheck, Plus, Pencil, FileText, CheckCircle2, AlertTriangle,
    ArrowLeft, HelpCircle, Building2, Check, X
} from 'lucide-react';

function EditConsentTypeModal({ consentType, onClose }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: consentType?.name || '',
        description: consentType?.description || '',
        body: consentType?.body || '',
        is_active: consentType ? consentType.is_active : true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(`/app/settings/consents/${consentType.id}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <FileText className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            Configure Agreement: {consentType.name}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Compliance Alert */}
                    <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/70 dark:bg-violet-950/30 p-3.5 text-xs text-violet-800 dark:text-violet-300 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
                        <p className="leading-relaxed">
                            <strong>Clinic Responsibility Notice:</strong> Enter your clinic's approved legal and medical agreement terms below.
                            UMAHZ does not supply or fabricate legal wording.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            Agreement Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                        />
                        {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            Internal Description / Usage Notes
                        </label>
                        <input
                            type="text"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="e.g. Required for all initial assessments..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                        />
                        {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description}</p>}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Legal Agreement Text (Terms presented to patient)
                            </label>
                            <span className="text-[11px] text-slate-400">
                                {data.body.length} characters
                            </span>
                        </div>
                        <textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={9}
                            placeholder="Enter the complete agreement text here. If left blank, a placeholder will be shown and signing will be prevented until configured..."
                            className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none leading-relaxed"
                        />
                        {errors.body && <p className="text-xs text-rose-600 mt-1">{errors.body}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                            Active for client signing
                        </label>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs transition"
                            >
                                {processing ? 'Saving...' : 'Save Agreement Text'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateConsentTypeModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        body: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/app/settings/consents', {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <Plus className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            Add Custom Consent Type
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            Agreement Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            placeholder="e.g. Dry Needling Consent"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                        />
                        {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="e.g. Required prior to acupuncture or trigger point dry needling."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                        />
                        {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                            Consent Agreement Terms (Optional at creation)
                        </label>
                        <textarea
                            value={data.body}
                            onChange={(e) => setData('body', e.target.value)}
                            rows={5}
                            placeholder="Enter the initial agreement text or configure it later..."
                            className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none leading-relaxed"
                        />
                        {errors.body && <p className="text-xs text-rose-600 mt-1">{errors.body}</p>}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs transition"
                        >
                            {processing ? 'Creating...' : 'Create Consent Type'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ConsentSettingsIndex({ consentTypes = [] }) {
    const [editingType, setEditingType] = useState(null);
    const [creatingType, setCreatingType] = useState(false);

    return (
        <AuthenticatedLayout title="Consent Settings">
            <Head title="Consent Agreement Configuration" />

            <div className="mb-6">
                <Link
                    href="/app/settings"
                    className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Clinic Settings
                </Link>
            </div>

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Informed Consent Agreements
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Configure the legal text and consent forms your clinic requires patients to sign.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCreatingType(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        Add Consent Type
                    </button>
                </div>

                {/* Important Notice */}
                <div className="mt-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-bold">Important: Compliance & Legal Agreement Wording</p>
                        <p className="leading-relaxed text-amber-800 dark:text-amber-300">
                            UMAHZ does not fabricate legal, medical, or regulatory language. Your clinic is responsible for entering
                            its own compliant informed consent wording for each consent type. Forms without configured text will
                            display a placeholder warning to staff and cannot be signed until agreement text is saved.
                        </p>
                    </div>
                </div>
            </div>

            {/* Consent Types Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {consentTypes.map((type) => {
                    const hasText = Boolean(type.body && type.body.trim().length > 0);
                    return (
                        <div
                            key={type.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {type.name}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        hasText
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    }`}>
                                        {hasText ? '✓ Text Configured' : '⚠️ Missing Agreement Text'}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    {type.description || 'Standard clinic consent agreement.'}
                                </p>

                                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3.5 mb-4 text-xs">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Current Agreement Snapshot Preview
                                    </span>
                                    {hasText ? (
                                        <p className="line-clamp-3 font-mono text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                                            {type.body}
                                        </p>
                                    ) : (
                                        <p className="text-slate-400 italic text-[11px]">
                                            No agreement text has been entered yet. Click "Edit Agreement" to add your clinic's wording.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                <span className="text-slate-400 text-[11px]">
                                    {type.consents_count || 0} signed records on file
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setEditingType(type)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    Edit Agreement...
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            {editingType && (
                <EditConsentTypeModal
                    consentType={editingType}
                    onClose={() => setEditingType(null)}
                />
            )}

            {creatingType && (
                <CreateConsentTypeModal
                    onClose={() => setCreatingType(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
