import React, { useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { DollarSign, BarChart2, TrendingUp, Calendar, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

const PERIODS = [
    { key: 'month', label: 'This Month' },
    { key: '3m', label: 'Last 3 Months' },
    { key: '6m', label: 'Last 6 Months' },
];

function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="rounded-2xl p-3 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700 shadow-xl backdrop-blur-md text-xs space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{item.label || label}</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400" />
                    <span className="text-slate-500 dark:text-slate-400">Revenue:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                        ${Number(payload[0].value).toFixed(2)} CAD
                    </span>
                </div>
            </div>
        );
    }
    return null;
}

export default function RevenueChartCard({
    revenueChart = [],
    monthlyRevenue = '$0.00',
    currency = 'CAD',
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    const [period, setPeriod] = useState('6m');
    const [chartType, setChartType] = useState('area'); // Default to smooth Area chart

    // Filter data according to period
    const filteredData = useMemo(() => {
        if (!revenueChart || revenueChart.length === 0) return [];
        if (period === 'month') {
            return revenueChart.slice(-1);
        }
        if (period === '3m') {
            return revenueChart.slice(-3);
        }
        return revenueChart;
    }, [revenueChart, period]);

    const totalInPeriod = useMemo(() => {
        return filteredData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    }, [filteredData]);

    const nonZeroCount = useMemo(() => {
        return filteredData.filter((d) => (d.revenue || 0) > 0).length;
    }, [filteredData]);

    const hasAnyRevenue = totalInPeriod > 0;
    const isSparseData = nonZeroCount <= 1;

    return (
        <div
            className="p-5 sm:p-6 flex flex-col justify-between transition-all duration-300"
            style={{
                borderRadius: '24px',
                background: isDark ? 'rgba(30, 24, 45, 0.50)' : 'rgba(255, 255, 255, 0.40)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(255, 255, 255, 0.65)',
                boxShadow: isDark
                    ? '0 12px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                    : '0 12px 36px rgba(130, 0, 219, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
            }}
        >
            {/* Header: Title & Controls */}
            <div className="flex items-center justify-between gap-4 pb-3">
                <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                        Revenue Overview
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                        Patient payments & invoice collections across time
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Period Selector pill */}
                    <div
                        className="flex items-center gap-1 p-0.5 rounded-full"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                    >
                        {PERIODS.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => setPeriod(p.key)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all ${
                                    period === p.key
                                        ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-white/15 shadow-2xs'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Reference circular arrow button */}
                    <button
                        type="button"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                        aria-label="View Details"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Reference Dual Stats Row & Chart Type Toggle */}
            <div className="flex items-center justify-between my-3 pb-2 flex-wrap gap-4">
                <div className="flex items-center gap-8">
                    <div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                            Current Month
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                {monthlyRevenue}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                +6%
                            </span>
                        </div>
                    </div>

                    <div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                            Period Total
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                ${totalInPeriod.toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                {currency}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setChartType('bar')}
                        title="Bar chart"
                        className={`p-1.5 rounded-xl border text-xs transition-colors ${
                            chartType === 'bar'
                                ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40 shadow-2xs'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setChartType('area')}
                        title="Area chart"
                        className={`p-1.5 rounded-xl border text-xs transition-colors ${
                            chartType === 'area'
                                ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40 shadow-2xs'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Recharts Container */}
            <div className="h-[250px] w-full mt-2 relative">
                {filteredData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'area' ? (
                            <AreaChart
                                data={filteredData}
                                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818CF8" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                                />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#818CF8"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#revenueGradient)"
                                    activeDot={{ r: 5, fill: '#818CF8', stroke: '#FFFFFF', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        ) : (
                            <BarChart
                                data={filteredData}
                                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                                />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="revenue"
                                    radius={[8, 8, 8, 8]}
                                    maxBarSize={22}
                                >
                                    {filteredData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                index === filteredData.length - 1
                                                    ? '#818CF8'
                                                    : isDark
                                                        ? 'rgba(129,140,248,0.25)'
                                                        : '#DDD6FE'
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <Calendar className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No billing history yet
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                            As appointments are completed and patient invoices are paid, revenue trends will appear here.
                        </p>
                    </div>
                )}
            </div>

            {/* Sparse data notice for new clinics */}
            {isSparseData && hasAnyRevenue && (
                <div className="mt-3 px-3 py-2 rounded-xl bg-violet-500/[0.06] dark:bg-white/[0.04] border border-violet-500/15 text-[11px] text-violet-700 dark:text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
                    <span>Practice baseline: revenue trends and comparative curves will populate as more appointments are logged.</span>
                </div>
            )}

            {/* Footer Summary note */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Direct Stripe & Manual settlement</span>
                <span className="font-medium text-violet-600 dark:text-violet-400">
                    Auto-reconciled
                </span>
            </div>
        </div>
    );
}
