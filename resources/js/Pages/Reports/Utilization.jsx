import React from 'react';
import { Link } from '@inertiajs/react';
import ReportLayout from './ReportLayout';
import {
    Clock,
    Percent,
    Calendar,
    DoorOpen,
    AlertCircle,
    Building2,
    Settings,
    ArrowRight,
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

export default function UtilizationReport({
    canViewFinancial,
    filters,
    options,
    practitioners,
    locations,
    data,
    report,
}) {
    const payload = report || data || {};
    const is_configured = payload.is_configured ?? false;
    const summary = payload.summary || {
        booked_hours: 0,
        available_hours: 0,
        utilization_rate: 0,
        total_appointments: 0,
    };
    const by_room = payload.by_room || [];
    const by_day_of_week = payload.by_day_of_week || [];

    const maxDayHours = Math.max(
        ...by_day_of_week.map((d) => d.booked_hours ?? (d.booked_mins ? d.booked_mins / 60 : 0)),
        1
    );

    return (
        <ReportLayout
            title="Capacity Utilization"
            activeTab="utilization"
            canViewFinancial={canViewFinancial}
            filters={filters}
            options={options}
            practitioners={practitioners}
            locations={locations}
            exportRoute="/app/reports/utilization/export"
        >
            {/* Unconfigured Operating Hours Notification */}
            {!is_configured && (
                <div
                    className="p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-300"
                    style={{
                        background: 'color-mix(in srgb, #F59E0B 8%, var(--umahz-surface))',
                        borderColor: 'color-mix(in srgb, #F59E0B 25%, transparent)',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                Operating Hours Not Configured
                            </h4>
                            <p className="text-xs mt-1" style={{ color: 'var(--umahz-text-secondary)' }}>
                                Configure your clinic's weekly business hours to unlock exact available capacity hours and true utilization percentage calculations.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/app/settings"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Configure Operating Hours
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Capacity Utilization"
                    value={is_configured ? `${summary.utilization_rate}%` : 'N/A'}
                    subtext={is_configured ? 'Of total operating hours' : 'Operating hours required'}
                    rate={is_configured ? summary.utilization_rate : undefined}
                    icon={Percent}
                    tint={summary.utilization_rate >= 70 ? '#10B981' : summary.utilization_rate >= 40 ? '#3B82F6' : '#F59E0B'}
                />
                <StatCard
                    label="Booked Consultation Hours"
                    value={`${summary.booked_hours}h`}
                    subtext={`Across ${summary.total_appointments} appointments`}
                    icon={Clock}
                    tint="#3B82F6"
                />
                <StatCard
                    label="Available Capacity"
                    value={is_configured ? `${summary.available_hours}h` : '—'}
                    subtext="Operating schedule window"
                    icon={Calendar}
                    tint="#8B5CF6"
                />
                <StatCard
                    label="Average Session Duration"
                    value={`${summary.average_duration_minutes}m`}
                    subtext="Per completed appointment"
                    icon={Clock}
                    tint="#10B981"
                />
            </div>

            {/* Day of Week Volume & Capacity Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Day of Week */}
                <div
                    className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <div className="pb-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                        <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                            <Calendar className="w-4 h-4 text-blue-500" />
                            Appointments by Day of Week
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                            Identifying peak days and capacity bottlenecks.
                        </p>
                    </div>

                    <div className="mt-6 space-y-3.5">
                        {by_day_of_week.map((day, idx) => {
                            const dayHours = day.booked_hours ?? (day.booked_mins ? Math.round((day.booked_mins / 60) * 10) / 10 : 0);
                            const pct = Math.round((dayHours / maxDayHours) * 100);
                            const dayName = day.day_name || day.name || 'Day';
                            const sessions = day.appointment_count || 0;

                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold w-24" style={{ color: 'var(--umahz-text-primary)' }}>
                                            {dayName}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span style={{ color: 'var(--umahz-text-secondary)' }}>
                                                {sessions} sessions
                                            </span>
                                            <span className="font-bold w-12 text-right text-blue-600 dark:text-blue-400">
                                                {dayHours}h
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-blue-500 transition-all duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Rooms Breakdown */}
                <div
                    className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <div className="pb-4 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                        <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                            <DoorOpen className="w-4 h-4 text-purple-500" />
                            Room & Space Utilization
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                            Hours booked per treatment room or consultation suite.
                        </p>
                    </div>

                    {by_room.length === 0 ? (
                        <p className="text-xs py-8 text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>No rooms assigned to appointments in range.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}>
                                        <th className="pb-2.5">Room</th>
                                        <th className="pb-2.5">Location</th>
                                        <th className="pb-2.5 text-center">Sessions</th>
                                        <th className="pb-2.5 text-right">Booked Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--umahz-border)' }}>
                                    {by_room.map((room, idx) => (
                                        <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                                            <td className="py-2.5 font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                                {room.room_name || room.name}
                                            </td>
                                            <td className="py-2.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                                                {room.location_name || 'Main Clinic'}
                                            </td>
                                            <td className="py-2.5 text-center font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>
                                                {room.appointment_count}
                                            </td>
                                            <td className="py-2.5 text-right font-bold text-purple-600 dark:text-purple-400">
                                                {room.booked_hours}h
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </ReportLayout>
    );
}
