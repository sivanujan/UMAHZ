import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import ReportLayout from './ReportLayout';
import KpiCard from '@/Components/Dashboard/KpiCard';
import ChartCard from '@/Components/UI/ChartCard';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import { GlassButton } from '@/Components/UI/GlassButton';
import {
    Users,
    UserPlus,
    RotateCcw,
    HeartHandshake,
    Award,
    TrendingUp,
    Calendar,
    CheckCircle2,
    Clock,
    UserCheck,
    ArrowUpDown,
    ExternalLink,
    Sparkles,
    AlertCircle,
    Activity,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useTheme } from '@/Contexts/ThemeContext';

/* Custom Dark-Mode Aware Tooltip for Patient Activity Chart */
function RetentionChartTooltip({ active, payload, label }) {
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
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            {item.value} patient{item.value === 1 ? '' : 's'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RetentionReport({
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
        total_active_clients: 0,
        new_clients: 0,
        returning_clients: 0,
        new_client_pct: 0,
        returning_client_pct: 0,
        rebooking_rate: 0,
        rebooked_clients_count: 0,
        avg_visits_per_client: 0,
        total_visits: 0,
    };
    const comparison = payload.comparison || {
        active_clients_growth: 0,
        rebooking_rate_diff: 0,
        new_clients_growth: 0,
        returning_clients_growth: 0,
        prev_active_clients: 0,
        prev_rebooking_rate: 0,
        prev_new_clients: 0,
        prev_returning_clients: 0,
    };
    const trend = payload.trend || [];
    const clients = payload.clients || [];

    // Sorting for Client Cohort table
    const [sortField, setSortField] = useState('visits');
    const [sortDirection, setSortDirection] = useState('desc');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedClients = useMemo(() => {
        return [...clients].sort((a, b) => {
            let valA = a[sortField] ?? 0;
            let valB = b[sortField] ?? 0;
            if (typeof valA === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'boolean') {
                return sortDirection === 'asc' ? (valA ? 1 : 0) - (valB ? 1 : 0) : (valB ? 1 : 0) - (valA ? 1 : 0);
            }
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }, [clients, sortField, sortDirection]);

    // Check if trend has any activity in range
    const totalTrendActivity = useMemo(() => {
        return trend.reduce((acc, t) => acc + (t.new_clients || 0) + (t.returning_visits || 0), 0);
    }, [trend]);

    // Sparklines for KPI cards
    const activeSparkline = useMemo(() => trend.map((t) => (t.new_clients || 0) + (t.returning_visits || 0)), [trend]);
    const rebookingSparkline = useMemo(() => trend.map((t) => (t.returning_visits || 0)), [trend]);
    const newSparkline = useMemo(() => trend.map((t) => (t.new_clients || 0)), [trend]);
    const returningSparkline = useMemo(() => trend.map((t) => (t.returning_visits || 0)), [trend]);

    // Donut chart data for New vs Returning split
    const donutData = useMemo(() => {
        if (summary.total_active_clients === 0) return [];
        return [
            { name: 'First-Time Patients', value: summary.new_clients || 0, color: '#8B5CF6' },
            { name: 'Returning Patients', value: summary.returning_clients || 0, color: '#10B981' },
        ].filter((d) => d.value > 0);
    }, [summary.total_active_clients, summary.new_clients, summary.returning_clients]);

    return (
        <ReportLayout
            title="Client Retention"
            activeTab="retention"
            canViewFinancial={canViewFinancial}
            filters={filters}
            options={options}
            practitioners={practitioners}
            locations={locations}
            exportRoute="/app/reports/retention/export"
        >
            <div className="space-y-6">
                {/* 1. Retention KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Key Metric 1: Rebooking Rate (Emerald Accent) */}
                    <KpiCard
                        label="Rebooking Rate"
                        value={`${summary.rebooking_rate || 0}%`}
                        icon={RotateCcw}
                        iconTint="#10B981"
                        iconBg="rgba(16,185,129,0.12)"
                        trend={{
                            value: comparison.rebooking_rate_diff,
                            isPositive: comparison.rebooking_rate_diff >= 0,
                            text: `${summary.rebooked_clients_count || 0} scheduled subsequent visits`,
                            hasComparison: comparison.prev_active_clients > 0,
                        }}
                        sparkline={rebookingSparkline}
                        delay={0}
                    />

                    {/* Key Metric 2: Returning Clients (Teal Accent) */}
                    <KpiCard
                        label="Returning Clients"
                        value={summary.returning_clients || 0}
                        icon={HeartHandshake}
                        iconTint="#059669"
                        iconBg="rgba(5,150,105,0.12)"
                        trend={{
                            value: comparison.returning_clients_growth,
                            isPositive: comparison.returning_clients_growth >= 0,
                            text: `Avg ${summary.avg_visits_per_client || 0} visits per patient`,
                            hasComparison: comparison.prev_returning_clients > 0,
                        }}
                        sparkline={returningSparkline}
                        delay={1}
                    />

                    {/* Metric 3: Active Clients (Blue Accent) */}
                    <KpiCard
                        label="Active Patients"
                        value={summary.total_active_clients || 0}
                        icon={Users}
                        iconTint="#3B82F6"
                        iconBg="rgba(59,130,246,0.12)"
                        trend={{
                            value: comparison.active_clients_growth,
                            isPositive: comparison.active_clients_growth >= 0,
                            text: `${summary.total_visits || 0} care sessions completed`,
                            hasComparison: comparison.prev_active_clients > 0,
                        }}
                        sparkline={activeSparkline}
                        delay={2}
                    />

                    {/* Metric 4: New Clients Acquired (Purple Accent) */}
                    <KpiCard
                        label="New Clients Acquired"
                        value={summary.new_clients || 0}
                        icon={UserPlus}
                        iconTint="#8B5CF6"
                        iconBg="rgba(139,92,246,0.12)"
                        trend={{
                            value: comparison.new_clients_growth,
                            isPositive: comparison.new_clients_growth >= 0,
                            text: `${summary.new_client_pct || 0}% of active client base`,
                            hasComparison: comparison.prev_new_clients > 0,
                        }}
                        sparkline={newSparkline}
                        delay={3}
                    />
                </div>

                {/* 2. Retention Distribution & Activity Trend (2 Column Layout) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Patient Retention Composition (5 cols on lg) */}
                    <GlassCard className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/60 dark:border-white/10">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                                    <Award className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                        Patient Retention Composition
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        First-time acquisition vs recurring client loyalty ratio.
                                    </p>
                                </div>
                            </div>

                            {summary.total_active_clients === 0 ? (
                                <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-500" />
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">No Patient Visits Recorded</p>
                                    <p className="mt-1 max-w-xs mx-auto text-[11px]">
                                        As clinical appointments are completed, client loyalty distribution will populate automatically.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-5">
                                    {/* Donut & Mini Stat Split */}
                                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/10">
                                        <div className="w-24 h-24 shrink-0 relative flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={donutData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={28}
                                                        outerRadius={42}
                                                        stroke="transparent"
                                                    >
                                                        {donutData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">
                                                    {summary.total_active_clients}
                                                </span>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                                    Total
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                    <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                                                        First-Time
                                                    </span>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                    {summary.new_clients} ({summary.new_client_pct}%)
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                                                        Returning
                                                    </span>
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                    {summary.returning_clients} ({summary.returning_client_pct}%)
                                                </span>
                                            </div>
                                            <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
                                                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Rebooked Next:</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                                    {summary.rebooking_rate}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bars */}
                                    <div className="space-y-4">
                                        {/* New Clients Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    First-Time Patients
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                        {summary.new_clients} client{summary.new_clients === 1 ? '' : 's'}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                                        {summary.new_client_pct}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
                                                    style={{ width: `${summary.new_client_pct || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Returning Clients Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    Returning & Recurring Patients
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                        {summary.returning_clients} client{summary.returning_clients === 1 ? '' : 's'}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                        {summary.returning_client_pct}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                                    style={{ width: `${summary.returning_client_pct || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Rebooking Rate Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    Follow-up Rebooking Rate
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                        {summary.rebooked_clients_count} scheduled next
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                                        {summary.rebooking_rate}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                                                    style={{ width: `${summary.rebooking_rate || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Early Stage Acquisition Notice when all clients are first-time */}
                                    {summary.total_active_clients > 0 && summary.returning_clients === 0 && (
                                        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] leading-relaxed">
                                                <strong>Initial Growth Phase:</strong> 100% of active clients are first-time patients. Subsequent appointment rebooking will compound retention ratios.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer stats */}
                        <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between text-slate-500 dark:text-slate-400 gap-1.5">
                            <span>
                                Avg Frequency: <strong className="text-emerald-600 dark:text-emerald-400">{summary.avg_visits_per_client || 0} visits</strong> per active client
                            </span>
                            <span>
                                Total Care Sessions: <strong className="text-slate-900 dark:text-white font-bold">{summary.total_visits || 0}</strong>
                            </span>
                        </div>
                    </GlassCard>

                    {/* Daily Patient Activity Trend (7 cols on lg) */}
                    <div className="lg:col-span-7">
                        <ChartCard
                            icon={TrendingUp}
                            title="Patient Activity Trend"
                            subtitle="Daily acquisition of first-time patients vs returning care sessions."
                            hasData={totalTrendActivity > 0}
                            emptyTitle="Not enough patient activity in this range"
                            emptyDescription="There are no completed or scheduled patient sessions recorded in the selected period."
                            legend={
                                <div className="flex items-center gap-4 text-xs font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs" />
                                        <span className="text-slate-600 dark:text-slate-300">New Clients</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                                        <span className="text-slate-600 dark:text-slate-300">Returning Visits</span>
                                    </div>
                                </div>
                            }
                        >
                            <div className="w-full h-80 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trend} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
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
                                            tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<RetentionChartTooltip />} />
                                        <Bar
                                            dataKey="new_clients"
                                            name="New Clients"
                                            fill="#8B5CF6"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={28}
                                        />
                                        <Bar
                                            dataKey="returning_visits"
                                            name="Returning Visits"
                                            fill="#10B981"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={28}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>
                </div>

                {/* 3. Patient Loyalty & Rebooking Status Table */}
                <GlassCard className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10 gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    Patient Loyalty & Rebooking Status
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Individual client attendance and follow-up appointment scheduling.
                                </p>
                            </div>
                        </div>

                        {sortedClients.length > 0 && (
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Showing {sortedClients.length} active patient{sortedClients.length === 1 ? '' : 's'}
                            </span>
                        )}
                    </div>

                    {sortedClients.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">No Patient Activity Records</p>
                            <p className="mt-1 text-[11px]">
                                There are no client appointments recorded for the selected filter parameters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="pb-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">
                                                <span>Patient Name</span>
                                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('is_new')}>
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Cohort Type</span>
                                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('visits')}>
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Visits in Period</span>
                                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('has_future')}>
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Rebooking Status</span>
                                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="pb-3 text-right">
                                            <span>Action</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                                    {sortedClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                            <td className="py-3">
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">
                                                        {client.name}
                                                    </p>
                                                    {client.email && (
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                                                            {client.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 text-center">
                                                {client.is_new ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                                        <UserPlus className="w-3 h-3" />
                                                        First-Time Patient
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                        <HeartHandshake className="w-3 h-3" />
                                                        Returning Client
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                                                {client.visits} visit{client.visits === 1 ? '' : 's'}
                                            </td>
                                            <td className="py-3 text-center">
                                                {client.has_future ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Next Visit Scheduled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                        <Clock className="w-3 h-3" />
                                                        Pending Follow-up
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-right">
                                                <Link
                                                    href={`/app/clients/${client.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
                                                >
                                                    <span>View</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>
        </ReportLayout>
    );
}
