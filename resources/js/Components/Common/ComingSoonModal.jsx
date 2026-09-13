import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Activity, FileText, X, ArrowRight, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'umahz_coming_soon_seen_v1';

/** Helper to programmatically reopen the modal from any link or button */
export function openComingSoonModal() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-coming-soon-modal'));
    }
}

export default function ComingSoonModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        // Check if user has already seen this announcement
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        let timer = null;

        if (!hasSeen) {
            // Elegant entrance delay of 1000ms after site loads
            timer = setTimeout(() => {
                setIsOpen(true);
                setIsRendered(true);
            }, 1000);
        }

        // Listener to allow reopening via "What's coming" buttons/links
        const handleOpen = () => {
            setIsOpen(true);
            setIsRendered(true);
        };

        window.addEventListener('open-coming-soon-modal', handleOpen);

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('open-coming-soon-modal', handleOpen);
        };
    }, []);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleDismiss();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            // Trap focus or focus the modal
            modalRef.current?.focus();
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleDismiss = () => {
        setIsOpen(false);
        // Persist seen state so users are not repeatedly interrupted
        localStorage.setItem(STORAGE_KEY, 'true');
        setTimeout(() => setIsRendered(false), 300);
    };

    if (!isRendered) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-soon-title"
        >
            {/* Backdrop Blur Overlay */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={handleDismiss}
                aria-hidden="true"
            />

            {/* Modal Card */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 outline-none ${
                    isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                }`}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                }}
            >
                {/* Decorative Top Gradient Accent */}
                <div
                    className="h-1.5 w-full"
                    style={{ background: 'linear-gradient(90deg, #2563EB 0%, #5B2EFF 50%, #06B6D4 100%)' }}
                />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 sm:p-8">
                    {/* Header Tag */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80 mb-3.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Coming Soon to UMAHZ</span>
                    </div>

                    <h2
                        id="coming-soon-title"
                        className="text-2xl font-bold text-slate-900 tracking-tight"
                    >
                        Powerful new capabilities are on the way.
                    </h2>

                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        We're constantly expanding UMAHZ to streamline modern healthcare practices. Here's an early preview of two major modules currently in development.
                    </p>

                    {/* Features List */}
                    <div className="mt-6 space-y-3.5">
                        {/* Feature 1: UMAHZ Motion */}
                        <div className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200/80 transition-all duration-200 flex items-start gap-4">
                            <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600 shadow-sm">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        UMAHZ Motion
                                    </h3>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200/60 flex-shrink-0">
                                        Coming Soon
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-normal font-medium">
                                    Camera-based movement assessment & progress tracking
                                </p>
                            </div>
                        </div>

                        {/* Feature 2: UMAHZ Scribe */}
                        <div className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-purple-50/40 hover:border-purple-200/80 transition-all duration-200 flex items-start gap-4">
                            <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-100 text-purple-600 shadow-sm">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        UMAHZ Scribe
                                    </h3>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200/60 flex-shrink-0">
                                        Coming Soon
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-normal font-medium">
                                    AI-assisted clinical documentation
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Planned for future updates
                        </span>

                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            style={{
                                background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                            }}
                        >
                            Got it
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
