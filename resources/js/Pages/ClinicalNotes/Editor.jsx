import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    FileText, Save, CheckCircle2, Shield, AlertTriangle, ArrowLeft,
    Clock, User, Calendar, Stethoscope, ChevronRight, Lock, Eye, EyeOff,
    Check, Sparkles, X, Info
} from 'lucide-react';

export default function ClinicalNoteEditor({
    client,
    appointment,
    note,
    template,
    practitioner,
    referenceIntake,
}) {
    const isEditingExisting = !!note?.id;
    const [noteId, setNoteId] = useState(note?.id || null);
    const [content, setContent] = useState(note?.content || {});
    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [lastSavedAt, setLastSavedAt] = useState(note?.updated_at || null);
    const [showIntakeDrawer, setShowIntakeDrawer] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);

    // Finalization form state
    const [signerName, setSignerName] = useState(practitioner?.name || '');
    const [signerCredentials, setSignerCredentials] = useState(practitioner?.credentials || '');
    const [attestationAgreed, setAttestationAgreed] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [finalizeErrors, setFinalizeErrors] = useState({});

    const schema = template?.schema || { sections: [] };

    // Update field in state
    const handleFieldChange = (fieldId, value) => {
        setContent((prev) => ({
            ...prev,
            [fieldId]: value,
        }));
    };

    // Autosave timer
    const contentRef = useRef(content);
    contentRef.current = content;

    const performAutosave = async () => {
        if (!noteId) {
            // First save initializes the draft note
            try {
                setAutosaveStatus('saving');
                const res = await fetch(`/app/clients/${client.id}/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        appointment_id: appointment?.id || null,
                        clinical_note_template_id: template.id,
                        content: contentRef.current,
                    }),
                });
                const data = await res.json();
                if (data.success && data.note_id) {
                    setNoteId(data.note_id);
                    setAutosaveStatus('saved');
                    setLastSavedAt(new Date().toISOString());
                    // Replace browser URL without full reload
                    window.history.replaceState({}, '', `/app/notes/${data.note_id}/edit`);
                } else {
                    setAutosaveStatus('error');
                }
            } catch {
                setAutosaveStatus('error');
            }
            return;
        }

        try {
            setAutosaveStatus('saving');
            const res = await fetch(`/app/notes/${noteId}/autosave`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    content: contentRef.current,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setAutosaveStatus('saved');
                setLastSavedAt(data.updated_at || new Date().toISOString());
            } else {
                setAutosaveStatus('error');
            }
        } catch {
            setAutosaveStatus('error');
        }
    };

    // Debounced autosave on content change
    useEffect(() => {
        const timeout = setTimeout(() => {
            performAutosave();
        }, 1500);

        return () => clearTimeout(timeout);
    }, [content]);

    const handleFinalize = async (e) => {
        e.preventDefault();
        if (!attestationAgreed) {
            setFinalizeErrors({ attestation: 'You must check the attestation box to sign.' });
            return;
        }

        setFinalizing(true);
        setFinalizeErrors({});

        // Ensure note is saved first
        let targetNoteId = noteId;
        if (!targetNoteId) {
            const initRes = await fetch(`/app/clients/${client.id}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    appointment_id: appointment?.id || null,
                    clinical_note_template_id: template.id,
                    content,
                }),
            });
            const initData = await initRes.json();
            targetNoteId = initData.note_id;
        }

        router.post(`/app/notes/${targetNoteId}/finalize`, {
            signer_name: signerName,
            signer_credentials: signerCredentials,
            attestation_text: 'I attest that the clinical documentation recorded above accurately reflects the assessment, treatment, and clinical observations conducted during this patient encounter.',
            content,
        }, {
            onError: (errs) => {
                setFinalizeErrors(errs);
                setFinalizing(false);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Clinical Note — ${client.name}`} />

            <div className="max-w-5xl mx-auto space-y-6 pb-16">
                {/* Back Link & Header */}
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
                                    {template?.name || 'Clinical Encounter Note'}
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Draft
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
                        {/* Reference Intake Toggle */}
                        {referenceIntake && (
                            <button
                                type="button"
                                onClick={() => setShowIntakeDrawer(!showIntakeDrawer)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                                    showIntakeDrawer
                                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5 text-violet-500" />
                                <span>{showIntakeDrawer ? 'Hide Intake Form' : 'Reference Intake'}</span>
                            </button>
                        )}

                        {/* Finalize Button */}
                        <button
                            type="button"
                            onClick={() => setShowFinalizeModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sign & Finalize</span>
                        </button>
                    </div>
                </div>

                {/* Encounter Context Metadata Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-xs">
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Encounter Service</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                            {appointment?.service_name || 'In-Person Consultation'}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Encounter Date</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {appointment?.starts_at ? new Date(appointment.starts_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString()}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Practitioner</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {practitioner?.name} {practitioner?.credentials && `(${practitioner.credentials})`}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Health Discipline</span>
                        <span className="font-bold text-violet-700 dark:text-violet-400">
                            {practitioner?.discipline_label}
                        </span>
                    </div>
                </div>

                {/* Main Content Layout with Optional Intake Reference Drawer */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Note Sections & Form Fields */}
                    <div className={`${showIntakeDrawer ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5 transition-all duration-200`}>
                        {(schema.sections || []).map((sec, sIdx) => (
                            <div
                                key={sec.id || sIdx}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
                            >
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {sec.title}
                                    </h2>
                                    {sec.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {sec.description}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {(sec.fields || []).map((field) => {
                                        const val = content[field.id] ?? '';
                                        return (
                                            <div key={field.id} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        {field.label}
                                                        {field.required && <span className="text-rose-500 ml-1">*</span>}
                                                    </label>
                                                </div>

                                                {field.type === 'long_text' && (
                                                    <textarea
                                                        rows={4}
                                                        value={val}
                                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder || 'Enter notes...'}
                                                        className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed font-sans"
                                                    />
                                                )}

                                                {field.type === 'short_text' && (
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder || ''}
                                                        className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    />
                                                )}

                                                {field.type === 'select' && (
                                                    <select
                                                        value={val}
                                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                        className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    >
                                                        <option value="">— Select an option —</option>
                                                        {(field.options || []).map((opt, oIdx) => (
                                                            <option key={oIdx} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                {field.type === 'radio' && (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {(field.options || []).map((opt, oIdx) => (
                                                            <label
                                                                key={oIdx}
                                                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                                                                    val === opt
                                                                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-500'
                                                                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`radio_${field.id}`}
                                                                    checked={val === opt}
                                                                    onChange={() => handleFieldChange(field.id, opt)}
                                                                    className="sr-only"
                                                                />
                                                                <span>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {field.type === 'multiselect' && (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {(field.options || []).map((opt, oIdx) => {
                                                            const selected = Array.isArray(val) && val.includes(opt);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={oIdx}
                                                                    onClick={() => {
                                                                        const cur = Array.isArray(val) ? [...val] : [];
                                                                        const next = selected ? cur.filter((x) => x !== opt) : [...cur, opt];
                                                                        handleFieldChange(field.id, next);
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                                                        selected
                                                                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                                                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reference Intake Drawer (Read-Only) */}
                    {showIntakeDrawer && referenceIntake && (
                        <div className="lg:col-span-5 sticky top-6 bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-violet-900/60 p-5 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2 text-violet-900 dark:text-violet-200 font-bold text-xs">
                                    <FileText className="w-4 h-4 text-violet-600" />
                                    <span>Patient Submitted Health Intake</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowIntakeDrawer(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Contraindication Flags */}
                            {referenceIntake.flags && referenceIntake.flags.length > 0 && (
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 text-[11px]">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Patient Flagged Contraindications ({referenceIntake.flags.length})</span>
                                    </div>
                                    {referenceIntake.flags.map((flag, idx) => (
                                        <div key={idx} className="p-2 rounded bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 text-[11px]">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{flag.question}</p>
                                            <p className="text-rose-600 font-bold mt-0.5">⚠️ {flag.warning}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Intake Form Responses */}
                            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 text-xs">
                                {(referenceIntake.schema?.sections || []).map((sec, sIdx) => (
                                    <div key={sIdx} className="space-y-2">
                                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                                            {sec.title}
                                        </h4>
                                        <dl className="space-y-2">
                                            {(sec.fields || []).map((f) => {
                                                const aVal = referenceIntake.responses?.[f.id];
                                                return (
                                                    <div key={f.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 text-[11px]">
                                                        <dt className="text-slate-500 font-medium">{f.label}</dt>
                                                        <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                            {typeof aVal === 'object' && aVal?.type === 'image' ? (
                                                                <span className="text-violet-600">Attached Photo ({aVal.original_name})</span>
                                                            ) : aVal !== undefined && aVal !== null && String(aVal).trim().length > 0 ? (
                                                                String(aVal)
                                                            ) : (
                                                                <span className="text-slate-400 italic">Not answered</span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                );
                                            })}
                                        </dl>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Bottom Autosave & Actions Bar */}
                <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div className="flex items-center gap-2 text-xs">
                        {autosaveStatus === 'saving' && (
                            <span className="flex items-center gap-1.5 text-slate-500">
                                <Clock className="w-3.5 h-3.5 animate-spin text-violet-500" />
                                <span>Saving draft...</span>
                            </span>
                        )}
                        {autosaveStatus === 'saved' && (
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Draft autosaved ({new Date(lastSavedAt).toLocaleTimeString()})</span>
                            </span>
                        )}
                        {autosaveStatus === 'error' && (
                            <span className="flex items-center gap-1.5 text-rose-500">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Autosave failed — check connection</span>
                            </span>
                        )}
                        {autosaveStatus === 'idle' && (
                            <span className="text-slate-400">
                                Draft ready • Autosaves continuously
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={performAutosave}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition"
                        >
                            Save Draft Now
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFinalizeModal(true)}
                            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-600/25 transition"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sign & Finalize Note</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Finalize & Sign Modal */}
            {showFinalizeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !finalizing && setShowFinalizeModal(false)} />
                    <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5 z-10">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Finalize & Sign Clinical Encounter
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Legal electronic attestation & permanent record locking
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={finalizing}
                                onClick={() => setShowFinalizeModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Immutability Warning */}
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span>Permanent & Immutable Healthcare Record</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">
                                Once finalized, this note will be locked and cannot be edited or deleted. Any future modifications must be made via signed addenda.
                            </p>
                        </div>

                        <form onSubmit={handleFinalize} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Practitioner Legal Full Name
                                </label>
                                <input
                                    type="text"
                                    value={signerName}
                                    onChange={(e) => setSignerName(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Professional Credentials / Registration Number
                                </label>
                                <input
                                    type="text"
                                    value={signerCredentials}
                                    onChange={(e) => setSignerCredentials(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="e.g. RMT #12345, L.Ac, CSCS"
                                />
                            </div>

                            {/* Attestation Checkbox */}
                            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={attestationAgreed}
                                        onChange={(e) => setAttestationAgreed(e.target.checked)}
                                        className="mt-0.5 rounded text-violet-600 focus:ring-violet-500"
                                        required
                                    />
                                    <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                                        I attest that the clinical documentation recorded above accurately reflects the assessment, treatment, and clinical observations conducted during this patient encounter.
                                    </span>
                                </label>
                                {finalizeErrors.attestation && (
                                    <p className="text-[11px] text-rose-500 font-semibold">{finalizeErrors.attestation}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={finalizing}
                                    onClick={() => setShowFinalizeModal(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={finalizing || !attestationAgreed}
                                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 shadow-md shadow-violet-600/25 transition disabled:opacity-50"
                                >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>{finalizing ? 'Signing & Locking...' : 'Attest & Lock Record'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
