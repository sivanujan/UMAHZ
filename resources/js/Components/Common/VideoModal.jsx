import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import VideoPlayer from '@/Components/Common/VideoPlayer';

export default function VideoModal({
    isOpen,
    onClose,
    title = 'UMAHZ Walkthrough',
    src,
    poster,
    captionsSrc,
    aspect = '16:9',
}) {
    const dialogRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                ref={dialogRef}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full mx-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-violet-500/30 bg-[#0B0F19] text-white ${
                    aspect === '9:16'
                        ? 'max-w-[380px] max-h-[92vh]'
                        : 'max-w-4xl xl:max-w-5xl'
                }`}
            >
                {/* Modal Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
                    <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                        {title}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close video (Esc)"
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Video Player */}
                <div className="w-full bg-black">
                    <VideoPlayer
                        src={src}
                        poster={poster}
                        captionsSrc={captionsSrc}
                        aspect={aspect}
                        autoPlay={true}
                        preload="metadata"
                        className="w-full h-full"
                    />
                </div>
            </div>
        </div>
    );
}

