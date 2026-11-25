import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PROVENANCE } from '@/Components/Scribe/ScribeDraft';
import ScribeSessionViewer from '@/Components/Scribe/ScribeSessionViewer';
import {
    FileText, Save, CheckCircle2, Shield, AlertTriangle, ArrowLeft,
    Clock, User, Calendar, Stethoscope, ChevronRight, Lock, Eye, EyeOff,
    Check, Sparkles, X, Info, MessageSquare, Activity, Plus, Trash2,
    BookOpen, Layers
} from 'lucide-react';

const normalizeOptions = (x) => {
    const list = Array.isArray(x)
        ? x
        : Object.entries(x ?? {}).map(([value, label]) => ({ value, label }));

    return list.map((item) => (
        item && typeof item === 'object' && 'value' in item
            ? item
            : { value: item, label: item }
    ));
};

const normalizeList = (x) => {
    if (Array.isArray(x)) return x;
    if (x && typeof x === 'object') return Object.values(x);
    return [];
};

export default function ClinicalNoteEditor({
    client,
    appointment,
    note,
    template,
    practitioner,
    referenceIntake,
    scribeHandoff = null,
    testResults: initialTestResults = [],
}) {
    const isEditingExisting = !!note?.id;
    const [noteId, setNoteId] = useState(note?.id || null);
    const [content, setContent] = useState(note?.content || {});
    const [testResults, setTestResults] = useState(initialTestResults || []);
    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [lastSavedAt, setLastSavedAt] = useState(note?.updated_at || null);
    const [showIntakeDrawer, setShowIntakeDrawer] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [showScribeViewer, setShowScribeViewer] = useState(false);

    // Test picker & detail states
    const [showTestPicker, setShowTestPicker] = useState(false);
    const [availableTests, setAvailableTests] = useState([]);
    const [loadingTests, setLoadingTests] = useState(false);
    const [pickerRegion, setPickerRegion] = useState('all');
    const [pickerSearch, setPickerSearch] = useState('');
    const [selectedTestIds, setSelectedTestIds] = useState([]);
    const [viewingTestDetail, setViewingTestDetail] = useState(null);

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

    const testResultsRef = useRef(testResults);
    testResultsRef.current = testResults;

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
                        test_results: testResultsRef.current,
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
                    test_results: testResultsRef.current,
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

    // Debounced autosave on content or test results change
    useEffect(() => {
        const timeout = setTimeout(() => {
            performAutosave();
        }, 1500);

        return () => clearTimeout(timeout);
    }, [content, testResults]);

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
                    test_results: testResults,
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
            test_results: testResults,
        }, {
            onError: (errs) => {
                setFinalizeErrors(errs);
                setFinalizing(false);
            },
        });
    };

    const PICKER_REGIONS = [
        { value: 'all', label: 'All Regions' },
        { value: 'shoulder', label: 'Shoulder' },
        { value: 'elbow', label: 'Elbow' },
        { value: 'wrist_hand', label: 'Wrist & Hand' },
        { value: 'cervical', label: 'Cervical' },
        { value: 'thoracic', label: 'Thoracic' },
        { value: 'lumbar', label: 'Lumbar' },
        { value: 'hip', label: 'Hip' },
        { value: 'knee', label: 'Knee' },
        { value: 'ankle_foot', label: 'Ankle & Foot' },
        { value: 'other', label: 'Other' },
    ];

    const openTestPicker = async () => {
        setShowTestPicker(true);
        setSelectedTestIds([]);
        setPickerRegion('all');
        setPickerSearch('');
        if (availableTests.length === 0) {
            setLoadingTests(true);
            try {
                const res = await fetch('/app/tests/lookup');
                const data = await res.json();
                const list = Array.isArray(data)
                    ? data
                    : (Array.isArray(data?.data) ? data.data : Object.values(data ?? {}));
                setAvailableTests(list);
            } catch {
                setAvailableTests([]);
            } finally {
                setLoadingTests(false);
            }
        }
    };

    const handleTogglePickerTest = (testId) => {
        setSelectedTestIds((prev) =>
            prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
        );
    };

    const handleAddSelectedTests = () => {
        const safeTests = Array.isArray(availableTests)
            ? availableTests
            : (Array.isArray(availableTests?.data) ? availableTests.data : Object.values(availableTests ?? {}));
        const toAdd = safeTests.filter((t) => selectedTestIds.includes(t.id));
        const newItems = toAdd.map((test) => ({
            assessment_test_id: test.id,
            test_name_snapshot: test.name,
            body_region_snapshot: test.body_region,
            side: 'bilateral',
            result: 'negative',
            pain_reproduced: false,
            notes: '',
            assessment_test: test,
        }));
        setTestResults((prev) => [...prev, ...newItems]);
        setShowTestPicker(false);
        setSelectedTestIds([]);
    };

    const handleUpdateTestResult = (index, updates) => {
        setTestResults((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    const handleRemoveTestResult = (index) => {
        setTestResults((prev) => prev.filter((_, i) => i !== index));
    };

    const safeTestResults = normalizeList(testResults);
    const positiveTests = safeTestResults.filter((t) => t.result === 'positive');

    const safeAvailableTests = Array.isArray(availableTests)
        ? availableTests
        : (Array.isArray(availableTests?.data) ? availableTests.data : Object.values(availableTests ?? {}));

    const filteredPickerTests = safeAvailableTests.filter((t) => {
        if (pickerRegion !== 'all' && t.body_region !== pickerRegion) return false;
        if (pickerSearch.trim()) {
            const q = pickerSearch.toLowerCase();
            const matchName = t.name?.toLowerCase().includes(q);
            const matchPurpose = t.purpose?.toLowerCase().includes(q);
            const tAliases = normalizeList(t.aliases);
            const matchAliases = tAliases.some((a) => typeof a === 'string' && a.toLowerCase().includes(q));
            if (!matchName && !matchPurpose && !matchAliases) return false;
        }
        return true;
    });

    const hasObjectiveSection = (schema.sections || []).some((sec) =>
        sec.title?.toLowerCase().includes('objective')
    );

    const renderTestsSection = () => (
        <div className="bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 mt-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Tests Performed & Clinical Maneuvers
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                        {safeTestResults.length} {safeTestResults.length === 1 ? 'test' : 'tests'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={openTestPicker}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tests</span>
                </button>
            </div>

            {/* Positive Tests Summary Alert */}
            {positiveTests.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold text-xs block">
                            {positiveTests.length} Positive {positiveTests.length === 1 ? 'Test' : 'Tests'}:
                        </span>
                        <span className="text-xs font-medium">
                            {positiveTests
                                .map(
                                    (t) =>
                                        `${t.test_name_snapshot || t.test_name || 'Test'}${
                                            t.side && t.side !== 'n/a' ? ` (${t.side})` : ''
                                        }`
                                )
                                .join(', ')}
                        </span>
                    </div>
                </div>
            ) : testResults.length > 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All {testResults.length} documented assessment tests are negative.</span>
                </div>
            ) : (
                <div className="p-5 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <Activity className="w-5 h-5 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        No orthopedic or assessment tests recorded.
                    </p>
                    <p className="text-[11px] text-slate-400">
                        Select tests from the clinical library to record sides, results, and pain reproduction.
                    </p>
                </div>
            )}

            {/* Documented Test Cards */}
            {safeTestResults.length > 0 && (
                <div className="space-y-3 pt-1">
                    {safeTestResults.map((t, idx) => (
                        <div
                            key={t.id || idx}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                        >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {t.test_name_snapshot || t.test_name || 'Assessment Test'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                                        {t.body_region_snapshot ? t.body_region_snapshot.replace('_', ' / ') : 'Other'}
                                    </span>
                                    {t.assessment_test && (
                                        <button
                                            type="button"
                                            onClick={() => setViewingTestDetail(t.assessment_test)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                                        >
                                            <BookOpen className="w-3 h-3" />
                                            <span>Criteria</span>
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTestResult(idx)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                                    title="Remove test"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                {/* Side Selector */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Side
                                    </label>
                                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        {[
                                            { val: 'left', label: 'Left' },
                                            { val: 'right', label: 'Right' },
                                            { val: 'bilateral', label: 'Bi' },
                                            { val: 'n/a', label: 'N/A' },
                                        ].map((s) => (
                                            <button
                                                key={s.val}
                                                type="button"
                                                onClick={() => handleUpdateTestResult(idx, { side: s.val })}
                                                className={`flex-1 py-1 text-[11px] font-semibold transition ${
                                                    t.side === s.val
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                }`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Result Selector */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Result
                                    </label>
                                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        {[
                                            { val: 'positive', label: 'Pos (+)', activeCls: 'bg-rose-600 text-white' },
                                            { val: 'negative', label: 'Neg (-)', activeCls: 'bg-emerald-600 text-white' },
                                            { val: 'inconclusive', label: 'Inc', activeCls: 'bg-amber-600 text-white' },
                                            { val: 'not_tested', label: 'N/T', activeCls: 'bg-slate-600 text-white' },
                                        ].map((r) => (
                                            <button
                                                key={r.val}
                                                type="button"
                                                onClick={() =>
                                                    handleUpdateTestResult(idx, {
                                                        result: r.val,
                                                        pain_reproduced: r.val === 'positive' ? true : t.pain_reproduced,
                                                    })
                                                }
                                                className={`flex-1 py-1 text-[11px] font-semibold transition ${
                                                    t.result === r.val
                                                        ? r.activeCls
                                                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                }`}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pain Provoked Toggle */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Pain Provoked
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdateTestResult(idx, {
                                                pain_reproduced: !t.pain_reproduced,
                                            })
                                        }
                                        className={`w-full py-1 px-2.5 rounded-lg text-[11px] font-semibold border transition text-center ${
                                            t.pain_reproduced
                                                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                                        }`}
                                    >
                                        {t.pain_reproduced ? '⚡ Pain Provoked (+)' : 'No Pain / Non-tender'}
                                    </button>
                                </div>
                            </div>

                            {/* Clinical Observations / Notes */}
                            <div>
                                <input
                                    type="text"
                                    value={t.notes || ''}
                                    onChange={(e) => handleUpdateTestResult(idx, { notes: e.target.value })}
                                    placeholder="Clinical notes / symptom reproduction (e.g. sharp anterolateral shoulder pain at 80° abduction)..."
                                    className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

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
                                <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
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
                        {/* View Scribe Session */}
                        {scribeHandoff?.session_id && (
                            <button
                                type="button"
                                onClick={() => setShowScribeViewer(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-xs transition"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>View original conversation</span>
                            </button>
                        )}

                        {/* Reference Intake Toggle */}
                        {referenceIntake && (
                            <button
                                type="button"
                                onClick={() => setShowIntakeDrawer(!showIntakeDrawer)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${showIntakeDrawer
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
                        {scribeHandoff && (
                            <div role="status" className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200">
                                <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                <div className="text-xs leading-relaxed flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                                        <p className="font-bold text-sm">Pre-filled from AI Scribe — review every field before signing</p>
                                        {scribeHandoff.session_id && (
                                            <button
                                                type="button"
                                                onClick={() => setShowScribeViewer(true)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600/15 hover:bg-amber-600/25 text-amber-950 dark:text-amber-100 text-xs font-bold border border-amber-500/30 transition shrink-0"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>View original conversation</span>
                                            </button>
                                        )}
                                    </div>
                                    <p>
                                        {Object.keys(scribeHandoff.fields || {}).length} field(s) were filled from the AI draft and are labelled below with where they came from.
                                        Fields marked <strong>AI wrote</strong> are the AI's own wording or interpretation — check them most carefully.
                                        {scribeHandoff.skipped?.length > 0 && ` ${scribeHandoff.skipped.length} field(s) you had already written were left unchanged.`}
                                    </p>
                                    {scribeHandoff.is_consent_withdrawn && (
                                        <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
                                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                            <span>Transcript hidden because the client withdrew consent</span>
                                        </div>
                                    )}
                                    {scribeHandoff.is_translated && !scribeHandoff.is_consent_withdrawn && (
                                        <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center gap-2 text-amber-950 dark:text-amber-100 font-bold">
                                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <span>This note was translated from {scribeHandoff.source_language_label || 'Mandarin (Chinese)'} by AI — please verify before signing.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                                    {scribeHandoff?.fields?.[field.id] && (
                                                        <div className="flex flex-wrap items-center justify-end gap-1" title="Pre-filled from the AI Scribe draft">
                                                            {scribeHandoff.fields[field.id].map((key) => {
                                                                const p = PROVENANCE[key] || PROVENANCE.ai_generated;
                                                                const Icon = p.icon;
                                                                return (
                                                                    <span key={key} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${p.className}`}>
                                                                        <Icon className="w-3 h-3" /> {p.label}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
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
                                                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${val === opt
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
                                                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${selected
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
                                {sec.title?.toLowerCase().includes('objective') && renderTestsSection()}
                            </div>
                        ))}
                        {!hasObjectiveSection && renderTestsSection()}
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
            {/* Read-Only Scribe Session Viewer */}
            {showScribeViewer && scribeHandoff?.session_id && (
                <ScribeSessionViewer
                    sessionId={scribeHandoff.session_id}
                    isOpen={showScribeViewer}
                    onClose={() => setShowScribeViewer(false)}
                />
            )}

            {/* Test Picker Modal */}
            {showTestPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTestPicker(false)} />
                    <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 z-10 text-xs">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Clinical Assessment Test Picker
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Select tests to add to your clinical documentation
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTestPicker(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Region Filter */}
                        <div className="py-3 space-y-3 border-b border-slate-100 dark:border-slate-800">
                            <input
                                type="text"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                                placeholder="Search test by name, alias, or purpose (e.g. Neer, Lachman, Spurling)..."
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                                {normalizeOptions(PICKER_REGIONS).map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setPickerRegion(r.value)}
                                        className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition ${
                                            pickerRegion === r.value
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Test List */}
                        <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[45vh]">
                            {loadingTests ? (
                                <div className="p-8 text-center text-slate-400">Loading assessment library...</div>
                            ) : filteredPickerTests.length > 0 ? (
                                filteredPickerTests.map((t) => {
                                    const isSelected = selectedTestIds.includes(t.id);
                                    return (
                                        <div
                                            key={t.id}
                                            className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-400 dark:border-violet-700'
                                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                            }`}
                                        >
                                            <label className="flex items-start gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleTogglePickerTest(t.id)}
                                                    className="mt-1 rounded text-violet-600 focus:ring-violet-500"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {t.name}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                                                            {t.body_region?.replace('_', ' / ')}
                                                        </span>
                                                    </div>
                                                    {normalizeList(t.aliases).length > 0 && (
                                                        <p className="text-[10px] text-slate-400">
                                                            Also: {normalizeList(t.aliases).join(', ')}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                                        {t.purpose}
                                                    </p>
                                                </div>
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() => setViewingTestDetail(t)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                                                title="View procedure and criteria"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : safeAvailableTests.length === 0 ? (
                                <div className="p-8 text-center space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            The UMAHZ test library is being prepared. You can add your own clinic tests now.
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            Create custom tests for your clinic to document them inside clinical notes.
                                        </p>
                                    </div>
                                    <a
                                        href="/app/tests"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add clinic test</span>
                                    </a>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-500">
                                    No assessment tests matched your search.
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                            <span className="text-xs text-slate-500 font-semibold">
                                {selectedTestIds.length} {selectedTestIds.length === 1 ? 'test' : 'tests'} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTestPicker(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedTestIds.length === 0}
                                    onClick={handleAddSelectedTests}
                                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition disabled:opacity-50"
                                >
                                    Add Selected Tests ({selectedTestIds.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Test Detail Modal */}
            {viewingTestDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingTestDetail(null)} />
                    <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-3.5 z-10 text-xs">
                        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400">
                                    {viewingTestDetail.body_region?.replace('_', ' / ')}
                                </span>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                    {viewingTestDetail.name}
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingTestDetail(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <h5 className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                                    Purpose
                                </h5>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {viewingTestDetail.purpose || 'N/A'}
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <h5 className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                                    Procedure Steps
                                </h5>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {viewingTestDetail.procedure || 'N/A'}
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                                <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] uppercase tracking-wider mb-1">
                                    Positive Finding Criteria
                                </h5>
                                <p className="leading-relaxed">
                                    {viewingTestDetail.positive_finding || 'N/A'}
                                </p>
                            </div>

                            {viewingTestDetail.interpretation_notes && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <h5 className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                                        Clinical Interpretation
                                    </h5>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {viewingTestDetail.interpretation_notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setViewingTestDetail(null)}
                                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
