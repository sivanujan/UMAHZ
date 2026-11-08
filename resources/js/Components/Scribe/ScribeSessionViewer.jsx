import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, Sparkles, Mic, FileText, Clock, User, Globe, AlertTriangle,
    Copy, Check, ChevronDown, Trash2, ArrowUpRight, Loader2,
    Calendar, CheckCircle2, Languages, Columns
} from 'lucide-react';
import { PROVENANCE } from './ScribeDraft';

function formatClock(ms) {
    if (!ms && ms !== 0) return '—';
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ScribeSessionViewer({
    sessionId,
    isOpen = true,
    onClose,
    onUseVersionInNote,
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);

    // Active tab in viewer: 'transcript' or 'draft'
    const [activeTab, setActiveTab] = useState('transcript');

    // Transcript mode: 'original', 'translated', or 'side_by_side'
    const [transcriptMode, setTranscriptMode] = useState('side_by_side');

    // Selected draft version number
    const [selectedVersion, setSelectedVersion] = useState(null);

    const [copied, setCopied] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    useEffect(() => {
        if (!isOpen || !sessionId) return;
        fetchSession(sessionId);
    }, [sessionId, isOpen]);

    const fetchSession = async (id, targetVersion = null) => {
        setLoading(true);
        setError(null);
        try {
            const url = targetVersion
                ? `/app/scribe/sessions/${id}?version=${targetVersion}`
                : `/app/scribe/sessions/${id}`;
            const res = await axios.get(url);
            const sess = res.data.session;
            setSession(sess);

            const v = targetVersion || sess.draft?.active_version || sess.draft?.version;
            setSelectedVersion(v);

            // Default transcript mode based on language: if non-English, show side_by_side by default
            if (sess.is_non_english || sess.is_translated) {
                setTranscriptMode('side_by_side');
            } else {
                setTranscriptMode('original');
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load Scribe session.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVersion = (versionNum) => {
        setSelectedVersion(versionNum);
        if (session?.id) {
            fetchSession(session.id, versionNum);
        }
    };

    const handleCopyTranscript = async () => {
        if (!session?.segments) return;
        const text = session.segments.map((s) => {
            const time = formatClock(s.start_ms);
            if (transcriptMode === 'side_by_side') {
                return `[${time}] Original (${session.language_label || 'Mandarin'}): ${s.text}\n[${time}] AI Translation (English): ${s.translated_text || s.text}`;
            }
            if (transcriptMode === 'translated') {
                return `[${time}] ${s.translated_text || s.text}`;
            }
            return `[${time}] ${s.text}`;
        }).join('\n\n');

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked */ }
    };

    const handleDiscardDraft = async () => {
        if (!session || !selectedVersion) return;
        if (!window.confirm(`Are you sure you want to discard draft version ${selectedVersion}? This will mark it as discarded in the audit log without deleting historical data.`)) {
            return;
        }

        setActionBusy(true);
        try {
            await axios.post(`/app/scribe/sessions/${session.id}/discard-draft`, {
                version: selectedVersion,
            });
            setActionMessage({ type: 'success', text: `Draft version ${selectedVersion} marked as discarded.` });
            await fetchSession(session.id, selectedVersion);
        } catch (err) {
            setActionMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to discard draft version.' });
        } finally {
            setActionBusy(false);
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handleHandoff = async () => {
        if (!session || !selectedVersion) return;
        setActionBusy(true);
        try {
            const res = await axios.post(`/app/scribe/sessions/${session.id}/handoff`, {
                version: selectedVersion,
            });
            if (onUseVersionInNote) {
                onUseVersionInNote(res.data);
            } else if (res.data?.redirect) {
                window.location.href = res.data.redirect;
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to hand off draft version.' });
            setActionBusy(false);
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    if (!isOpen) return null;

    const spokenLang = session?.language_label || 'Mandarin (Chinese)';
    const versions = session?.draft?.versions || [];
    const activeVersionData = versions.find((v) => v.version === selectedVersion) || (versions.length > 0 ? versions[versions.length - 1] : null);
    const isDiscarded = Boolean(activeVersionData?.is_discarded || activeVersionData?.discarded || session?.draft?.is_discarded);
    const isLatest = Boolean(activeVersionData?.is_latest || activeVersionData?.latest);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-[#8200db] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Sparkles className="w-3.5 h-3.5" /> Past Scribe Session (Read-Only)
                            </span>
                            {session && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    session.status === 'handed_off'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                    {session.status === 'handed_off' ? 'Handed off to clinical note' : (session.status_label || session.status)}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{session?.client?.name ? `Encounter — ${session.client.name}` : 'Encounter Conversation'}</span>
                        </h2>
                        {session && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {session.started_at ? new Date(session.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Past encounter'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                                    Spoken: <strong className="text-slate-700 dark:text-slate-200">{spokenLang}</strong>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    Duration: <strong className="text-slate-700 dark:text-slate-200">{session.recorded_ms ? formatClock(session.recorded_ms) : '—'}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Close viewer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Linked Clinical Note Callout */}
                {session?.clinical_note && (
                    <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>This conversation was used to draft a clinical note ({session.clinical_note.status}).</span>
                        </div>
                        {session.clinical_note.url && (
                            <a
                                href={session.clinical_note.url}
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                            >
                                Open Clinical Note <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                )}

                {/* Action Feedback Message */}
                {actionMessage && (
                    <div className={`px-5 py-2 text-xs font-semibold ${actionMessage.type === 'error' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}`}>
                        {actionMessage.text}
                    </div>
                )}

                {/* Main Tabs (Transcript vs AI Draft) */}
                <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('transcript')}
                            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition inline-flex items-center gap-2 ${
                                activeTab === 'transcript'
                                    ? 'border-[#8200db] text-[#8200db] dark:text-purple-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            <Mic className="w-4 h-4" /> Full Conversation
                            {session?.segments?.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
                                    {session.segments.length}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('draft')}
                            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition inline-flex items-center gap-2 ${
                                activeTab === 'draft'
                                    ? 'border-[#8200db] text-[#8200db] dark:text-purple-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" /> AI Drafts
                            {versions.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 font-mono text-purple-700 dark:text-purple-300">
                                    {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'transcript' && session?.segments?.length > 0 && (
                        <button
                            type="button"
                            onClick={handleCopyTranscript}
                            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#8200db] inline-flex items-center gap-1.5 pb-2"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy transcript'}
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30">
                    {session?.is_consent_withdrawn && (
                        <div className="mb-4 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="font-bold">Transcript hidden because the client withdrew consent</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#8200db]" />
                            <p className="text-sm">Loading encounter details…</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-sm">
                            <p className="font-bold">Error loading session</p>
                            <p className="text-xs mt-1">{error}</p>
                        </div>
                    ) : activeTab === 'transcript' ? (
                        <div className="space-y-4">
                            {/* Transcript View Options: 1) Original, 2) Translation, 3) Side by side */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                                    View Mode:
                                </span>
                                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setTranscriptMode('original')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                            transcriptMode === 'original'
                                                ? 'bg-white dark:bg-slate-900 text-[#8200db] dark:text-purple-300 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        Original - {spokenLang}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTranscriptMode('translated')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                            transcriptMode === 'translated'
                                                ? 'bg-white dark:bg-slate-900 text-[#8200db] dark:text-purple-300 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        AI translation - English
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTranscriptMode('side_by_side')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                                            transcriptMode === 'side_by_side'
                                                ? 'bg-white dark:bg-slate-900 text-[#8200db] dark:text-purple-300 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        <Columns className="w-3.5 h-3.5" /> Side by side
                                    </button>
                                </div>
                            </div>

                            {/* Transcript Segments */}
                            {session?.is_consent_withdrawn ? (
                                <div className="text-center py-16 px-4 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/60 p-8 shadow-xs">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        Transcript hidden because the client withdrew consent
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                        The client withdrew recording consent for this session. In compliance with patient privacy rights and medical regulations, the transcript audio and text have been removed and cannot be displayed.
                                    </p>
                                </div>
                            ) : (!session.segments || session.segments.length === 0) ? (
                                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                    No transcript segments recorded for this session.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {session.segments.map((seg, idx) => {
                                        const time = formatClock(seg.start_ms);
                                        const origText = seg.text;
                                        const transText = seg.translated_text || seg.text;

                                        if (transcriptMode === 'side_by_side') {
                                            return (
                                                <div
                                                    key={seg.id || idx}
                                                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1">
                                                        <span>Turn #{seg.sequence ?? idx + 1}</span>
                                                        <span className="font-semibold text-slate-500">{time}</span>
                                                    </div>

                                                    {/* Desktop: Side-by-side; Mobile: Stacks vertically */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                                        {/* Original */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                                Original - {spokenLang}
                                                            </div>
                                                            <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                                                                {origText}
                                                            </p>
                                                        </div>

                                                        {/* AI Translation */}
                                                        <div className="space-y-1 md:border-l md:border-slate-200 md:dark:border-slate-800 md:pl-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                                                                <span className="w-2 h-2 rounded-full bg-[#8200db]"></span>
                                                                AI translation - English
                                                            </div>
                                                            <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                                                                {transText}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Single Mode: Original or Translated
                                        const displayText = transcriptMode === 'translated' ? transText : origText;
                                        const label = transcriptMode === 'translated' ? 'AI translation - English' : `Original - ${spokenLang}`;

                                        return (
                                            <div
                                                key={seg.id || idx}
                                                className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-start"
                                            >
                                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5 shrink-0 tabular-nums">
                                                    {time}
                                                </span>
                                                <div className="space-y-0.5 flex-1">
                                                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                                                        {displayText}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        {label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* AI Draft Tab */
                        <div className="space-y-4">
                            {/* Version Selector Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Draft Version:</span>
                                    {versions.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {versions.map((ver) => (
                                                <button
                                                    key={ver.version}
                                                    type="button"
                                                    onClick={() => handleSelectVersion(ver.version)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                                                        selectedVersion === ver.version
                                                            ? 'bg-[#8200db] text-white shadow-xs'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    <span>v{ver.version}</span>
                                                    {ver.is_latest && (
                                                        <span className="text-[10px] px-1 py-0.2 rounded bg-white/20 font-normal">Latest</span>
                                                    )}
                                                    {ver.is_discarded && (
                                                        <span className="text-[10px] px-1 py-0.2 rounded bg-rose-500 text-white font-normal">Discarded</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400">No versions recorded</span>
                                    )}
                                </div>

                                {/* Discard / Status Actions */}
                                <div className="flex items-center gap-2">
                                    {isDiscarded ? (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                            Discarded
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleDiscardDraft}
                                            disabled={actionBusy}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold transition disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Discard draft
                                        </button>
                                    )}

                                    {!isDiscarded && (
                                        <button
                                            type="button"
                                            onClick={handleHandoff}
                                            disabled={actionBusy}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8200db] hover:bg-[#6b00b5] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                                        >
                                            {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                            Use this version in clinical note
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Version metadata & Template */}
                            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-1">
                                <span>Template: <strong>{activeVersionData?.template || session?.draft?.template || 'Standard Clinical Note'}</strong></span>
                                {activeVersionData?.generated_at && (
                                    <span>Generated: {new Date(activeVersionData.generated_at).toLocaleString()}</span>
                                )}
                            </div>

                            {/* Section Items for Active Version */}
                            {(!activeVersionData?.sections || activeVersionData.sections.length === 0) ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    No content available for draft version {selectedVersion}.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeVersionData.sections.map((section) => {
                                        const fieldsWithItems = section.fields.filter((f) => f.items && f.items.length > 0);
                                        if (fieldsWithItems.length === 0) return null;

                                        return (
                                            <div key={section.id || section.title} className="space-y-2">
                                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 pl-1">
                                                    {section.title}
                                                </h4>
                                                <div className="space-y-2.5">
                                                    {fieldsWithItems.map((field) => (
                                                        <div key={field.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{field.label}</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {field.items.map((item) => {
                                                                    const p = PROVENANCE[item.provenance] || PROVENANCE.ai_generated;
                                                                    const Icon = p.icon;
                                                                    return (
                                                                        <div key={item.id} className="space-y-1">
                                                                            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                                                                                {item.content}
                                                                            </p>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${p.className}`}>
                                                                                    <Icon className="w-3 h-3" /> {p.label}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Past session records and translations are encrypted at rest.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

