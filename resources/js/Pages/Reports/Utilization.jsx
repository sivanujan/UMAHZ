import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import ReportLayout from './ReportLayout';
import KpiCard from '@/Components/Dashboard/KpiCard';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import { useTheme } from '@/Contexts/ThemeContext';
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
    TrendingDown,
    Users,
    Stethoscope,
    Flame,
    Sparkles,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Activity,
    CheckCircle2,
    HelpCircle,
} from 'lucide-react';

/**
 * Format duration in minutes into a clean human string: "45m", "1h 15m", "2h", or "—"
 * Guards against undefined, null, NaN, and negative numbers.
 */
function formatDuration(mins) {
    if (mins === null || mins === undefined || isNaN(mins) || Number(mins) <= 0) {
        return '—';
    }
    const totalMins = Math.round(Number(mins));
    const hours = Math.floor(totalMins / 60);
    const remainder = totalMins % 60;

    if (hours === 0) return `${remainder}m`;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
}

/**
 * Format hours to clean decimal or whole string: "12h", "12.5h", or "0h"
 * Guards against undefined, null, and NaN.
 */
function formatHours(hours) {
    if (hours === null || hours === undefined || isNaN(hours)) {
        return '0h';
    }
    const num = Number(hours);
    return `${num.toFixed(1).replace(/\.0$/, '')}h`;
}

/**
 * Format raw number with fallback.
 */
