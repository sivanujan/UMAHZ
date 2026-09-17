import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

export default function ThemeToggle({ className = '', size = 'md' }) {
    let theme = null;
    try {
        theme = useTheme();
    } catch (e) {
        // Safe fallback if rendered without provider
    }
    if (!theme) return null;

    const { resolved, toggle } = theme;
    const isDark = resolved === 'dark';

    const sizeClasses = size === 'sm' 
        ? 'w-8 h-8' 
        : size === 'lg' 
            ? 'w-10 h-10' 
            : 'w-9 h-9';

    return (
        <button
            type="button"
            onClick={toggle}
            className={`group relative flex items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-700/90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 shadow-xs backdrop-blur-md cursor-pointer ${sizeClasses} ${className}`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            {isDark ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
            ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform duration-300 group-hover:-rotate-12" />
            )}
        </button>
    );
}
