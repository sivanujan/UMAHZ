import React from 'react';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';

/**
 * ChartCard
 * 
 * Reusable container for analytics charts:
 * - Glassmorphic surface
 * - Header with icon, title, description, and action/legend slot
 * - Graceful empty state when data has 0 values or empty array
 */
export function ChartCard({
    icon: Icon = null,
    title,
    subtitle,
    actions = null,
    legend = null,
    hasData = true,
    emptyTitle = 'No activity in this range',
    emptyDescription = 'There were no recorded entries for the selected date range and filter criteria.',
    emptyAction = null,
    children,
    className = '',
}) {
    return (
        <GlassCard className={`p-5 sm:p-6 flex flex-col justify-between ${className}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200/60 dark:border-white/10 gap-3">
                <div className="flex items-start gap-3">
                    {Icon && (
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/20 mt-0.5">
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right side: Legend and/or Actions */}
                {(legend || actions) && (
                    <div className="flex flex-wrap items-center gap-3">
                        {legend}
                        {actions}
                    </div>
                )}
            </div>

            {/* Content or Inside Empty State */}
            <div className="pt-4 flex-1">
                {hasData ? (
                    children
                ) : (
                    <div className="py-12 px-4 rounded-xl border border-dashed border-slate-200/80 dark:border-white/10 bg-slate-500/[0.02]">
                        <EmptyState
                            icon={Icon}
                            title={emptyTitle}
                            description={emptyDescription}
                            action={emptyAction}
                        />
                    </div>
                )}
            </div>
        </GlassCard>
    );
}

export default ChartCard;
