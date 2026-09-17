import React, { useMemo, useState } from 'react';
import ReportLayout from './ReportLayout';
import KpiCard from '@/Components/Dashboard/KpiCard';
import ChartCard from '@/Components/UI/ChartCard';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    ArrowDownRight,
    Tag,
    AlertCircle,
    User,
    CheckCircle2,
    ShieldCheck,
    Receipt,
    HelpCircle,
    ArrowUpDown,
    Info,
    Banknote,
    ArrowRightLeft,
    Wallet,
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { useTheme } from '@/Contexts/ThemeContext';

/* Currency formatter with explicit CAD display support */
function formatCents(cents, currency = 'CAD', includeCode = false) {
    const val = (cents || 0) / 100;
    const formatted = new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: (currency || 'CAD').toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);
    return includeCode ? `${formatted} ${currency}` : formatted;
}

/* Get payment method icon */
function getPaymentMethodIcon(method) {
    const m = (method || '').toLowerCase();
    if (m === 'card' || m === 'stripe') return <CreditCard className="w-4 h-4" />;
    if (m === 'cash') return <Banknote className="w-4 h-4" />;
    if (m === 'etransfer' || m === 'e-transfer') return <ArrowRightLeft className="w-4 h-4" />;
    return <Wallet className="w-4 h-4" />;
}

