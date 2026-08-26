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
export default function Logo({ size = 'md', theme = 'light', tagline = false, className = '' }) {
    const { image, wordmark, tagline: taglineSize } = SIZES[size];
    const wordmarkColor = theme === 'dark' ? 'text-white' : 'text-[#1E0B3C]';
    const taglineColor = theme === 'dark' ? 'text-purple-200' : 'text-slate-500';

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <img
                src="/imags/logo.png"
                alt="UMAHZ"
                style={{ width: image, height: image, flexShrink: 0 }}
                className="object-contain"
            />
            <span className="flex flex-col leading-tight">
                <span className={`font-bold tracking-tight ${wordmark} ${wordmarkColor}`}>
                    UMAHZ<span className="text-[#2563EB]">.</span>
                </span>
                {tagline && (
                    <span className={`font-medium ${taglineSize} ${taglineColor}`}>
                        One Platform.{' '}
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#2E9BE6] to-[#22c55e]">
                            Every Wellness Practice.
                        </span>
                    </span>
                )}
            </span>
        </span>
    );
}
