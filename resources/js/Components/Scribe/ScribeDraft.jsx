import React, { useState } from 'react';
import { Sparkles, Loader2, RotateCcw, AlertTriangle, Copy, Check, MessageCircle, Stethoscope, Bot, Ruler, PenLine } from 'lucide-react';

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

export default function ScribeDraft({ draft, canGenerate, busy, onGenerate, segmentsBySequence = {}, onJumpToSegment }) {
    const [copied, setCopied] = useState(false);
    const status = draft?.status;
    const hasDraft = (draft?.version || 0) > 0 && status !== 'generating';
    const filledFields = (draft?.sections || []).flatMap((s) => s.fields).filter((f) => f.items.length > 0);

    const copyDraft = async () => {
        const text = (draft.sections || [])
            .map((section) => {
                const lines = section.fields
                    .filter((f) => f.items.length)
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
                    </h3>
                    {draft?.template && hasDraft && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{draft.template} · version {draft.version}</p>
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

                    {filledFields.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">The transcript did not contain enough information to fill any field.</p>
                    ) : (
                        <div className="space-y-4">
                            {draft.sections.map((section) => {
                                const fields = section.fields.filter((f) => f.items.length);
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
                                                                        {item.evidence.map((seq) => (
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