/* Custom Dark-Mode Aware Tooltip for Financial Recharts */
function FinancialChartTooltip({ active, payload, label, currency }) {
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
                            {formatCents(item.value, currency)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RevenueReport({
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
    const summary = payload.summary || {};
    const comparison = payload.comparison || {
        gross_billed_growth: 0,
        net_collected_growth: 0,
        prev_net_collected_cents: 0,
        prev_gross_billed_cents: 0,
    };
    const daily = payload.trend || payload.daily || [];
    const byMethod = payload.by_method || payload.by_payment_method || [];
    const byPractitioner = payload.by_practitioner || [];
    const byService = payload.by_service || [];
    const currency = summary.currency || 'CAD';

    // Sorting state for Practitioner Table
    const [sortField, setSortField] = useState('paid_cents');
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

    // Check if chart has any revenue activity across range
    const totalDailyActivity = useMemo(() => {
        return daily.reduce((acc, d) => acc + (d.invoiced_cents || d.gross_cents || 0) + (d.collected_cents || d.net_cents || 0), 0);
    }, [daily]);

    const hasChartData = totalDailyActivity > 0;

    // Normalizing chart data for Recharts
    const chartData = useMemo(() => {
        return daily.map((d) => ({
            label: d.label,
            date: d.date,
            gross: d.invoiced_cents ?? d.gross_cents ?? 0,
            net: d.collected_cents ?? d.net_cents ?? 0,
        }));
    }, [daily]);

    // Sparkline points for KPI cards
    const netSparkline = useMemo(() => daily.map((d) => (d.collected_cents ?? d.net_cents ?? 0) / 100), [daily]);
    const grossSparkline = useMemo(() => daily.map((d) => (d.invoiced_cents ?? d.gross_cents ?? 0) / 100), [daily]);

    // Check if discounts exceed gross billed (flagged for review)
    const hasDiscountAnomaly = (summary.discounts_cents || 0) > (summary.gross_billed_cents || 0);

    const paymentCount = summary.payment_count || 0;
    const paymentSubtext = paymentCount === 1 ? 'From 1 payment collected' : `From ${paymentCount} payments collected`;

    const sortedServices = useMemo(() => {
        return [...byService].sort((a, b) => {
            const amtA = a.total_cents ?? a.paid_cents ?? 0;
            const amtB = b.total_cents ?? b.paid_cents ?? 0;
            return amtB - amtA;
        });
    }, [byService]);

    return (
        <ReportLayout
            title="Revenue & Financials"
            activeTab="revenue"
            canViewFinancial={canViewFinancial}
            filters={filters}
            options={options}
            practitioners={practitioners}
            locations={locations}
            currency={currency}
            exportRoute="/app/reports/revenue/export"
        >
            <div className="space-y-6">
                {/* Data Sanity Alert if Discounts Exceed Gross */}
                {hasDiscountAnomaly && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 text-xs sm:text-sm shadow-xs">
                        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                                Accounting Audit Note: Cumulative Discounts Exceed Gross Billed Subtotal
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                                Cumulative discounts ({formatCents(summary.discounts_cents, currency, true)}) mathematically exceed gross billable services ({formatCents(summary.gross_billed_cents, currency, true)}).
                                This occurs when non-billable promotional vouchers, package waivers, or gift credits are applied to $0 consultation invoices. Net collections reflect reconciled payable amounts.
                            </p>
                        </div>
                    </div>
                )}

                {/* 1. Primary Headline Financial KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Hero Net Revenue Collected */}
                    <div
                        className="relative overflow-hidden p-6 rounded-2xl shadow-lg flex flex-col justify-between transition-all duration-300 border border-emerald-400/30"
                        style={{
                            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                            boxShadow: '0 12px 30px -10px rgba(16,185,129,0.5)',
                        }}
                    >
                        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/20">
                                    Cash Inflow ({currency})
                                </span>
                                <p className="text-sm font-bold text-white mt-2">Net Revenue Collected</p>
                            </div>
                            <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-white/20 text-white shadow-inner">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-5">
                            <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-none tabular-nums">
                                {formatCents(summary.net_collected_cents, currency)}
                            </h3>
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-100 mt-3 pt-2.5 border-t border-white/20">
                                <span className="flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {paymentSubtext}
                                </span>
                                {comparison.net_collected_growth !== 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
                                        {comparison.net_collected_growth > 0 ? `+${comparison.net_collected_growth}%` : `${comparison.net_collected_growth}%`} vs prev
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Gross Billed */}
                    <KpiCard
                        label={`Gross Billed (${currency})`}
                        value={formatCents(summary.gross_billed_cents, currency)}
                        icon={Receipt}
                        iconTint="#3B82F6"
                        iconBg="rgba(59,130,246,0.12)"
                        trend={{
                            value: comparison.gross_billed_growth,
                            isPositive: comparison.gross_billed_growth >= 0,
                            text: `Across ${summary.invoice_count || 0} invoice${summary.invoice_count === 1 ? '' : 's'} issued`,
                            hasComparison: comparison.prev_gross_billed_cents > 0,
                        }}
                        sparkline={grossSparkline}
                        delay={1}
                    />

                    {/* Outstanding / Due Balance */}
                    <KpiCard
                        label={`Outstanding Balance (Due ${currency})`}
                        value={formatCents(summary.outstanding_cents, currency)}
                        icon={AlertCircle}
                        iconTint="#F59E0B"
                        iconBg="rgba(245,158,11,0.12)"
                        trend={{
                            value: 0,
                            isPositive: false,
                            text: 'Pending client payment settlement',
                            hasComparison: false,
                        }}
                        delay={2}
                    />
                </div>

                {/* 2. Secondary Financial Adjustments Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Discounts */}
                    <GlassCard className="p-4 sm:p-5 flex flex-col justify-between opacity-95">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Discounts Applied
                                </p>
                                <h4 className="text-xl font-bold mt-1 text-slate-900 dark:text-white tabular-nums">
                                    {formatCents(summary.discounts_cents, currency, true)}
                                </h4>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <Tag className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                            Promotional & coupon adjustments
                        </p>
                    </GlassCard>

                    {/* Refunds */}
                    <GlassCard className="p-4 sm:p-5 flex flex-col justify-between opacity-95">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Refunds Processed
                                </p>
                                <h4 className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400 tabular-nums">
                                    {formatCents(summary.refunds_cents, currency, true)}
                                </h4>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                                <ArrowDownRight className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                            Subtracted from gross collections
                        </p>
                    </GlassCard>

                    {/* Sales Tax */}
                    <GlassCard className="p-4 sm:p-5 flex flex-col justify-between opacity-95">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Sales Tax / GST
                                </p>
                                <h4 className="text-xl font-bold mt-1 text-slate-900 dark:text-white tabular-nums">
                                    {formatCents(summary.taxes_cents || summary.tax_cents, currency, true)}
                                </h4>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                            Remittable tax liability
                        </p>
                    </GlassCard>
                </div>

                {/* Financial Integrity Note styled as a subtle info card */}
                <div className="p-3.5 px-4 rounded-2xl bg-slate-100/60 dark:bg-white/[0.025] border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        <span>
                            <strong className="text-slate-800 dark:text-slate-200 font-semibold">Financial Integrity Assurance:</strong> Ledger records stored in exact integer minor currency units (cents). Immutable transaction entries eliminate floating-point calculation drift.
                        </span>
                    </div>
                    <span className="self-start sm:self-center shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Audit Safe
                    </span>
                </div>

                {/* 3. Daily Revenue & Collections Trend Chart */}
                <ChartCard
                    icon={TrendingUp}
                    title="Daily Revenue & Collections Trend"
                    subtitle="Comparison of gross invoiced billing vs realized net cash collections."
                    hasData={hasChartData}
                    emptyTitle="No financial transactions in this range"
                    emptyDescription="There are no recorded invoices or settled payments in the selected period."
                    legend={
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                                <span className="text-slate-600 dark:text-slate-300">Net Collected ({currency})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
                                <span className="text-slate-600 dark:text-slate-300">Gross Invoiced ({currency})</span>
                            </div>
                        </div>
                    }
                >
                    <div className="w-full h-72 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
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
                                    tickFormatter={(v) => `$${(v / 100).toLocaleString()}`}
                                />
                                <Tooltip content={<FinancialChartTooltip currency={currency} />} />
                                <Area
                                    type="monotone"
                                    dataKey="gross"
                                    name={`Gross Invoiced (${currency})`}
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#grossGradient)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="net"
                                    name={`Net Collected (${currency})`}
                                    stroke="#10B981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#netGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* 4. Financial Breakdown Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue by Practitioner */}
                    <GlassCard className="p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                            Revenue by Practitioner
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Gross billings and settled cash receipts per clinician.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {sortedPractitioners.length === 0 ? (
                                <p className="text-xs py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                                    No practitioner billing records found for this period.
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
                                                <th className="pb-3 text-center cursor-pointer select-none" onClick={() => handleSort('invoice_count')}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>Invoices</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-right cursor-pointer select-none" onClick={() => handleSort('total_cents')}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>Gross Billed</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                                <th className="pb-3 text-right cursor-pointer select-none" onClick={() => handleSort('paid_cents')}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>Net Collected</span>
                                                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                                            {sortedPractitioners.map((p, idx) => {
                                                const netShare = summary.net_collected_cents > 0
                                                    ? Math.round((p.paid_cents / summary.net_collected_cents) * 100)
                                                    : 0;

                                                return (
                                                    <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                                        <td className="py-3 font-semibold text-slate-900 dark:text-white">
                                                            {p.name}
                                                        </td>
                                                        <td className="py-3 text-center text-slate-500 dark:text-slate-400 font-medium">
                                                            {p.invoice_count}
                                                        </td>
                                                        <td className="py-3 text-right font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                                                            {formatCents(p.total_cents ?? p.subtotal_cents, currency, true)}
                                                        </td>
                                                        <td className="py-3 text-right tabular-nums">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                        {formatCents(p.paid_cents, currency, true)}
                                                                    </span>
                                                                    {netShare > 0 && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                                            {netShare}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {netShare > 0 && (
                                                                    <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full bg-emerald-500"
                                                                            style={{ width: `${netShare}%` }}
                                                                        />
                                                                    </div>
                                                                )}
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

                    {/* Revenue by Payment Method & Service */}
                    <div className="space-y-6">
                        {/* Collections by Payment Method */}
                        <GlassCard className="p-5 sm:p-6">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/60 dark:border-white/10">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                        Collections by Payment Method
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Payment gateway breakdown and transaction volume.
                                    </p>
                                </div>
                            </div>

                            {byMethod.length === 0 ? (
                                <p className="text-xs py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                                    No payment transactions in range.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs mt-3">
                                    {byMethod.map((pm, idx) => {
                                        const sharePct = summary.gross_collected_cents > 0
                                            ? Math.round((pm.total_cents / summary.gross_collected_cents) * 100)
                                            : 0;

                                        return (
                                            <div key={idx} className="py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs">
                                                        {getPaymentMethodIcon(pm.method)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{pm.label}</p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {pm.count} transaction{pm.count === 1 ? '' : 's'} ({sharePct}%)
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums block">
                                                        {formatCents(pm.total_cents, currency, true)}
                                                    </span>
                                                    <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden ml-auto mt-1">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500"
                                                            style={{ width: `${sharePct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassCard>

                        {/* Revenue by Service */}
                        {sortedServices.length > 0 && (
                            <GlassCard className="p-5 sm:p-6">
                                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/60 dark:border-white/10">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                        <Receipt className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                            Revenue by Service
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Cash revenue generated per service modality.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3.5 mt-4">
                                    {sortedServices.map((s, idx) => {
                                        const billed = s.total_cents ?? s.paid_cents ?? 0;
                                        const pct = summary.gross_billed_cents > 0 ? Math.round((billed / summary.gross_billed_cents) * 100) : 0;

                                        return (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1.5">
                                                            ({s.count} session{s.count === 1 ? '' : 's'})
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                        {formatCents(billed, currency, true)} {pct > 0 && `(${pct}%)`}
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
                            </GlassCard>
                        )}
                    </div>
                </div>
            </div>
        </ReportLayout>
    );
}
