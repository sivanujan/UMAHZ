import React, { useMemo, useState } from 'react';
import ReportLayout from './ReportLayout';
import KpiCard from '@/Components/Dashboard/KpiCard';
import ChartCard from '@/Components/UI/ChartCard';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    User,
    Building2,
    Stethoscope,
    TrendingUp,
    BarChart3,
    ArrowUpDown,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from 'recharts';
import { useTheme } from '@/Contexts/ThemeContext';

/* Custom Dark-Mode Aware Tooltip for Recharts */
function CustomChartTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="p-3 rounded-xl shadow-xl border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-[#1a122e]/95 backdrop-blur-md text-xs">
            <p className="font-bold text-slate-900 dark:text-white mb-1.5 border-b border-slate-100 dark:border-white/10 pb-1">
                {label}
            </p>
            <div className="space-y-1">
                {payload.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {item.name}:
                            </span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AppointmentsReport({
    canViewFinancial,
    filters,
    options,
    practitioners,
    locations,
    data,
    report,
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';

    const payload = report || data || {};
    const summary = payload.summary || {
        total: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        scheduled: 0,
        confirmed: 0,
        completion_rate: 0,
        cancellation_rate: 0,
        no_show_rate: 0,
    };
    const comparison = payload.comparison || {
        total_growth: 0,
        completed_growth: 0,
        cancelled_growth: 0,
        no_show_growth: 0,
        prev_total: 0,
    };
    const daily = payload.trend || payload.daily || [];
    const byPractitioner = payload.by_practitioner || [];
    const byService = payload.by_service || [];
    const byLocation = payload.by_location || [];

    // Sorting state for Practitioner Performance table
    const [sortField, setSortField] = useState('total');
    const [sortDirection, setSortDirection] = useState('desc');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedPractitioners = useMemo(() => {
        return [...byPractitioner].sort((a, b) => {
            let valA = a[sortField] ?? 0;
            let valB = b[sortField] ?? 0;
            if (typeof valA === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }, [byPractitioner, sortField, sortDirection]);

    // Check if chart has any activity across range
    const totalDailyActivity = useMemo(() => {
        return daily.reduce((acc, d) => acc + (d.total || 0), 0);
    }, [daily]);

    const hasChartData = totalDailyActivity > 0;

    // Trend sparkline arrays for KPI cards
    const totalSparkline = useMemo(() => daily.map((d) => d.total || 0), [daily]);
    const completedSparkline = useMemo(() => daily.map((d) => d.completed || 0), [daily]);
    const cancelledSparkline = useMemo(() => daily.map((d) => d.cancelled || 0), [daily]);
    const noShowSparkline = useMemo(() => daily.map((d) => d.no_show || 0), [daily]);

    return (
        <ReportLayout
            title="Appointments Report"
            activeTab="appointments"
            canViewFinancial={canViewFinancial}
            filters={filters}
            options={options}
            practitioners={practitioners}
            locations={locations}
            exportRoute="/app/reports/appointments/export"
        >
            <div className="space-y-6">
                {/* 1. Professional KPI Summary Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        label="Total Appointments"
                        rawValue={summary.total || 0}
                        icon={Calendar}
                        iconTint="#8200db"
                        iconBg="rgba(130,0,219,0.12)"
                        trend={{
                            value: comparison.total_growth,
                            isPositive: comparison.total_growth >= 0,
                            text: `vs prev period (${comparison.prev_total || 0})`,
                            hasComparison: comparison.prev_total > 0,
                        }}
                        sparkline={totalSparkline}
                        delay={0}
                    />

                    <KpiCard
                        label={`Completed (${summary.completion_rate || 0}% rate)`}
                        rawValue={summary.completed || 0}
                        icon={CheckCircle2}
                        iconTint="#10B981"
                        iconBg="rgba(16,185,129,0.12)"
                        trend={{
                            value: comparison.completed_growth,
                            isPositive: comparison.completed_growth >= 0,
                            text: `${summary.completion_rate || 0}% completion rate`,
                        }}
                        sparkline={completedSparkline}
                        delay={1}
                    />

                    <KpiCard
                        label={`Cancellations (${summary.cancellation_rate || 0}% rate)`}
                        rawValue={summary.cancelled || 0}
                        icon={XCircle}
                        iconTint="#F43F5E"
                        iconBg="rgba(244,63,94,0.12)"
                        trend={{
                            value: comparison.cancelled_growth,
                            isPositive: comparison.cancelled_growth <= 0, // Less cancellations is good
                            text: `${summary.cancellation_rate || 0}% cancellation rate`,
                        }}
                        sparkline={cancelledSparkline}
                        delay={2}
                    />

                    <KpiCard
                        label={`No-Shows (${summary.no_show_rate || 0}% rate)`}
                        rawValue={summary.no_show || 0}
                        icon={AlertCircle}
                        iconTint="#F59E0B"
                        iconBg="rgba(245,158,11,0.12)"
                        trend={{
                            value: comparison.no_show_growth,
                            isPositive: comparison.no_show_growth <= 0, // Less no-shows is good
                            text: `${summary.no_show_rate || 0}% no-show rate`,
                        }}
                        sparkline={noShowSparkline}
                        delay={3}
                    />
                </div>

                {/* 2. Main Daily Scheduling Volume Chart */}
                <ChartCard
                    icon={BarChart3}
                    title="Appointment Activity Over Time"
                    subtitle="Daily breakdown of completed, cancelled, and no-show patient sessions."
                    hasData={hasChartData}
                    emptyTitle="No appointment activity in this range"
                    emptyDescription="There are no booked or recorded appointments within the selected date range and filter criteria."
                    legend={
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-2xs" />
                                <span className="text-slate-600 dark:text-slate-300">Completed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-2xs" />
                                <span className="text-slate-600 dark:text-slate-300">Cancelled</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-2xs" />
                                <span className="text-slate-600 dark:text-slate-300">No-Show</span>
                            </div>
                        </div>
                    }
                >
                    <div className="w-full h-72 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={daily} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }}
                                    axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                    axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#F43F5E" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="no_show" name="No-Show" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* 3. Report Breakdown Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Performance by Practitioner */}
                    <GlassCard className="p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/20">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                            Performance by Practitioner
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Clinical session volume and delivery fulfillment.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {sortedPractitioners.length === 0 ? (
                                <p className="text-xs py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                                    No practitioner activity recorded in this period.
                                </p>
                            ) : (
                                <div className="overflow-x-auto mt-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200/80 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                <th className="pb-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                                                    <div className="flex items-center gap-1">
                                                        <span>Practitioner</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('total')}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>Total</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('completed')}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>Done</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('cancelled')}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>Cancel</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-right cursor-pointer select-none" onClick={() => handleSort('completion_rate')}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>Fulfillment</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                                            {sortedPractitioners.map((p, idx) => {
                                                const rate = p.completion_rate ?? 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                                        <td className="py-3 font-semibold text-slate-900 dark:text-white">
                                                            {p.name}
                                                        </td>
                                                        <td className="py-3 text-center font-bold text-slate-900 dark:text-white">
                                                            {p.total}
                                                        </td>
                                                        <td className="py-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            {p.completed}
                                                        </td>
                                                        <td className="py-3 text-center text-rose-500 font-semibold">
                                                            {p.cancelled}
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="w-14 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden hidden sm:block">
                                                                    <div
                                                                        className="h-full rounded-full bg-emerald-500"
                                                                        style={{ width: `${Math.min(100, rate)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {rate}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Breakdown by Service & Location */}
                    <div className="space-y-6">
                        {/* By Service */}
                        <GlassCard className="p-5 sm:p-6">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/60 dark:border-white/10">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                    <Stethoscope className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                        Appointments by Service
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Demand volume per clinical modality or session type.
                                    </p>
                                </div>
                            </div>

                            {byService.length === 0 ? (
                                <p className="text-xs py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                                    No service appointments recorded in this period.
                                </p>
                            ) : (
                                <div className="space-y-3.5 mt-4">
                                    {byService.map((s, idx) => {
                                        const count = s.total || s.count || 0;
                                        const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                                        return (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {s.name}
                                                    </span>
                                                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                                        {count} sessions ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassCard>

                        {/* By Location */}
                        {byLocation.length > 0 && (
                            <GlassCard className="p-5 sm:p-6">
                                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/60 dark:border-white/10">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                            Appointments by Location
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Distribution across physical clinic branches.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    {byLocation.map((loc, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] flex items-center justify-between text-xs"
                                        >
                                            <span className="font-bold text-slate-900 dark:text-white truncate mr-2">
                                                {loc.name}
                                            </span>
                                            <span className="font-extrabold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 shrink-0">
                                                {loc.total || loc.count || 0} visits
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </div>
            </div>
        </ReportLayout>
    );
}