function formatNumber(val, fallback = 0) {
    if (val === null || val === undefined || isNaN(val)) {
        return fallback;
    }
    return Number(val);
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
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    const shouldReduceMotion = useReducedMotion();

    const payload = report || data || {};
    const is_configured = Boolean(payload.is_configured);

    // Guard summary values against undefined / NaN
    const summary = {
        booked_hours: formatNumber(payload.summary?.booked_hours, 0),
        booked_minutes: formatNumber(payload.summary?.booked_minutes, 0),
        available_hours: formatNumber(payload.summary?.available_hours, 0),
        available_minutes: formatNumber(payload.summary?.available_minutes, 0),
        utilization_rate: formatNumber(payload.summary?.utilization_rate, 0),
        total_appointments: formatNumber(payload.summary?.total_appointments, 0),
        average_duration_minutes: payload.summary?.average_duration_minutes ?? null,
    };

    const comparison = payload.comparison || {
        utilization_rate_diff: 0,
        booked_hours_growth: 0,
        appointments_growth: 0,
        prev_utilization_rate: 0,
        prev_booked_hours: 0,
        prev_available_hours: 0,
    };

    const by_day_of_week = payload.by_day_of_week || [];
    const by_room = payload.by_room || [];
    const by_practitioner = payload.by_practitioner || [];

    // 1. Peak day calculation
    const maxDayHours = useMemo(() => {
        return Math.max(
            ...by_day_of_week.map((d) => Number(d.booked_hours || 0)),
            1
        );
    }, [by_day_of_week]);

    const totalWeekBookedHours = useMemo(() => {
        return by_day_of_week.reduce((acc, d) => acc + Number(d.booked_hours || 0), 0);
    }, [by_day_of_week]);

    // 2. Room Sorting State
    const [roomSortField, setRoomSortField] = useState('booked_hours');
    const [roomSortDirection, setRoomSortDirection] = useState('desc');

    const handleRoomSort = (field) => {
        if (roomSortField === field) {
            setRoomSortDirection(roomSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setRoomSortField(field);
            setRoomSortDirection('desc');
        }
    };

    const totalRoomBookedHours = useMemo(() => {
        return by_room.reduce((acc, r) => acc + Number(r.booked_hours || 0), 0);
    }, [by_room]);

    const sortedRooms = useMemo(() => {
        return [...by_room].sort((a, b) => {
            let valA = a[roomSortField] ?? 0;
            let valB = b[roomSortField] ?? 0;
            if (typeof valA === 'string') {
                return roomSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return roomSortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }, [by_room, roomSortField, roomSortDirection]);

    // 3. Practitioner Sorting State
    const [practitionerSortField, setPractitionerSortField] = useState('booked_hours');
    const [practitionerSortDirection, setPractitionerSortDirection] = useState('desc');

    const handlePractitionerSort = (field) => {
        if (practitionerSortField === field) {
            setPractitionerSortDirection(practitionerSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setPractitionerSortField(field);
            setPractitionerSortDirection('desc');
        }
    };

    const totalPractitionerBookedHours = useMemo(() => {
        return by_practitioner.reduce((acc, p) => acc + Number(p.booked_hours || 0), 0);
    }, [by_practitioner]);

    const sortedPractitioners = useMemo(() => {
        return [...by_practitioner].sort((a, b) => {
            let valA = a[practitionerSortField] ?? 0;
            let valB = b[practitionerSortField] ?? 0;
            if (typeof valA === 'string') {
                return practitionerSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return practitionerSortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }, [by_practitioner, practitionerSortField, practitionerSortDirection]);

    // Sparklines for KPI cards
    const bookedHoursSparkline = useMemo(() => by_day_of_week.map((d) => Number(d.booked_hours || 0)), [by_day_of_week]);
    const appointmentsSparkline = useMemo(() => by_day_of_week.map((d) => Number(d.appointment_count || 0)), [by_day_of_week]);
    const utilizationSparkline = useMemo(() => by_day_of_week.map((d) => Number(d.utilization_rate || 0)), [by_day_of_week]);

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
            <div className="space-y-6">
                {/* Unconfigured Operating Hours Notification */}
                {!is_configured && (
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 shadow-sm"
                        style={{
                            background: isDark
                                ? 'rgba(245, 158, 11, 0.08)'
                                : 'rgba(254, 243, 199, 0.65)',
                            borderColor: isDark
                                ? 'rgba(245, 158, 11, 0.25)'
                                : 'rgba(245, 158, 11, 0.40)',
                            backdropFilter: 'blur(16px)',
                        }}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                    Operating Hours Not Configured
                                </h4>
                                <p className="text-xs mt-0.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                                    Set up your clinic's weekly business hours in Settings to calculate exact available capacity and true capacity utilization percentages.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/app/settings"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all duration-200 active:scale-[0.98] whitespace-nowrap self-start sm:self-auto shrink-0"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            Configure Business Hours
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                    </motion.div>
                )}

                {/* 1. CAPACITY KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Headline Metric: Capacity Utilization % */}
                    <KpiCard
                        label="Capacity Utilization"
                        value={is_configured ? `${summary.utilization_rate}%` : 'N/A'}
                        icon={Activity}
                        iconTint="#8200db"
                        iconBg="rgba(130,0,219,0.12)"
                        trend={{
                            value: is_configured ? comparison.utilization_rate_diff : null,
                            isPositive: comparison.utilization_rate_diff >= 0,
                            text: is_configured
                                ? `${formatHours(summary.booked_hours)} of ${formatHours(summary.available_hours)}`
                                : `${formatHours(summary.booked_hours)} booked (Schedule not set)`,
                            hasComparison: is_configured && comparison.prev_available_hours > 0,
                        }}
                        sparkline={is_configured ? utilizationSparkline : bookedHoursSparkline}
                        delay={0}
                    />

                    {/* Booked Consultation Hours */}
                    <KpiCard
                        label="Booked Consultation Hours"
                        value={formatHours(summary.booked_hours)}
                        icon={Clock}
                        iconTint="#3B82F6"
                        iconBg="rgba(59,130,246,0.12)"
                        trend={{
                            value: comparison.booked_hours_growth,
                            isPositive: comparison.booked_hours_growth >= 0,
                            text: `Across ${summary.total_appointments} appointment${summary.total_appointments === 1 ? '' : 's'}`,
                            hasComparison: comparison.prev_booked_hours > 0,
                        }}
                        sparkline={bookedHoursSparkline}
                        delay={1}
                    />

                    {/* Available Capacity */}
                    <KpiCard
                        label="Available Capacity"
                        value={is_configured ? formatHours(summary.available_hours) : '—'}
                        icon={Calendar}
                        iconTint="#10B981"
                        iconBg="rgba(16,185,129,0.12)"
                        trend={{
                            value: null,
                            isPositive: true,
                            text: is_configured ? 'Operating schedule window' : 'Operating hours required',
                            hasComparison: false,
                        }}
                        delay={2}
                    />

                    {/* Average Session Duration - BUG FIXED (No "undefinedm") */}
                    <KpiCard
                        label="Average Session Duration"
                        value={formatDuration(summary.average_duration_minutes)}
                        icon={Clock}
                        iconTint="#EC4899"
                        iconBg="rgba(236,72,153,0.12)"
                        trend={{
                            value: null,
                            isPositive: true,
                            text: summary.average_duration_minutes
                                ? 'Per booked appointment'
                                : summary.total_appointments > 0
                                ? 'Calculating from sessions'
                                : 'No data yet in range',
                            hasComparison: false,
                        }}
                        delay={3}
                    />
                </div>

                {/* 2. MAIN VISUALS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visual 1: Appointments by Day of Week */}
                    <GlassCard delay={1} className="flex flex-col">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                        Appointments by Day of Week
                                    </h2>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Identifying peak volume days and capacity bottlenecks across the week.
                                </p>
                            </div>
                        </div>

                        {by_day_of_week.length === 0 || totalWeekBookedHours === 0 ? (
                            <div className="py-12">
                                <EmptyState
                                    icon={Calendar}
                                    title="No appointments in this range"
                                    description="No consultation hours were booked on any day of the week for the selected filter criteria."
                                />
                            </div>
                        ) : (
                            <div className="mt-5 space-y-4 flex-1">
                                {by_day_of_week.map((day, idx) => {
                                    const dayHours = Number(day.booked_hours || 0);
                                    const dayAvailHours = Number(day.available_hours || 0);
                                    const sessions = Number(day.appointment_count || 0);
                                    const isPeak = dayHours === maxDayHours && dayHours > 0;

                                    // Width calculation relative to max day
                                    const barPct = Math.min(100, Math.max(0, Math.round((dayHours / maxDayHours) * 100)));
                                    const dayUtilization = day.utilization_rate ?? (dayAvailHours > 0 ? Math.round((dayHours / dayAvailHours) * 100) : 0);
                                    const shareOfWeek = totalWeekBookedHours > 0 ? Math.round((dayHours / totalWeekBookedHours) * 100) : 0;

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-xl transition-all duration-200 ${
                                                isPeak
                                                    ? 'bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 shadow-sm'
                                                    : 'hover:bg-slate-500/5'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <div className="flex items-center gap-2 min-w-[130px]">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {day.day_name || day.name}
                                                    </span>
                                                    {isPeak && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                                            <Flame className="w-3 h-3 text-amber-500" />
                                                            Peak Demand
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                        {sessions} {sessions === 1 ? 'session' : 'sessions'}
                                                    </span>
                                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums w-12 text-right">
                                                        {formatHours(dayHours)}
                                                    </span>
                                                    {is_configured && dayAvailHours > 0 ? (
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                                                                dayUtilization >= 85
                                                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                                                    : dayUtilization >= 50
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                                                    : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                                            }`}
                                                        >
                                                            {dayUtilization}% cap
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 tabular-nums">
                                                            {shareOfWeek}% of week
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress Bar with Brand Colors */}
                                            <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                                <motion.div
                                                    initial={shouldReduceMotion ? { width: `${barPct}%` } : { width: 0 }}
                                                    animate={{ width: `${barPct}%` }}
                                                    transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${
                                                        isPeak
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                            : 'bg-gradient-to-r from-[#8200db] to-[#a855f7]'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </GlassCard>

                    {/* Visual 2: Room & Space Utilization */}
                    <GlassCard delay={2} className="flex flex-col">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                        <DoorOpen className="w-4 h-4" />
                                    </div>
                                    <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                        Room & Space Utilization
                                    </h2>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Consultation suites and physical rooms booked across the period.
                                </p>
                            </div>
                        </div>

                        {sortedRooms.length === 0 ? (
                            <div className="py-12">
                                <EmptyState
                                    icon={DoorOpen}
                                    title="No room utilization data"
                                    description="No treatment rooms or consultation suites are attached to appointments in this date range."
                                />
                            </div>
                        ) : (
                            <div className="mt-4 overflow-x-auto flex-1">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200/60 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            <th className="pb-3 pr-2">
                                                <button
                                                    onClick={() => handleRoomSort('room_name')}
                                                    className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                >
                                                    Room
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="pb-3 px-2">Location</th>
                                            <th className="pb-3 px-2 text-center">
                                                <button
                                                    onClick={() => handleRoomSort('appointment_count')}
                                                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                >
                                                    Sessions
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="pb-3 px-2 text-right">
                                                <button
                                                    onClick={() => handleRoomSort('booked_hours')}
                                                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                                                >
                                                    Booked
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="pb-3 pl-3 text-right">Room Load</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                                        {sortedRooms.map((room, idx) => {
                                            const isUnassigned = room.id === 'unassigned' || room.room_name === 'Unassigned Room';
                                            const roomHours = Number(room.booked_hours || 0);
                                            const loadPct = totalRoomBookedHours > 0
                                                ? Math.round((roomHours / totalRoomBookedHours) * 100)
                                                : 0;

                                            return (
                                                <tr
                                                    key={idx}
                                                    className="hover:bg-slate-500/5 transition-colors group"
                                                >
                                                    <td className="py-3 pr-2 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                                isUnassigned
                                                                    ? 'bg-slate-500/10 text-slate-400'
                                                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                            }`}>
                                                                <DoorOpen className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className={isUnassigned ? 'italic text-slate-500 dark:text-slate-400' : ''}>
                                                                {room.room_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 opacity-60 shrink-0" />
                                                            <span className="truncate max-w-[130px]">
                                                                {room.location_name || 'Main Clinic'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 text-center font-semibold text-slate-900 dark:text-white tabular-nums">
                                                        {room.appointment_count}
                                                    </td>
                                                    <td className="py-3 px-2 text-right font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                                                        {formatHours(roomHours)}
                                                    </td>
                                                    <td className="py-3 pl-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-purple-500"
                                                                    style={{ width: `${loadPct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-8 tabular-nums">
                                                                {loadPct}%
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
                    </GlassCard>
                </div>

                {/* 3. PRACTITIONER SCHEDULING & WORKLOAD (Capacity Planning) */}
                <GlassCard delay={3}>
                    <div className="flex items-start justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <Stethoscope className="w-4 h-4" />
                                </div>
                                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                    Practitioner Scheduling & Load
                                </h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Clinical volume and consultation hours allocated per team member.
                            </p>
                        </div>
                    </div>

                    {sortedPractitioners.length === 0 ? (
                        <div className="py-12">
                            <EmptyState
                                icon={Users}
                                title="No practitioner data"
                                description="No appointments found for practitioners in the selected timeframe."
                            />
                        </div>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200/60 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="pb-3 pr-4">
                                            <button
                                                onClick={() => handlePractitionerSort('name')}
                                                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                Practitioner
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="pb-3 px-4 text-center">
                                            <button
                                                onClick={() => handlePractitionerSort('appointment_count')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                Appointments
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="pb-3 px-4 text-right">
                                            <button
                                                onClick={() => handlePractitionerSort('booked_hours')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto"
                                            >
                                                Booked Hours
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="pb-3 pl-4 text-right">Workload Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                                    {sortedPractitioners.map((practitioner, idx) => {
                                        const pHours = Number(practitioner.booked_hours || 0);
                                        const sharePct = totalPractitionerBookedHours > 0
                                            ? Math.round((pHours / totalPractitionerBookedHours) * 100)
                                            : 0;
                                        const isUnassigned = practitioner.id === 'unassigned';

                                        return (
                                            <tr
                                                key={idx}
                                                className="hover:bg-slate-500/5 transition-colors group"
                                            >
                                                <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-bold text-[10px] shrink-0 shadow-sm">
                                                            {practitioner.name
                                                                .split(' ')
                                                                .map((p) => p[0])
                                                                .slice(0, 2)
                                                                .join('')
                                                                .toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className={`font-semibold ${isUnassigned ? 'italic text-slate-500' : ''}`}>
                                                                {practitioner.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center font-semibold text-slate-900 dark:text-white tabular-nums">
                                                    {practitioner.appointment_count}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    {formatHours(pHours)}
                                                </td>
                                                <td className="py-3 pl-4 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <div className="w-24 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                                                                style={{ width: `${sharePct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-10 tabular-nums">
                                                            {sharePct}%
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
                </GlassCard>
            </div>
        </ReportLayout>
    );
}
