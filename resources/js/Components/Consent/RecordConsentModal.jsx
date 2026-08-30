import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import SignaturePad from '@/Components/SignaturePad';
import {
    FileCheck2, ShieldAlert, Check, X, AlertTriangle, UserCheck,
    PenLine, Type, Clock, Building2, File, ExternalLink
} from 'lucide-react';

export default function RecordConsentModal({ client, consentTypes = [], onClose }) {
    const { auth } = usePage().props;

    const isTypeConfigured = (type) => {
        if (!type) return false;
        if (type.is_configured !== undefined) return Boolean(type.is_configured);
        if (type.agreement_source === 'pdf') {
            return Boolean(type.pdf_path);
        }
        return Boolean(type.body && type.body.trim().length > 0);
    };

    const firstConfigured = consentTypes.find(isTypeConfigured);
    const [selectedTypeId, setSelectedTypeId] = useState(firstConfigured?.id || consentTypes[0]?.id || '');
    const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' | 'typed'
    const [agreedCheckbox, setAgreedCheckbox] = useState(false);

    const selectedType = consentTypes.find((t) => t.id === selectedTypeId) || firstConfigured || consentTypes[0];
    const isCurrentConfigured = isTypeConfigured(selectedType);
    const isPdf = selectedType?.agreement_source === 'pdf';

    const { data, setData, post, processing, errors, reset } = useForm({
        consent_type_id: selectedType?.id || '',
        signer_name: client.name || `${client.first_name} ${client.last_name}`,
        signature_type: 'draw',
        signature_data: '',
    });

    const handleTypeSelect = (id) => {
        setSelectedTypeId(id);
        setData('consent_type_id', id);
    };

    const handleSignatureChange = (dataUrl) => {
        setData('signature_data', dataUrl);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isCurrentConfigured) return;

        if (!agreedCheckbox) {
            alert('Please check the confirmation box acknowledging client agreement.');
            return;
        }

        const submissionData = {
            ...data,
            consent_type_id: selectedType?.id,
            signature_type: signatureMode,
            signature_data: signatureMode === 'draw'
                ? data.signature_data
                : `TYPED_ACKNOWLEDGMENT: ${data.signer_name} agreed electronically on ${new Date().toISOString()}`,
        };

        post(`/app/clients/${client.id}/consents`, {
            data: submissionData,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                {/* Modal Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'var(--umahz-border)', background: 'var(--umahz-surface-alt, #fafafa)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Capture Client Consent
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Step 1: Choose Consent Type */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            1. Select Consent Agreement
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {consentTypes.map((type) => {
                                const configured = isTypeConfigured(type);
                                const isSelected = type.id === selectedType?.id;
                                const isTypePdf = type.agreement_source === 'pdf';

                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        disabled={!configured}
                                        onClick={() => configured && handleTypeSelect(type.id)}
                                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                            !configured
                                                ? 'opacity-40 cursor-not-allowed bg-slate-50/60 dark:bg-slate-900/30 border-dashed border-slate-300 dark:border-slate-800'
                                                : isSelected
                                                    ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/20 ring-2 ring-violet-500/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                                {type.name}
                                            </span>
                                            {isSelected && configured && (
                                                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {type.description || (isTypePdf ? 'Official PDF consent document.' : 'Standard clinic agreement.')}
                                        </p>
                                        {!configured ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-2">
                                                <AlertTriangle className="w-3 h-3" /> Unconfigured — {isTypePdf ? 'upload PDF' : 'add text'} under Settings
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                                                <Check className="w-3 h-3" /> {isTypePdf ? 'PDF Document Configured' : 'Text Configured'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.consent_type_id && (
                            <p className="text-xs text-rose-600 mt-1.5">{errors.consent_type_id}</p>
                        )}
                    </div>

                    {/* Step 2: Agreement Document Body / PDF Viewer */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                2. Agreement Terms & Conditions
                            </label>
                            <span className="text-[11px] text-slate-400">
                                {isPdf ? 'Exact document version will be immutably snapshot' : 'Exact text will be immutably snapshot'}
                            </span>
                        </div>

                        {isCurrentConfigured ? (
                            isPdf ? (
                                /* Embedded PDF Viewer */
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
                                    <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <File className="w-4 h-4 text-rose-500 shrink-0" />
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {selectedType.pdf_original_name || 'Consent Agreement Document (PDF)'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                                v{selectedType.version || 1}
                                            </span>
                                        </div>
                                        {selectedType.pdf_url && (
                                            <a
                                                href={selectedType.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-semibold text-[11px] shrink-0"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Open Full PDF
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-950">
                                        {selectedType.pdf_url ? (
                                            <iframe
                                                src={`${selectedType.pdf_url}#toolbar=0&navpanes=0`}
                                                title={selectedType.name}
                                                className="w-full h-full border-0"
                                            />
                                        ) : (
                                            <div className="p-6 text-center text-xs text-slate-500">PDF preview unavailable</div>
                                        )}
                                    </div>
                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Please have the client review the complete document above prior to signing below.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* Scrollable Text Agreement */
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 max-h-48 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-text">
                                    {selectedType.body}
                                </div>
                            )
                        ) : (
                            /* Unconfigured State */
                            <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3 text-amber-800 dark:text-amber-300 text-xs">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-semibold text-sm">No Consent Agreement Configured</p>
                                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                                        This clinic has not yet entered agreement wording or uploaded a PDF for <strong>{selectedType?.name}</strong>.
                                        UMAHZ does not fabricate legal or medical language. A clinic administrator must configure the
                                        required consent terms in <strong>Clinic Settings &rarr; Consent Types</strong> before this form can be signed.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Signature Capture */}
                    <div className={!isCurrentConfigured ? 'opacity-40 pointer-events-none' : ''}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                3. Client Acknowledgment & Signature
                            </label>
                            {/* Mode Toggle */}
                            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setSignatureMode('draw')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 ${
                                        signatureMode === 'draw'
                                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <PenLine className="w-3 h-3" />
                                    Draw
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSignatureMode('typed')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 ${
                                        signatureMode === 'typed'
                                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <Type className="w-3 h-3" />
                                    Type Name
                                </button>
                            </div>
                        </div>

                        {/* Signer Legal Name Input */}
                        <div className="mb-3">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Full Legal Name of Signer
                            </label>
                            <input
                                type="text"
                                value={data.signer_name}
                                onChange={(e) => setData('signer_name', e.target.value)}
                                required
                                disabled={!isCurrentConfigured}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                                placeholder="e.g. Jane Doe"
                            />
                            {errors.signer_name && (
                                <p className="text-xs text-rose-600 mt-1">{errors.signer_name}</p>
                            )}
                        </div>

                        {/* Signature Mode Display */}
                        {signatureMode === 'draw' ? (
                            <div>
                                <SignaturePad
                                    disabled={!isCurrentConfigured}
                                    onSignatureChange={handleSignatureChange}
                                />
                                {errors.signature_data && (
                                    <p className="text-xs text-rose-600 mt-1">{errors.signature_data}</p>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3.5 text-xs text-slate-600 dark:text-slate-400">
                                <p>
                                    Electronic signature fallback: The client's typed legal name and affirmative agreement below
                                    constitute a legally binding electronic acknowledgment.
                                </p>
                            </div>
                        )}

                        {/* Universal Affirmative Acknowledgment Checkbox */}
                        <div className="mt-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={agreedCheckbox}
                                    onChange={(e) => setAgreedCheckbox(e.target.checked)}
                                    disabled={!isCurrentConfigured}
                                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                    I, <strong className="text-violet-700 dark:text-violet-400">{data.signer_name || client.name}</strong>, acknowledge that I have read, understand, and voluntarily agree to the complete terms of this consent agreement.
                                </span>
                            </label>
                        </div>

                        {/* Witness & Date Stamp Info */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>
                                    Witnessed & recorded by: <strong className="text-slate-700 dark:text-slate-300">{auth?.user?.name || 'Staff User'}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>Timestamp: <strong>Instant (UTC)</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={
                                !isCurrentConfigured ||
                                processing ||
                                !agreedCheckbox ||
                                !data.signer_name.trim() ||
                                (signatureMode === 'draw' && !data.signature_data)
                            }
                            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-sm flex items-center gap-2"
                        >
                            {processing ? 'Recording Consent...' : 'Record & Store Consent'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
