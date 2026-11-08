import React, { useState } from 'react';
import {
    Sparkles, Loader2, RotateCcw, AlertTriangle, Copy, Check,
    MessageCircle, Stethoscope, Bot, Ruler, PenLine, Trash2, FileText, ChevronDown
} from 'lucide-react';

/**
 * Phase 2 — profession-specific AI draft, shown field by field.
 *
 * Every item keeps its own source badge (client said / practitioner said /
 * AI wrote) and clickable evidence pointing back at the transcript, so the
 * practitioner can always tell what was actually said from what the AI
 * inferred. This is a proposal only; nothing here writes to the record.
 */
export const PROVENANCE = {
    client_reported: {
        label: 'Client said',
        icon: MessageCircle,
        className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    },
    practitioner_stated: {
        label: 'Practitioner said',
        icon: Stethoscope,
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    },
    practitioner_entered: {
        label: 'Practitioner entered',
        icon: PenLine,
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    },
    objective_measurement: {
        label: 'Measured',
        icon: Ruler,
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    },
    ai_generated: {
        label: 'AI wrote',
        icon: Bot,
        className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
    },
};

function formatClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function ScribeDraft({
    draft,
    canGenerate,
    busy,
    onGenerate,
    segmentsBySequence = {},
    onJumpToSegment,
    isTranslated = false,
    sourceLanguageLabel = '',
    outputLanguageLabel = 'English',
    onSelectVersion,
    onDiscardVersion,
    onHandoffVersion,
}) {
    const [copied, setCopied] = useState(false);
    const [selectedVersionNum, setSelectedVersionNum] = useState(draft?.active_version || draft?.version || 1);

    const status = draft?.status;
    const hasDraft = (draft?.version || 0) > 0 && status !== 'generating';
    const isMultilingual = Boolean(sourceLanguageLabel && outputLanguageLabel && sourceLanguageLabel !== outputLanguageLabel);

    const versions = draft?.versions || [];
    const activeVersionData = versions.find((v) => v.version === selectedVersionNum) || {
        version: draft?.version || 1,
        sections: draft?.sections || [],
        is_latest: true,
        is_discarded: Boolean(draft?.is_discarded),
        template: draft?.template,
    };

    const sections = activeVersionData.sections || draft?.sections || [];
    const isLatest = activeVersionData.is_latest ?? (selectedVersionNum === draft?.version);
    const isDiscarded = Boolean(activeVersionData.is_discarded || activeVersionData.discarded);
    const filledFields = (sections || []).flatMap((s) => s.fields || []).filter((f) => f.items && f.items.length > 0);

    const handleVersionChange = (ver) => {
        setSelectedVersionNum(ver);
        onSelectVersion?.(ver);
    };

    const copyDraft = async () => {
        const text = (sections || [])
            .map((section) => {
                const lines = (section.fields || [])
                    .filter((f) => f.items && f.items.length)
                    .map((f) => `${f.label}: ${f.items.map((i) => i.content).join(' ')}`);
                return lines.length ? `${section.title}\n${lines.join('\n')}` : null;
            })
            .filter(Boolean)
            .join('\n\n');
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked */ }
    };

    return (
        <div className="rounded-2xl border border-purple-500/25 bg-purple-500/[0.04] dark:bg-purple-400/[0.05] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8200db] dark:text-purple-300 inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI draft
                        {hasDraft && <span className="normal-case tracking-normal font-semibold text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">Proposal · review required</span>}
                        {isDiscarded && <span className="normal-case tracking-normal font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white">Discarded</span>}
                    </h3>
                    {hasDraft && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {activeVersionData.template || draft?.template || 'Clinical Note'} · version {selectedVersionNum}
                            {isLatest && ' (Latest)'}
                            {!isLatest && ' (Older version — read-only)'}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasDraft && filledFields.length > 0 && (
                        <button type="button" onClick={copyDraft} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#8200db]">
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy draft'}
                        </button>
                    )}
                    {canGenerate && (
                        <button
                            type="button"
                            onClick={onGenerate}
                            disabled={busy || status === 'generating'}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${hasDraft
                                ? 'border border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10'
                                : 'bg-[#8200db] hover:opacity-90 text-white shadow-sm'}`}
                        >
                            {status === 'generating'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : hasDraft ? <RotateCcw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {status === 'generating' ? 'Drafting…' : hasDraft ? 'Regenerate' : 'Generate AI draft'}
                        </button>
                    )}
                </div>
            </div>

            {/* Version Switcher Bar */}
            {versions.length > 1 && (
                <div className="flex items-center gap-2 pt-1 pb-1 overflow-x-auto text-xs">
                    <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider shrink-0">Versions:</span>
                    <div className="flex items-center gap-1.5">
                        {versions.map((ver) => (
                            <button
                                key={ver.version}
                                type="button"
                                onClick={() => handleVersionChange(ver.version)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${selectedVersionNum === ver.version
                                        ? 'bg-[#8200db] text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
                </div>
            )}

            {(isTranslated || isMultilingual) && hasDraft && (
                <div role="status" className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="leading-relaxed">
                        <strong>Multilingual note review:</strong> This note was drafted in {outputLanguageLabel} from {sourceLanguageLabel || 'source'} audio by AI — please verify before signing.
                    </div>
                </div>
            )}

            {isDiscarded && (
                <div role="status" className="flex items-center justify-between p-3 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>This draft version has been discarded and cannot be handed off to a clinical note.</span>
                    </div>
                </div>
            )}

            {status === 'generating' && (
                <p className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing a draft in your clinic's note format… this usually takes 5–20 seconds.
                </p>
            )}

            {status === 'failed' && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-medium text-rose-800 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{draft.error || 'The AI draft could not be generated.'} The transcript is safe; you can try again.</span>
                </div>
            )}

            {!status && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Turn this transcript into a draft in your clinic's note template. Each line shows who it came from and links back to the transcript.
                </p>
            )}

            {hasDraft && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                            {['client_reported', 'practitioner_stated', 'ai_generated'].map((key) => {
                                const p = PROVENANCE[key];
                                const Icon = p.icon;
                                return (
                                    <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${p.className}`}>
                                        <Icon className="w-3 h-3" /> {p.label}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Actions for this version */}
                        <div className="flex items-center gap-2">
                            {!isDiscarded && onDiscardVersion && (
                                <button
                                    type="button"
                                    onClick={() => onDiscardVersion(selectedVersionNum)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold transition disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Discard draft
                                </button>
                            )}

                            {!isDiscarded && onHandoffVersion && (
                                <button
                                    type="button"
                                    onClick={() => onHandoffVersion(selectedVersionNum)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#8200db] hover:bg-[#6b00b5] text-white text-xs font-bold transition disabled:opacity-50 shadow-xs"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Use this version in note
                                </button>
                            )}
                        </div>
                    </div>

                    {filledFields.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">The transcript did not contain enough information to fill any field.</p>
                    ) : (
                        <div className="space-y-4">
                            {sections.map((section) => {
                                const fields = (section.fields || []).filter((f) => f.items && f.items.length);
                                if (!fields.length) return null;
                                return (
                                    <div key={section.id || section.title}>
                                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{section.title}</h4>
                                        <div className="space-y-2.5">
                                            {fields.map((field) => (
                                                <div key={field.id} className="rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/70 dark:border-white/10 p-3">
                                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">{field.label}</p>
                                                    <ul className="space-y-2">
                                                        {field.items.map((item) => {
                                                            const p = PROVENANCE[item.provenance] || PROVENANCE.ai_generated;
                                                            const Icon = p.icon;
                                                            return (
                                                                <li key={item.id} className="flex flex-col gap-1">
                                                                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{item.content}</p>
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${p.className}`}>
                                                                            <Icon className="w-3 h-3" /> {p.label}
                                                                        </span>
                                                                        {(item.evidence || []).map((seq) => (
                                                                            <button
                                                                                key={seq}
                                                                                type="button"
                                                                                onClick={() => onJumpToSegment?.(seq)}
                                                                                title="Show in transcript"
                                                                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-purple-500/15 hover:text-purple-700 dark:hover:text-purple-300"
                                                                            >
                                                                                ↳ {segmentsBySequence[seq] ? formatClock(segmentsBySequence[seq].start_ms) : `#${seq}`}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
