import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * EmptyState
 * 
 * Friendly empty state for lists, tables, and sparse data cards
 */
export function EmptyState({
    icon: Icon = Sparkles,
    title = 'No records found',
    description = 'Get started by creating your first entry.',
    action = null,
    className = '',
}) {
    return (
        <div className={`py-12 px-4 flex flex-col items-center justify-center text-center ${className}`}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/10 text-[#8200db] dark:text-purple-300 mb-3.5 border border-purple-500/20 shadow-2xs">
                <Icon className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
            </h4>
            {description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-5">
                    {action}
                </div>
            )}
        </div>
    );
}

export default EmptyState;
