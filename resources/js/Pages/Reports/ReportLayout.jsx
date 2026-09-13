import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Calendar,
    DollarSign,
    Users,
    Clock,
    Download,
    Filter,
    Lock,
    RefreshCw,
    SlidersHorizontal,
} from 'lucide-react';

const PRESETS = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Year to Date', value: 'ytd' },
];

export default function ReportLayout({
    title,
    activeTab,
    canViewFinancial,
    filters = {},
    options = {},
    practitioners = [],
    locations = [],
    exportRoute,
    children,
}) {
    const practitionersList = options.practitioners || practitioners || [];
    const locationsList = options.locations || locations || [];

    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [practitionerId, setPractitionerId] = useState(filters.practitioner_id || '');
    const [locationId, setLocationId] = useState(filters.location_id || '');
    const [activePreset, setActivePreset] = useState(filters.preset || '');
    const [isApplying, setIsApplying] = useState(false);

    const tabs = [
        {
            id: 'appointments',
            label: 'Appointments',
            href: '/app/reports/appointments',
            icon: Calendar,
            enabled: true,
        },
        {
            id: 'revenue',
            label: 'Revenue & Financials',
            href: '/app/reports/revenue',
            icon: DollarSign,
            enabled: canViewFinancial,
            ownerOnly: true,
        },
        {
            id: 'retention',
            label: 'Client Retention',
            href: '/app/reports/retention',
            icon: Users,
            enabled: true,
        },
        {
            id: 'utilization',
            label: 'Capacity Utilization',
            href: '/app/reports/utilization',
            icon: Clock,
            enabled: true,
        },
    ];

    const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

    const applyFilters = (overrides = {}) => {
        setIsApplying(true);
        const params = {
            start_date: overrides.start_date !== undefined ? overrides.start_date : startDate,
            end_date: overrides.end_date !== undefined ? overrides.end_date : endDate,
            practitioner_id: overrides.practitioner_id !== undefined ? overrides.practitioner_id : practitionerId,
            location_id: overrides.location_id !== undefined ? overrides.location_id : locationId,
            preset: overrides.preset !== undefined ? overrides.preset : activePreset,
        };

        // Clean empty keys
        Object.keys(params).forEach((key) => {
            if (!params[key]) delete params[key];
        });

        router.get(currentTabObj.href, params, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsApplying(false),
        });
    };

    const handlePresetClick = (presetValue) => {
        setActivePreset(presetValue);
        // Let backend compute the exact dates for standard presets
        applyFilters({ preset: presetValue, start_date: '', end_date: '' });
    };

    const handleCustomFilterSubmit = (e) => {
        e.preventDefault();
        setActivePreset('custom');
        applyFilters({ preset: 'custom' });
    };

    const buildExportUrl = () => {
        const query = new URLSearchParams();
        if (filters.start_date) query.set('start_date', filters.start_date);
        if (filters.end_date) query.set('end_date', filters.end_date);
        if (filters.practitioner_id) query.set('practitioner_id', filters.practitioner_id);
        if (filters.location_id) query.set('location_id', filters.location_id);
        if (filters.preset) query.set('preset', filters.preset);
        const qStr = query.toString();
        return qStr ? `${exportRoute}?${qStr}` : exportRoute;
    };

    return (
        <AuthenticatedLayout title={`${title} - Reports`}>
            <Head title={`${title} - Reports`} />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header & Tabs */}
                <div className="border-b transition-colors duration-300 pb-4" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                      style={{ background: 'color-mix(in srgb, var(--umahz-accent) 15%, transparent)', color: 'var(--umahz-accent)' }}>
                                    Analytics & Insights
                                </span>
                                <span className="text-xs" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                    Spec §18
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1" style={{ color: 'var(--umahz-text-primary)' }}>
                                Practice Reporting
                            </h1>
                            <p className="text-sm mt-1" style={{ color: 'var(--umahz-text-secondary)' }}>
                                Real-time operational data, clinical scheduling volume, and financial performance.
                            </p>
                        </div>

                        {/* Export Action */}
                        {exportRoute && (
                            <div className="flex items-center gap-3">
                                <a
                                    href={buildExportUrl()}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2"
                                    style={{
                                        background: 'var(--umahz-surface)',
                                        borderColor: 'var(--umahz-border)',
                                        color: 'var(--umahz-text-primary)',
                                    }}
                                    download
                                >
                                    <Download className="w-4 h-4 text-emerald-500" />
                                    Export CSV
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar border-b" style={{ borderColor: 'var(--umahz-border)' }} aria-label="Reports navigation">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;

                            if (!tab.enabled) {
                                return (
                                    <div
                                        key={tab.id}
                                        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent opacity-50 cursor-not-allowed select-none"
                                        style={{ color: 'var(--umahz-text-tertiary)' }}
                                        title="Available to Clinic Owner only"
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap"
                                    style={{
                                        borderColor: isActive ? 'var(--umahz-accent)' : 'transparent',
                                        color: isActive ? 'var(--umahz-accent)' : 'var(--umahz-text-secondary)',
                                        fontWeight: isActive ? 600 : 500,
                                    }}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    {tab.ownerOnly && (
                                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            Owner
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Filter Control Bar */}
                <div
                    className="p-4 rounded-xl border shadow-sm transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <form onSubmit={handleCustomFilterSubmit} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                            <span className="text-xs font-semibold mr-1 flex items-center gap-1" style={{ color: 'var(--umahz-text-tertiary)' }}>
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Range:
                            </span>
                            {PRESETS.map((p) => {
                                const isSelected = activePreset === p.value;
                                return (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => handlePresetClick(p.value)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                                        style={{
                                            background: isSelected
                                                ? 'var(--umahz-accent)'
                                                : 'var(--umahz-surface-2)',
                                            color: isSelected ? '#FFFFFF' : 'var(--umahz-text-secondary)',
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Date & Filter Dropdowns */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setActivePreset('custom');
                                    }}
                                    className="px-2.5 py-1.5 text-xs rounded-lg border focus:ring-1"
                                    style={{
                                        background: 'var(--umahz-bg)',
                                        borderColor: 'var(--umahz-border)',
                                        color: 'var(--umahz-text-primary)',
                                    }}
                                    aria-label="Start date"
                                />
                                <span className="text-xs" style={{ color: 'var(--umahz-text-tertiary)' }}>to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setActivePreset('custom');
                                    }}
                                    className="px-2.5 py-1.5 text-xs rounded-lg border focus:ring-1"
                                    style={{
                                        background: 'var(--umahz-bg)',
                                        borderColor: 'var(--umahz-border)',
                                        color: 'var(--umahz-text-primary)',
                                    }}
                                    aria-label="End date"
                                />
                            </div>

                            {/* Practitioner dropdown */}
                            {practitionersList.length > 0 && (
                                <select
                                    value={practitionerId}
                                    onChange={(e) => setPractitionerId(e.target.value)}
                                    className="px-2.5 py-1.5 text-xs rounded-lg border"
                                    style={{
                                        background: 'var(--umahz-bg)',
                                        borderColor: 'var(--umahz-border)',
                                        color: 'var(--umahz-text-primary)',
                                    }}
                                    aria-label="Filter by practitioner"
                                >
                                    <option value="">All Practitioners</option>
                                    {practitionersList.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}

                            {/* Location dropdown */}
                            {locationsList.length > 0 && (
                                <select
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="px-2.5 py-1.5 text-xs rounded-lg border"
                                    style={{
                                        background: 'var(--umahz-bg)',
                                        borderColor: 'var(--umahz-border)',
                                        color: 'var(--umahz-text-primary)',
                                    }}
                                    aria-label="Filter by location"
                                >
                                    <option value="">All Locations</option>
                                    {locationsList.map((loc) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            )}

                            <button
                                type="submit"
                                disabled={isApplying}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm transition-all"
                                style={{ background: 'var(--umahz-accent)' }}
                            >
                                {isApplying ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Filter className="w-3.5 h-3.5" />
                                )}
                                Apply
                            </button>
                        </div>
                    </form>

                    {/* Active range summary indicator */}
                    <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-tertiary)' }}>
                        <div>
                            Showing data for <span className="font-medium" style={{ color: 'var(--umahz-text-secondary)' }}>{filters.start_date}</span> through <span className="font-medium" style={{ color: 'var(--umahz-text-secondary)' }}>{filters.end_date}</span>
                        </div>
                        {(filters.practitioner_id || filters.location_id) && (
                            <span className="text-amber-500 font-medium">Filtered by specific practitioner or location</span>
                        )}
                    </div>
                </div>

                {/* Tab content */}
                {children}
            </div>
        </AuthenticatedLayout>
    );
}
