import React from 'react';
import ReportLayout from './ReportLayout';
import {
    Users,
    UserPlus,
    RotateCcw,
    HeartHandshake,
    Award,
    TrendingUp,
} from 'lucide-react';

function StatCard({ label, value, subtext, rate, icon: Icon, tint }) {
    return (
        <div
            className="p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-colors duration-300"
            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--umahz-text-secondary)' }}>
                        {label}
                    </p>
                    <h3 className="text-3xl font-bold mt-1.5" style={{ color: 'var(--umahz-text-primary)' }}>
                        {value}
                    </h3>
                </div>
                <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}
                >
                    <Icon className="w-5 h-5" />
                </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--umahz-border)' }}>
                <span style={{ color: 'var(--umahz-text-tertiary)' }}>{subtext}</span>
                {rate !== undefined && (
                    <span
                        className="font-semibold px-2 py-0.5 rounded text-[11px]"
                        style={{
                            background: `color-mix(in srgb, ${tint} 12%, transparent)`,
                            color: tint,
                        }}
                    >
                        {rate}%
                    </span>
                )}
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
    const trend = payload.trend || [];

    const maxTrendTotal = Math.max(
        ...trend.map((t) => (t.new_clients || 0) + (t.returning_visits || 0)),
        1
    );

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
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Active Clients"
                    value={(summary.total_active_clients || 0).toLocaleString()}
                    subtext={`${summary.total_visits || 0} total visits completed`}
                    icon={Users}
                    tint="#3B82F6"
                />
                <StatCard
                    label="Rebooking Rate"
                    value={`${summary.rebooking_rate || 0}%`}
                    subtext={`${summary.rebooked_clients_count || 0} clients booked subsequent visits`}
                    rate={summary.rebooking_rate || 0}
                    icon={RotateCcw}
                    tint="#10B981"
                />
                <StatCard
                    label="New Clients Acquired"
                    value={(summary.new_clients || 0).toLocaleString()}
                    subtext={`${summary.new_client_pct || 0}% of all active patients`}
                    icon={UserPlus}
                    tint="#8B5CF6"
                />
                <StatCard
                    label="Returning Clients"
                    value={(summary.returning_clients || 0).toLocaleString()}
                    subtext={`Avg ${summary.avg_visits_per_client || 0} visits per patient`}
                    icon={HeartHandshake}
                    tint="#F59E0B"
                />
            </div>

            {/* Retention Distribution & Acquisition Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Composition Breakdown */}
                <div
                    className="p-6 rounded-xl border shadow-sm transition-colors duration-300 flex flex-col justify-between"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <div>
                        <div className="pb-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                            <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                                <Award className="w-4 h-4 text-purple-500" />
                                Patient Retention Composition
                            </h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                                Ratio of newly acquired clients versus recurring loyal visitors.
                            </p>
                        </div>

                        <div className="mt-6 space-y-5">
                            {/* New Clients Bar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                        First-Time Patients
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>
                                            {summary.new_clients || 0} clients
                                        </span>
                                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                                            {summary.new_client_pct || 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                                        style={{ width: `${summary.new_client_pct || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Returning Clients Bar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                        Returning & Recurring Patients
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>
                                            {summary.returning_clients || 0} clients
                                        </span>
                                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                            {summary.returning_client_pct || 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${summary.returning_client_pct || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Rebooking Rate Bar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                        Follow-up Rebooking Rate
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>
                                            {summary.rebooked_clients_count || 0} scheduled next session
                                        </span>
                                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                            {summary.rebooking_rate || 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${summary.rebooking_rate || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t text-xs flex items-center justify-between" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-tertiary)' }}>
                        <span>Avg Frequency: <strong className="text-emerald-500">{summary.avg_visits_per_client || 0} visits</strong> per active client</span>
                        <span>Total Care Sessions: <strong style={{ color: 'var(--umahz-text-primary)' }}>{summary.total_visits || 0}</strong></span>
                    </div>
                </div>

                {/* Daily Acquisition & Retention Trend */}
                <div
                    className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div>
                            <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Patient Activity Trend
                            </h2>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                                Daily acquisition of new clients vs returning patient visits.
                            </p>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                                <span style={{ color: 'var(--umahz-text-secondary)' }}>New</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                                <span style={{ color: 'var(--umahz-text-secondary)' }}>Returning</span>
                            </div>
                        </div>
                    </div>

                    {trend.length === 0 ? (
                        <p className="text-xs py-12 text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>No patient activity records in this date range.</p>
                    ) : (
                        <div className="mt-6">
                            <div className="overflow-x-auto pb-2">
                                <div className="flex items-end gap-2 sm:gap-3 min-w-[500px] h-48 pt-6 px-2">
                                    {trend.map((day, idx) => {
                                        const newHeight = Math.min(100, Math.max(0, ((day.new_clients || 0) / maxTrendTotal) * 100));
                                        const returningHeight = Math.min(100, Math.max(0, ((day.returning_visits || 0) / maxTrendTotal) * 100));

                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                                {/* Tooltip */}
                                                <div
                                                    className="absolute bottom-full mb-2 hidden group-hover:flex flex-col p-2 rounded-lg text-[11px] shadow-lg z-20 whitespace-nowrap pointer-events-none"
                                                    style={{
                                                        background: 'var(--umahz-sidebar-bg, #0F172A)',
                                                        color: '#FFFFFF',
                                                        border: '1px solid var(--umahz-border)',
                                                    }}
                                                >
                                                    <div className="font-semibold text-white mb-1">{day.label}</div>
                                                    <div className="text-purple-400">New Clients: {day.new_clients || 0}</div>
                                                    <div className="text-emerald-400">Returning Visits: {day.returning_visits || 0}</div>
                                                </div>

                                                {/* Dual Stacked / Grouped Bars */}
                                                <div className="w-full max-w-[24px] flex flex-col-reverse rounded-t overflow-hidden bg-slate-100 dark:bg-slate-800/40">
                                                    <div style={{ height: `${returningHeight}%` }} className="w-full bg-emerald-500 transition-all duration-300" />
                                                    <div style={{ height: `${newHeight}%` }} className="w-full bg-purple-500 transition-all duration-300" />
                                                </div>

                                                {/* Day label */}
                                                <div className="text-[10px] mt-2 truncate max-w-[40px] text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                                    {day.label ? day.label.split(',')[0] : ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ReportLayout>
    );
}
