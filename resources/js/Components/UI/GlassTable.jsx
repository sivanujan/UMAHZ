import React from 'react';

/**
 * GlassTable
 * 
 * Clean table components for glass cards:
 * - Upper-case muted header row
 * - Hairline row dividers
 * - Hover row illumination
 * - High-contrast data cells
 */

export function GlassTable({ children, className = '' }) {
    return (
        <div className="w-full overflow-x-auto rounded-xl">
            <table className={`w-full text-left border-collapse text-xs sm:text-sm ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function GlassThead({ children, className = '' }) {
    return (
        <thead className={`border-b border-slate-200/80 dark:border-white/[0.08] ${className}`}>
            {children}
        </thead>
    );
}

export function GlassTh({ children, className = '', align = 'left', ...props }) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    return (
        <th
            className={`py-3 px-3 sm:px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap ${alignClass} ${className}`}
            {...props}
        >
            {children}
        </th>
    );
}

export function GlassTbody({ children, className = '' }) {
    return (
        <tbody className={`divide-y divide-slate-100 dark:divide-white/[0.06] ${className}`}>
            {children}
        </tbody>
    );
}

export function GlassTr({ children, className = '', onClick, ...props }) {
    return (
        <tr
            onClick={onClick}
            className={`transition-colors duration-150 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] ${onClick ? 'cursor-pointer' : ''} ${className}`}
            {...props}
        >
            {children}
        </tr>
    );
}

export function GlassTd({ children, className = '', align = 'left', ...props }) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    return (
        <td
            className={`py-3.5 px-3 sm:px-4 text-slate-800 dark:text-slate-200 ${alignClass} ${className}`}
            {...props}
        >
            {children}
        </td>
    );
}
