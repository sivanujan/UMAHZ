import React from 'react';

export default function AuthBackground({ className = '' }) {
    return (
        <div
            className={`fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300 ${className}`}
            aria-hidden="true"
        >
            {/* Subtle background texture grid */}
            <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] bg-[radial-gradient(#6d5efc_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Blob 1: Brand Violet (#6d5efc), Top-Right */}
            <div
                className="absolute -top-36 -right-28 w-[540px] h-[540px] rounded-full blur-3xl animate-aurora-1 opacity-25 dark:opacity-20"
                style={{
                    background: 'radial-gradient(circle, #6d5efc 0%, rgba(109,94,252,0.65) 45%, rgba(109,94,252,0) 70%)',
                }}
            />

            {/* Blob 2: Brand Teal Accent (#06b6d4), Bottom-Left */}
            <div
                className="absolute -bottom-32 -left-24 w-[500px] h-[500px] rounded-full blur-3xl animate-aurora-2 opacity-20 dark:opacity-15"
                style={{
                    background: 'radial-gradient(circle, #06b6d4 0%, rgba(6,182,212,0.55) 45%, rgba(6,182,212,0) 70%)',
                }}
            />

            {/* Blob 3: Deep Indigo (#4f46e5), Center / Ambient */}
            <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-3xl animate-aurora-3 opacity-20 dark:opacity-15"
                style={{
                    background: 'radial-gradient(circle, #4f46e5 0%, rgba(79,70,229,0.5) 40%, rgba(79,70,229,0) 70%)',
                }}
            />
        </div>
    );
}
