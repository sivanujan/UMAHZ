import React, { useState, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ShieldCheck, Plus, Pencil, FileText, CheckCircle2, AlertTriangle,
    ArrowLeft, Check, X, FileUp, UploadCloud, File, ExternalLink
} from 'lucide-react';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function EditConsentTypeModal({ consentType, onClose }) {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileError, setFileError] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        name: consentType?.name || '',
        description: consentType?.description || '',
        agreement_source: consentType?.agreement_source || 'text',
        body: consentType?.body || '',
        pdf_file: null,
        is_active: consentType ? consentType.is_active : true,
    });

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        setFileError('');
        if (!file) {
            setSelectedFile(null);
            setData('pdf_file', null);
            return;
        }

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setFileError('Only PDF files are supported.');
            e.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setFileError('File size exceeds the 10MB limit.');
            e.target.value = '';
            return;
        }

        setSelectedFile(file);
        setData('pdf_file', file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFileError('');

        post(`/app/settings/consents/${consentType.id}`, {
            preserveScroll: true,
            forceFormData: true,
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
                            <strong>Clinic Responsibility Notice:</strong> Enter your clinic's approved legal agreement terms or upload your official consent PDF below.
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

                    {/* Agreement Source Switcher */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                            Agreement Source <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <button
                                type="button"
                                onClick={() => setData('agreement_source', 'text')}
                                className={`py-2 px-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                                    data.agreement_source === 'text'
                                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>Typed Text</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setData('agreement_source', 'pdf')}
                                className={`py-2 px-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                                    data.agreement_source === 'pdf'
                                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <FileUp className="w-4 h-4" />
                                <span>Uploaded PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* Conditional: Typed Text Form */}
                    {data.agreement_source === 'text' && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Legal Agreement Text (Presented to client)
                                </label>
                                <span className="text-[11px] text-slate-400">
                                    {data.body.length} characters
                                </span>
                            </div>
                            <textarea
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                rows={8}
                                placeholder="Enter the complete agreement text here. If left blank, a placeholder will be shown and signing will be prevented until configured..."
                                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none leading-relaxed"
                            />
                            {errors.body && <p className="text-xs text-rose-600 mt-1">{errors.body}</p>}
                        </div>
                    )}

                    {/* Conditional: Uploaded PDF Form */}
                    {data.agreement_source === 'pdf' && (
                        <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Consent PDF Document (PDF only, max 10MB)
                            </label>

                            {/* Existing Document Info */}
                            {consentType.pdf_path && (
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
                                            <File className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                {consentType.pdf_original_name || 'Uploaded Agreement.pdf'}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Version {consentType.version || 1} {consentType.pdf_file_size ? `• ${formatBytes(consentType.pdf_file_size)}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {consentType.pdf_url && (
                                        <a
                                            href={consentType.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1 shrink-0"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            View PDF
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* File Upload Box */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 rounded-xl p-5 text-center transition bg-white dark:bg-slate-900/40"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {selectedFile ? selectedFile.name : (consentType.pdf_path ? 'Click to replace agreement PDF' : 'Click to select consent PDF to upload')}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {selectedFile ? `${formatBytes(selectedFile.size)} ready to upload` : 'PDF only, up to 10MB'}
                                </p>
                            </div>

                            {fileError && <p className="text-xs text-rose-600 mt-1">{fileError}</p>}
                            {errors.pdf_file && <p className="text-xs text-rose-600 mt-1">{errors.pdf_file}</p>}
                        </div>
                    )}

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
                                {processing ? 'Saving...' : 'Save Agreement'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateConsentTypeModal({ onClose }) {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileError, setFileError] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        agreement_source: 'text',
        body: '',
        pdf_file: null,
    });

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        setFileError('');
        if (!file) {
            setSelectedFile(null);
            setData('pdf_file', null);
            return;
        }

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setFileError('Only PDF files are supported.');
            e.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setFileError('File size exceeds the 10MB limit.');
            e.target.value = '';
            return;
        }

        setSelectedFile(file);
        setData('pdf_file', file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/app/settings/consents', {
            preserveScroll: true,
            forceFormData: true,
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

                    {/* Source Selector */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                            Agreement Source
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <button
                                type="button"
                                onClick={() => setData('agreement_source', 'text')}
                                className={`py-2 px-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                                    data.agreement_source === 'text'
                                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>Typed Text</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setData('agreement_source', 'pdf')}
                                className={`py-2 px-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                                    data.agreement_source === 'pdf'
                                        ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <FileUp className="w-4 h-4" />
                                <span>Uploaded PDF</span>
                            </button>
                        </div>
                    </div>

                    {data.agreement_source === 'text' ? (
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
                    ) : (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                Consent PDF Document (Optional at creation)
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 rounded-xl p-4 text-center transition bg-white dark:bg-slate-900/40"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1.5" />
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {selectedFile ? selectedFile.name : 'Select a consent PDF document'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {selectedFile ? `${formatBytes(selectedFile.size)} selected` : 'PDF only, up to 10MB'}
                                </p>
                            </div>
                            {fileError && <p className="text-xs text-rose-600 mt-1">{fileError}</p>}
                            {errors.pdf_file && <p className="text-xs text-rose-600 mt-1">{errors.pdf_file}</p>}
                        </div>
                    )}

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
                                    Configure either typed agreement text or uploaded consent PDFs your clinic requires patients to sign.
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
                            its own compliant informed consent wording or uploading an official PDF document. Forms without configured
                            terms will display a placeholder warning to staff and cannot be signed until agreement text or a PDF is saved.
                        </p>
                    </div>
                </div>
            </div>

            {/* Consent Types Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {consentTypes.map((type) => {
                    const isPdf = type.agreement_source === 'pdf';
                    const isConfigured = Boolean(type.is_configured);

                    return (
                        <div
                            key={type.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            {type.name}
                                        </h2>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                                            {isPdf ? 'PDF Source' : 'Text Source'}
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        isConfigured
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    }`}>
                                        {isConfigured
                                            ? (isPdf ? `✓ PDF Configured (v${type.version || 1})` : '✓ Text Configured')
                                            : (isPdf ? '⚠️ Missing Agreement PDF' : '⚠️ Missing Agreement Text')}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    {type.description || 'Standard clinic consent agreement.'}
                                </p>

                                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3.5 mb-4 text-xs">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Current Agreement Snapshot Preview
                                    </span>
                                    {isPdf ? (
                                        isConfigured ? (
                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                                                    <File className="w-4 h-4 text-rose-500 shrink-0" />
                                                    <span className="truncate">{type.pdf_original_name || 'Agreement.pdf'}</span>
                                                    {type.pdf_file_size && (
                                                        <span className="text-[10px] text-slate-400 shrink-0">({formatBytes(type.pdf_file_size)})</span>
                                                    )}
                                                </div>
                                                {type.pdf_url && (
                                                    <a
                                                        href={type.pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 shrink-0"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Preview
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 italic text-[11px]">
                                                No PDF uploaded yet. Click "Edit Agreement" to upload your clinic's consent PDF document.
                                            </p>
                                        )
                                    ) : (
                                        isConfigured ? (
                                            <p className="line-clamp-3 font-mono text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                                                {type.body}
                                            </p>
                                        ) : (
                                            <p className="text-slate-400 italic text-[11px]">
                                                No agreement text entered yet. Click "Edit Agreement" to add your clinic's wording.
                                            </p>
                                        )
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
