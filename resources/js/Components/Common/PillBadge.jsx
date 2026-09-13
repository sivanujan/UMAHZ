import React from 'react';

/**
 * Standardized pink pill badge for section headers
 * Ensures identical padding, letter-spacing, text size, dot indicator, and radius everywhere.
 */
export default function PillBadge({ text, className = '', dotColor = 'bg-pink-500 dark:bg-pink-400' }) {
    return (
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] bg-pink-100/90 text-pink-700 border border-pink-200/80 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800/50 shadow-xs transition-colors duration-200 ${className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} aria-hidden="true" />
            <span>{text}</span>
        </div>
    );
}
