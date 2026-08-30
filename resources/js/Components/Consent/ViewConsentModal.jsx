import React, { useRef } from 'react';
import { usePage } from '@inertiajs/react';
import {
    FileCheck, X, Calendar, UserCheck, ShieldCheck, Printer,
    AlertTriangle, ShieldAlert, Building2, CheckCircle2, Copy,
    FileDown, File, ExternalLink, Award
} from 'lucide-react';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ViewConsentModal({ consent, onClose, onWithdraw }) {
    if (!consent) return null;

    const iframeRef = useRef(null);
    const { auth } = usePage().props;
    const clinicName = auth?.tenant?.name || 'Clinic';
    const isWithdrawn = consent.status === 'withdrawn';
    const isPdf = consent.agreement_source === 'pdf';

    const handlePrint = () => {
        if (isPdf && consent.pdf_url) {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                try {
                    iframeRef.current.contentWindow.focus();
                    iframeRef.current.contentWindow.print();
                    return;
                } catch (err) {
                    // Fallback to opening in new window if direct iframe print is restricted
                }
            }
            window.open(consent.pdf_url, '_blank');
            return;
        }
        window.print();
    };

    const formatDate = (isoString) => {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <>
            {/* Scoped Print Stylesheet */}
            <style>{`
                @media print {
                    /* Hide everything outside the printable consent document */
                    body * {
                        visibility: hidden !important;
                    }

                    #consent-printable-document,
                    #consent-printable-document * {
                        visibility: visible !important;
                    }

                    #consent-printable-document {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #0f172a !important;
                        display: block !important;
                        box-shadow: none !important;
                    }

                    @page {
                        size: A4 portrait;
                        margin: 18mm 15mm 18mm 15mm;
                    }

                    .print-avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}</style>

            {/* SCREEN MODAL (Interactive On-Screen View) */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:hidden">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

                <div
                    className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                        style={{ borderColor: 'var(--umahz-border)', background: 'var(--umahz-surface-alt, #fafafa)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                isWithdrawn
                                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            }`}>
                                {isWithdrawn ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {consent.consent_type_name}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        isWithdrawn
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    }`}>
                                        {isWithdrawn ? 'Withdrawn' : 'Active Consent'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{consent.signer_name}</span>
                                    {clinicName && ` • ${clinicName}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isPdf && consent.pdf_url && (
                                <a
                                    href={consent.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={consent.signed_pdf_original_name || 'signed_consent.pdf'}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition text-xs font-semibold shadow-sm"
                                    title="Download Signed PDF Document"
                                >
                                    <FileDown className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    <span>Download PDF</span>
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition text-xs font-semibold shadow-sm"
                                title="Print Official Document / Save as PDF"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print / Export</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Withdrawn Notice */}
                        {isWithdrawn && (
                            <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                                <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    This consent agreement was marked as withdrawn
                                </div>
                                <p>
                                    <strong>Withdrawn at:</strong> {formatDate(consent.withdrawn_at)}
                                    {consent.withdrawn_by && ` by ${consent.withdrawn_by}`}
                                </p>
                                {consent.withdrawal_reason && (
                                    <p className="mt-1 bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-lg font-mono text-[11px]">
                                        <strong>Reason:</strong> {consent.withdrawal_reason}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                                    Date & Time Agreed
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {formatDate(consent.agreed_at)}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                                    Witnessed / Recorded By
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {consent.witnessed_by || 'Staff User'}
                                </span>
                            </div>
                        </div>

                        {/* Signed Agreement Document/Terms Presentation */}
                        {isPdf ? (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Agreed PDF Document (Immutable Snapshot • v{consent.consent_version || 1})
                                    </span>
                                    {consent.pdf_url && (
                                        <a
                                            href={consent.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Open Full PDF
                                        </a>
                                    )}
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden shadow-sm">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <File className="w-4 h-4 text-rose-500 shrink-0" />
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {consent.signed_pdf_original_name || 'Agreed_Consent_Document.pdf'}
                                            </span>
                                            {consent.signed_pdf_file_size && (
                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                    ({formatBytes(consent.signed_pdf_file_size)})
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                            Record: {consent.id.substring(0, 8)}...
                                        </span>
                                    </div>
                                    <div className="relative w-full h-80 bg-slate-100 dark:bg-slate-950">
                                        {consent.pdf_url ? (
                                            <iframe
                                                ref={iframeRef}
                                                src={`${consent.pdf_url}#toolbar=0&navpanes=0`}
                                                title={consent.consent_type_name}
                                                className="w-full h-full border-0"
                                            />
                                        ) : (
                                            <div className="p-6 text-center text-xs text-slate-500">PDF document not available</div>
                                        )}
                                    </div>
                                    <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>Certified PDF: Original agreement terms + attached official signature execution certificate.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Agreed Agreement Terms (Immutable Snapshot)
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        Record ID: {consent.id.substring(0, 8)}...
                                    </span>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed whitespace-pre-wrap select-text max-h-72 overflow-y-auto shadow-inner">
                                    {consent.consent_body}
                                </div>
                            </div>
                        )}

                        {/* Signature Presentation */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                                Client Signature & Acknowledgment
                            </span>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Signer: <span className="font-bold text-slate-900 dark:text-white">{consent.signer_name}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Signature Method: <strong className="capitalize">{consent.signature_type === 'draw' ? 'Drawn Signature' : 'Typed Electronic Name'}</strong>
                                    </p>
                                </div>

                                <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white shadow-sm">
                                    {consent.signature_type === 'draw' && consent.signature_data?.startsWith('data:image') ? (
                                        <img
                                            src={consent.signature_data}
                                            alt={`Signature of ${consent.signer_name}`}
                                            className="h-16 max-w-full object-contain"
                                        />
                                    ) : (
                                        <div className="px-5 py-2 font-serif italic text-lg text-slate-900 border-b border-slate-400">
                                            /s/ {consent.signer_name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                        <div>
                            {!isWithdrawn && onWithdraw && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onWithdraw(consent);
                                    }}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
                                >
                                    Mark as Withdrawn...
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm flex items-center gap-1.5"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print / Export
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* DEDICATED OFFICIAL PRINT DOCUMENT (Rendered ONLY in print/PDF output) */}
            <div id="consent-printable-document" className="hidden print:block text-slate-900 bg-white font-sans">
                {/* Clinic Official Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-1">
                            {clinicName}
                        </h1>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            Official Informed Consent Record
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${
                            isWithdrawn
                                ? 'border-amber-600 text-amber-800 bg-amber-50'
                                : 'border-emerald-700 text-emerald-800 bg-emerald-50'
                        }`}>
                            {isWithdrawn ? 'RECORD WITHDRAWN' : 'VERIFIED & ACTIVE'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                            Record ID: {consent.id}
                        </p>
                    </div>
                </div>

                {/* Patient & Record Details Table */}
                <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50 print-avoid-break">
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Patient Full Name</span>
                            <span className="font-bold text-sm text-slate-900">{consent.signer_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Consent Agreement Type</span>
                            <span className="font-bold text-sm text-slate-900">{consent.consent_type_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Date & Time Executed</span>
                            <span className="font-semibold text-slate-800">{formatDate(consent.agreed_at)}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Witnessed / Recorded By</span>
                            <span className="font-semibold text-slate-800">{consent.witnessed_by || 'Clinical Staff'}</span>
                        </div>
                    </div>
                </div>

                {/* Withdrawn Notice if Applicable */}
                {isWithdrawn && (
                    <div className="border border-amber-300 bg-amber-50 p-3.5 rounded-lg mb-6 text-xs text-amber-900 print-avoid-break">
                        <strong className="block text-sm mb-0.5">⚠️ Withdrawal Notice</strong>
                        <p>This consent agreement was marked as withdrawn on <strong>{formatDate(consent.withdrawn_at)}</strong>{consent.withdrawn_by && ` by ${consent.withdrawn_by}`}.</p>
                        {consent.withdrawal_reason && (
                            <p className="mt-1 text-[11px] font-mono italic">Reason on file: "{consent.withdrawal_reason}"</p>
                        )}
                    </div>
                )}

                {/* Agreement Terms or Attached PDF Certification */}
                {isPdf ? (
                    <div className="mb-8 border border-slate-300 rounded-lg p-5 bg-slate-50/50 print-avoid-break">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-2 mb-3">
                            Attached Informed Consent Agreement Document (PDF)
                        </h3>
                        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                            <p>
                                <strong>Document Name:</strong> {consent.signed_pdf_original_name || 'Consent Agreement Document (PDF)'}
                            </p>
                            <p>
                                <strong>Document Version:</strong> Version {consent.consent_version || 1}
                            </p>
                            <p>
                                <strong>Audit & Record Verification:</strong> This informed consent record was officially signed and executed by the patient against the exact attached document. The agreed PDF is immutably archived on file in the clinic's digital medical records repository under UUID <code className="font-mono font-semibold">{consent.id}</code>.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1.5 mb-3">
                            Terms of Informed Consent (Agreed Version)
                        </h3>
                        <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans text-justify">
                            {consent.consent_body}
                        </div>
                    </div>
                )}

                {/* Signatures & Execution Section */}
                <div className="border-t-2 border-slate-300 pt-6 mt-8 print-avoid-break">
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-6">
                        <strong>Patient Affirmation:</strong> By signing below, I certify that I have read, understand,
                        and voluntarily agreed to the complete terms set forth in this consent agreement.
                        I acknowledge that a digital record and signature have been captured and archived with my patient chart.
                    </p>

                    <div className="grid grid-cols-2 gap-8 items-end">
                        {/* Client Signature */}
                        <div>
                            <div className="h-20 flex items-end pb-2 border-b-2 border-slate-900">
                                {consent.signature_type === 'draw' && consent.signature_data?.startsWith('data:image') ? (
                                    <img
                                        src={consent.signature_data}
                                        alt={`Signature of ${consent.signer_name}`}
                                        className="h-16 max-w-full object-contain"
                                    />
                                ) : (
                                    <span className="font-serif italic text-xl text-slate-900">
                                        /s/ {consent.signer_name}
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 text-xs">
                                <span className="font-bold text-slate-900 block">{consent.signer_name}</span>
                                <span className="text-slate-500 text-[11px]">Patient Signature • {new Date(consent.agreed_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Witness Staff Signature */}
                        <div>
                            <div className="h-20 flex items-end pb-2 border-b-2 border-slate-900">
                                <span className="font-serif italic text-lg text-slate-800">
                                    {consent.witnessed_by || 'Clinical Staff'}
                                </span>
                            </div>
                            <div className="mt-2 text-xs">
                                <span className="font-bold text-slate-900 block">{consent.witnessed_by || 'Staff Witness'}</span>
                                <span className="text-slate-500 text-[11px]">Authorized Clinic Witness • {new Date(consent.agreed_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legal / Regulatory Compliance Footer */}
                <div className="mt-12 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between print-avoid-break">
                    <span>
                        Official Medical Record • UMAHZ Practice Management • Immutable Storage
                    </span>
                    <span>
                        Document UUID: {consent.id}
                    </span>
                </div>
            </div>
        </>
    );
}
