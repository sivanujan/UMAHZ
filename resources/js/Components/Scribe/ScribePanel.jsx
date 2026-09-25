import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { GlassModal } from '@/Components/UI/GlassModal';
import SignaturePad from '@/Components/SignaturePad';
import useScribeRecorder from '@/Components/Scribe/useScribeRecorder';
import ScribeDraft from '@/Components/Scribe/ScribeDraft';
import {
    Mic, Pause, Play, Square, ShieldCheck, ShieldOff, AlertTriangle, Loader2,
    RotateCcw, FileText, Copy, Check, PenLine, Type, ExternalLink, Info,
} from 'lucide-react';

/**
 * AI Scribe panel — Phase 1: consent gate -> capture -> near-live transcript.
 *
 * Near-live updates use short polling (every 2.5s while work is in flight).
 * UMAHZ has no websocket/broadcasting stack; polling needs no extra server
 * process, survives flaky networks, and a few seconds of latency is fine for a
 * transcript that only exists for the practitioner's later review.
 *
 * Scribe only ever produces a transcript for review. It never writes, finalizes
 * or signs a clinical note — that stays in the Clinical Notes flow.
 */
const POLL_MS = 2500;
const ACTIVE_STATUSES = ['recording', 'paused', 'transcribing'];

function formatClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function formatInZone(iso, timeZone) {
    if (!iso) return '';
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone || undefined,
        }).format(new Date(iso));
    } catch {
        return new Date(iso).toLocaleString();
    }
}

