import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * Microphone capture for AI Scribe.
 *
 * Why the recorder is restarted every CHUNK_MS instead of using
 * MediaRecorder's `timeslice`: timeslice blobs after the first one have no
 * container header, so they cannot be transcribed on their own. Restarting
 * yields short, fully self-contained files that AssemblyAI (or any provider)
 * accepts independently, so chunks can be transcribed in parallel and retried
 * one by one. The gap between recorders is a few milliseconds.
 *
 * Uploads run strictly in sequence with retry/backoff. A 403 from the server
 * means consent is no longer valid: capture stops immediately.
 */
export const CHUNK_MS = 12000;
const UPLOAD_BACKOFF_MS = [1000, 3000, 8000, 15000];

const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

function pickMimeType() {
    if (typeof window === 'undefined' || !window.MediaRecorder) return null;
    return PREFERRED_TYPES.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || '';
}

function extensionFor(mime) {
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('mp4')) return 'm4a';
    return 'webm';
}

export function describeMicError(err) {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'Microphone access needs a secure (HTTPS) connection. Open UMAHZ over https:// to use AI Scribe.';
    }
    switch (err?.name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'Microphone permission was denied. Allow microphone access for this site in your browser settings, then try again.';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'No microphone was found. Connect a microphone and try again.';
        case 'NotReadableError':
            return 'Your microphone is being used by another application. Close it and try again.';
        default:
            return 'Could not start the microphone. Check your browser permissions and device, then try again.';
    }
}

