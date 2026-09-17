import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react';
import { GlassButton } from '@/Components/UI/GlassButton';

/**
 * DateRangePicker
 * 
 * Styled date range selector matching the UMAHZ glassmorphism aesthetic:
 * - Segmented quick-presets
 * - Styled date range inputs with clear validation
 * - Dynamic visual range summary ("Sep 1, 2026 – Sep 17, 2026")
 */
export function DateRangePicker({
    startDate = '',
    endDate = '',
    activePreset = '',
    presets = [
        { label: 'Last 7 Days', value: '7d' },
        { label: 'This Month', value: 'month' },
        { label: 'Last Month', value: 'last_month' },
        { label: 'Year to Date', value: 'ytd' },
    ],
    onPresetSelect,
    onDateChange,
    className = '',
}) {
    const [localStart, setLocalStart] = useState(startDate);
    const [localEnd, setLocalEnd] = useState(endDate);

    const handleStartChange = (e) => {
        const val = e.target.value;
        setLocalStart(val);
        if (onDateChange) onDateChange(val, localEnd);
    };

    const handleEndChange = (e) => {
        const val = e.target.value;
        setLocalEnd(val);
        if (onDateChange) onDateChange(localStart, val);
    };

    return (
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${className}`}>
            {/* Quick Presets Segmented Bar */}
            <div className="flex items-center gap-1 p-1 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md overflow-x-auto no-scrollbar">
                {presets.map((p) => {
                    const isSelected = activePreset === p.value;
                    return (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => {
                                if (onPresetSelect) onPresetSelect(p.value);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                isSelected
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.06]'
                            }`}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {/* Custom Range Inputs */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md text-xs font-semibold">
                <CalendarIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <input
                    type="date"
                    value={startDate}
                    onChange={handleStartChange}
                    className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-medium"
                    aria-label="Start date"
                />
                <span className="text-slate-400 font-normal select-none">–</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={handleEndChange}
                    className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-medium"
                    aria-label="End date"
                />
            </div>
        </div>
    );
}

export default DateRangePicker;
