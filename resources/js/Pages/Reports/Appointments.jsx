import React from 'react';
import ReportLayout from './ReportLayout';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    User,
    Building2,
    Stethoscope,
    Clock,
    TrendingUp,
} from 'lucide-react';

function StatCard({ label, value, subtext, rate, icon: Icon, tint, borderTint }) {
    return (
        <div
            className="p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-colors duration-300"
            style={{
                background: 'var(--umahz-surface)',
                borderColor: borderTint || 'var(--umahz-border)',
            }}
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

export default function AppointmentsReport({
    canViewFinancial,
    filters,
    options,
    practitioners,
    locations,
    data,
    report,
}) {
    const payload = report || data || {};
    const summary = payload.summary || { total: 0, completed: 0, cancelled: 0, no_show: 0, booked: 0, confirmed: 0, completion_rate: 0, cancellation_rate: 0, no_show_rate: 0 };
    const daily = payload.trend || payload.daily || [];
    const byPractitioner = payload.by_practitioner || [];
    const byService = payload.by_service || [];
    const byLocation = payload.by_location || [];

    // Find max daily total for normalized bar chart scaling
    const maxDailyTotal = Math.max(...daily.map((d) => d.total || 0), 1);

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
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Appointments"
                    value={(summary.total || 0).toLocaleString()}
                    subtext={`${summary.booked || 0} booked • ${summary.confirmed || 0} confirmed`}
                    icon={Calendar}
                    tint="#3B82F6"
                />
                <StatCard
                    label="Completed Sessions"
                    value={(summary.completed || 0).toLocaleString()}
                    subtext="Successfully delivered"
                    rate={summary.completion_rate || 0}
                    icon={CheckCircle2}
                    tint="#10B981"
                />
                <StatCard
                    label="Cancellations"
                    value={(summary.cancelled || 0).toLocaleString()}
                    subtext="Cancelled by client/clinic"
                    rate={summary.cancellation_rate || 0}
                    icon={XCircle}
                    tint="#F43F5E"
                />
                <StatCard
                    label="No-Shows"
                    value={(summary.no_show || 0).toLocaleString()}
                    subtext="Missed appointments"
                    rate={summary.no_show_rate || 0}
                    icon={AlertCircle}
                    tint="#F59E0B"
                />
            </div>

            {/* Daily Scheduling Volume Chart */}
            <div
                className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b gap-2" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div>
                        <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Appointment Activity Over Time
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                            Daily breakdown of completed, cancelled, and no-show sessions.
                        </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span style={{ color: 'var(--umahz-text-secondary)' }}>Completed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                            <span style={{ color: 'var(--umahz-text-secondary)' }}>Cancelled</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                            <span style={{ color: 'var(--umahz-text-secondary)' }}>No-Show</span>
                        </div>
                    </div>
                </div>

                {daily.length === 0 ? (
                    <div className="py-12 text-center text-sm" style={{ color: 'var(--umahz-text-tertiary)' }}>
                        No appointments found within this selected period.
                    </div>
                ) : (
                    <div className="mt-6">
                        {/* Bar chart scrollable container */}
                        <div className="overflow-x-auto pb-2">
                            <div className="flex items-end gap-2 sm:gap-3 min-w-[600px] h-48 pt-6 px-2">
                                {daily.map((day, idx) => {
                                    const completedHeight = (day.completed / maxDailyTotal) * 100;
                                    const cancelledHeight = (day.cancelled / maxDailyTotal) * 100;
                                    const noShowHeight = (day.no_show / maxDailyTotal) * 100;
                                    const otherHeight = ((day.total - day.completed - day.cancelled - day.no_show) / maxDailyTotal) * 100;

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
                                                <div className="text-emerald-400">Completed: {day.completed}</div>
                                                <div className="text-rose-400">Cancelled: {day.cancelled}</div>
                                                <div className="text-amber-400">No-show: {day.no_show}</div>
                                                <div className="text-gray-300 font-bold pt-1 border-t border-gray-700 mt-1">Total: {day.total}</div>
                                            </div>

                                            {/* Stacked bar */}
                                            <div className="w-full max-w-[28px] flex flex-col-reverse rounded-t overflow-hidden bg-slate-100 dark:bg-slate-800/40">
                                                <div style={{ height: `${completedHeight}%` }} className="w-full bg-emerald-500 transition-all duration-300" />
                                                <div style={{ height: `${cancelledHeight}%` }} className="w-full bg-rose-500 transition-all duration-300" />
                                                <div style={{ height: `${noShowHeight}%` }} className="w-full bg-amber-500 transition-all duration-300" />
                                                <div style={{ height: `${Math.max(0, otherHeight)}%` }} className="w-full bg-blue-400 transition-all duration-300" />
                                            </div>

                                            {/* Day label */}
                                            <div className="text-[10px] mt-2 truncate max-w-[40px] text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                                {day.label.split(',')[0]}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Breakdown Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Breakdown by Practitioner */}
                <div
                    className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <h2 className="font-semibold text-base flex items-center gap-2 mb-4" style={{ color: 'var(--umahz-text-primary)' }}>
                        <User className="w-4 h-4 text-blue-500" />
                        Performance by Practitioner
                    </h2>

                    {byPractitioner.length === 0 ? (
                        <p className="text-xs py-4 text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>No practitioner data in range.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}>
                                        <th className="pb-2.5">Practitioner</th>
                                        <th className="pb-2.5 text-center">Total</th>
                                        <th className="pb-2.5 text-center">Completed</th>
                                        <th className="pb-2.5 text-center">Cancelled</th>
                                        <th className="pb-2.5 text-right">Completion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--umahz-border)' }}>
                                    {byPractitioner.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                                            <td className="py-2.5 font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                                {p.name}
                                            </td>
                                            <td className="py-2.5 text-center font-bold" style={{ color: 'var(--umahz-text-primary)' }}>
                                                {p.total}
                                            </td>
                                            <td className="py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                                                {p.completed}
                                            </td>
                                            <td className="py-2.5 text-center text-rose-500 font-medium">
                                                {p.cancelled}
                                            </td>
                                            <td className="py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                                {p.completion_rate ?? 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Breakdown by Service & Location */}
                <div className="space-y-6">
                    {/* By Service */}
                    <div
                        className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                        style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                    >
                        <h2 className="font-semibold text-base flex items-center gap-2 mb-4" style={{ color: 'var(--umahz-text-primary)' }}>
                            <Stethoscope className="w-4 h-4 text-emerald-500" />
                            Appointments by Service
                        </h2>

                        {byService.length === 0 ? (
                            <p className="text-xs py-4 text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>No service appointments recorded.</p>
                        ) : (
                            <div className="space-y-3">
                                {byService.map((s, idx) => {
                                    const count = s.total || s.count || 0;
                                    const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                                    {s.name}
                                                </span>
                                                <span style={{ color: 'var(--umahz-text-secondary)' }}>
                                                    {count} sessions ({pct}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-emerald-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* By Location */}
                    {byLocation.length > 0 && (
                        <div
                            className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                        >
                            <h2 className="font-semibold text-base flex items-center gap-2 mb-4" style={{ color: 'var(--umahz-text-primary)' }}>
                                <Building2 className="w-4 h-4 text-purple-500" />
                                Appointments by Location
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                {byLocation.map((loc, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg border flex items-center justify-between text-xs"
                                        style={{ background: 'var(--umahz-surface-2)', borderColor: 'var(--umahz-border)' }}
                                    >
                                        <span className="font-medium truncate mr-2" style={{ color: 'var(--umahz-text-primary)' }}>
                                            {loc.name}
                                        </span>
                                        <span className="font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                            {loc.total || loc.count || 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ReportLayout>
    );
}
