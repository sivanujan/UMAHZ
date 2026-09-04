import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    FileText, Printer, ArrowLeft, ShieldCheck, Clock, UserCheck,
    Plus, AlertTriangle, Building2, Calendar, Lock, CheckCircle2,
    Layers, Stethoscope, ChevronRight, X
} from 'lucide-react';

const ADDENDUM_REASONS = [
    'Late entry',
    'Treatment clarification',
    'Correction of record',
    'Additional clinical observation',
    'Patient follow-up update',
    'Administrative note',
];

export default function ClinicalNoteShow({ client, appointment, note, clinic }) {
    const [showAddendumModal, setShowAddendumModal] = useState(false);
    const [reason, setReason] = useState(ADDENDUM_REASONS[0]);
    const [authorName, setAuthorName] = useState('');
    const [addendumContent, setAddendumContent] = useState('');
    const [submittingAddendum, setSubmittingAddendum] = useState(false);

    const isFinalized = note.status === 'finalized' || note.status === 'addended';
    const schema = note.schema || { sections: [] };
    const content = note.content || {};
    const addenda = note.addenda || [];

    const handlePrint = () => {
        window.print();
    };

    const handleAddAddendum = (e) => {
        e.preventDefault();
        setSubmittingAddendum(true);
        router.post(`/app/notes/${note.id}/addenda`, {
            reason,
            author_name: authorName,
            content: addendumContent,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSubmittingAddendum(false);
                setShowAddendumModal(false);
                setAddendumContent('');
            },
            onError: () => setSubmittingAddendum(false),
        });
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

    return (
        <AuthenticatedLayout>
            <Head title={`Clinical Record — ${client.name}`} />

            {/* Scoped Print Stylesheet */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #clinical-printable-record,
                    #clinical-printable-record * {
                        visibility: visible !important;
                    }
                    #clinical-printable-record {
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

            {/* Interactive Screen View */}
            <div className="max-w-4xl mx-auto space-y-6 pb-16 print:hidden">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/app/clients/${client.id}`}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {note.template_name || 'Clinical Encounter Note'}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    note.status === 'finalized'
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : note.status === 'addended'
                                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                }`}>
                                    {note.status === 'addended' ? 'Finalized + Addended' : note.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</span>
                                {client.date_of_birth && ` (DOB: ${client.date_of_birth})`}
                                {client.sex && ` • Sex: ${client.sex}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isFinalized && (
                            <button
                                type="button"
                                onClick={() => setShowAddendumModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
                            >
                                <Plus className="w-3.5 h-3.5 text-violet-600" />
                                <span>Add Addendum</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print / Export PDF</span>
                        </button>
                    </div>
                </div>

                {/* Encounter Summary Metadata Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-xs">
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Health Discipline</span>
                        <span className="font-bold text-violet-700 dark:text-violet-400">
                            {note.discipline_label}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Encounter Date</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {appointment?.starts_at ? formatDate(appointment.starts_at) : formatDate(note.created_at)}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Practitioner</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {note.signer_name || note.author?.name}
                            {note.signer_credentials && ` (${note.signer_credentials})`}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Template Snapshot</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                            v{note.template_version} (Locked)
                        </span>
                    </div>
                </div>

                {/* Clinical Content Sections */}
                {note.can_view_body ? (
                    <div className="space-y-5">
                        {(schema.sections || []).map((sec, sIdx) => (
                            <div
                                key={sec.id || sIdx}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
                            >
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    {sec.title}
                                </h3>

                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    {(sec.fields || []).map((field) => {
                                        const val = content[field.id];
                                        return (
                                            <div
                                                key={field.id}
                                                className={`p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 ${
                                                    field.type === 'long_text' ? 'sm:col-span-2' : ''
                                                }`}
                                            >
                                                <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                                                    {field.label}
                                                </dt>
                                                <dd className="font-semibold text-slate-900 dark:text-white text-xs leading-relaxed whitespace-pre-wrap">
                                                    {Array.isArray(val) ? (
                                                        val.length > 0 ? val.join(', ') : <span className="text-slate-400 italic">None selected</span>
                                                    ) : val !== undefined && val !== null && String(val).trim().length > 0 ? (
                                                        String(val)
                                                    ) : (
                                                        <span className="text-slate-400 italic">Not documented</span>
                                                    )}
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center space-y-2">
                        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Protected Clinical Record</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Clinical documentation bodies are restricted to treating practitioners and clinical directors in accordance with healthcare privacy regulations.
                        </p>
                    </div>
                )}

                {/* Verified Electronic Signature Block */}
                {isFinalized && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Verified Electronic Clinical Signature</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                            Electronically finalized and signed by <strong>{note.signer_name}</strong> {note.signer_credentials && `(${note.signer_credentials})`} on {formatDate(note.finalized_at || note.signed_at)}.
                        </p>
                        {note.attestation_text && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                                "{note.attestation_text}"
                            </p>
                        )}
                    </div>
                )}

                {/* Chronological Addenda Feed */}
                {addenda.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Record Addenda & Clarifications ({addenda.length})</span>
                        </div>

                        {addenda.map((ad, idx) => (
                            <div
                                key={ad.id || idx}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 p-5 space-y-3 shadow-sm"
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                                            Addendum #{idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            Reason: {ad.reason}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                        {formatDate(ad.signed_at)}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                    {ad.content}
                                </p>

                                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    Signed by: <strong>{ad.author_name}</strong> ({ad.author_role})
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DEDICATED OFFICIAL PRINT DOCUMENT (Visible ONLY on print / PDF export) */}
            <div id="clinical-printable-record" className="hidden print:block text-slate-900 bg-white font-sans">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-0.5">
                            {clinic?.name || 'Clinic Health Center'}
                        </h1>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            {note.discipline_label} Clinical Documentation Record
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-900 text-slate-900">
                            OFFICIAL HEALTHCARE RECORD
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                            Record ID: {note.id}
                        </p>
                    </div>
                </div>

                {/* Patient & Encounter Summary Card */}
                <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50 print-avoid-break">
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Patient Name</span>
                            <span className="font-bold text-sm text-slate-900">{client.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Health Discipline</span>
                            <span className="font-bold text-sm text-slate-900">{note.discipline_label}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Encounter Date</span>
                            <span className="font-semibold text-slate-800">{appointment?.starts_at ? formatDate(appointment.starts_at) : formatDate(note.created_at)}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Attending Practitioner</span>
                            <span className="font-semibold text-slate-800">{note.signer_name || note.author?.name} {note.signer_credentials && `(${note.signer_credentials})`}</span>
                        </div>
                    </div>
                </div>

                {/* Sections & Fields */}
                <div className="space-y-5">
                    {(schema.sections || []).map((sec, sIdx) => (
                        <div key={sec.id || sIdx} className="border border-slate-200 rounded-lg p-4 print-avoid-break">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5 mb-3">
                                {sec.title}
                            </h2>

                            <dl className="grid grid-cols-1 gap-2.5 text-xs">
                                {(sec.fields || []).map((field) => {
                                    const val = content[field.id];
                                    return (
                                        <div key={field.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                                            <dt className="text-slate-500 text-[10px] uppercase font-semibold mb-0.5">
                                                {field.label}
                                            </dt>
                                            <dd className="font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                                                {Array.isArray(val) ? (
                                                    val.join(', ')
                                                ) : val !== undefined && val !== null && String(val).trim().length > 0 ? (
                                                    String(val)
                                                ) : (
                                                    <span className="text-slate-400 italic">Not documented</span>
                                                )}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </div>
                    ))}
                </div>

                {/* Signature Block on Print */}
                <div className="border border-slate-300 rounded-lg p-4 mt-6 print-avoid-break bg-slate-50/50">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Electronic Signature & Clinical Attestation
                    </h3>
                    <p className="text-xs text-slate-900 font-semibold">
                        Signed by: {note.signer_name} {note.signer_credentials && `(${note.signer_credentials})`} • Date: {formatDate(note.finalized_at || note.signed_at)}
                    </p>
                    {note.attestation_text && (
                        <p className="text-[10px] text-slate-500 italic mt-1">
                            "{note.attestation_text}"
                        </p>
                    )}
                </div>

                {/* Addenda on Print */}
                {addenda.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1">
                            Signed Addenda
                        </h3>
                        {addenda.map((ad, idx) => (
                            <div key={idx} className="border border-slate-200 rounded p-3 text-xs bg-slate-50 print-avoid-break">
                                <div className="flex justify-between font-bold text-slate-800 mb-1">
                                    <span>Addendum #{idx + 1} — Reason: {ad.reason}</span>
                                    <span>{formatDate(ad.signed_at)}</span>
                                </div>
                                <p className="text-slate-900 whitespace-pre-wrap">{ad.content}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Signed by: {ad.author_name} ({ad.author_role})</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Addendum Modal */}
            {showAddendumModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submittingAddendum && setShowAddendumModal(false)} />
                    <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Append Clinical Note Addendum
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    The original finalized note remains unaltered. This entry will be appended permanently.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={submittingAddendum}
                                onClick={() => setShowAddendumModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddAddendum} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Reason for Addendum
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                >
                                    {ADDENDUM_REASONS.map((r, i) => (
                                        <option key={i} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Author Full Name
                                </label>
                                <input
                                    type="text"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    placeholder="e.g. Dr. Jane Smith, RMT"
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Addendum Content / Notes
                                </label>
                                <textarea
                                    rows={5}
                                    value={addendumContent}
                                    onChange={(e) => setAddendumContent(e.target.value)}
                                    placeholder="Enter additional clinical notes, clarifications, or corrections..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={submittingAddendum}
                                    onClick={() => setShowAddendumModal(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingAddendum}
                                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 shadow-md shadow-violet-600/25 transition disabled:opacity-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{submittingAddendum ? 'Appending...' : 'Append Signed Addendum'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
