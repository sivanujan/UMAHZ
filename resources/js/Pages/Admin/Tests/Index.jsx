import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Activity, CheckCircle2, AlertCircle, AlertTriangle, Search, Filter,
    Plus, Upload, Download, FileText, Check, Archive, Eye, Edit3, X,
    ChevronDown, ChevronRight, BookOpen, Stethoscope, RefreshCw, Layers
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

export default function AdminTestsIndex({
    tests = { data: [] },
    filters = { region: 'all', status: 'all', search: '' },
    stats = {},
    bodyRegions = [],
    disciplines = [],
}) {
    const { flash, errors } = usePage().props;

    const safeDisciplines = normalizeOptions(disciplines);
    const safeBodyRegions = normalizeOptions(bodyRegions);
    const safeTests = Array.isArray(tests)
        ? tests
        : Array.isArray(tests?.data)
            ? tests.data
            : (tests && typeof tests === 'object' ? Object.values(tests) : []);

    // Filter states
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRegion, setSelectedRegion] = useState(filters.region || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    // Create / Edit modal state
    const [formModalOpen, setFormModalOpen] = useState(false);
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
        status: 'draft',
    });
    const [saving, setSaving] = useState(false);

    // Detail view modal
    const [viewingTest, setViewingTest] = useState(null);

    // CSV Import modal state
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [importPreviewData, setImportPreviewData] = useState(null);
    const [importing, setImporting] = useState(false);

    // Action loaders
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // Review modal state
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewTargetTest, setReviewTargetTest] = useState(null);
    const [reviewerName, setReviewerName] = useState('');
    const [reviewerCredential, setReviewerCredential] = useState('');
    const [reviewing, setReviewing] = useState(false);

    // Trigger search/filter
    const applyFilters = (newRegion, newStatus, newSearch) => {
        router.get('/admin/tests', {
            region: newRegion !== undefined ? newRegion : selectedRegion,
            status: newStatus !== undefined ? newStatus : selectedStatus,
            search: newSearch !== undefined ? newSearch : searchTerm,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        applyFilters(selectedRegion, selectedStatus, searchTerm);
    };

    const handleRegionChange = (reg) => {
        setSelectedRegion(reg);
        applyFilters(reg, selectedStatus, searchTerm);
    };

    const handleStatusChange = (st) => {
        setSelectedStatus(st);
        applyFilters(selectedRegion, st, searchTerm);
    };

    // Open create modal
    const openCreateModal = () => {
        setEditingTest(null);
        setFormData({
            name: '',
            body_region: 'shoulder',
            aliases: '',
            purpose: '',
            procedure: '',
            positive_finding: '',
            interpretation_notes: '',
            disciplines: ['physio'],
            references: '',
            status: 'draft',
        });
        setFormModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (test) => {
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
            status: test.status || 'draft',
        });
        setFormModalOpen(true);
    };

    // Save test (create or update)
    const handleSaveTest = (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            ...formData,
            aliases: formData.aliases ? formData.aliases.split(',').map(s => s.trim()).filter(Boolean) : [],
        };

        if (editingTest) {
            router.put(`/admin/tests/${editingTest.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        } else {
            router.post('/admin/tests', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            });
        }
    };

    // Open review modal
    const openReviewModal = (test) => {
        setReviewTargetTest(test);
        setReviewerName(test.reviewer_name || '');
        setReviewerCredential(test.reviewer_credential || '');
        setReviewModalOpen(true);
    };

    const handleConfirmReview = (e) => {
        e.preventDefault();
        if (!reviewTargetTest) return;
        setReviewing(true);
        router.post(`/admin/tests/${reviewTargetTest.id}/review`, {
            reviewer_name: reviewerName,
            reviewer_credential: reviewerCredential,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewModalOpen(false);
                setReviewTargetTest(null);
                setReviewing(false);
            },
            onError: () => setReviewing(false),
            onFinish: () => setReviewing(false),
        });
    };

    // Archive test
    const handleArchive = (test) => {
        if (!confirm(`Archive "${test.name}"? It will be hidden from practitioners' active library.`)) {
            return;
        }
        setActionLoadingId(test.id);
        router.post(`/admin/tests/${test.id}/archive`, {}, {
            preserveScroll: true,
            onFinish: () => setActionLoadingId(null),
        });
    };

    // CSV Import preview handler
    const handleCsvSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCsvFile(file);
        setPreviewing(true);
        setImportPreviewData(null);

        const uploadData = new FormData();
        uploadData.append('csv_file', file);
        uploadData.append('file', file);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/admin/tests/import-preview', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: uploadData,
            });
            const data = await res.json();
            if (res.ok) {
                setImportPreviewData(data);
            } else {
                alert(data.message || 'Failed to parse CSV file.');
            }
        } catch (err) {
            alert('Error parsing CSV preview: ' + err.message);
        } finally {
            setPreviewing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!csvFile) return;
        setImporting(true);

        const uploadData = new FormData();
        uploadData.append('csv_file', csvFile);
        uploadData.append('file', csvFile);

        router.post('/admin/tests/import', uploadData, {
            preserveScroll: true,
            onSuccess: () => {
                setImportModalOpen(false);
                setCsvFile(null);
                setImportPreviewData(null);
                setImporting(false);
            },
            onError: () => setImporting(false),
            onFinish: () => setImporting(false),
        });
    };

    const toggleDiscipline = (val) => {
        const cur = [...formData.disciplines];
        if (cur.includes(val)) {
            if (cur.length > 1) {
                setFormData({ ...formData, disciplines: cur.filter(d => d !== val) });
            }
        } else {
            setFormData({ ...formData, disciplines: [...cur, val] });
        }
    };

    return (
        <AdminLayout title="Clinical Assessment Test Library">
            <Head title="Test Library — Platform Admin" />

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Activity className="w-7 h-7 text-purple-400" />
                            <span>Clinical Assessment Test Library</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Curate, review, and manage orthopedic and special tests for physiotherapists, chiropractors, and practitioners.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <a
                            href="/admin/tests/template"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-xs transition"
                            title="Download clean CSV template with headers and example row"
                        >
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span>Download Template</span>
                        </a>
                        <a
                            href="/admin/tests/export"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-xs transition"
                        >
                            <Download className="w-4 h-4 text-purple-400" />
                            <span>Export CSV</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                setCsvFile(null);
                                setImportPreviewData(null);
                                setImportModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-xs transition"
                        >
                            <Upload className="w-4 h-4 text-purple-400" />
                            <span>Import CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Test</span>
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Total Tests</span>
                        <div className="text-2xl font-bold text-white mt-2">{stats.total ?? 0}</div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">In platform repository</span>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">Reviewed & Published</span>
                        <div className="text-2xl font-bold text-emerald-400 mt-2">{stats.reviewed ?? 0}</div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">Live to all practitioners</span>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">Draft / Pending Review</span>
                        <div className="text-2xl font-bold text-amber-400 mt-2">{stats.draft ?? 0}</div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">Hidden from practitioners</span>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Archived</span>
                        <div className="text-2xl font-bold text-slate-400 mt-2">{stats.archived ?? 0}</div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">Deprecated tests</span>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Search input */}
                        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by test name or alias..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </form>

                        {/* Status Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto w-full md:w-auto">
                            {[
                                { key: 'all', label: 'All Status' },
                                { key: 'reviewed', label: 'Reviewed' },
                                { key: 'draft', label: 'Draft' },
                                { key: 'archived', label: 'Archived' },
                            ].map((st) => (
                                <button
                                    key={st.key}
                                    type="button"
                                    onClick={() => handleStatusChange(st.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                        selectedStatus === st.key
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Body Region Selector Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            <span>Region:</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => handleRegionChange('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                                selectedRegion === 'all'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
                            }`}
                        >
                            All Regions
                        </button>
                        {safeBodyRegions.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => handleRegionChange(r.value)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                                    selectedRegion === r.value
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tests Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4 font-semibold">Test Name & Aliases</th>
                                    <th className="py-3 px-4 font-semibold">Body Region</th>
                                    <th className="py-3 px-4 font-semibold">Disciplines</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                    <th className="py-3 px-4 font-semibold">Review Info</th>
                                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {safeTests.length > 0 ? (
                                    safeTests.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-800/30 transition">
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-white text-sm">{t.name}</div>
                                                {normalizeList(t.aliases).length > 0 && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        Also known as: {normalizeList(t.aliases).join(', ')}
                                                    </div>
                                                )}
                                                <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-md">
                                                    {t.purpose}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold text-[11px] capitalize">
                                                    {t.body_region ? t.body_region.replace('_', ' / ') : 'Other'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {normalizeList(t.disciplines).map((d, dIdx) => (
                                                        <span
                                                            key={dIdx}
                                                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/50"
                                                        >
                                                            {typeof d === 'object' ? (d.label || d.value) : d}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {t.status === 'reviewed' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>Reviewed</span>
                                                    </span>
                                                ) : t.status === 'draft' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        <span>Draft</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                                        <Archive className="w-3.5 h-3.5" />
                                                        <span>Archived</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {t.status === 'reviewed' ? (
                                                    <div>
                                                        <div className="font-semibold text-slate-200">
                                                            {t.reviewer_display || t.reviewer_name || (t.reviewer?.name ? `${t.reviewer.name}${t.reviewer_credential ? `, ${t.reviewer_credential}` : ''}` : 'Verified Reviewer')}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">{t.reviewed_at ? new Date(t.reviewed_at).toLocaleDateString() : 'N/A'}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic text-[11px]">Pending review</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingTest(t)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(t)}
                                                        className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-slate-800 transition"
                                                        title="Edit Test"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    {t.status !== 'reviewed' && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoadingId === t.id}
                                                            onClick={() => openReviewModal(t)}
                                                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition"
                                                            title="Mark as Reviewed & Set Credential"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {t.status !== 'archived' && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoadingId === t.id}
                                                            onClick={() => handleArchive(t)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                                            title="Archive Test"
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-500">
                                            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                            <p className="text-sm font-semibold">No assessment tests found.</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Try adjusting your filter or import tests via CSV.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {Array.isArray(tests?.links) && tests.links.length > 3 && (
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                            <div>
                                Showing <span className="text-white font-semibold">{tests.from || 0}</span> to <span className="text-white font-semibold">{tests.to || 0}</span> of <span className="text-white font-semibold">{tests.total || 0}</span> tests
                            </div>
                            <div className="flex items-center gap-1">
                                {(Array.isArray(tests?.links) ? tests.links : []).map((link, lIdx) => (
                                    <button
                                        key={lIdx}
                                        type="button"
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.visit(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-purple-600 text-white'
                                                : link.url
                                                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            {formModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !saving && setFormModalOpen(false)} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 z-10 text-xs text-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-400" />
                                <span>{editingTest ? 'Edit Assessment Test' : 'New Platform Assessment Test'}</span>
                            </h3>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setFormModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTest} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">
                                        Test Name <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Hawkins-Kennedy Impingement Test"
                                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-300 mb-1">
                                        Body Region <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={formData.body_region}
                                        onChange={(e) => setFormData({ ...formData, body_region: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    >
                                        {safeBodyRegions.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Aliases / Alternate Names (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={formData.aliases}
                                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                                    placeholder="e.g. Hawkins Test, Subacromial Impingement Sign"
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Target Disciplines
                                </label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {safeDisciplines.map((d) => {
                                        const checked = formData.disciplines.includes(d.value);
                                        return (
                                            <button
                                                key={d.value}
                                                type="button"
                                                onClick={() => toggleDiscipline(d.value)}
                                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                                    checked
                                                        ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Clinical Purpose <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    placeholder="What does this test assess? (e.g. Assesses for subacromial impingement / supraspinatus tendon pathology)"
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Step-by-Step Procedure <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    rows="3"
                                    value={formData.procedure}
                                    onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                                    placeholder="1. Patient is seated or standing. 2. Forward flex shoulder to 90 degrees with elbow at 90. 3. Passively internally rotate the arm."
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Positive Finding Criteria <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    value={formData.positive_finding}
                                    onChange={(e) => setFormData({ ...formData, positive_finding: e.target.value })}
                                    placeholder="Reproduction of concordant shoulder pain in the subacromial region upon internal rotation."
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Interpretation Notes & Diagnostic Accuracy (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    value={formData.interpretation_notes}
                                    onChange={(e) => setFormData({ ...formData, interpretation_notes: e.target.value })}
                                    placeholder="Diagnostic accuracy notes, sensitivity/specificity considerations, or diagnostic cluster context..."
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Medical References / Citations (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.references}
                                    onChange={(e) => setFormData({ ...formData, references: e.target.value })}
                                    placeholder="Primary literature reference or citation (e.g. Journal, Author, Year)..."
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Initial Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="draft">Draft (Private, not visible to clinics)</option>
                                    <option value="reviewed">Reviewed (Live in platform library)</option>
                                    <option value="archived">Archived (Deprecated)</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setFormModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>{editingTest ? 'Update Test' : 'Save Test'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick View Details Modal */}
            {viewingTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setViewingTest(null)} />
                    <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4 z-10 text-xs text-slate-200">
                        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                                    {viewingTest.body_region?.replace('_', ' / ')}
                                </span>
                                <h3 className="text-lg font-bold text-white mt-0.5">{viewingTest.name}</h3>
                                {normalizeList(viewingTest.aliases).length > 0 && (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Aliases: {normalizeList(viewingTest.aliases).join(', ')}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingTest(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Purpose</h4>
                                <p className="text-slate-200 leading-relaxed">{viewingTest.purpose || 'N/A'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Procedure Steps</h4>
                                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{viewingTest.procedure || 'N/A'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                                <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Positive Finding</h4>
                                <p className="text-emerald-200 leading-relaxed">{viewingTest.positive_finding || 'N/A'}</p>
                            </div>

                            {viewingTest.interpretation_notes && (
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Interpretation</h4>
                                    <p className="text-slate-300 leading-relaxed">{viewingTest.interpretation_notes}</p>
                                </div>
                            )}

                            {viewingTest.references && (
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">References</h4>
                                    <p className="text-slate-400 italic text-[11px]">{viewingTest.references}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setViewingTest(null)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !importing && setImportModalOpen(false)} />
                    <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 z-10 text-xs text-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Upload className="w-5 h-5 text-purple-400" />
                                <span>Import Assessment Tests (CSV)</span>
                            </h3>
                            <button
                                type="button"
                                disabled={importing}
                                onClick={() => setImportModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <h4 className="text-xs font-bold text-white">CSV Guidelines & Expected Columns:</h4>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                                Columns: <code className="text-purple-400">body_region, name, aliases, purpose, procedure, positive_finding, interpretation_notes, disciplines, references</code>.
                            </p>
                            <p className="text-purple-400 text-[11px] font-semibold flex items-center gap-1.5 pt-1">
                                <Download className="w-3.5 h-3.5" />
                                <a href="/admin/tests/template" className="underline hover:text-purple-300">
                                    Download clean CSV template with headers & fake example row
                                </a>
                            </p>
                            <p className="text-amber-400 text-[11px] font-semibold">
                                * All imported tests are created in <strong>draft</strong> status so you can review each before making it visible to clinics.
                            </p>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-300 mb-2">
                                Select CSV File
                            </label>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleCsvSelect}
                                disabled={previewing || importing}
                                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                            />
                        </div>

                        {previewing && (
                            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                                <span>Parsing CSV and validating rows...</span>
                            </div>
                        )}

                        {importPreviewData && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                                        <div className="text-lg font-bold text-white mt-1">{importPreviewData.total_rows}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-center">
                                        <span className="text-[10px] uppercase font-bold text-emerald-400">Valid Rows</span>
                                        <div className="text-lg font-bold text-emerald-400 mt-1">{importPreviewData.valid_count}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-center">
                                        <span className="text-[10px] uppercase font-bold text-rose-400">Errors</span>
                                        <div className="text-lg font-bold text-rose-400 mt-1">{importPreviewData.error_count}</div>
                                    </div>
                                </div>

                                {importPreviewData.errors && importPreviewData.errors.length > 0 && (
                                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 space-y-1">
                                        <h5 className="font-bold text-rose-400 text-xs">Validation Errors:</h5>
                                        <ul className="list-disc list-inside text-[11px] text-rose-300 space-y-0.5 max-h-32 overflow-y-auto">
                                            {importPreviewData.errors.map((err, eIdx) => (
                                                <li key={eIdx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {importPreviewData.preview && importPreviewData.preview.length > 0 && (
                                    <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                        <table className="w-full text-left text-[11px]">
                                            <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                                                <tr>
                                                    <th className="py-2 px-3">Test Name</th>
                                                    <th className="py-2 px-3">Region</th>
                                                    <th className="py-2 px-3">Purpose</th>
                                                    <th className="py-2 px-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {importPreviewData.preview.map((row, rIdx) => (
                                                    <tr key={rIdx}>
                                                        <td className="py-2 px-3 font-semibold text-white">{row.name}</td>
                                                        <td className="py-2 px-3 text-slate-300 capitalize">{row.body_region}</td>
                                                        <td className="py-2 px-3 text-slate-400 line-clamp-1 max-w-xs">{row.purpose}</td>
                                                        <td className="py-2 px-3 text-amber-400 font-semibold">{row.status}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                disabled={importing}
                                onClick={() => setImportModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={importing || !importPreviewData || importPreviewData.valid_count === 0}
                                onClick={handleConfirmImport}
                                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition disabled:opacity-50"
                            >
                                {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                <span>{importing ? 'Importing Rows...' : `Import ${importPreviewData?.valid_count || 0} Tests`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark Reviewed Confirmation Modal */}
            {reviewModalOpen && reviewTargetTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !reviewing && setReviewModalOpen(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4 z-10 text-xs text-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span>Mark Test as Reviewed</span>
                            </h3>
                            <button
                                type="button"
                                disabled={reviewing}
                                onClick={() => setReviewModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-slate-400 text-xs leading-relaxed">
                            Marking <strong className="text-white">"{reviewTargetTest.name}"</strong> as reviewed will immediately publish it to the UMAHZ platform library, making it visible to all practitioners.
                        </p>

                        <form onSubmit={handleConfirmReview} className="space-y-4">
                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Reviewer Full Name
                                </label>
                                <input
                                    type="text"
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                    placeholder="e.g. Zainab ..., RMT or Admin Name"
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-[10px] text-slate-500 mt-1 block">Leave blank to use your account name.</span>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-300 mb-1">
                                    Reviewer Clinical Credentials (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={reviewerCredential}
                                    onChange={(e) => setReviewerCredential(e.target.value)}
                                    placeholder="e.g. RMT #12345, PT, or DC"
                                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                    Will be displayed to practitioners (e.g. "Zainab ..., RMT").
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    disabled={reviewing}
                                    onClick={() => setReviewModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={reviewing}
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                                >
                                    {reviewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>{reviewing ? 'Publishing...' : 'Approve & Publish'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
