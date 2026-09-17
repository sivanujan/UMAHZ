import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    UploadCloud, Image as ImageIcon, Check, Trash2, Edit3, Search,
    X, Link as LinkIcon, RefreshCw, AlertCircle, CheckCircle2,
    Copy, ExternalLink, ArrowUpDown, Info, Eye, Sparkles
} from 'lucide-react';

/**
 * UMAHZ Branded Media Library Modal
 *
 * Fully integrated multi-tenant media manager for GrapesJS Page Builder.
 * Replaces the default GrapesJS Asset Manager with a clear upload -> select -> insert flow.
 */
export default function MediaLibraryModal({
    isOpen,
    onClose,
    onSelect,
    currentValue = '',
    title = 'Media Library',
    tenant = {},
}) {
    const [activeTab, setActiveTab] = useState('library'); // 'library' | 'upload' | 'url'
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'size'
    const [selectedAsset, setSelectedAsset] = useState(null);

    // Upload state
    const [uploadQueue, setUploadQueue] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // URL input state
    const [urlInput, setUrlInput] = useState('');
    const [urlNameInput, setUrlNameInput] = useState('');
    const [urlPreviewError, setUrlPreviewError] = useState(false);

    // Rename & details state
    const [editingName, setEditingName] = useState('');
    const [editingAlt, setEditingAlt] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);
    const [deleteConfirmAsset, setDeleteConfirmAsset] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Fetch assets from backend
    const fetchAssets = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/app/settings/page-builder/assets');
            const data = await res.json();
            if (res.ok && data.assets) {
                setAssets(data.assets);
                // If currentValue matches an asset, auto-select it
                if (currentValue) {
                    const match = data.assets.find(a => a.src === currentValue);
                    if (match) setSelectedAsset(match);
                }
            } else {
                setError(data.error || 'Failed to load media assets.');
            }
        } catch (err) {
            console.error('Error fetching assets:', err);
            setError('Could not connect to media library service.');
        } finally {
            setLoading(false);
        }
    };

    // Reload assets whenever modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAssets();
            setActiveTab('library');
            setDeleteConfirmAsset(null);
        } else {
            setSelectedAsset(null);
            setUploadQueue([]);
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                if (deleteConfirmAsset) {
                    setDeleteConfirmAsset(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, deleteConfirmAsset, onClose]);

    // When an asset is selected, sync editing inputs
    useEffect(() => {
        if (selectedAsset) {
            setEditingName(selectedAsset.name || '');
            setEditingAlt(selectedAsset.alt || '');
        } else {
            setEditingName('');
            setEditingAlt('');
        }
    }, [selectedAsset]);

    // Filter & Sort Assets
    const filteredAssets = useMemo(() => {
        let result = [...assets];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(a =>
                (a.name && a.name.toLowerCase().includes(q)) ||
                (a.filename && a.filename.toLowerCase().includes(q))
            );
        }

        result.sort((a, b) => {
            if (sortBy === 'newest') {
                return (b.updated_at || 0) - (a.updated_at || 0);
            }
            if (sortBy === 'oldest') {
                return (a.updated_at || 0) - (b.updated_at || 0);
            }
            if (sortBy === 'name') {
                return (a.name || a.filename || '').localeCompare(b.name || b.filename || '');
            }
            if (sortBy === 'size') {
                return (b.size || 0) - (a.size || 0);
            }
            return 0;
        });

        return result;
    }, [assets, searchQuery, sortBy]);

    // Handle files upload
    const handleFilesUpload = async (filesList) => {
        if (!filesList || filesList.length === 0) return;

        const filesArray = Array.from(filesList);
        const newQueueItems = filesArray.map(f => ({
            id: Math.random().toString(36).substring(2, 9),
            file: f,
            name: f.name,
            size: f.size,
            progress: 0,
            status: 'uploading', // 'uploading' | 'done' | 'error'
            error: null,
            preview: URL.createObjectURL(f),
        }));

        setUploadQueue(prev => [...newQueueItems, ...prev]);
        setUploading(true);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const formData = new FormData();

        filesArray.forEach(f => {
            formData.append('files[]', f);
        });

        try {
            const res = await fetch('/app/settings/page-builder/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && (data.ok || data.assets || data.data)) {
                const uploadedAssets = data.assets || (data.asset ? [data.asset] : []);

                // Update queue status
                setUploadQueue(prev =>
                    prev.map(item =>
                        filesArray.some(f => f.name === item.name)
                            ? { ...item, progress: 100, status: 'done' }
                            : item
                    )
                );

                // Refresh assets list
                await fetchAssets();

                // Auto-select the first newly uploaded image
                if (uploadedAssets.length > 0) {
                    setSelectedAsset(uploadedAssets[0]);
                }

                // Switch back to library view after small delay
                setTimeout(() => {
                    setActiveTab('library');
                }, 600);
            } else {
                const errMsg = data.error || data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : null) || (res.status ? `Upload failed (${res.status} ${res.statusText})` : 'Upload failed. Please check file format and size.');
                setUploadQueue(prev =>
                    prev.map(item =>
                        filesArray.some(f => f.name === item.name)
                            ? { ...item, status: 'error', error: errMsg }
                            : item
                    )
                );
            }
        } catch (err) {
            console.error('Upload exception:', err);
            setUploadQueue(prev =>
                prev.map(item =>
                    filesArray.some(f => f.name === item.name)
                        ? { ...item, status: 'error', error: 'Network error during upload.' }
                        : item
                )
            );
        } finally {
            setUploading(false);
        }
    };

    // Save renamed asset / alt text
    const handleSaveMetadata = async () => {
        if (!selectedAsset || selectedAsset.is_preset) return;
        setSavingMeta(true);
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const res = await fetch('/app/settings/page-builder/assets', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    filename: selectedAsset.filename,
                    name: editingName,
                    alt: editingAlt,
                }),
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                // Update local asset
                setAssets(prev =>
                    prev.map(a =>
                        a.filename === selectedAsset.filename
                            ? { ...a, name: editingName, alt: editingAlt }
                            : a
                    )
                );
                setSelectedAsset(prev => prev ? { ...prev, name: editingName, alt: editingAlt } : null);
            }
        } catch (err) {
            console.error('Failed to update asset metadata:', err);
        } finally {
            setSavingMeta(false);
        }
    };

    // Delete asset handler
    const handleDeleteAsset = async (assetToDelete) => {
        if (!assetToDelete || assetToDelete.is_preset) return;
        setDeleting(true);
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const res = await fetch('/app/settings/page-builder/assets', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    filename: assetToDelete.filename,
                    url: assetToDelete.src,
                }),
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setAssets(prev => prev.filter(a => a.filename !== assetToDelete.filename));
                if (selectedAsset?.filename === assetToDelete.filename) {
                    setSelectedAsset(null);
                }
                setDeleteConfirmAsset(null);
            } else {
                alert(data.error || 'Failed to delete asset.');
            }
        } catch (err) {
            console.error('Failed to delete asset:', err);
            alert('A network error occurred while deleting image.');
        } finally {
            setDeleting(false);
        }
    };

    // Insert chosen asset into GrapesJS element
    const handleInsert = (assetToUse = selectedAsset) => {
        const asset = assetToUse || selectedAsset;
        if (!asset || !asset.src) {
            console.warn('Cannot insert: no asset selected or missing src', asset);
            return;
        }
        try {
            onSelect(asset.src, asset);
        } catch (err) {
            console.error('Error during onSelect in MediaLibraryModal:', err);
        }
        onClose();
    };

    // Insert from URL handler
    const handleInsertFromUrl = () => {
        if (!urlInput.trim()) return;
        const customObj = {
            src: urlInput.trim(),
            name: urlNameInput.trim() || basename(urlInput.trim()),
            alt: urlNameInput.trim() || '',
            is_external: true,
        };
        try {
            onSelect(urlInput.trim(), customObj);
        } catch (err) {
            console.error('Error during onSelect (URL) in MediaLibraryModal:', err);
        }
        onClose();
    };

    const copyToClipboard = (text) => {
        navigator.clipboard?.writeText(text);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div
                className="relative w-full max-w-5xl h-[88vh] max-h-[850px] bg-white dark:bg-[#131620] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
                onClick={e => e.stopPropagation()}
            >
                {/* 1. Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#181b26]/70 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                    {tenant.name || 'Clinic Media'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Select or upload photos for your clinic website.
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-[#1e2230] p-1 rounded-xl border border-slate-300/60 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('library')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'library'
                                    ? 'bg-white dark:bg-[#131620] text-violet-600 dark:text-violet-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Media Library</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {assets.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'upload'
                                    ? 'bg-white dark:bg-[#131620] text-violet-600 dark:text-violet-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Upload Media</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('url')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'url'
                                    ? 'bg-white dark:bg-[#131620] text-violet-600 dark:text-violet-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>From URL</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* TAB 1: MEDIA LIBRARY */}
                    {activeTab === 'library' && (
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Grid View Area */}
                            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 dark:border-white/10">
                                {/* Search & Filter Bar */}
                                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-white dark:bg-[#131620]">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search by filename or title..."
                                            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1a1d29] text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-transparent focus:border-violet-500 focus:bg-white dark:focus:bg-[#131620] focus:outline-none transition-all"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                            <select
                                                value={sortBy}
                                                onChange={e => setSortBy(e.target.value)}
                                                className="bg-slate-100 dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-violet-500"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="name">Name (A-Z)</option>
                                                <option value="size">Largest Size</option>
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={fetchAssets}
                                            disabled={loading}
                                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            title="Refresh Assets"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Image Grid Scroll Container */}
                                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 dark:bg-[#0f1118]/50">
                                    {loading && assets.length === 0 ? (
                                        /* Skeletons */
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : filteredAssets.length === 0 ? (
                                        /* Empty State */
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                                {searchQuery ? 'No matching images found' : 'No images in clinic library'}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
                                                {searchQuery
                                                    ? `We couldn't find any media matching "${searchQuery}". Try a different keyword or upload a new photo.`
                                                    : 'Upload your clinic logo, treatment room photos, or doctor portraits to customize your homepage.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('upload')}
                                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/25 flex items-center gap-2 transition-all"
                                            >
                                                <UploadCloud className="w-4 h-4" />
                                                <span>Upload Your First Image</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Grid Cards */
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                            {filteredAssets.map((asset, idx) => {
                                                const isSelected = selectedAsset?.src === asset.src;
                                                return (
                                                    <div
                                                        key={asset.filename || idx}
                                                        onClick={() => setSelectedAsset(asset)}
                                                        onDoubleClick={() => handleInsert(asset)}
                                                        className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex flex-col ${
                                                            isSelected
                                                                ? 'border-violet-600 ring-4 ring-violet-500/20 shadow-lg shadow-violet-500/10 scale-[1.02]'
                                                                : 'border-slate-200/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 bg-white dark:bg-[#181b26]'
                                                        }`}
                                                    >
                                                        {/* Checkerboard Pattern for transparent SVGs/PNGs */}
                                                        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:8px_8px] opacity-40" />

                                                        {/* Thumbnail */}
                                                        <div className="relative w-full h-full flex items-center justify-center p-2">
                                                            <img
                                                                src={asset.src}
                                                                alt={asset.alt || asset.name}
                                                                className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                        </div>

                                                        {/* Selected Checkmark Badge */}
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150">
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            </div>
                                                        )}

                                                        {/* Preset Badge */}
                                                        {asset.is_preset && (
                                                            <div className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-sm">
                                                                Logo
                                                            </div>
                                                        )}

                                                        {/* Hover Information / Quick Actions Overlay */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 pt-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-[11px] font-semibold text-white truncate drop-shadow-sm mb-0.5">
                                                                {asset.name || asset.filename}
                                                            </p>
                                                            <div className="flex items-center justify-between text-[10px] text-slate-300">
                                                                <span>{asset.size_formatted || 'Image'}</span>
                                                                {asset.dimensions && (
                                                                    <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details & Inspector Sidebar */}
                            <div className="w-full md:w-80 flex-shrink-0 bg-white dark:bg-[#161924] flex flex-col overflow-y-auto border-t md:border-t-0 border-slate-200 dark:border-white/10 p-5">
                                {selectedAsset ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                Image Details
                                            </span>
                                            {selectedAsset.is_preset ? (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    Clinic Preset
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteConfirmAsset(selectedAsset)}
                                                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Delete</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Large Preview */}
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1c202d] border border-slate-200 dark:border-white/10 flex items-center justify-center p-2">
                                            <img
                                                src={selectedAsset.src}
                                                alt={selectedAsset.alt || selectedAsset.name}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                            <a
                                                href={selectedAsset.src}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white transition-colors"
                                                title="Open original in new tab"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>

                                        {/* File Metadata Info */}
                                        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1a1d29] p-3 rounded-xl border border-slate-200/70 dark:border-white/5">
                                            <div className="flex justify-between">
                                                <span>File:</span>
                                                <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={selectedAsset.filename}>
                                                    {selectedAsset.filename}
                                                </span>
                                            </div>
                                            {selectedAsset.dimensions && (
                                                <div className="flex justify-between">
                                                    <span>Dimensions:</span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                                                        {selectedAsset.dimensions.width} × {selectedAsset.dimensions.height} px
                                                    </span>
                                                </div>
                                            )}
                                            {selectedAsset.size_formatted && (
                                                <div className="flex justify-between">
                                                    <span>File Size:</span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                                                        {selectedAsset.size_formatted}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Name / Title Editing */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Display Name / Title
                                            </label>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                disabled={selectedAsset.is_preset}
                                                placeholder="Enter title..."
                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#1a1d29] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-violet-500"
                                            />
                                        </div>

                                        {/* Alt Text Editing */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Alt Text (for SEO & Accessibility)
                                            </label>
                                            <input
                                                type="text"
                                                value={editingAlt}
                                                onChange={e => setEditingAlt(e.target.value)}
                                                disabled={selectedAsset.is_preset}
                                                placeholder="Descriptive image summary..."
                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#1a1d29] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-violet-500"
                                            />
                                        </div>

                                        {/* Save Metadata Button */}
                                        {!selectedAsset.is_preset && (
                                            <button
                                                type="button"
                                                onClick={handleSaveMetadata}
                                                disabled={savingMeta}
                                                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#1e2230] hover:bg-slate-200 dark:hover:bg-[#252a3d] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                {savingMeta ? (
                                                    <span>Saving...</span>
                                                ) : (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Save Title & Alt Text</span>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {/* Copy Direct URL */}
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(selectedAsset.src)}
                                                className="w-full py-1.5 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                {copiedUrl ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-emerald-500 font-bold">URL Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5" />
                                                        <span>Copy Image URL</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#1a1d29] text-slate-400 flex items-center justify-center mb-3">
                                            <Info className="w-6 h-6" />
                                        </div>
                                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No Image Selected</h5>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Click an image from the library on the left to inspect details, rename it, or use it on your page.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: UPLOAD MEDIA */}
                    {activeTab === 'upload' && (
                        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                            {/* Drag & Drop Box */}
                            <div
                                onDragOver={e => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    handleFilesUpload(e.dataTransfer.files);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
                                    isDragging
                                        ? 'border-violet-600 bg-violet-500/10 scale-[1.01]'
                                        : 'border-slate-300 dark:border-white/20 hover:border-violet-500 dark:hover:border-violet-400 bg-slate-50/50 dark:bg-[#181b26]/50'
                                }`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={e => handleFilesUpload(e.target.files)}
                                    multiple
                                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
                                    className="hidden"
                                />

                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 mb-4">
                                    <UploadCloud className="w-8 h-8" />
                                </div>

                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    Drag & Drop Images Here
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
                                    Upload photos from your computer. You can drag multiple files at once.
                                </p>

                                <button
                                    type="button"
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/25 transition-all"
                                >
                                    Browse Files on Computer
                                </button>

                                <p className="text-[11px] text-slate-400 mt-4">
                                    Supported formats: JPG, PNG, WEBP, GIF, SVG, AVIF (Max 10MB per file)
                                </p>
                            </div>

                            {/* Upload Progress Queue */}
                            {uploadQueue.length > 0 && (
                                <div className="mt-6 space-y-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Upload Progress ({uploadQueue.filter(i => i.status === 'done').length}/{uploadQueue.length})
                                        </h5>
                                        {uploading && (
                                            <span className="text-xs text-violet-600 font-semibold flex items-center gap-1.5">
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                Uploading files...
                                            </span>
                                        )}
                                    </div>

                                    {uploadQueue.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10"
                                        >
                                            <img
                                                src={item.preview}
                                                alt={item.name}
                                                className="w-10 h-10 rounded-lg object-cover bg-slate-200 dark:bg-slate-800"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {(item.size / 1024).toFixed(0)} KB
                                                    </span>
                                                </div>

                                                {item.status === 'uploading' && (
                                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-violet-600 rounded-full animate-pulse w-3/4" />
                                                    </div>
                                                )}

                                                {item.status === 'done' && (
                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>Uploaded successfully</span>
                                                    </div>
                                                )}

                                                {item.status === 'error' && (
                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        <span>{item.error || 'Upload error'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: FROM URL */}
                    {activeTab === 'url' && (
                        <div className="flex-1 flex flex-col p-8 max-w-xl mx-auto justify-center">
                            <div className="bg-slate-50 dark:bg-[#181b26] p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                                        <LinkIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Image from URL</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Paste any public web image address.</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Image URL (https://...)
                                    </label>
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={e => {
                                            setUrlInput(e.target.value);
                                            setUrlPreviewError(false);
                                        }}
                                        placeholder="https://images.unsplash.com/photo-..."
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#131620] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-violet-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Optional Title
                                    </label>
                                    <input
                                        type="text"
                                        value={urlNameInput}
                                        onChange={e => setUrlNameInput(e.target.value)}
                                        placeholder="e.g. Clinic Reception Desk"
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#131620] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-violet-500"
                                    />
                                </div>

                                {urlInput && !urlPreviewError && (
                                    <div className="space-y-1.5">
                                        <span className="block text-[11px] font-semibold text-slate-400">Live Preview:</span>
                                        <div className="aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center p-2 border border-slate-300 dark:border-white/10">
                                            <img
                                                src={urlInput}
                                                alt="Preview"
                                                onError={() => setUrlPreviewError(true)}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                    </div>
                                )}

                                {urlPreviewError && (
                                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-500/20">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>Image could not be loaded from this URL. Please verify the link.</span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleInsertFromUrl}
                                    disabled={!urlInput.trim() || urlPreviewError}
                                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 shadow-md shadow-violet-500/25 transition-all"
                                >
                                    Use This Image URL
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Modal Footer (Select & Insert Flow) */}
                <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#181b26]/70 flex items-center justify-between gap-4 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {selectedAsset ? (
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                    src={selectedAsset.src}
                                    alt={selectedAsset.name}
                                    className="w-8 h-8 rounded-lg object-cover border border-violet-500/40"
                                />
                                <div className="truncate">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                                        {selectedAsset.name || selectedAsset.filename}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {selectedAsset.size_formatted || 'Ready to use'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">
                                Click an image above to select it.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleInsert()}
                            disabled={!selectedAsset}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-500/25 flex items-center gap-1.5 transition-all"
                        >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>Use Selected Image</span>
                        </button>
                    </div>
                </div>

                {/* 4. Delete Confirmation Dialog */}
                {deleteConfirmAsset && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                        <div className="w-full max-w-sm bg-white dark:bg-[#181b26] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delete Image?</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        This image will be permanently removed from clinic media storage.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#131620] text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                {deleteConfirmAsset.name || deleteConfirmAsset.filename}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmAsset(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteAsset(deleteConfirmAsset)}
                                    disabled={deleting}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
