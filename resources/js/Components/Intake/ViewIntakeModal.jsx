import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import {
    FileText, X, Printer, ShieldAlert, CheckCircle2, UserCheck,
    Calendar, Clock, AlertTriangle, Building2
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture & TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietetics & Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

export default function ViewIntakeModal({ client, intakeSummary, onClose }) {
    const { auth } = usePage().props;
    const clinicName = auth?.tenant?.name || 'Clinic';

    const [fullIntake, setFullIntake] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!intakeSummary?.id) return;
        setLoading(true);
        fetch(`/app/clients/${client.id}/intakes/${intakeSummary.id}`)
            .then((res) => res.json())
            .then((data) => {
                setFullIntake(data.intake);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [client.id, intakeSummary?.id]);

    const handlePrint = () => {
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
        });
    };

    const isFlagged = fullIntake?.status === 'flagged' || intakeSummary?.status === 'flagged';
    const flags = fullIntake?.contraindication_flags || intakeSummary?.contraindication_flags || [];
    const schema = fullIntake?.schema || { sections: [] };
    const responses = fullIntake?.responses || {};

    return (
        <>
            {/* Scoped Print Stylesheet */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #intake-printable-document,
                    #intake-printable-document * {
                        visibility: visible !important;
                    }
                    #intake-printable-document {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #0f172a !important;
                        display: block !important;
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

            {/* Interactive Screen Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:hidden">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

                <div
                    className="relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                        style={{ borderColor: 'var(--umahz-border)', background: 'var(--umahz-surface-alt, #fafafa)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                isFlagged
                                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            }`}>
                                {isFlagged ? <ShieldAlert className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {disciplineTitle} Intake
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        isFlagged
                                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    }`}>
                                        {isFlagged ? '⚠️ Contraindication Flagged' : 'Completed'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</span>
                                    {clinicName && ` • ${clinicName}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition text-xs font-semibold shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print / PDF</span>
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

                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {loading ? (
                            <div className="py-16 text-center text-slate-400 text-xs">
                                Loading clinical intake record...
                            </div>
                        ) : (
                            <>
                                {/* Contraindication Alert Banner */}
                                {isFlagged && flags.length > 0 && (
                                    <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-5 space-y-3">
                                        <div className="flex items-center gap-2 text-rose-900 dark:text-rose-100 font-bold text-sm">
                                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                                            Clinical Review Alert: {flags.length} Potential Contraindication(s)
                                        </div>
                                        <div className="space-y-2">
                                            {flags.map((flag, idx) => (
                                                <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{flag.question}</p>
                                                    <p className="mt-1 font-bold text-rose-700 dark:text-rose-400">⚠️ {flag.warning}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">Answer on file: <strong>{String(flag.answer || 'yes')}</strong></p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">Submission Method</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                            {fullIntake?.submission_type === 'patient_link' ? 'Patient Self-Fill (Link)' : 'Staff Recorded'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">Date Submitted</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {formatDate(fullIntake?.submitted_at)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">Recorded / Witnessed</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {fullIntake?.submitted_by || 'Patient Electronic'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">Record Status</span>
                                        <span className="font-bold text-slate-900 dark:text-white capitalize">
                                            {fullIntake?.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Questions & Answers by Section */}
                                <div className="space-y-6">
                                    {(schema.sections || []).map((sec, sIdx) => (
                                        <div key={sIdx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                                                {sec.title}
                                            </h3>

                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                {(sec.fields || []).map((field) => {
                                                    const val = responses[field.id];
                                                    const isFieldFlagged = field.is_contraindication && val !== undefined && String(val).toLowerCase() === String(field.flag_trigger || 'yes').toLowerCase();

                                                    return (
                                                        <div
                                                            key={field.id}
                                                            className={`p-3 rounded-lg border ${
                                                                isFieldFlagged
                                                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 sm:col-span-2'
                                                                    : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/80'
                                                            }`}
                                                        >
                                                            <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                                                                {field.label}
                                                            </dt>
                                                            <dd className="font-semibold text-slate-900 dark:text-white text-xs leading-relaxed">
                                                                {val !== undefined && val !== null && String(val).trim().length > 0 ? (
                                                                    String(val)
                                                                ) : (
                                                                    <span className="text-slate-400 italic">Not specified</span>
                                                                )}
                                                            </dd>
                                                            {isFieldFlagged && (
                                                                <p className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                                                    ⚠️ {field.flag_warning}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </dl>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print Official Document
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* DEDICATED OFFICIAL PRINT DOCUMENT (Rendered ONLY in print/PDF output) */}
            <div id="intake-printable-document" className="hidden print:block text-slate-900 bg-white font-sans">
                {/* Clinic Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-1">
                            {clinicName}
                        </h1>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            {disciplineTitle} Health History Record
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded border ${
                            isFlagged
                                ? 'border-rose-600 text-rose-800 bg-rose-50'
                                : 'border-emerald-700 text-emerald-800 bg-emerald-50'
                        }`}>
                            {isFlagged ? 'CONTRAINDICATION FLAGGED' : 'CLINICAL INTAKE COMPLETED'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                            Record ID: {intakeSummary.id}
                        </p>
                    </div>
                </div>

                {/* Patient Summary Card */}
                <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50 print-avoid-break">
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Patient Name</span>
                            <span className="font-bold text-sm text-slate-900">{client.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Health Discipline</span>
                            <span className="font-bold text-sm text-slate-900">{disciplineTitle}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Date Submitted</span>
                            <span className="font-semibold text-slate-800">{formatDate(fullIntake?.submitted_at || intakeSummary.submitted_at)}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Recorded By</span>
                            <span className="font-semibold text-slate-800">{fullIntake?.submitted_by || 'Patient Electronic Link'}</span>
                        </div>
                    </div>
                </div>

                {/* Contraindication Warnings on Print */}
                {isFlagged && flags.length > 0 && (
                    <div className="border-2 border-rose-600 bg-rose-50 p-4 rounded-lg mb-6 text-xs text-rose-900 print-avoid-break">
                        <strong className="block text-sm mb-1 text-rose-950 uppercase tracking-wider">
                            ⚠️ Clinical Contraindication Warnings
                        </strong>
                        <ul className="list-disc list-inside space-y-1">
                            {flags.map((f, i) => (
                                <li key={i}>
                                    <strong>{f.question}:</strong> {f.warning} (Answer: {String(f.answer || 'yes')})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Full Question & Answer Inventory */}
                <div className="space-y-6">
                    {(schema.sections || []).map((sec, sIdx) => (
                        <div key={sIdx} className="print-avoid-break mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-3">
                                {sec.title}
                            </h3>
                            <div className="space-y-2.5">
                                {(sec.fields || []).map((f) => (
                                    <div key={f.id} className="text-xs border-b border-slate-100 pb-1.5 flex justify-between gap-4">
                                        <span className="text-slate-600 font-medium flex-1">{f.label}</span>
                                        <span className="font-bold text-slate-900 text-right shrink-0 max-w-xs">
                                            {responses[f.id] !== undefined ? String(responses[f.id]) : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Formal Record Retention Footer */}
                <div className="mt-12 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between print-avoid-break">
                    <span>Official Medical Record • UMAHZ Practice Management • Immutable Storage</span>
                    <span>Document UUID: {intakeSummary.id}</span>
                </div>
            </div>
        </>
    );
}
