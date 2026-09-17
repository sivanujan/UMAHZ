import React from 'react';

/**
 * StatusBadge
 * 
 * Reusable theme-aware status badge with animated dot:
 * - Green (active, paid, completed, confirmed)
 * - Amber (pending, invited, warning, in_progress)
 * - Violet / Indigo (scheduled, checked_in)
 * - Red (cancelled, overdue, suspended, inactive)
 * - Slate / Neutral (deactivated, default)
 */
export function StatusBadge({
    status = 'active',
    variant = null,
    label = null,
    children = null,
    pulse = false,
    className = '',
}) {
    const rawStatus = variant || status;
    const norm = String(rawStatus || '').toLowerCase().replace(/[\s-]/g, '_');

    let bgClass = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    let dotClass = 'bg-slate-400';
    let defaultLabel = children || label || rawStatus;

    if (['active', 'paid', 'completed', 'confirmed', 'settled', 'success'].includes(norm)) {
        bgClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
        dotClass = 'bg-emerald-500';
        if (!defaultLabel) defaultLabel = 'Active';
    } else if (['pending', 'invited', 'warning', 'in_progress', 'partially_paid', 'no_show'].includes(norm)) {
        bgClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25';
        dotClass = 'bg-amber-500';
        if (!defaultLabel) defaultLabel = 'Pending';
    } else if (['scheduled', 'checked_in', 'info', 'primary'].includes(norm)) {
        bgClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25';
        dotClass = 'bg-[#8200db]';
        if (!defaultLabel) defaultLabel = 'Scheduled';
    } else if (['cancelled', 'overdue', 'suspended', 'inactive', 'danger', 'failed'].includes(norm)) {
        bgClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25';
        dotClass = 'bg-rose-500';
        if (!defaultLabel) defaultLabel = 'Cancelled';
    } else if (['neutral', 'draft', 'deactivated'].includes(norm)) {
        bgClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
        dotClass = 'bg-slate-400';
        if (!defaultLabel) defaultLabel = 'Neutral';
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${bgClass} ${className}`}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass} ${pulse ? 'animate-pulse' : ''}`}
            />
            <span>{defaultLabel}</span>
        </span>
    );
}

export default StatusBadge;