export default function useScribeRecorder({ sessionId, onConsentRevoked, onSessionUpdate }) {
    const [micState, setMicState] = useState('idle'); // idle | requesting | live | paused | stopped
    const [micError, setMicError] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [pendingUploads, setPendingUploads] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);

    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const timerRef = useRef(null);
    const tickRef = useRef(null);
    const runningRef = useRef(false);
    const sequenceRef = useRef(0);
    const offsetRef = useRef(0);
    const segmentStartRef = useRef(0);
    const queueRef = useRef([]);
    const drainingRef = useRef(null);
    const mimeRef = useRef('');
    const haltedRef = useRef(false);

    const callbacks = useRef({ onConsentRevoked, onSessionUpdate });
    callbacks.current = { onConsentRevoked, onSessionUpdate };

    const releaseMic = useCallback(() => {
        clearTimeout(timerRef.current);
        clearInterval(tickRef.current);
        runningRef.current = false;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    /** Hard stop (consent revoked / unmount): drop everything not yet sent. */
    const halt = useCallback(() => {
        haltedRef.current = true;
        queueRef.current = [];
        setPendingUploads(0);
        try {
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.onstop = null;
                recorderRef.current.stop();
            }
        } catch (_) { /* already stopped */ }
        releaseMic();
        setMicState('stopped');
    }, [releaseMic]);

    const drain = useCallback(() => {
        if (drainingRef.current) return drainingRef.current;

        drainingRef.current = (async () => {
            while (queueRef.current.length && !haltedRef.current) {
                const item = queueRef.current[0];
                let sent = false;

                for (let attempt = 0; attempt <= UPLOAD_BACKOFF_MS.length && !haltedRef.current; attempt++) {
                    try {
                        const form = new FormData();
                        form.append('audio', item.blob, `chunk-${item.sequence}.${extensionFor(item.blob.type || mimeRef.current)}`);
                        form.append('sequence', String(item.sequence));
                        form.append('duration_ms', String(item.durationMs));
                        form.append('offset_ms', String(item.offsetMs));

                        const { data } = await axios.post(`/app/scribe/sessions/${sessionId}/chunks`, form);
                        callbacks.current.onSessionUpdate?.(data.session);
                        sent = true;
                        break;
                    } catch (err) {
                        const status = err?.response?.status;
                        if (status === 403) {
                            if (err.response.data?.session) callbacks.current.onSessionUpdate?.(err.response.data.session);
                            halt();
                            callbacks.current.onConsentRevoked?.(err.response.data?.message);
                            return;
                        }
                        if (status === 409 || status === 422) {
                            // Session no longer accepts audio, or the file was rejected: do not loop forever.
                            setUploadError(err.response.data?.message || 'A part of the recording was rejected by the server.');
                            break;
                        }
                        if (attempt < UPLOAD_BACKOFF_MS.length) {
                            await new Promise((r) => setTimeout(r, UPLOAD_BACKOFF_MS[attempt]));
                        }
                    }
                }

                if (!sent && !haltedRef.current) {
                    setUploadError(`Part ${item.sequence + 1} of the recording could not be uploaded. Check your connection, then press “Retry upload”.`);
                    break; // keep it at the head of the queue for a manual retry
                }

                queueRef.current.shift();
                setPendingUploads(queueRef.current.length);
            }
        })().finally(() => {
            drainingRef.current = null;
        });

        return drainingRef.current;
    }, [sessionId, halt]);

    const retryUploads = useCallback(() => {
        setUploadError(null);
        return drain();
    }, [drain]);

    const startSegment = useCallback(() => {
        const stream = streamRef.current;
        if (!stream || haltedRef.current) return;

        const options = mimeRef.current ? { mimeType: mimeRef.current, audioBitsPerSecond: 32000 } : undefined;
        const recorder = new MediaRecorder(stream, options);
        const parts = [];
        recorderRef.current = recorder;
        segmentStartRef.current = performance.now();

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) parts.push(e.data);
        };

        recorder.onstop = () => {
            const durationMs = Math.round(performance.now() - segmentStartRef.current);
            if (parts.length && !haltedRef.current) {
                const blob = new Blob(parts, { type: recorder.mimeType || mimeRef.current || 'audio/webm' });
                queueRef.current.push({ sequence: sequenceRef.current, blob, durationMs, offsetMs: offsetRef.current });
                sequenceRef.current += 1;
                offsetRef.current += durationMs;
                setPendingUploads(queueRef.current.length);
                drain();
            }
            if (runningRef.current) startSegment();
        };

        recorder.start();
        timerRef.current = setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
        }, CHUNK_MS);
    }, [drain]);

    /** Stop the current recorder and wait until its audio is queued. */
    const flushSegment = useCallback(() => new Promise((resolve) => {
        clearTimeout(timerRef.current);
        runningRef.current = false;
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return resolve();
        const originalOnStop = recorder.onstop;
        recorder.onstop = (e) => {
            originalOnStop?.(e);
            resolve();
        };
        recorder.stop();
    }), []);

    const startTicking = useCallback(() => {
        clearInterval(tickRef.current);
        tickRef.current = setInterval(() => {
            setElapsedMs(offsetRef.current + (runningRef.current ? performance.now() - segmentStartRef.current : 0));
        }, 500);
    }, []);

    /** Ask for the microphone. Returns true when ready. */
    const acquireMic = useCallback(async () => {
        setMicError(null);
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            setMicError(window?.isSecureContext === false
                ? describeMicError(null)
                : 'This browser cannot record audio. Use a current version of Chrome, Edge, Firefox or Safari.');
            return false;
        }
        setMicState('requesting');
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
            });
            mimeRef.current = pickMimeType() ?? '';
            setMicState('idle');
            return true;
        } catch (err) {
            setMicError(describeMicError(err));
            setMicState('idle');
            return false;
        }
    }, []);

    /**
     * Start capturing. nextSequence/offsetMs come from the server so a session
     * resumed after a page reload continues numbering instead of overwriting.
     */
    const begin = useCallback(({ nextSequence = 0, offsetMs = 0 } = {}) => {
        sequenceRef.current = Math.max(sequenceRef.current, nextSequence);
        offsetRef.current = Math.max(offsetRef.current, offsetMs);
        haltedRef.current = false;
        runningRef.current = true;
        setMicState('live');
        startSegment();
        startTicking();
    }, [startSegment, startTicking]);

    const pause = useCallback(async () => {
        await flushSegment();
        setMicState('paused');
        setElapsedMs(offsetRef.current);
        await drain();
    }, [flushSegment, drain]);

    const resume = useCallback(() => {
        runningRef.current = true;
        setMicState('live');
        startSegment();
    }, [startSegment]);

    /** Graceful stop: flush the last segment and upload everything. */
    const finish = useCallback(async () => {
        await flushSegment();
        await drain();
        releaseMic();
        setElapsedMs(offsetRef.current);
        setMicState('stopped');
        return queueRef.current.length === 0;
    }, [flushSegment, drain, releaseMic]);

    useEffect(() => () => halt(), [halt]);

    return {
        micState,
        micError,
        uploadError,
        pendingUploads,
        elapsedMs,
        acquireMic,
        begin,
        pause,
        resume,
        finish,
        halt,
        retryUploads,
        releaseMic,
    };
}
