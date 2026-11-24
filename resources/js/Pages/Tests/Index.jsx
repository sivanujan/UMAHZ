import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Activity, Search, Plus, Eye, Edit3, Trash2, CheckCircle2,
    BookOpen, Layers, Filter, Check, X, ChevronRight, AlertCircle,
    Info, ShieldCheck, Sparkles, Building2
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

export default function TestsIndex({
    tests = [],
    bodyRegions = [],
    disciplines = [],
    regionCounts = {},
    filters = { region: 'all', search: '', discipline: 'all' },
    canManageCustom = false,
}) {
    const { flash } = usePage().props;

    const safeDisciplines = normalizeOptions(disciplines);
    const safeBodyRegions = normalizeOptions(bodyRegions);
    const safeTests = Array.isArray(tests)
        ? tests
        : Array.isArray(tests?.data)
            ? tests.data
            : (tests && typeof tests === 'object' ? Object.values(tests) : []);

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRegion, setSelectedRegion] = useState(filters.region || 'all');
    const [selectedDiscipline, setSelectedDiscipline] = useState(filters.discipline || 'all');

    // Detail view state
    const [viewingTest, setViewingTest] = useState(null);

    // Custom test create/edit modal
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        body_region: 'shoulder',
        aliases: '',
        purpose: '',
        procedure: '',
        positive_finding: '',
        interpretation_notes: '',
        disciplines: ['physio'],
        references: '',
    });
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Apply filters
    const applyFilters = (region, discipline, search) => {
        router.get('/app/tests', {
            region: region !== undefined ? region : selectedRegion,
            discipline: discipline !== undefined ? discipline : selectedDiscipline,
            search: search !== undefined ? search : searchTerm,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        applyFilters(selectedRegion, selectedDiscipline, searchTerm);
    };

    const handleRegionSelect = (reg) => {
        setSelectedRegion(reg);
        applyFilters(reg, selectedDiscipline, searchTerm);
    };

    const handleDisciplineSelect = (disc) => {
        setSelectedDiscipline(disc);
        applyFilters(selectedRegion, disc, searchTerm);
    };

    // Open create custom test modal
    const openCreateCustom = () => {
        setEditingTest(null);
        setFormData({
            name: '',
            body_region: selectedRegion !== 'all' ? selectedRegion : 'shoulder',
            aliases: '',
            purpose: '',
            procedure: '',
            positive_finding: '',
            interpretation_notes: '',
            disciplines: ['physio'],
            references: '',
        });
        setCustomModalOpen(true);
    };

    // Open edit custom test modal
    const openEditCustom = (test) => {
        setEditingTest(test);
        setFormData({
            name: test.name || '',
            body_region: test.body_region || 'shoulder',
            aliases: normalizeList(test.aliases).join(', '),
            purpose: test.purpose || '',
            procedure: test.procedure || '',
            positive_finding: test.positive_finding || '',
            interpretation_notes: test.interpretation_notes || '',
            disciplines: normalizeList(test.disciplines).length > 0 ? normalizeList(test.disciplines) : ['physio'],
            references: test.references || '',
        });
        setCustomModalOpen(true);
    };

    // Save custom test
    const handleSaveCustom = (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            ...formData,
            aliases: formData.aliases ? formData.aliases.split(',').map(s => s.trim()).filter(Boolean) : [],
        };

        if (editingTest) {
            router.put(`/app/tests/${editingTest.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCustomModalOpen(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        } else {
            router.post('/app/tests', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setCustomModalOpen(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        }
    };

    // Delete custom test
    const handleDeleteCustom = (test) => {
        if (!confirm(`Are you sure you want to remove your clinic's custom test "${test.name}"?`)) {
            return;
        }
        setDeletingId(test.id);
        router.delete(`/app/tests/${test.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const toggleDisciplineSelection = (val) => {
        const cur = [...formData.disciplines];
        if (cur.includes(val)) {
            if (cur.length > 1) {
                setFormData({ ...formData, disciplines: cur.filter(d => d !== val) });
            }
        } else {
            setFormData({ ...formData, disciplines: [...cur, val] });
        }
    };

    const totalVisibleTests = tests?.total ?? safeTests.length;

    return (
        <AuthenticatedLayout>
            <Head title="Clinical Assessment Test Library" />

            <div className="max-w-6xl mx-auto space-y-6 pb-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.01em] text-slate-900 dark:text-white flex items-center gap-2.5">
                                <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                <span>Clinical Assessment Test Library</span>
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                {totalVisibleTests} Available
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Evidence-informed special tests & clinical orthopedic maneuvers for assessment and documentation.
                        </p>
                    </div>

                    {canManageCustom && (
                        <button
                            type="button"
                            onClick={openCreateCustom}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition self-start sm:self-auto"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Clinic Test</span>
                        </button>
                    )}
                </div>

                {/* Alerts */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Search & Discipline Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <form onSubmit={handleSearchSubmit} className="sm:col-span-2 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by test name, aliases, or purpose (e.g. Hawkins, Lachman, Spurling)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </form>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            value={selectedDiscipline}
                            onChange={(e) => handleDisciplineSelect(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="all">All Disciplines</option>
                            {safeDisciplines.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Body Region Cards / Tabs */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-violet-500" />
                        <span>Browse by Body Area</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                        <button
                            type="button"
                            onClick={() => handleRegionSelect('all')}
                            className={`p-3 rounded-2xl border text-left transition ${
                                selectedRegion === 'all'
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <span className="block text-xs font-bold">All Body Regions</span>
                            <span className={`text-[11px] font-medium mt-0.5 block ${selectedRegion === 'all' ? 'text-violet-200' : 'text-slate-400'}`}>
                                {totalVisibleTests} tests
                            </span>
                        </button>

                        {safeBodyRegions.map((r) => {
                            const count = regionCounts[r.value] || 0;
                            const isSelected = selectedRegion === r.value;
                            return (
                                <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => handleRegionSelect(r.value)}
                                    className={`p-3 rounded-2xl border text-left transition ${
                                        isSelected
                                            ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    <span className="block text-xs font-bold">{r.label}</span>
                                    <span className={`text-[11px] font-medium mt-0.5 block ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>
                                        {count} {count === 1 ? 'test' : 'tests'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tests Grid */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Showing {tests?.total ?? safeTests.length} tests</span>
                        {selectedRegion !== 'all' && (
                            <button
                                type="button"
                                onClick={() => handleRegionSelect('all')}
                                className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                            >
                                Clear region filter
                            </button>
                        )}
                    </div>

                    {safeTests.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {safeTests.map((t) => (
                                <div
                                    key={t.id}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-violet-300 dark:hover:border-violet-700 transition flex flex-col justify-between space-y-4"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {t.body_region?.replace('_', ' / ')}
                                                    </span>
                                                    {t.is_custom ? (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                                            <Building2 className="w-3 h-3" />
                                                            <span>Clinic Custom</span>
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 flex items-center gap-1">
                                                            <ShieldCheck className="w-3 h-3" />
                                                            <span>Reviewed Library</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                                                    {t.name}
                                                </h3>
                                                {normalizeList(t.aliases).length > 0 && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Also: {normalizeList(t.aliases).join(', ')}
                                                    </p>
                                                )}
                                            </div>

                                            {t.is_custom && canManageCustom && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditCustom(t)}
                                                        className="p-1 rounded text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition"
                                                        title="Edit test"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={deletingId === t.id}
                                                        onClick={() => handleDeleteCustom(t)}
                                                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                                                        title="Delete test"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                            {t.purpose}
                                        </p>

                                        {/* Disciplines Chips */}
                                        {normalizeList(t.disciplines).length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {normalizeList(t.disciplines).map((d, dIdx) => (
                                                    <span
                                                        key={dIdx}
                                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                    >
                                                        {typeof d === 'object' ? (d.label || d.value) : d}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setViewingTest(t)}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>Read Procedure & Findings</span>
                                        </button>
                                        {(t.reviewer_display || t.reviewer_name || t.reviewer?.name) && (
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 text-right truncate max-w-[180px]" title={`Reviewed by ${t.reviewer_display || t.reviewer_name || t.reviewer?.name}`}>
                                                Reviewed by <span className="font-semibold text-slate-600 dark:text-slate-300">{t.reviewer_display || t.reviewer_name || t.reviewer?.name}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div className="max-w-md mx-auto space-y-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    The UMAHZ test library is being prepared. You can add your own clinic tests now.
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {selectedRegion !== 'all' || searchTerm
                                        ? 'No tests matched your current filter criteria. You can clear filters or add a new custom clinic test.'
                                        : 'Once platform orthopedic and assessment tests are reviewed by clinical directors, they will appear here automatically.'}
                                </p>
                            </div>
                            {canManageCustom && (
                                <button
                                    type="button"
                                    onClick={openCreateCustom}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add clinic test</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Test Details Modal */}
            {viewingTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingTest(null)} />
                    <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 z-10 text-xs text-slate-800 dark:text-slate-200">
                        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 tracking-wider">
                                    {viewingTest.body_region?.replace('_', ' / ')}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                    {viewingTest.name}
                                </h3>
                                {normalizeList(viewingTest.aliases).length > 0 && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Aliases: {normalizeList(viewingTest.aliases).join(', ')}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingTest(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Purpose</h4>
                                <p className="leading-relaxed">{viewingTest.purpose || 'N/A'}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Step-by-Step Procedure</h4>
                                <p className="leading-relaxed whitespace-pre-wrap">{viewingTest.procedure || 'N/A'}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                                <h4 className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Positive Finding Criteria</h4>
                                <p className="leading-relaxed">{viewingTest.positive_finding || 'N/A'}</p>
                            </div>

                            {viewingTest.interpretation_notes && (
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Clinical Interpretation & Accuracy</h4>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{viewingTest.interpretation_notes}</p>
                                </div>
                            )}

                            {viewingTest.references && (
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">References</h4>
                                    <p className="text-slate-500 italic text-[11px]">{viewingTest.references}</p>
                                </div>
                            )}

                            {(viewingTest.reviewer_display || viewingTest.reviewer_name || viewingTest.reviewer?.name) && (
                                <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
                                    <span>
                                        Clinical Reviewer: <strong className="text-slate-900 dark:text-white">{viewingTest.reviewer_display || viewingTest.reviewer_name || viewingTest.reviewer?.name}</strong>
                                    </span>
                                    {viewingTest.reviewed_at && (
                                        <span className="text-[11px] text-slate-500">Reviewed {new Date(viewingTest.reviewed_at).toLocaleDateString()}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setViewingTest(null)}
                                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Clinic Custom Test Modal */}
            {customModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setCustomModalOpen(false)} />
                    <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 z-10 text-xs text-slate-800 dark:text-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                <span>{editingTest ? 'Edit Clinic Custom Test' : 'Add Custom Assessment Test'}</span>
                            </h3>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setCustomModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCustom} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold mb-1">
                                        Test Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Modified Thomas Test"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">
                                        Body Region <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.body_region}
                                        onChange={(e) => setFormData({ ...formData, body_region: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        required
                                    >
                                        {safeBodyRegions.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Aliases / Alternate Names (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={formData.aliases}
                                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                                    placeholder="e.g. Rectus Femoris Tightness Test"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Target Disciplines
                                </label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {safeDisciplines.map((d) => {
                                        const checked = formData.disciplines.includes(d.value);
                                        return (
                                            <button
                                                key={d.value}
                                                type="button"
                                                onClick={() => toggleDisciplineSelection(d.value)}
                                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                                    checked
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Clinical Purpose <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    placeholder="Assesses hip flexor contracture / psoas and rectus femoris tightness."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Step-by-Step Procedure <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows="3"
                                    value={formData.procedure}
                                    onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                                    placeholder="1. Patient sits at edge of plinth. 2. Patient lies back holding opposite knee to chest..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Positive Finding Criteria <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    value={formData.positive_finding}
                                    onChange={(e) => setFormData({ ...formData, positive_finding: e.target.value })}
                                    placeholder="Thigh does not reach horizontal or knee extends beyond 90 degrees."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Clinical Notes (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    value={formData.interpretation_notes}
                                    onChange={(e) => setFormData({ ...formData, interpretation_notes: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setCustomModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingTest ? 'Update Test' : 'Save Test'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