function Banner({ tone = 'info', icon: Icon = Info, children, action }) {
    const tones = {
        info: 'bg-purple-500/10 border-purple-500/25 text-purple-800 dark:text-purple-200',
        warn: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200',
        error: 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200',
        success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200',
    };
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium ${tones[tone]}`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{children}</div>
            {action}
        </div>
    );
}

function ConsentStep({ session, clientName, onCaptured, isOwner }) {
    const type = session.consent_type;
    const [signerName, setSignerName] = useState(clientName || '');
    const [mode, setMode] = useState('typed');
    const [signature, setSignature] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!type?.is_configured) {
        return (
            <Banner tone="warn" icon={AlertTriangle}>
                <p className="font-bold mb-1">Recording consent wording has not been set up.</p>
                <p>
                    Before anyone can be recorded, a clinic owner must enter the clinic's own
                    “{type?.name || 'Recording & AI Transcription Consent'}” text under Settings → Consents.
                </p>
                {isOwner && (
                    <a href="/app/settings/consents" className="inline-flex items-center gap-1 mt-2 font-bold underline">
                        Open consent settings <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </Banner>
        );
    }

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        const signatureData = mode === 'typed' ? signerName.trim() : signature;
        if (!signerName.trim() || !signatureData) {
            setError('Enter the client’s name and signature.');
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await axios.post(`/app/scribe/sessions/${session.id}/consent`, {
                signer_name: signerName.trim(),
                signature_type: mode,
                signature_data: signatureData,
                confirmed,
            });
            onCaptured(data.session);
        } catch (err) {
            const errors = err?.response?.data?.errors;
            setError(errors ? Object.values(errors).flat()[0] : (err?.response?.data?.message || 'Consent could not be saved.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8200db] dark:text-purple-300">
                <ShieldCheck className="w-4 h-4" /> Step 1 · Client consent for this encounter
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4 max-h-48 overflow-y-auto">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                    {type.name} · v{type.version}
                </p>
                {type.agreement_source === 'pdf' ? (
                    <a href={type.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#8200db] dark:text-purple-300 underline">
                        Open the consent document <ExternalLink className="w-3 h-3" />
                    </a>
                ) : (
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">{type.body}</p>
                )}
            </div>

            <div>
                <label htmlFor="scribe-signer" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Client name</label>
                <input
                    id="scribe-signer"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
            </div>

            <div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 w-fit mb-2">
                    {[['typed', 'Typed', Type], ['draw', 'Draw', PenLine]].map(([value, label, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setMode(value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode === value ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                            <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                    ))}
                </div>
                {mode === 'draw' ? (
                    <SignaturePad onSignatureChange={setSignature} />
                ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">The client’s typed name above is recorded as their signature.</p>
                )}
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                <span>The client has read (or had read to them) the text above and explicitly agrees to this appointment being audio-recorded and transcribed. They know they can withdraw at any time.</span>
            </label>

            {error && <Banner tone="error" icon={AlertTriangle}>{error}</Banner>}

            <button
                type="submit"
                disabled={!confirmed || submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8200db] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition shadow-sm"
            >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Record consent
            </button>
        </form>
    );
}

function WithdrawConsent({ session, onWithdrawn, beforeWithdraw }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const submit = async () => {
        if (!reason.trim()) return setError('A reason is required.');
        setBusy(true);
        setError(null);
        beforeWithdraw?.(); // stop the microphone first — withdrawal is immediate
        try {
            const { data } = await axios.post(`/app/scribe/sessions/${session.id}/consent/withdraw`, { reason: reason.trim() });
            onWithdrawn(data.session);
            setOpen(false);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not withdraw consent.');
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline">
                <ShieldOff className="w-3.5 h-3.5" /> Client withdraws consent
            </button>
        );
    }

    return (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                Recording stops immediately and audio not yet transcribed is discarded without being sent.
            </p>
            <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason (e.g. client asked to stop recording)"
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={submit} disabled={busy} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50">
                    {busy ? 'Withdrawing…' : 'Withdraw consent & stop'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">Cancel</button>
            </div>
        </div>
    );
}

export default function ScribePanel({ clientId, clientName, appointmentId = null, onClose }) {
    const { auth } = usePage().props;
    const isOwner = auth?.user?.role === 'clinic_owner';

    const [session, setSession] = useState(null);
    const [segments, setSegments] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const [copied, setCopied] = useState(false);
    const transcriptRef = useRef(null);
    const [highlightSeq, setHighlightSeq] = useState(null);

    const applySession = useCallback((next, { replaceSegments = false } = {}) => {
        if (!next) return;
        setSession(next);
        setSegments((prev) => {
            if (replaceSegments) return next.segments || [];
            const bySeq = new Map(prev.map((s) => [s.sequence, s]));
            (next.segments || []).forEach((s) => bySeq.set(s.sequence, s));
            return [...bySeq.values()].sort((a, b) => a.sequence - b.sequence);
        });
    }, []);

    const recorder = useScribeRecorder({
        sessionId: session?.id,
        onSessionUpdate: (s) => applySession(s),
        onConsentRevoked: (message) => setNotice(message || 'Consent is no longer valid. Recording has stopped.'),
    });
    // Stable handle for effects (the hook returns a new object every render).
    const recorderRef = useRef(recorder);
    recorderRef.current = recorder;

    // Open (or resume) the session for this encounter.
    useEffect(() => {
        let cancelled = false;
        axios.post('/app/scribe/sessions', { client_id: clientId, appointment_id: appointmentId })
            .then(({ data }) => !cancelled && applySession(data.session, { replaceSegments: true }))
            .catch((err) => !cancelled && setLoadError(err?.response?.data?.message || 'AI Scribe could not be opened.'));
        return () => { cancelled = true; };
    }, [clientId, appointmentId, applySession]);

    const lastSequence = segments.length ? segments[segments.length - 1].sequence : -1;
    const status = session?.status;
    // Poll while capture/transcription runs, and while an AI draft is being written.
    const shouldPoll = ACTIVE_STATUSES.includes(status) || session?.draft?.status === 'generating';

    // Near-live transcript: poll for new segments while work is in flight.
    useEffect(() => {
        if (!session?.id || !shouldPoll) return undefined;
        const id = setInterval(async () => {
            try {
                const { data } = await axios.get(`/app/scribe/sessions/${session.id}`, { params: { after_sequence: lastSequence } });
                applySession(data.session);
                // Consent withdrawn elsewhere (e.g. client profile): stop the mic now.
                if (!data.session.has_valid_consent && ['live', 'paused'].includes(recorderRef.current.micState)) {
                    recorderRef.current.halt();
                    setNotice('Consent was withdrawn. Recording has stopped.');
                }
            } catch { /* transient; next poll retries */ }
        }, POLL_MS);
        return () => clearInterval(id);
    }, [session?.id, shouldPoll, lastSequence, applySession]);

    useEffect(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, [segments.length]);

    // Warn before leaving the page mid-recording.
    useEffect(() => {
        if (!['live', 'paused'].includes(recorder.micState)) return undefined;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [recorder.micState]);

    const call = async (action) => {
        setActionError(null);
        try {
            const { data } = await axios.post(`/app/scribe/sessions/${session.id}/${action}`);
            applySession(data.session);
            return data;
        } catch (err) {
            if (err?.response?.data?.session) applySession(err.response.data.session);
            if (err?.response?.status === 403) {
                recorder.halt();
                setNotice(err.response.data?.message);
            } else {
                setActionError(err?.response?.data?.message || 'Something went wrong. Please try again.');
            }
            throw err;
        }
    };

    const handleStart = async () => {
        setBusy(true);
        try {
            // Mic first: a denied permission must not flip the session to "recording".
            if (!(await recorder.acquireMic())) return;
            const data = await call('start');
            recorder.begin({ nextSequence: data.session.next_sequence, offsetMs: data.session.recorded_ms });
        } catch {
            recorder.releaseMic();
        } finally {
            setBusy(false);
        }
    };

    const handlePause = async () => {
        setBusy(true);
        try {
            await recorder.pause();
            await call('pause');
        } catch { /* surfaced */ } finally { setBusy(false); }
    };

    const handleResume = async () => {
        setBusy(true);
        try {
            if (!recorder.micState || recorder.micState === 'stopped' || recorder.micState === 'idle') {
                if (!(await recorder.acquireMic())) return;
                const data = await call('resume');
                recorder.begin({ nextSequence: data.session.next_sequence, offsetMs: data.session.recorded_ms });
            } else {
                await call('resume');
                recorder.resume();
            }
        } catch { /* surfaced */ } finally { setBusy(false); }
    };

    const handleStop = async () => {
        setBusy(true);
        try {
            const allUploaded = await recorder.finish();
            if (!allUploaded) {
                setActionError('Some audio has not uploaded yet. Retry the upload before stopping.');
                return;
            }
            await call('stop');
        } catch { /* surfaced */ } finally { setBusy(false); }
    };

    // The page was reloaded mid-recording: the server is still "recording" but
    // this tab has no microphone yet. Reattach without changing server state.
    const handleReconnect = async () => {
        setBusy(true);
        try {
            if (await recorder.acquireMic()) {
                recorder.begin({ nextSequence: session.next_sequence, offsetMs: session.recorded_ms });
            }
        } finally { setBusy(false); }
    };

    const handleGenerateDraft = async () => {
        setBusy(true);
        try { await call('draft'); } catch { /* surfaced */ } finally { setBusy(false); }
    };

    // Phase 3: pre-fill a DRAFT clinical note, then open it for review.
    const handleHandoff = async () => {
        setBusy(true);
        try {
            const data = await call('handoff');
            if (data?.redirect) window.location.href = data.redirect;
        } catch { /* surfaced */ } finally { setBusy(false); }
    };

    const jumpToSegment = (seq) => {
        const el = transcriptRef.current?.querySelector(`[data-seq="${seq}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightSeq(seq);
        setTimeout(() => setHighlightSeq(null), 2000);
    };

    const handleRetryChunks = async () => {
        setBusy(true);
        try { await call('chunks/retry'); } catch { /* surfaced */ } finally { setBusy(false); }
    };

    const handleClose = async () => {
        if (['live', 'paused'].includes(recorder.micState)) {
            if (!window.confirm('Stop recording and close AI Scribe? Audio captured so far will still be transcribed.')) return;
            await handleStop();
        }
        onClose();
    };

    const copyTranscript = async () => {
        try {
            await navigator.clipboard.writeText(segments.map((s) => s.text).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked */ }
    };

    const needsConsent = status === 'consent_pending' && !session?.has_valid_consent;
    const readyToStart = status === 'consent_pending' && session?.has_valid_consent;
    const isRecording = status === 'recording';
    const isPaused = status === 'paused';
    const canUseDraft = canRecord && status === 'draft_ready' && session?.draft?.status === 'ready';
    const micDetached = isRecording && recorder.micState !== 'live' && recorder.micState !== 'requesting';
    const canRecord = session?.can_record;
    const failed = session?.chunks?.failed || 0;
    const pendingTranscription = (session?.chunks?.pending || 0) + recorder.pendingUploads;
    const elapsed = recorder.micState === 'idle' ? (session?.recorded_ms || 0) : recorder.elapsedMs;

    const subtitle = useMemo(() => {
        if (!session) return 'Preparing…';
        const parts = [session.client?.name || clientName];
        if (session.discipline_label) parts.push(session.discipline_label);
        if (session.appointment?.starts_at) parts.push(formatInZone(session.appointment.starts_at, session.timezone));
        return parts.filter(Boolean).join(' · ');
    }, [session, clientName]);

    return (
        <GlassModal isOpen onClose={handleClose} title="AI Scribe" subtitle={subtitle} maxWidth="max-w-3xl">
            <div className="space-y-4">
                {loadError && <Banner tone="error" icon={AlertTriangle}>{loadError}</Banner>}

                {!session && !loadError && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-8 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" /> Opening secure session…
                    </div>
                )}

                {session && (
                    <>
                        {notice && <Banner tone="warn" icon={ShieldOff}>{notice}</Banner>}
                        {recorder.micError && <Banner tone="error" icon={Mic}>{recorder.micError}</Banner>}
                        {actionError && <Banner tone="error" icon={AlertTriangle}>{actionError}</Banner>}
                        {recorder.uploadError && (
                            <Banner
                                tone="error"
                                icon={AlertTriangle}
                                action={(
                                    <button type="button" onClick={recorder.retryUploads} className="shrink-0 inline-flex items-center gap-1 font-bold underline">
                                        <RotateCcw className="w-3 h-3" /> Retry upload
                                    </button>
                                )}
                            >
                                {recorder.uploadError}
                            </Banner>
                        )}

                        {needsConsent && canRecord && (
                            <ConsentStep session={session} clientName={clientName} isOwner={isOwner} onCaptured={(s) => applySession(s)} />
                        )}
                        {needsConsent && !canRecord && (
                            <Banner>Only the practitioner running this encounter can capture consent and record.</Banner>
                        )}

                        {session.consent && (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1.5">
                                    {session.has_valid_consent
                                        ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        : <ShieldOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                                    Consent {session.has_valid_consent ? 'given' : 'withdrawn'} by <strong className="font-bold text-slate-800 dark:text-slate-200">{session.consent.signer_name}</strong>
                                    · v{session.consent.version} · {formatInZone(session.consent.agreed_at, session.timezone)}
                                </span>
                                {session.has_valid_consent && !['consent_withdrawn', 'handed_off'].includes(status) && (
                                    <WithdrawConsent session={session} onWithdrawn={(s) => { applySession(s); setNotice('Consent withdrawn. Recording stopped and untranscribed audio was discarded.'); }} beforeWithdraw={recorder.halt} />
                                )}
                            </div>
                        )}

                        {(readyToStart || isRecording || isPaused) && canRecord && (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                                <div className="flex items-center gap-3">
                                    {isRecording ? (
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-extrabold uppercase tracking-wider" aria-live="polite">
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Recording
                                        </span>
                                    ) : isPaused ? (
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-extrabold uppercase tracking-wider">
                                            <Pause className="w-3 h-3" /> Paused
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold uppercase tracking-wider">
                                            Ready
                                        </span>
                                    )}
                                    <span className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatClock(elapsed)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {readyToStart && (
                                        <button type="button" onClick={handleStart} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm disabled:opacity-50">
                                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} Start recording
                                        </button>
                                    )}
                                    {micDetached && (
                                        <button type="button" onClick={handleReconnect} disabled={busy} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-50">
                                            <Mic className="w-4 h-4" /> Reconnect microphone
                                        </button>
                                    )}
                                    {isRecording && !micDetached && (
                                        <button type="button" onClick={handlePause} disabled={busy} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-100 text-sm font-bold hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-50">
                                            <Pause className="w-4 h-4" /> Pause
                                        </button>
                                    )}
                                    {isPaused && (
                                        <button type="button" onClick={handleResume} disabled={busy} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8200db] hover:opacity-90 text-white text-sm font-bold disabled:opacity-50">
                                            <Play className="w-4 h-4" /> Resume
                                        </button>
                                    )}
                                    {(isRecording || isPaused) && (
                                        <button type="button" onClick={handleStop} disabled={busy} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 disabled:opacity-50">
                                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {status === 'transcribing' && (
                            <Banner icon={Loader2}>Finishing transcription of the last {pendingTranscription || ''} part{pendingTranscription === 1 ? '' : 's'}…</Banner>
                        )}
                        {failed > 0 && ['transcribing', 'transcript_ready', 'recording', 'paused'].includes(status) && (
                            <Banner
                                tone="error"
                                icon={AlertTriangle}
                                action={canRecord && session.has_valid_consent && (
                                    <button type="button" onClick={handleRetryChunks} disabled={busy} className="shrink-0 inline-flex items-center gap-1 font-bold underline">
                                        <RotateCcw className="w-3 h-3" /> Retry
                                    </button>
                                )}
                            >
                                {failed} part{failed === 1 ? '' : 's'} of the recording could not be transcribed{session.last_error ? ` (${session.last_error})` : ''}. Text already transcribed is safe.
                            </Banner>
                        )}
                        {status === 'transcript_ready' && failed === 0 && !session.draft?.status && (
                            <Banner tone="success" icon={Check}>Transcript ready. Generate an AI draft below, or write your note yourself. Nothing has been added to the record automatically.</Banner>
                        )}

                        {!needsConsent && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" /> Transcript
                                        <span className="normal-case tracking-normal font-semibold text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">AI transcription · unreviewed</span>
                                    </h3>
                                    {segments.length > 0 && (
                                        <button type="button" onClick={copyTranscript} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#8200db]">
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    )}
                                </div>
                                <div ref={transcriptRef} className="h-64 overflow-y-auto rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 space-y-3" aria-live="polite">
                                    {segments.length === 0 ? (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-20">
                                            {isRecording ? 'Listening… the first words appear about 15 seconds after you start.' : 'No transcript yet.'}
                                        </p>
                                    ) : segments.map((s) => (
                                        <div key={s.sequence} data-seq={s.sequence} className={`flex gap-3 rounded-lg transition-colors ${highlightSeq === s.sequence ? 'bg-purple-500/15' : ''}`}>
                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-0.5 shrink-0 tabular-nums">{formatClock(s.start_ms)}</span>
                                            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{s.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {['transcript_ready', 'draft_ready', 'handed_off'].includes(status) && segments.length > 0 && (
                            <ScribeDraft
                                draft={session.draft}
                                canGenerate={canRecord && session.has_valid_consent && status !== 'handed_off'}
                                busy={busy}
                                onGenerate={handleGenerateDraft}
                                segmentsBySequence={Object.fromEntries(segments.map((s) => [s.sequence, s]))}
                                onJumpToSegment={jumpToSegment}
                            />
                        )}

                        {status === 'handed_off' && session.clinical_note && (
                            <Banner
                                tone="success"
                                icon={Check}
                                action={(
                                    <a href={session.clinical_note.url} className="shrink-0 inline-flex items-center gap-1 font-bold underline">
                                        <FileText className="w-3 h-3" /> Open note
                                    </a>
                                )}
                            >
                                {session.clinical_note.status === 'draft'
                                    ? 'This draft was sent to the clinical note. Review and edit it there, then sign.'
                                    : 'The clinical note from this draft has been signed.'}
                            </Banner>
                        )}

                        {['transcript_ready', 'draft_ready'].includes(status) && (
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                                    {canUseDraft
                                        ? 'Sends the draft into a DRAFT clinical note. Empty fields are filled; anything already typed is kept. You review, edit and sign it there.'
                                        : 'The AI draft is a proposal. You review, edit and sign the note in Clinical Notes.'}
                                </p>
                                {canUseDraft ? (
                                    <button
                                        type="button"
                                        onClick={handleHandoff}
                                        disabled={busy}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8200db] hover:opacity-90 text-white text-xs font-bold shadow-sm disabled:opacity-50"
                                    >
                                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Use this draft in the clinical note
                                    </button>
                                ) : (
                                    <a
                                        href={`/app/clients/${session.client.id}/notes/create${session.appointment ? `?appointment_id=${session.appointment.id}` : ''}`}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 text-xs font-bold"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Write note myself
                                    </a>
                                )}
                            </div>
                        )}

                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border-t border-slate-200/60 dark:border-white/10 pt-3">
                            Audio is encrypted, sent to the transcription service, and
                            {session.audio_retention?.audio_retention_mode === 'retain_window'
                                ? ` deleted after ${session.audio_retention.audio_retention_hours}h.`
                                : ' deleted as soon as it is transcribed.'}
                            {' '}Only you and the clinic owner can view this transcript.
                        </p>
                    </>
                )}
            </div>
        </GlassModal>
    );
}
