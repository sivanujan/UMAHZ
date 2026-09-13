import React from 'react';

const SIZES = {
    sm: { image: 32, wordmark: 'text-lg', tagline: 'text-[10px]' },
    md: { image: 36, wordmark: 'text-xl', tagline: 'text-[11px]' },
    lg: { image: 44, wordmark: 'text-2xl', tagline: 'text-xs' },
};

/**
 * The UMAHZ logo mark + wordmark, optionally with the "One Platform. Every
 * Wellness Practice." tagline. Centralised here so the brand asset only
 * needs to be swapped in one place.
 */
export default function Logo({ size = 'md', theme = 'auto', tagline = false, className = '' }) {
    const { image, wordmark, tagline: taglineSize } = SIZES[size];
    const wordmarkColor =
        theme === 'dark'
            ? 'text-white'
            : theme === 'light'
                ? 'text-slate-900'
                : 'text-slate-900 dark:text-white';

    const taglineColor =
        theme === 'dark'
            ? 'text-slate-300'
            : theme === 'light'
                ? 'text-slate-600'
                : 'text-slate-600 dark:text-slate-300';

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <img
                src="/imags/logo.png"
                alt="UMAHZ"
                style={{ width: image, height: image, flexShrink: 0 }}
                className="object-contain drop-shadow-xs"
            />
            <span className="flex flex-col leading-tight">
                <span className={`font-extrabold tracking-tight ${wordmark} ${wordmarkColor}`}>
                    UMAHZ<span className="text-indigo-600 dark:text-indigo-400">.</span>
                </span>
                {tagline && (
                    <span className={`font-medium ${taglineSize} ${taglineColor}`}>
                        One Platform.{' '}
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-cyan-400 dark:to-emerald-400">
                            Every Wellness Practice.
                        </span>
                    </span>
                )}
            </span>
        </span>
    );
}
