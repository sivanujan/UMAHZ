import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * Audio capture for AI Scribe with dual mode:
 * 1. Real-time streaming (AssemblyAI v3 WebSocket) with sub-second live text.
 * 2. Parallel in-memory chunk buffer with seamless automatic fallback to the
 *    proven 12s MediaRecorder chunk-upload flow if the stream ever drops.
 */
export const CHUNK_MS = 12000;
const UPLOAD_BACKOFF_MS = [1000, 3000, 8000, 15000];
const LONG_SESSION_RECONNECT_MS = 55 * 60 * 1000; // Reconnect before 3600s limit

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

/**
 * Downsample Float32 audio samples from hardware mic rate to 16,000 Hz.
 */
function downsampleTo16k(inputBuffer, inputRate) {
    if (inputRate === 16000) return inputBuffer;
    const ratio = inputRate / 16000;
    const newLength = Math.round(inputBuffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
            accum += inputBuffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : inputBuffer[offsetBuffer];
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

/**
 * Convert normalized Float32 samples (-1.0 to 1.0) to 16-bit signed little-endian PCM.
 */
function floatToInt16Pcm(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

export default function useScribeRecorder({
    sessionId,
    language = 'en',
    streamingEnabled = false,
    audioRetentionMode = 'delete_after_transcription',
    onConsentRevoked,
    onSessionUpdate,
    onNewSegment,
    chunkMs = CHUNK_MS,
}) {
    const [micState, setMicState] = useState('idle'); // idle | requesting | live | paused | stopped
    const [micError, setMicError] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [pendingUploads, setPendingUploads] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [stream, setStream] = useState(null);
    const [interimText, setInterimText] = useState('');
    const [fallbackNotice, setFallbackNotice] = useState(null);
    const [isStreamingActive, setIsStreamingActive] = useState(false);
    const [streamingMode, setStreamingMode] = useState(streamingEnabled ? 'ready' : 'standard');
    const [streamingModeReason, setStreamingModeReason] = useState(
        streamingEnabled
            ? 'Real-time WebSocket streaming ready'
            : 'Streaming disabled (SCRIBE_STREAMING=false). Standard 12s chunk transcription active.'
    );
    const [streamSaveWarning, setStreamSaveWarning] = useState(null);

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

    // Streaming state & Web Audio refs
    const sessionStartTimeRef = useRef(null);
    const sessionElapsedBaseRef = useRef(0);
    const interimTextRef = useRef('');
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const processorNodeRef = useRef(null);
    const wsRef = useRef(null);
    const isStreamingRef = useRef(false);
    const streamingModeActiveRef = useRef(false);
    const intentionalStopRef = useRef(false);
    const sessionTokenRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const streamConnStartRef = useRef(null);
    const lastSavedStreamMsRef = useRef(0);
    const unpersistedTurnsMapRef = useRef(new Map());
    const isFlushingTurnsRef = useRef(false);
    const flushTimerRef = useRef(null);
    const flushRetryTimerRef = useRef(null);

    // Parallel fallback ring-buffer (in-memory only, not uploaded unless stream fails)
    const fallbackBufferRef = useRef([]);

    const getSessionElapsedMs = useCallback(() => {
        return sessionElapsedBaseRef.current + (sessionStartTimeRef.current !== null && runningRef.current ? Math.round(performance.now() - sessionStartTimeRef.current) : 0);
    }, []);

    const callbacks = useRef({ onConsentRevoked, onSessionUpdate, onNewSegment });
    callbacks.current = { onConsentRevoked, onSessionUpdate, onNewSegment };

    const releaseMic = useCallback(() => {
        clearTimeout(timerRef.current);
        clearInterval(tickRef.current);
        clearTimeout(reconnectTimerRef.current);
        clearTimeout(flushTimerRef.current);
        clearTimeout(flushRetryTimerRef.current);
        runningRef.current = false;
        intentionalStopRef.current = true;

        // Clean Web Audio
        try {
            processorNodeRef.current?.disconnect();
            sourceNodeRef.current?.disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {});
            }
        } catch (_) {}
        processorNodeRef.current = null;
        sourceNodeRef.current = null;
        audioContextRef.current = null;

        // Clean WebSocket
        try {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
                wsRef.current.close();
            }
        } catch (_) {}
        wsRef.current = null;
        isStreamingRef.current = false;
        streamingModeActiveRef.current = false;
        setIsStreamingActive(false);

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStream(null);
    }, []);

    /** Hard stop (consent revoked / unmount): drop everything. */
    const halt = useCallback(() => {
        haltedRef.current = true;
        intentionalStopRef.current = true;
        queueRef.current = [];
        fallbackBufferRef.current = [];
        unpersistedTurnsMapRef.current.clear();
        clearTimeout(flushRetryTimerRef.current);
        clearTimeout(flushTimerRef.current);
        setPendingUploads(0);
        setInterimText('');
        setStreamSaveWarning(null);
        isFlushingTurnsRef.current = false;
        streamingModeActiveRef.current = false;

        try {
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.onstop = null;
                recorderRef.current.stop();
            }
        } catch (_) {}

        releaseMic();
        setMicState('stopped');
    }, [releaseMic]);

    /** Flush unpersisted streaming turns to the backend with retry and backoff. */
    const flushStreamingTurns = useCallback(async ({ connectionDurationSec = null, maxRetries = 1 } = {}) => {
        if (!sessionId || haltedRef.current) return true;

        if (isFlushingTurnsRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = setTimeout(() => {
                flushStreamingTurns({ connectionDurationSec, maxRetries });
            }, 500);
            return false;
        }

        const turnsToSave = [...unpersistedTurnsMapRef.current.values()].sort((a, b) => a.sequence - b.sequence);
        if (!turnsToSave.length && connectionDurationSec === null) {
            return true;
        }

        isFlushingTurnsRef.current = true;
        let success = false;

        for (let attempt = 0; attempt < maxRetries && !haltedRef.current; attempt++) {
            try {
                const payload = {
                    turns: turnsToSave.map((t) => ({
                        sequence: Number(t.sequence),
                        text: String(t.text || '').trim(),
                        start_ms: Math.max(0, Math.round(t.start_ms || 0)),
                        end_ms: Math.max(Math.max(0, Math.round(t.start_ms || 0)), Math.round(t.end_ms || 0)),
                        language: t.language && t.language !== 'auto' ? String(t.language) : (language || 'en'),
                        detected_language: t.detected_language || null,
                    })),
                    client_recorded_ms: Math.max(0, getSessionElapsedMs()),
                };
                if (connectionDurationSec !== null) {
                    payload.connection_duration_seconds = Math.max(0, Math.round(connectionDurationSec));
                }

                const { data } = await axios.post(`/app/scribe/sessions/${sessionId}/streaming-turns`, payload);
                if (data.session) callbacks.current.onSessionUpdate?.(data.session);

                // Evict successfully saved turns
                turnsToSave.forEach((t) => unpersistedTurnsMapRef.current.delete(t.sequence));
                setStreamSaveWarning(null);
                success = true;
                break;
            } catch (err) {
                const status = err?.response?.status;
                if (status === 403) {
                    if (err.response?.data?.session) callbacks.current.onSessionUpdate?.(err.response.data.session);
                    halt();
                    callbacks.current.onConsentRevoked?.(err.response?.data?.message);
                    isFlushingTurnsRef.current = false;
                    return false;
                }

                console.warn(`[AI Scribe Streaming] Turn save failed (attempt ${attempt + 1}/${maxRetries}):`, err?.response?.data || err?.message);
                setStreamSaveWarning('Some transcript turns could not be saved to server yet. Retrying in background...');

                if (attempt < maxRetries - 1) {
                    await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 4000)));
                }
            }
        }

        isFlushingTurnsRef.current = false;

        // If there are still turns in memory, schedule exponential backoff retry
        if (unpersistedTurnsMapRef.current.size > 0 && !haltedRef.current) {
            clearTimeout(flushRetryTimerRef.current);
            flushRetryTimerRef.current = setTimeout(() => {
                flushStreamingTurns();
            }, 3000);
        }

        return success;
    }, [sessionId, halt, language]);

    /** Chunk upload drain loop with backoff retry. */
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
                    break;
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

    /**
     * Fallback to classic chunking flow without losing audio or double billing.
     * Extracts chunks from the parallel in-memory buffer starting after lastSavedStreamMs.
     */
    const fallbackToChunking = useCallback((reason) => {
        if (!isStreamingRef.current && !streamingModeActiveRef.current) return;
        if (intentionalStopRef.current) return;

        console.warn('[AI Scribe Streaming] Falling back to standard chunk uploads. Reason:', reason);
        isStreamingRef.current = false;
        streamingModeActiveRef.current = false;
        setIsStreamingActive(false);
        setStreamingMode('standard');
        setStreamingModeReason(reason);
        setInterimText('');
        setFallbackNotice(`Switched to standard transcription (${reason}). Recording continued without loss.`);

        // Close WebSocket
        try {
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.close();
            }
        } catch (_) {}
        wsRef.current = null;

        // Transfer relevant unsent chunks from in-memory fallback buffer into upload queue
        const cutoffMs = lastSavedStreamMsRef.current;
        const chunksToUpload = fallbackBufferRef.current.filter((c) => (c.offsetMs + c.durationMs) > cutoffMs);
        fallbackBufferRef.current = [];

        if (chunksToUpload.length) {
            queueRef.current.push(...chunksToUpload);
            setPendingUploads(queueRef.current.length);
            drain();
        }
    }, [drain]);

    /**
     * Parallel MediaRecorder loop:
     * - In streaming mode: chunks stay in fallbackBufferRef only, pruned as turns settle.
     * - In chunk mode: chunks are pushed to queueRef and uploaded immediately.
     */
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
                const item = { sequence: sequenceRef.current, blob, durationMs, offsetMs: offsetRef.current };
                sequenceRef.current += 1;
                offsetRef.current += durationMs;

                if (isStreamingRef.current || streamingModeActiveRef.current) {
                    // Keep in memory buffer only
                    fallbackBufferRef.current.push(item);
                    // Discard old chunks where audio is already safely saved in streaming turns
                    const safeCutoff = Math.max(0, lastSavedStreamMsRef.current - 5000);
                    fallbackBufferRef.current = fallbackBufferRef.current.filter((c) => (c.offsetMs + c.durationMs) >= safeCutoff);
                } else {
                    // Classic mode: queue for upload
                    queueRef.current.push(item);
                    setPendingUploads(queueRef.current.length);
                    drain();
                }
            }
            if (runningRef.current) startSegment();
        };

        recorder.start();
        timerRef.current = setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
        }, chunkMs);
    }, [drain, chunkMs]);

    /** Stop current MediaRecorder slice. */
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

    /**
     * Start Web Audio capture and open AssemblyAI WebSocket connection.
     */
    const startStreaming = useCallback(async () => {
        if (!sessionId || haltedRef.current) return false;

        try {
            console.log('[AI Scribe Streaming] Fetching temporary token from backend for session:', sessionId);
            // 1. Fetch short-lived token from backend
            const { data } = await axios.post(`/app/scribe/sessions/${sessionId}/token`);
            sessionTokenRef.current = data;
            const token = data.token;
            const speechModel = data.speech_model || 'universal-3-6-pro';
            const sampleRate = data.sample_rate || 16000;
            const mode = data.mode || 'balanced';

            console.log('[AI Scribe Streaming] Token acquired successfully:', {
                speech_model: speechModel,
                sample_rate: sampleRate,
                mode,
                language: language || 'en',
            });

            // Construct WebSocket URL with query params
            const wsBase = data.websocket_url || 'wss://streaming.assemblyai.com/v3/ws';
            const query = new URLSearchParams({
                token,
                sample_rate: String(sampleRate),
                speech_model: speechModel,
                mode,
            });
            if (language && language !== 'auto') {
                query.append('language_codes', language);
            }

            const wsUrl = `${wsBase}?${query.toString()}`;
            console.log('[AI Scribe Streaming] Connecting WebSocket to:', wsBase);
            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[AI Scribe Streaming] WebSocket opened successfully!');
                isStreamingRef.current = true;
                streamingModeActiveRef.current = true;
                setIsStreamingActive(true);
                setStreamingMode('live');
                setStreamingModeReason('Real-time WebSocket streaming active via AssemblyAI');
                streamConnStartRef.current = Date.now();

                // Setup 55-minute auto-reconnect timer for long sessions
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(async () => {
                    if (isStreamingRef.current && runningRef.current) {
                        try {
                            await flushStreamingTurns();
                            ws.send(JSON.stringify({ type: 'Terminate' }));
                            ws.close();
                            startStreaming();
                        } catch (_) {}
                    }
                }, LONG_SESSION_RECONNECT_MS);
            };

            ws.onmessage = (event) => {
                if (haltedRef.current) return;
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'Begin') {
                        console.log('[AI Scribe Streaming] Begin event received. Session ID:', msg.id);
                    } else if (msg.type === 'Turn') {
                        const transcript = msg.transcript ? msg.transcript.trim() : '';
                        if (!msg.end_of_turn) {
                            // Sub-second partial live preview
                            interimTextRef.current = transcript;
                            setInterimText(transcript);
                        } else if (transcript.length > 0) {
                            // Finalized turn
                            console.log('[AI Scribe Streaming] Final turn finalized:', transcript);
                            interimTextRef.current = '';
                            setInterimText('');

                            const sessionNow = getSessionElapsedMs();
                            let turnStart = null;
                            let turnEnd = null;

                            if (Array.isArray(msg.words) && msg.words.length > 0) {
                                const firstWord = msg.words[0];
                                const lastWord = msg.words[msg.words.length - 1];
                                if (typeof firstWord?.start === 'number') {
                                    turnStart = sessionElapsedBaseRef.current + firstWord.start;
                                }
                                if (typeof lastWord?.end === 'number') {
                                    turnEnd = sessionElapsedBaseRef.current + lastWord.end;
                                }
                            }
                            if (turnStart === null && typeof msg.audio_start === 'number') {
                                turnStart = sessionElapsedBaseRef.current + msg.audio_start;
                            }
                            if (turnEnd === null && typeof msg.audio_end === 'number') {
                                turnEnd = sessionElapsedBaseRef.current + msg.audio_end;
                            }
                            if (turnStart === null && typeof msg.start === 'number') {
                                turnStart = sessionElapsedBaseRef.current + msg.start;
                            }
                            if (turnEnd === null && typeof msg.end === 'number') {
                                turnEnd = sessionElapsedBaseRef.current + msg.end;
                            }
                            if (turnStart === null) {
                                turnStart = Math.max(lastSavedStreamMsRef.current, sessionNow - 2000);
                                turnEnd = Math.max(turnStart, sessionNow);
                            } else if (turnEnd === null) {
                                turnEnd = Math.max(turnStart, sessionNow);
                            }

                            const segmentSeq = sequenceRef.current++;
                            const detectedLang = msg.language_code || msg.language || null;

                            const newSegment = {
                                sequence: segmentSeq,
                                text: transcript,
                                start_ms: Math.max(0, Math.round(turnStart)),
                                end_ms: Math.max(Math.max(0, Math.round(turnStart)), Math.round(turnEnd)),
                                language: language && language !== 'auto' ? String(language) : (language || 'en'),
                                detected_language: detectedLang,
                                source: 'ai_streaming',
                            };

                            lastSavedStreamMsRef.current = newSegment.end_ms;

                            // 1. Immediately show turn on UI! Never blocked by saving.
                            callbacks.current.onNewSegment?.(newSegment);

                            // 2. Queue in memory map by sequence (idempotent)
                            unpersistedTurnsMapRef.current.set(newSegment.sequence, newSegment);

                            // 3. Schedule immediate flush to backend
                            clearTimeout(flushTimerRef.current);
                            flushTimerRef.current = setTimeout(() => {
                                flushStreamingTurns();
                            }, 1000);
                        }
                    } else if (msg.type === 'Termination') {
                        console.log('[AI Scribe Streaming] Termination summary received:', msg);
                        const connSec = msg.session_duration_seconds || (streamConnStartRef.current ? Math.round((Date.now() - streamConnStartRef.current) / 1000) : 0);
                        flushStreamingTurns({ connectionDurationSec: connSec });
                    }
                } catch (e) {
                    console.error('[AI Scribe Streaming] WS parse error:', e);
                }
            };

            ws.onerror = (e) => {
                console.error('[AI Scribe Streaming] WebSocket error event:', e);
                if (!intentionalStopRef.current) {
                    fallbackToChunking('WebSocket error on streaming connection');
                }
            };

            ws.onclose = (e) => {
                console.log('[AI Scribe Streaming] WebSocket closed. Code:', e.code, 'Reason:', e.reason, 'wasClean:', e.wasClean);
                if (intentionalStopRef.current) return;
                if ((isStreamingRef.current || streamingModeActiveRef.current) && runningRef.current && e.code !== 1000) {
                    fallbackToChunking(`WebSocket closed (code ${e.code}: ${e.reason || 'abnormal closure'})`);
                }
            };

            // 2. Setup Web Audio pipeline
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            console.log('[AI Scribe Streaming] AudioContext initialized. State:', audioCtx.state, 'sampleRate:', audioCtx.sampleRate);
            if (audioCtx.state === 'suspended') {
                console.log('[AI Scribe Streaming] Resuming suspended AudioContext...');
                await audioCtx.resume();
                console.log('[AI Scribe Streaming] AudioContext state after resume:', audioCtx.state);
            }

            const stream = streamRef.current;
            if (!stream) {
                throw new Error('Microphone media stream not available for AudioContext');
            }
            const source = audioCtx.createMediaStreamSource(stream);
            sourceNodeRef.current = source;

            // ScriptProcessorNode for universal browser compatibility (Chrome, Edge, Firefox, Safari iOS/macOS)
            const bufferSize = 4096;
            const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
            processorNodeRef.current = processor;

            let framesSent = 0;
            processor.onaudioprocess = (e) => {
                if (!runningRef.current || !isStreamingRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const resampled = downsampleTo16k(inputData, audioCtx.sampleRate);
                const pcmBuffer = floatToInt16Pcm(resampled);

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(pcmBuffer);
                    framesSent++;
                    if (framesSent === 1) {
                        console.log('[AI Scribe Streaming] First PCM audio frame streamed to AssemblyAI');
                    }
                }
            };

            // Route through a zero-gain node before destination to prevent speaker feedback loop
            const muteGain = audioCtx.createGain();
            muteGain.gain.value = 0;
            source.connect(processor);
            processor.connect(muteGain);
            muteGain.connect(audioCtx.destination);

            return true;
        } catch (err) {
            const reason = err?.response?.data?.message || err?.message || 'Streaming initialization failed';
            console.error('[AI Scribe Streaming] Initialization error:', reason, err);
            if (!intentionalStopRef.current) {
                fallbackToChunking(reason);
            }
            return false;
        }
    }, [sessionId, language, fallbackToChunking, flushStreamingTurns, getSessionElapsedMs]);

    const startTicking = useCallback(() => {
        clearInterval(tickRef.current);
        tickRef.current = setInterval(() => {
            setElapsedMs(getSessionElapsedMs());
        }, 500);
    }, [getSessionElapsedMs]);

    /** Request microphone access. */
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
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
            });
            streamRef.current = micStream;
            setStream(micStream);
            mimeRef.current = pickMimeType() ?? '';
            setMicState('idle');
            return true;
        } catch (err) {
            setMicError(describeMicError(err));
            setStream(null);
            setMicState('idle');
            return false;
        }
    }, []);

    /**
     * Start capturing:
     * - If streamingEnabled: launches WebSocket streaming and runs parallel in-memory chunk recorder.
     * - Otherwise: runs standard chunk recorder.
     */
    const begin = useCallback(async ({ nextSequence = 0, offsetMs = 0 } = {}) => {
        sequenceRef.current = Math.max(sequenceRef.current, nextSequence);
        offsetRef.current = Math.max(offsetRef.current, offsetMs);
        sessionElapsedBaseRef.current = Math.max(sessionElapsedBaseRef.current, offsetMs);
        sessionStartTimeRef.current = performance.now();
        lastSavedStreamMsRef.current = sessionElapsedBaseRef.current;
        haltedRef.current = false;
        intentionalStopRef.current = false;
        runningRef.current = true;
        setMicState('live');
        setFallbackNotice(null);
        setStreamSaveWarning(null);

        console.log('[AI Scribe] begin() called with streamingEnabled =', streamingEnabled, 'sessionId =', sessionId);
        if (streamingEnabled) {
            streamingModeActiveRef.current = true;
            setStreamingMode('connecting');
            setStreamingModeReason('Connecting to real-time speech stream…');
            await startStreaming();
        } else {
            streamingModeActiveRef.current = false;
            setStreamingMode('standard');
            setStreamingModeReason('Streaming is disabled (SCRIBE_STREAMING=false). Standard 12s chunk transcription active.');
        }

        startSegment();
        startTicking();
    }, [streamingEnabled, startStreaming, startSegment, startTicking, sessionId]);

    /** Pause: terminate WebSocket to stop AssemblyAI billing, pause recorder. */
    const pause = useCallback(async () => {
        intentionalStopRef.current = true;
        clearTimeout(reconnectTimerRef.current);
        const streamConnDuration = streamConnStartRef.current
            ? Math.round((Date.now() - streamConnStartRef.current) / 1000)
            : 0;

        if (sessionStartTimeRef.current !== null) {
            sessionElapsedBaseRef.current += Math.round(performance.now() - sessionStartTimeRef.current);
            sessionStartTimeRef.current = null;
        }

        if (isStreamingRef.current || streamingModeActiveRef.current) {
            try {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
                    wsRef.current.close(1000);
                }
            } catch (_) {}
            isStreamingRef.current = false;
            streamingModeActiveRef.current = false;
            setIsStreamingActive(false);
            interimTextRef.current = '';
            setInterimText('');
        }

        await flushSegment();
        setMicState('paused');
        setElapsedMs(sessionElapsedBaseRef.current);

        await flushStreamingTurns({ connectionDurationSec: streamConnDuration, maxRetries: 3 });
        if (!streamingEnabled && queueRef.current.length) {
            await drain();
        }
    }, [flushSegment, flushStreamingTurns, drain, streamingEnabled]);

    /** Resume: request fresh token and reconnect WebSocket continuing timeline offset. */
    const resume = useCallback(async () => {
        intentionalStopRef.current = false;
        runningRef.current = true;
        sessionStartTimeRef.current = performance.now();
        setMicState('live');

        if (streamingEnabled) {
            streamingModeActiveRef.current = true;
            await startStreaming();
        } else {
            streamingModeActiveRef.current = false;
        }

        startSegment();
    }, [streamingEnabled, startStreaming, startSegment]);

    /** Graceful stop: terminate stream, flush turns and uploads, release mic. */
    const finish = useCallback(async () => {
        intentionalStopRef.current = true;
        clearTimeout(reconnectTimerRef.current);
        const streamConnDuration = streamConnStartRef.current
            ? Math.round((Date.now() - streamConnStartRef.current) / 1000)
            : 0;

        // If there is any remaining interim text when user stops, flush it as the final turn
        // with the correct session-elapsed timestamp
        const finalInterim = (interimTextRef.current || '').trim();
        if (finalInterim.length > 0 && (isStreamingRef.current || streamingModeActiveRef.current)) {
            const sessionElapsed = getSessionElapsedMs();
            const finalTurn = {
                sequence: sequenceRef.current++,
                text: finalInterim,
                start_ms: Math.max(lastSavedStreamMsRef.current, Math.max(0, sessionElapsed - 2000)),
                end_ms: sessionElapsed,
                language: language && language !== 'auto' ? String(language) : (language || 'en'),
                source: 'ai_streaming',
            };
            lastSavedStreamMsRef.current = finalTurn.end_ms;
            callbacks.current.onNewSegment?.(finalTurn);
            unpersistedTurnsMapRef.current.set(finalTurn.sequence, finalTurn);
            interimTextRef.current = '';
            setInterimText('');
        }

        if (sessionStartTimeRef.current !== null) {
            sessionElapsedBaseRef.current += Math.round(performance.now() - sessionStartTimeRef.current);
            sessionStartTimeRef.current = null;
        }

        if (isStreamingRef.current || streamingModeActiveRef.current) {
            try {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
                    await new Promise((r) => setTimeout(r, 200));
                    wsRef.current.close(1000);
                }
            } catch (_) {}
            isStreamingRef.current = false;
            setIsStreamingActive(false);
            interimTextRef.current = '';
            setInterimText('');
        }

        await flushSegment();

        // In streaming mode, audio is already transcribed via live stream.
        // Discard in-memory fallback buffer and mark streaming mode inactive
        // so that the stop segment is NOT uploaded to the chunk endpoint!
        fallbackBufferRef.current = [];
        streamingModeActiveRef.current = false;

        // Flush all unpersisted turns with up to 3 retries
        await flushStreamingTurns({ connectionDurationSec: streamConnDuration, maxRetries: 3 });

        // Only drain classic chunking queue if classic mode or if fallback was triggered
        if (queueRef.current.length) {
            await drain();
        }

        releaseMic();
        setElapsedMs(sessionElapsedBaseRef.current);
        setMicState('stopped');
        return queueRef.current.length === 0;
    }, [flushSegment, flushStreamingTurns, drain, releaseMic, getSessionElapsedMs, language]);

    useEffect(() => () => halt(), [halt]);

    return {
        micState,
        micError,
        uploadError,
        streamSaveWarning,
        pendingUploads,
        elapsedMs,
        stream,
        interimText,
        fallbackNotice,
        isStreamingActive,
        streamingMode,
        streamingModeReason,
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
