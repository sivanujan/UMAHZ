import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * PageHeader
 * 
 * Reusable banner matching the dashboard greeting and overview row:
 * - Category eyebrow tag with icon
 * - Large, high-contrast title (text-slate-900 dark:text-white)
 * - Explanatory subtitle (text-slate-600 dark:text-slate-400)
 * - Right-aligned action buttons slot
 */
export function PageHeader({
    category = '',
    eyebrow = '',
    title,
    subtitle,
    action = null,
    actions = null,
    icon: Icon = Sparkles,
    className = '',
}) {
    const displayEyebrow = eyebrow || category;
    const displayActions = actions || action;

    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-2 ${className}`}>
            <div>
                {displayEyebrow && (
                    <div
                        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1"
                        style={{ color: '#8B7CF6' }}
                    >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{displayEyebrow}</span>
                    </div>
                )}
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-medium">
                        {subtitle}
                    </p>
                )}
            </div>

            {displayActions && (
                <div className="flex items-center gap-2.5 shrink-0">
                    {displayActions}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
