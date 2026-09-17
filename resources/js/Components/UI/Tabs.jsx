import React from 'react';
import { useTheme } from '@/Contexts/ThemeContext';

/**
 * Tabs
 * 
 * Segmented pill tabs matching the dashboard active pill style:
 * - Active: Soft white rounded pill with subtle shadow
 * - Inactive: Plain muted text with hover effect
 */
export function Tabs({
    tabs = [], // [{ id, label, count, icon: Icon }]
    activeTab,
    onChange,
    className = '',
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';

    return (
        <div
            className={`inline-flex items-center gap-1 p-1 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md ${className}`}
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                            isActive
                                ? isDark
                                    ? 'bg-white/20 text-white shadow-xs'
                                    : 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                    isActive
                                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                        : 'bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default Tabs;
