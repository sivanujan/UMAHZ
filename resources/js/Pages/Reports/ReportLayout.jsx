import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { DateRangePicker } from '@/Components/UI/DateRangePicker';
import {
    Calendar,
    DollarSign,
    Users,
    Clock,
    Download,
    Filter,
    Lock,
    RefreshCw,
    Printer,
    SlidersHorizontal,
    FileText,
} from 'lucide-react';

const PRESETS = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Year to Date', value: 'ytd' },
];

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-');
        if (!y || !m || !d) return dateStr;
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatDateRange(startStr, endStr) {
    if (!startStr && !endStr) return 'All Recorded Time';
    if (!startStr) return `Through ${formatDateDisplay(endStr)}`;
    if (!endStr) return `From ${formatDateDisplay(startStr)}`;

    try {
        const [y1, m1, d1] = startStr.split('-').map(Number);
        const [y2, m2, d2] = endStr.split('-').map(Number);
        const date1 = new Date(y1, m1 - 1, d1);
        const date2 = new Date(y2, m2 - 1, d2);

        const month1 = date1.toLocaleDateString('en-US', { month: 'short' });
        const month2 = date2.toLocaleDateString('en-US', { month: 'short' });
        const year1 = date1.getFullYear();
        const year2 = date2.getFullYear();

        if (year1 === year2) {
            return `${month1} ${date1.getDate()} – ${month2} ${date2.getDate()}, ${year1}`;
        }
        return `${month1} ${date1.getDate()}, ${year1} – ${month2} ${date2.getDate()}, ${year2}`;
    } catch {
        return `${formatDateDisplay(startStr)} – ${formatDateDisplay(endStr)}`;
    }
}

