import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ScribeSessionViewer from '@/Components/Scribe/ScribeSessionViewer';
import {
    FileText, Printer, ArrowLeft, ShieldCheck, Clock, UserCheck,
    Plus, AlertTriangle, Building2, Calendar, Lock, CheckCircle2,
    Layers, Stethoscope, ChevronRight, X, MessageSquare, Sparkles, Activity
} from 'lucide-react';

const ADDENDUM_REASONS = [
    'Late entry',
    'Treatment clarification',
    'Correction of record',
    'Additional clinical observation',
    'Patient follow-up update',
    'Administrative note',
];

export default function ClinicalNoteShow({ client, appointment, note, clinic, scribeHandoff = null, testResults = [] }) {
    const [showAddendumModal, setShowAddendumModal] = useState(false);
    const [showScribeViewer, setShowScribeViewer] = useState(false);
    const [reason, setReason] = useState(ADDENDUM_REASONS[0]);
    const [authorName, setAuthorName] = useState('');
    const [addendumContent, setAddendumContent] = useState('');
    const [submittingAddendum, setSubmittingAddendum] = useState(false);

    // Addendum test results state
    const [addendumTests, setAddendumTests] = useState([]);
    const [availableLookupTests, setAvailableLookupTests] = useState([]);
    const [loadingLookupTests, setLoadingLookupTests] = useState(false);
    const [showPickerForAddendum, setShowPickerForAddendum] = useState(false);
    const [addendumSearch, setAddendumSearch] = useState('');

    const isFinalized = note.status === 'finalized' || note.status === 'addended';
    const schema = note.schema || { sections: [] };
    const content = note.content || {};
    const addenda = note.addenda || [];

    const handlePrint = () => {
        window.print();
    };

    const openAddendumModal = () => {
        setReason(ADDENDUM_REASONS[0]);
        setAddendumContent('');
        setAddendumTests([]);
        setShowAddendumModal(true);
    };

    const fetchLookupTests = async () => {
        if (availableLookupTests.length > 0) return;
        setLoadingLookupTests(true);
        try {
            const res = await fetch('/app/tests/lookup');
            const data = await res.json();
            setAvailableLookupTests(Array.isArray(data) ? data : []);
        } catch {
            setAvailableLookupTests([]);
        } finally {
            setLoadingLookupTests(false);
        }
    };

    const handleAddTestToAddendum = (test) => {
        setAddendumTests((prev) => [
            ...prev,
            {
                assessment_test_id: test.id,
                test_name_snapshot: test.name,
                body_region_snapshot: test.body_region,
                side: 'bilateral',
                result: 'negative',
                pain_reproduced: false,
                notes: '',
            },
        ]);
        setShowPickerForAddendum(false);
    };

    const handleRemoveAddendumTest = (index) => {
        setAddendumTests((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateAddendumTest = (index, updates) => {
        setAddendumTests((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    const handleAddAddendum = (e) => {
        e.preventDefault();
        setSubmittingAddendum(true);
        router.post(`/app/notes/${note.id}/addenda`, {
            reason,
            author_name: authorName,
            content: addendumContent,
            test_results: addendumTests,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSubmittingAddendum(false);
                setShowAddendumModal(false);
                setAddendumContent('');
                setAddendumTests([]);
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
                                <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
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
                        {(note.scribe_session_id || scribeHandoff?.session_id) && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowScribeViewer(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-xs transition"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                                    <span>View original conversation</span>
                                </button>
                                {(note.is_scribe_consent_withdrawn || scribeHandoff?.is_consent_withdrawn) && (
                                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                        Consent withdrawn
                                    </span>
                                )}
                            </div>
                        )}

                        {isFinalized && (
                            <button
                                type="button"
                                onClick={openAddendumModal}
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

                {/* Clinical Assessment Tests Performed (Screen View) */}
                {note.can_view_body && testResults && testResults.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Clinical Assessment & Special Tests ({testResults.length})
                                </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">
                                {testResults.filter((t) => t.result === 'positive').length} Positive
                            </span>
                        </div>

                        {/* Positive summary banner */}
                        {testResults.some((t) => t.result === 'positive') ? (
                            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-xs block">
                                        {testResults.filter((t) => t.result === 'positive').length} Positive {testResults.filter((t) => t.result === 'positive').length === 1 ? 'Test' : 'Tests'} Recorded:
                                    </span>
                                    <span className="text-xs font-medium">
                                        {testResults
                                            .filter((t) => t.result === 'positive')
                                            .map(
                                                (t) =>
                                                    `${t.test_name_snapshot}${
                                                        t.side_label && t.side !== 'n/a' ? ` (${t.side_label})` : ''
                                                    }`
                                            )
                                            .join(', ')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>All {testResults.length} documented tests were negative / non-provocative.</span>
                            </div>
                        )}

                        {/* Tests Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold">Test Name</th>
                                        <th className="py-2.5 px-3 font-semibold">Region</th>
                                        <th className="py-2.5 px-3 font-semibold">Side</th>
                                        <th className="py-2.5 px-3 font-semibold">Result</th>
                                        <th className="py-2.5 px-3 font-semibold">Pain Provoked</th>
                                        <th className="py-2.5 px-3 font-semibold">Notes / Observations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {testResults.map((t, idx) => (
                                        <tr key={t.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                                {t.test_name_snapshot}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 capitalize">
                                                {t.body_region_label || (t.body_region_snapshot ? t.body_region_snapshot.replace('_', ' / ') : 'Other')}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                {t.side_label || (t.side ? t.side.toUpperCase() : 'N/A')}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        t.result === 'positive'
                                                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                            : t.result === 'negative'
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : t.result === 'inconclusive'
                                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {t.result_label || t.result}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                {t.pain_reproduced === true ? (
                                                    <span className="font-bold text-rose-600 dark:text-rose-400">Yes (+)</span>
                                                ) : t.pain_reproduced === false ? (
                                                    <span className="text-slate-400">No (-)</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                                                {t.notes || <span className="text-slate-400 italic">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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

                                {ad.test_results && ad.test_results.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Amended / Additional Test Results ({ad.test_results.length})
                                        </div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-slate-950">
                                                        <th className="py-2 px-3">Test</th>
                                                        <th className="py-2 px-3">Region</th>
                                                        <th className="py-2 px-3">Side</th>
                                                        <th className="py-2 px-3">Result</th>
                                                        <th className="py-2 px-3">Pain Provoked</th>
                                                        <th className="py-2 px-3">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                                                    {ad.test_results.map((t, tIdx) => (
                                                        <tr key={t.id || tIdx}>
                                                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{t.test_name_snapshot}</td>
                                                            <td className="py-2 px-3 capitalize text-slate-500">{t.body_region_snapshot?.replace('_', ' ')}</td>
                                                            <td className="py-2 px-3 uppercase text-slate-700 dark:text-slate-300 font-medium">{t.side}</td>
                                                            <td className="py-2 px-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                    t.result === 'positive'
                                                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                                        : t.result === 'negative'
                                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                }`}>
                                                                    {t.result}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{t.pain_reproduced ? 'Yes (+)' : 'No (-)'}</td>
                                                            <td className="py-2 px-3 text-slate-500">{t.notes || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

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

                {/* Assessment & Special Tests on Print */}
                {testResults && testResults.length > 0 && (
                    <div className="border border-slate-300 rounded-lg p-4 mt-6 print-avoid-break bg-white">
                        <div className="flex justify-between items-center border-b border-slate-300 pb-1.5 mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                Clinical Assessment & Special Tests ({testResults.length})
                            </h2>
                            {testResults.some((t) => t.result === 'positive') && (
                                <span className="text-[10px] font-bold text-slate-900 uppercase">
                                    * Positive Tests Recorded
                                </span>
                            )}
                        </div>

                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600 bg-slate-50">
                                    <th className="py-1.5 px-2">Test Name</th>
                                    <th className="py-1.5 px-2">Body Region</th>
                                    <th className="py-1.5 px-2">Side</th>
                                    <th className="py-1.5 px-2">Result</th>
                                    <th className="py-1.5 px-2">Pain Provoked</th>
                                    <th className="py-1.5 px-2">Clinical Findings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {testResults.map((t, idx) => (
                                    <tr
                                        key={t.id || idx}
                                        className={t.result === 'positive' ? 'bg-slate-50/70 font-semibold' : ''}
                                    >
                                        <td className="py-1.5 px-2 font-bold text-slate-900">
                                            {t.test_name_snapshot}
                                        </td>
                                        <td className="py-1.5 px-2 capitalize text-slate-600">
                                            {t.body_region_label || (t.body_region_snapshot ? t.body_region_snapshot.replace('_', ' / ') : 'Other')}
                                        </td>
                                        <td className="py-1.5 px-2 text-slate-800">
                                            {t.side_label || (t.side ? t.side.toUpperCase() : 'N/A')}
                                        </td>
                                        <td className="py-1.5 px-2">
                                            <span
                                                className={
                                                    t.result === 'positive'
                                                        ? 'font-bold uppercase text-slate-900'
                                                        : 'text-slate-700'
                                                }
                                            >
                                                {t.result_label || t.result}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-slate-800">
                                            {t.pain_reproduced === true
                                                ? 'Yes (+)'
                                                : t.pain_reproduced === false
                                                ? 'No (-)'
                                                : '—'}
                                        </td>
                                        <td className="py-1.5 px-2 text-slate-700">
                                            {t.notes || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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
                            <div key={idx} className="border border-slate-200 rounded p-3 text-xs bg-slate-50 print-avoid-break space-y-2">
                                <div className="flex justify-between font-bold text-slate-800 mb-1">
                                    <span>Addendum #{idx + 1} — Reason: {ad.reason}</span>
                                    <span>{formatDate(ad.signed_at)}</span>
                                </div>
                                <p className="text-slate-900 whitespace-pre-wrap">{ad.content}</p>
                                {ad.test_results && ad.test_results.length > 0 && (
                                    <div className="pt-2">
                                        <span className="font-bold text-[10px] uppercase text-slate-600 block mb-1">
                                            Additional / Amended Test Results ({ad.test_results.length}):
                                        </span>
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500">
                                                    <th className="py-1 px-1">Test Name</th>
                                                    <th className="py-1 px-1">Side</th>
                                                    <th className="py-1 px-1">Result</th>
                                                    <th className="py-1 px-1">Pain Provoked</th>
                                                    <th className="py-1 px-1">Findings / Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {ad.test_results.map((t, tIdx) => (
                                                    <tr key={t.id || tIdx}>
                                                        <td className="py-1 px-1 font-semibold">{t.test_name_snapshot}</td>
                                                        <td className="py-1 px-1 capitalize">{t.side}</td>
                                                        <td className="py-1 px-1 uppercase font-bold">{t.result}</td>
                                                        <td className="py-1 px-1">{t.pain_reproduced ? 'Yes (+)' : 'No (-)'}</td>
                                                        <td className="py-1 px-1">{t.notes || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 z-10">
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
                                    rows={4}
                                    value={addendumContent}
                                    onChange={(e) => setAddendumContent(e.target.value)}
                                    placeholder="Enter additional clinical notes, clarifications, or corrections..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                                    required
                                />
                            </div>

                            {/* Additional Tests to Record with Addendum */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300">
                                            Assessment Tests (Optional)
                                        </label>
                                        <p className="text-[11px] text-slate-500">
                                            Append orthopedic or special test results to this addendum without modifying original results.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fetchLookupTests();
                                            setShowPickerForAddendum(!showPickerForAddendum);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50 font-semibold text-xs flex items-center gap-1.5 transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>{showPickerForAddendum ? 'Close Test Picker' : 'Add Test'}</span>
                                    </button>
                                </div>

                                {showPickerForAddendum && (
                                    <div className="p-3 rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/20 space-y-2">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                                            Select Test to Add
                                        </div>
                                        <input
                                            type="text"
                                            value={addendumSearch}
                                            onChange={(e) => setAddendumSearch(e.target.value)}
                                            placeholder="Search test by name..."
                                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                        />
                                        {loadingLookupTests ? (
                                            <p className="text-xs text-slate-400 py-2">Loading library tests...</p>
                                        ) : availableLookupTests.length === 0 ? (
                                            <p className="text-xs text-slate-500 py-1">No reviewed or clinic tests available in library.</p>
                                        ) : (
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {availableLookupTests
                                                    .filter((t) => !addendumSearch || t.name.toLowerCase().includes(addendumSearch.toLowerCase()))
                                                    .slice(0, 20)
                                                    .map((t) => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => handleAddTestToAddendum(t)}
                                                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-white dark:hover:bg-slate-800 flex items-center justify-between transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                        >
                                                            <span className="font-semibold text-slate-900 dark:text-white">{t.name}</span>
                                                            <span className="text-[10px] text-slate-400 capitalize">{t.body_region?.replace('_', ' ')}</span>
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {addendumTests.length > 0 && (
                                    <div className="space-y-3">
                                        {addendumTests.map((t, index) => (
                                            <div
                                                key={index}
                                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white">{t.test_name_snapshot}</span>
                                                        <span className="ml-2 text-[10px] text-slate-500 capitalize">({t.body_region_snapshot?.replace('_', ' ')})</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAddendumTest(index)}
                                                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Side</label>
                                                        <select
                                                            value={t.side}
                                                            onChange={(e) => handleUpdateAddendumTest(index, { side: e.target.value })}
                                                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                                                        >
                                                            <option value="bilateral">Bilateral</option>
                                                            <option value="left">Left</option>
                                                            <option value="right">Right</option>
                                                            <option value="n/a">N/A</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Result</label>
                                                        <select
                                                            value={t.result}
                                                            onChange={(e) => handleUpdateAddendumTest(index, { result: e.target.value })}
                                                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                                                        >
                                                            <option value="negative">Negative (-)</option>
                                                            <option value="positive">Positive (+)</option>
                                                            <option value="inconclusive">Inconclusive</option>
                                                            <option value="not_tested">Not Tested</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center pt-4">
                                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={t.pain_reproduced || false}
                                                                onChange={(e) => handleUpdateAddendumTest(index, { pain_reproduced: e.target.checked })}
                                                                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-3.5 h-3.5"
                                                            />
                                                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Pain Provoked</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div>
                                                    <input
                                                        type="text"
                                                        value={t.notes || ''}
                                                        onChange={(e) => handleUpdateAddendumTest(index, { notes: e.target.value })}
                                                        placeholder="Clinical findings / notes on this test..."
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
            {/* Read-Only Scribe Session Viewer */}
            {showScribeViewer && (note.scribe_session_id || scribeHandoff?.session_id) && (
                <ScribeSessionViewer
                    sessionId={note.scribe_session_id || scribeHandoff.session_id}
                    isOpen={showScribeViewer}
                    onClose={() => setShowScribeViewer(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}
