import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play,
    Pause,
    Volume2,
    Volume1,
    VolumeX,
    Maximize,
    Minimize,
    Subtitles,
    Gauge,
    Loader2,
} from 'lucide-react';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({
    src,
    poster,
    captionsSrc,
    aspect = '16:9',
    autoPlay = false,
    preload = 'none',
    className = '',
    onEnded,
}) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const progressBarRef = useRef(null);
    const hideTimeoutRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedProgress, setBufferedProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [hasStarted, setHasStarted] = useState(autoPlay);
    const [captionsActive, setCaptionsActive] = useState(false);
    const [captionsAvailable, setCaptionsAvailable] = useState(Boolean(captionsSrc));
    const [scrubPreviewTime, setScrubPreviewTime] = useState(null);
    const [scrubPreviewPos, setScrubPreviewPos] = useState(0);

    // Format time: seconds to M:SS or MM:SS
    const formatTime = (secs) => {
        if (!secs || isNaN(secs) || secs < 0) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Auto-hide controls during playback
    const showControlsBriefly = useCallback(() => {
        setControlsVisible(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        if (isPlaying) {
            hideTimeoutRef.current = setTimeout(() => {
                setControlsVisible(false);
                setShowSpeedMenu(false);
            }, 2500);
        }
    }, [isPlaying]);

    // Play / Pause toggle
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused || video.ended) {
            video.play().then(() => {
                setIsPlaying(true);
                setHasStarted(true);
            }).catch(() => {});
        } else {
            video.pause();
            setIsPlaying(false);
        }
        showControlsBriefly();
    }, [showControlsBriefly]);

    // Volume change
    const handleVolumeChange = (newVol) => {
        const video = videoRef.current;
        if (!video) return;
        const clamped = Math.max(0, Math.min(1, newVol));
        video.volume = clamped;
        setVolume(clamped);
        const muted = clamped === 0;
        video.muted = muted;
        setIsMuted(muted);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        if (isMuted) {
            video.muted = false;
            setIsMuted(false);
            if (volume === 0) {
                video.volume = 0.5;
                setVolume(0.5);
            }
        } else {
            video.muted = true;
            setIsMuted(true);
        }
    };

    // Playback rate
    const handleSpeedChange = (rate) => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
    };

    // Captions toggle
    const toggleCaptions = () => {
        const video = videoRef.current;
        if (!video || !video.textTracks || video.textTracks.length === 0) return;
        const track = video.textTracks[0];
        if (captionsActive) {
            track.mode = 'hidden';
            setCaptionsActive(false);
        } else {
            track.mode = 'showing';
            setCaptionsActive(true);
        }
    };

    // Fullscreen toggle
    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    };

    // Scrubber click / drag
    const handleSeek = (e) => {
        const video = videoRef.current;
        const bar = progressBarRef.current;
        if (!video || !bar || !duration) return;

        const rect = bar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        video.currentTime = percentage * duration;
        setCurrentTime(video.currentTime);
    };

    const handleProgressMouseMove = (e) => {
        const bar = progressBarRef.current;
        if (!bar || !duration) return;
        const rect = bar.getBoundingClientRect();
        const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const percentage = hoverX / rect.width;
        setScrubPreviewTime(percentage * duration);
        setScrubPreviewPos(hoverX);
    };

    const handleProgressMouseLeave = () => {
        setScrubPreviewTime(null);
    };

    // Sync fullscreen change event
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
        };
    }, []);

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
        // Prevent default scrolling for Space / Arrow keys when focused on video region
        if (e.key === ' ' || e.key === 'k') {
            e.preventDefault();
            togglePlay();
        } else if (e.key === 'f') {
            e.preventDefault();
            toggleFullscreen();
        } else if (e.key === 'm') {
            e.preventDefault();
            toggleMute();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (videoRef.current) {
                videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
            }
            showControlsBriefly();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
            }
            showControlsBriefly();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleVolumeChange(volume + 0.1);
            showControlsBriefly();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleVolumeChange(volume - 0.1);
            showControlsBriefly();
        }
    };

    // Time & buffer update handlers
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTime(video.currentTime);

        if (video.buffered && video.buffered.length > 0 && duration > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            setBufferedProgress(Math.min(100, (bufferedEnd / duration) * 100));
        }
    };

    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;
        setDuration(video.duration);
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseMove={showControlsBriefly}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
            className={`relative group bg-[#0B0F19] text-white rounded-2xl overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-violet-500 shadow-2xl ${
                aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
            } ${className}`}
            role="region"
            aria-label="UMAHZ video player"
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                preload={preload}
                playsInline
                autoPlay={autoPlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => {
                    setIsBuffering(false);
                    setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    setHasStarted(false);
                    onEnded?.();
                }}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer bg-black"
            >
                {captionsSrc && (
                    <track
                        kind="captions"
                        src={captionsSrc}
                        srcLang="en"
                        label="English"
                        onError={() => setCaptionsAvailable(false)}
                    />
                )}
            </video>

            {/* Buffering Spinner */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-12 h-12 rounded-full bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-violet-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                </div>
            )}

            {/* Center Play Button Overlay (when paused or initial) */}
            {!isPlaying && !isBuffering && (
                <div
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer z-10"
                >
                    <div className="relative group/play">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)] transform transition-transform group-hover/play:scale-110">
                            <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Controls Bar Overlay */}
            <div
                className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-3 sm:px-4 pt-8 pb-3 transition-opacity duration-300 ${
                    controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                {/* Progress Bar (Scrubber) */}
                <div
                    ref={progressBarRef}
                    onClick={handleSeek}
                    onMouseMove={handleProgressMouseMove}
                    onMouseLeave={handleProgressMouseLeave}
                    className="relative group/scrub py-2 cursor-pointer -mx-1"
                >
                    {/* Hover Timestamp Tooltip */}
                    {scrubPreviewTime !== null && (
                        <div
                            style={{ left: `${scrubPreviewPos}px` }}
                            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-900 border border-slate-700 text-slate-200 pointer-events-none whitespace-nowrap shadow-md z-30"
                        >
                            {formatTime(scrubPreviewTime)}
                        </div>
                    )}

                    {/* Rail Track */}
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden relative transition-all group-hover/scrub:h-2.5">
                        {/* Buffered progress */}
                        <div
                            style={{ width: `${bufferedProgress}%` }}
                            className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-150"
                        />
                        {/* Play progress */}
                        <div
                            style={{ width: `${progressPercent}%` }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full"
                        />
                    </div>

                    {/* Scrubber Knob */}
                    <div
                        style={{ left: `${progressPercent}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-violet-600 opacity-0 group-hover/scrub:opacity-100 transition-opacity"
                    />
                </div>

                {/* Controls Bottom Row */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    {/* Left Controls: Play, Time, Volume */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Play/Pause */}
                        <button
                            type="button"
                            onClick={togglePlay}
                            aria-label={isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
                            className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                            {isPlaying ? (
                                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                            ) : (
                                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                            )}
                        </button>

                        {/* Volume / Mute with Slider */}
                        <div className="flex items-center group/vol">
                            <button
                                type="button"
                                onClick={toggleMute}
                                aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                                className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-violet-500"
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                                ) : volume < 0.5 ? (
                                    <Volume1 className="w-4 h-4 sm:w-5 sm:h-5" />
                                ) : (
                                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                            </button>

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                aria-label="Volume slider"
                                className="w-0 group-hover/vol:w-16 focus:w-16 transition-all duration-200 h-1 accent-violet-500 cursor-pointer overflow-hidden ml-1"
                            />
                        </div>

                        {/* Time display */}
                        <span className="text-[11px] sm:text-xs font-mono text-slate-300 whitespace-nowrap">
                            <span className="font-semibold text-white">{formatTime(currentTime)}</span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span>{formatTime(duration)}</span>
                        </span>
                    </div>

                    {/* Right Controls: Speed, Captions, Fullscreen */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Playback Speed */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                aria-label="Playback speed"
                                aria-expanded={showSpeedMenu}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-violet-500"
                            >
                                <Gauge className="w-3.5 h-3.5 text-violet-400" />
                                <span>{playbackRate}x</span>
                            </button>

                            {showSpeedMenu && (
                                <div className="absolute right-0 bottom-full mb-2 bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-xl backdrop-blur-md flex flex-col min-w-[70px] z-30">
                                    {SPEED_OPTIONS.map((rate) => (
                                        <button
                                            key={rate}
                                            type="button"
                                            onClick={() => handleSpeedChange(rate)}
                                            className={`px-3 py-1 text-left rounded-lg text-xs font-semibold transition ${
                                                playbackRate === rate
                                                    ? 'bg-violet-600 text-white'
                                                    : 'text-slate-300 hover:bg-white/10'
                                            }`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Captions Toggle (if available) */}
                        {captionsAvailable && (
                            <button
                                type="button"
                                onClick={toggleCaptions}
                                aria-label={captionsActive ? 'Disable captions' : 'Enable captions'}
                                className={`p-1.5 rounded-lg transition focus-visible:ring-2 focus-visible:ring-violet-500 ${
                                    captionsActive
                                        ? 'text-violet-400 bg-violet-950/60'
                                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <Subtitles className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        )}

                        {/* Fullscreen */}
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                            className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                            {isFullscreen ? (
                                <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

