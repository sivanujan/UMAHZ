import React, { useEffect, useRef, useState } from 'react';

/**
 * Interactive Real-Time Voice Wave Visualizer for AI Scribe.
 *
 * Connects directly to the user's microphone MediaStream via the Web Audio API.
 * Animates live voice frequency bars in real-time with smooth interpolation,
 * providing clear visual feedback that recording is active and picking up audio.
 */
export default function VoiceWaveVisualizer({
    stream,
    isRecording = false,
    isPaused = false,
    barCount = 28,
    className = '',
}) {
    const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 1
    const [isDetectingVoice, setIsDetectingVoice] = useState(false);
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);

    // Keep smoothed bar values for silky 60fps animations
    const smoothedBarsRef = useRef(new Array(barCount).fill(4));

    useEffect(() => {
        if (!stream || !isRecording || isPaused) {
            // Cancel animation when not actively recording
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                try {
                    audioContextRef.current.close();
                } catch (_) {}
                audioContextRef.current = null;
            }
            setVolumeLevel(0);
            setIsDetectingVoice(false);
            return;
        }

        let isCancelled = false;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;

            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // yields 32 frequency bins
            analyser.smoothingTimeConstant = 0.75;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let phase = 0;

            const render = () => {
                if (isCancelled) return;

                analyser.getByteFrequencyData(dataArray);

                // Compute average audio power / volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / (bufferLength || 1);
                const normalizedVol = Math.min(1, avg / 128); // 0..1 scale
                const hasVoice = normalizedVol > 0.04;

                setVolumeLevel(normalizedVol);
                setIsDetectingVoice(hasVoice);

                phase += 0.08;

                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const width = canvas.width;
                    const height = canvas.height;

                    ctx.clearRect(0, 0, width, height);

                    const gap = 3;
                    const totalBarWidth = (width - (barCount - 1) * gap) / barCount;
                    const barWidth = Math.max(2, totalBarWidth);

                    for (let i = 0; i < barCount; i++) {
                        // Map bar to frequency bin with center weighting
                        const centerDist = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
                        const bellCurve = Math.cos((centerDist * Math.PI) / 2); // 1 in center, 0 at edges

                        const binIndex = Math.min(
                            bufferLength - 1,
                            Math.floor((i / barCount) * bufferLength)
                        );
                        const freqValue = dataArray[binIndex] / 255; // 0..1

                        // Base idle ripple so wave feels alive even in quiet room
                        const idleWave = Math.sin(phase + (i * 0.35)) * 0.18 + 0.22;

                        // Target height in pixels: min 4px, max (height - 4)px
                        const minH = 4;
                        const maxH = height - 4;
                        let targetHeight;

                        if (hasVoice) {
                            // Active voice reactivity amplified by bell curve
                            const voiceImpact = (freqValue * 0.7 + normalizedVol * 0.5) * (0.4 + 0.6 * bellCurve);
                            targetHeight = minH + Math.min(maxH - minH, voiceImpact * (maxH - minH));
                        } else {
                            // Gentle breathing idle wave
                            targetHeight = minH + idleWave * 8 * bellCurve;
                        }

                        // Smooth interpolation (lerp)
                        const currentH = smoothedBarsRef.current[i] || 4;
                        const newH = currentH + (targetHeight - currentH) * 0.28;
                        smoothedBarsRef.current[i] = newH;

                        const x = i * (barWidth + gap);
                        const y = (height - newH) / 2;

                        // Create modern gradient: Purple (#8200db) -> Rose (#f43f5e)
                        const gradient = ctx.createLinearGradient(0, y, 0, y + newH);
                        if (hasVoice) {
                            gradient.addColorStop(0, '#a855f7'); // Light purple
                            gradient.addColorStop(0.5, '#ec4899'); // Pink
                            gradient.addColorStop(1, '#8200db'); // UMAHZ Brand Purple
                        } else {
                            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
                            gradient.addColorStop(1, 'rgba(130, 0, 219, 0.35)');
                        }

                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(x, y, barWidth, newH, [barWidth / 2]);
                        } else {
                            ctx.rect(x, y, barWidth, newH);
                        }
                        ctx.fill();
                    }
                }

                animationFrameRef.current = requestAnimationFrame(render);
            };

            render();
        } catch (err) {
            console.warn('AudioContext visualizer initialization skipped:', err);
        }

        return () => {
            isCancelled = true;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                try {
                    audioContextRef.current.close();
                } catch (_) {}
            }
        };
    }, [stream, isRecording, isPaused, barCount]);

    return (
        <div className={`flex flex-col items-center gap-1.5 ${className}`}>
            <div className="relative flex items-center justify-center px-4 py-2 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 backdrop-blur-xs w-full shadow-inner overflow-hidden">
                {/* Glow ambient background when speaking */}
                {isRecording && !isPaused && isDetectingVoice && (
                    <div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-purple-500/15 blur-md pointer-events-none transition-opacity duration-300"
                        style={{ opacity: Math.min(1, volumeLevel * 2) }}
                    />
                )}

                {/* Canvas Waveform */}
                <canvas
                    ref={canvasRef}
                    width={220}
                    height={32}
                    className="relative z-10 max-w-[220px] h-[32px]"
                />

                {/* Status indicator pill inside visualizer */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 pointer-events-none">
                    {isRecording && !isPaused ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight text-purple-700 dark:text-purple-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${isDetectingVoice ? 'bg-emerald-500 animate-ping' : 'bg-purple-500 animate-pulse'}`} />
                            <span className="hidden sm:inline">{isDetectingVoice ? 'Voice detected' : 'Listening…'}</span>
                        </span>
                    ) : isPaused ? (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            Paused
                        </span>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