export default function ReportLayout({
    title,
    activeTab,
    canViewFinancial,
    filters = {},
    options = {},
    practitioners = [],
    locations = [],
    currency = 'CAD',
    exportRoute,
    children,
}) {
    const { auth } = usePage().props;
    const clinicName = auth?.tenant?.name || 'UMAHZ Clinic';

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
        applyFilters({ preset: presetValue, start_date: '', end_date: '' });
    };

    const handleDateChange = (newStart, newEnd) => {
        setStartDate(newStart);
        setEndDate(newEnd);
        setActivePreset('custom');
    };

    const handleCustomFilterSubmit = (e) => {
        e.preventDefault();
        applyFilters({ preset: 'custom', start_date: startDate, end_date: endDate });
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

    const handlePrint = () => {
        window.print();
    };

    const formattedStart = formatDateDisplay(filters.start_date);
    const formattedEnd = formatDateDisplay(filters.end_date);
    const formattedDateRange = useMemo(() => {
        return formatDateRange(filters.start_date, filters.end_date);
    }, [filters.start_date, filters.end_date]);

    const activeFilterSummary = useMemo(() => {
        const parts = [];
        if (filters.practitioner_id) {
            const p = practitionersList.find((item) => String(item.id) === String(filters.practitioner_id));
            if (p) parts.push(`Practitioner: ${p.name}`);
        }
        if (filters.location_id) {
            const loc = locationsList.find((item) => String(item.id) === String(filters.location_id));
            if (loc) parts.push(`Location: ${loc.name}`);
        }
        return parts.join(' • ');
    }, [filters.practitioner_id, filters.location_id, practitionersList, locationsList]);

    return (
        <AuthenticatedLayout title={`${title} - Reports`}>
            <Head title={`${title} - Reports`} />

            {/* Print Stylesheet */}
            <style>{`
                @media print {
                    nav, header, aside, .no-print, button, select, input {
                        display: none !important;
                    }
                    body {
                        background: #FFFFFF !important;
                        color: #000000 !important;
                        font-family: sans-serif !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    .recharts-responsive-container {
                        width: 100% !important;
                        height: 320px !important;
                    }
                    .glass-card, [style*="backdropFilter"] {
                        background: #FFFFFF !important;
                        border: 1px solid #E2E8F0 !important;
                        box-shadow: none !important;
                        page-break-inside: avoid;
                    }
                }
                @media screen {
                    .print-only {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
                {/* Print-Only Header */}
                <div className="print-only border-b border-slate-300 pb-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{clinicName} — {title}</h1>
                            <p className="text-sm text-slate-600 mt-1">
                                Reporting Period: <span className="font-bold">{formattedDateRange}</span> • Currency: <span className="font-bold">{currency}</span>
                            </p>
                            {activeFilterSummary && (
                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                    Active Filters: {activeFilterSummary}
                                </p>
                            )}
                        </div>
                        <div className="text-right text-xs text-slate-500">
                            <p className="font-semibold text-slate-800">Financial & Operational Record</p>
                            <p>Generated: {new Date().toLocaleString()}</p>
                            <p className="italic text-slate-400">Strictly Confidential</p>
                        </div>
                    </div>
                </div>

                {/* Header & Tabs (Screen Only) */}
                <div className="no-print">
                    <PageHeader
                        eyebrow="Analytics & Insights"
                        title="Practice Reporting"
                        subtitle="Real-time operational data, clinical scheduling volume, and financial performance."
                        actions={
                            <div className="flex items-center gap-2">
                                <GlassButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={handlePrint}
                                    icon={<Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                                    title="Print or Save as PDF"
                                >
                                    Export PDF
                                </GlassButton>

                                {exportRoute && (
                                    <a href={buildExportUrl()} download>
                                        <GlassButton
                                            variant="secondary"
                                            size="sm"
                                            icon={<Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                        >
                                            Export CSV
                                        </GlassButton>
                                    </a>
                                )}
                            </div>
                        }
                    />

                    {/* Navigation Sub-Tabs */}
                    <div className="mt-6 p-1.5 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-white/40 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;

                            if (!tab.enabled) {
                                return (
                                    <div
                                        key={tab.id}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed select-none whitespace-nowrap"
                                        title="Available to Clinic Owner only"
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{tab.label}</span>
                                        <Lock className="w-3 h-3 text-amber-500" />
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-white/10'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8200db] dark:text-purple-300' : ''}`} />
                                    <span>{tab.label}</span>
                                    {tab.ownerOnly && (
                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                            Owner
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Filter Control Bar (Screen Only) */}
                <GlassCard className="p-4 sm:p-5 no-print">
                    <form onSubmit={handleCustomFilterSubmit} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Segmented Quick Presets & Date Range */}
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            activePreset={activePreset}
                            presets={PRESETS}
                            onPresetSelect={handlePresetClick}
                            onDateChange={handleDateChange}
                        />

                        {/* Practitioner & Location Dropdowns + Apply Button */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {practitionersList.length > 0 && (
                                <select
                                    value={practitionerId}
                                    onChange={(e) => setPractitionerId(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 backdrop-blur-md outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                                    aria-label="Filter by practitioner"
                                >
                                    <option value="">All Practitioners</option>
                                    {practitionersList.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}

                            {locationsList.length > 0 && (
                                <select
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 backdrop-blur-md outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                                    aria-label="Filter by location"
                                >
                                    <option value="">All Locations</option>
                                    {locationsList.map((loc) => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            )}

                            <GlassButton
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={isApplying}
                                icon={
                                    isApplying ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Filter className="w-3.5 h-3.5" />
                                    )
                                }
                            >
                                Apply
                            </GlassButton>
                        </div>
                    </form>

                    {/* Active Range Summary indicator */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200/50 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Reporting Range:</span>
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white bg-white/70 dark:bg-white/10 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                {formattedDateRange}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                Currency: {currency} ($)
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeFilterSummary ? (
                                <span className="text-purple-700 dark:text-purple-300 font-semibold text-[11px] bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                                    {activeFilterSummary}
                                </span>
                            ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                                    All clinic activity included
                                </span>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* Tab content */}
                <div>
                    {children}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
