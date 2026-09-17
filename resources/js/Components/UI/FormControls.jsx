import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

/**
 * FormControls
 * 
 * Reusable theme-aware glass form controls matching the dashboard:
 * - GlassInput, GlassSelect, GlassTextarea, GlassCheckbox, GlassLabel, GlassError
 * - High-contrast text tokens (text-slate-900 dark:text-white) preventing light-mode washout
 * - Brand violet focus borders & rings
 */

export function GlassLabel({ children, required = false, className = '', htmlFor }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 ${className}`}
        >
            {children}
            {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
    );
}

export function GlassError({ message, className = '' }) {
    if (!message) return null;
    return (
        <p className={`mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 ${className}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    );
}

export const GlassInput = React.forwardRef(function GlassInput(
    { className = '', error, type = 'text', style = {}, ...props },
    ref
) {
    return (
        <input
            ref={ref}
            type={type}
            style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                ...style,
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                bg-white/70 hover:bg-white focus:bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus:bg-white/[0.10]
                text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                border ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15' : 'border-slate-200/90 dark:border-white/10 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15'}
                shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
            {...props}
        />
    );
});

export const GlassSelect = React.forwardRef(function GlassSelect(
    { className = '', error, children, style = {}, ...props },
    ref
) {
    return (
        <div className="relative">
            <select
                ref={ref}
                style={{
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    ...style,
                }}
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm transition-all duration-200 outline-none appearance-none
                    bg-white/70 hover:bg-white focus:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:focus:bg-slate-900
                    text-slate-900 dark:text-white
                    border ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15' : 'border-slate-200/90 dark:border-white/10 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15'}
                    shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>
    );
});

export const GlassTextarea = React.forwardRef(function GlassTextarea(
    { className = '', error, rows = 3, style = {}, ...props },
    ref
) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                ...style,
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                bg-white/70 hover:bg-white focus:bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus:bg-white/[0.10]
                text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                border ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15' : 'border-slate-200/90 dark:border-white/10 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15'}
                shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
            {...props}
        />
    );
});

export const GlassCheckbox = React.forwardRef(function GlassCheckbox(
    { className = '', label, id, ...props },
    ref
) {
    return (
        <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
                ref={ref}
                type="checkbox"
                id={id}
                className={`w-4 h-4 rounded-md border-slate-300 dark:border-white/20 text-violet-600 focus:ring-violet-500/20 bg-white/70 dark:bg-white/10 transition-colors cursor-pointer ${className}`}
                {...props}
            />
            {label && (
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </span>
            )}
        </label>
    );
});
