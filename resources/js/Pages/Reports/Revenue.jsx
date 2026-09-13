import React from 'react';
import ReportLayout from './ReportLayout';
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
} from 'lucide-react';

function StatCard({ label, value, subtext, icon: Icon, tint, isHero }) {
    if (isHero) {
        return (
            <div
                className="relative overflow-hidden p-6 rounded-xl shadow-md flex flex-col justify-between transition-colors duration-300 sm:col-span-2"
                style={{
                    background: 'linear-gradient(135deg, #0D9488 0%, #059669 55%, #10B981 120%)',
                    boxShadow: '0 12px 28px -12px rgba(16,185,129,0.55)',
                }}
            >
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} aria-hidden="true" />
                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/90 px-2 py-0.5 rounded bg-white/10">
                            Cash Inflow
                        </span>
                        <p className="text-sm font-semibold text-emerald-50 mt-1">{label}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/20 text-white">
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                <div className="relative z-10 mt-4">
                    <h3 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
                        {value}
                    </h3>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-100/90 mt-3">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {subtext}
                    </p>
                </div>
            </div>
        );
    }

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
                    <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--umahz-text-primary)' }}>
                        {value}
                    </h3>
                </div>
                <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}
                >
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="mt-3 pt-2.5 border-t text-xs truncate" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-tertiary)' }}>
                {subtext}
            </div>
        </div>
    );
}

function formatCents(cents, currency = 'CAD') {
    const val = (cents || 0) / 100;
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: (currency || 'CAD').toUpperCase(),
    }).format(val);
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
    const payload = report || data || {};
    const summary = payload.summary || {};
    const daily = payload.trend || payload.daily || [];
    const byMethod = payload.by_method || payload.by_payment_method || [];
    const byPractitioner = payload.by_practitioner || [];
    const byService = payload.by_service || [];
    const currency = summary.currency || 'CAD';

    const maxDailyGross = Math.max(...daily.map((d) => d.invoiced_cents || d.gross_cents || 0), 1);

    return (
        <ReportLayout
            title="Revenue & Financials"
            activeTab="revenue"
            canViewFinancial={canViewFinancial}
            filters={filters}
            options={options}
            practitioners={practitioners}
            locations={locations}
            exportRoute="/app/reports/revenue/export"
        >
            {/* Top Financial Stat Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Hero Net Collected */}
                <StatCard
                    label="Net Revenue Collected"
                    value={formatCents(summary.net_collected_cents, currency)}
                    subtext={`${summary.payment_count || summary.paid_invoices || 0} payments • Spec §15 exact cents`}
                    icon={DollarSign}
                    isHero
                />

                {/* Gross Billed */}
                <StatCard
                    label="Gross Billed"
                    value={formatCents(summary.gross_billed_cents, currency)}
                    subtext={`Across ${summary.invoice_count || summary.total_invoices || 0} total invoices issued`}
                    icon={Receipt}
                    tint="#3B82F6"
                />

                {/* Outstanding Balance */}
                <StatCard
                    label="Outstanding / Due"
                    value={formatCents(summary.outstanding_cents, currency)}
                    subtext="Pending payment confirmation"
                    icon={AlertCircle}
                    tint="#F59E0B"
                />

                {/* Discounts */}
                <StatCard
                    label="Discounts Applied"
                    value={formatCents(summary.discounts_cents, currency)}
                    subtext="Promotional & coupon write-offs"
                    icon={Tag}
                    tint="#6366F1"
                />

                {/* Refunds */}
                <StatCard
                    label="Refunds Processed"
                    value={formatCents(summary.refunds_cents, currency)}
                    subtext="Deducted from net receipts"
                    icon={ArrowDownRight}
                    tint="#EF4444"
                />

                {/* Tax */}
                <StatCard
                    label="Sales Tax / GST"
                    value={formatCents(summary.taxes_cents || summary.tax_cents, currency)}
                    subtext="Computed tax liabilities"
                    icon={CheckCircle2}
                    tint="#8B5CF6"
                />

                {/* Spec audit info card */}
                <div
                    className="p-5 rounded-xl border shadow-sm flex flex-col justify-between"
                    style={{
                        background: 'color-mix(in srgb, var(--umahz-accent) 6%, var(--umahz-surface))',
                        borderColor: 'var(--umahz-border)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--umahz-text-primary)' }}>
                            Financial Integrity
                        </span>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--umahz-text-secondary)' }}>
                        All financial calculations are stored in exact minor currency units (cents). Zero floating point rounding drift.
                    </p>
                </div>
            </div>

            {/* Daily Collections Chart */}
            <div
                className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b gap-2" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div>
                        <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: 'var(--umahz-text-primary)' }}>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Daily Revenue & Collections Trend
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-secondary)' }}>
                            Tracking gross invoices vs realized net cash collections.
                        </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span style={{ color: 'var(--umahz-text-secondary)' }}>Net Collected</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
                            <span style={{ color: 'var(--umahz-text-secondary)' }}>Gross Billed</span>
                        </div>
                    </div>
                </div>

                {daily.length === 0 ? (
                    <div className="py-12 text-center text-sm" style={{ color: 'var(--umahz-text-tertiary)' }}>
                        No financial billing transactions found in this period.
                    </div>
                ) : (
                    <div className="mt-6">
                        <div className="overflow-x-auto pb-2">
                            <div className="flex items-end gap-3 min-w-[600px] h-48 pt-6 px-2">
                                {daily.map((day, idx) => {
                                    const grossCents = day.invoiced_cents ?? day.gross_cents ?? 0;
                                    const netCents = day.collected_cents ?? day.net_cents ?? 0;
                                    const netHeight = Math.min(100, Math.max(0, (netCents / maxDailyGross) * 100));
                                    const grossHeight = Math.min(100, Math.max(0, (grossCents / maxDailyGross) * 100));

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
                                                <div className="text-emerald-400">Net Collected: {formatCents(netCents, currency)}</div>
                                                <div className="text-blue-300">Gross Billed: {formatCents(grossCents, currency)}</div>
                                            </div>

                                            {/* Dual Bars */}
                                            <div className="flex items-end gap-1 w-full max-w-[32px] h-full justify-center">
                                                <div
                                                    style={{ height: `${grossHeight}%` }}
                                                    className="w-1/2 bg-blue-400/70 rounded-t transition-all duration-300"
                                                    title={`Gross: ${formatCents(grossCents, currency)}`}
                                                />
                                                <div
                                                    style={{ height: `${netHeight}%` }}
                                                    className="w-1/2 bg-emerald-500 rounded-t transition-all duration-300"
                                                    title={`Net: ${formatCents(netCents, currency)}`}
                                                />
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
                {/* Revenue by Practitioner */}
                <div
                    className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                    style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                >
                    <h2 className="font-semibold text-base flex items-center gap-2 mb-4" style={{ color: 'var(--umahz-text-primary)' }}>
                        <User className="w-4 h-4 text-blue-500" />
                        Revenue by Practitioner
                    </h2>

                    {byPractitioner.length === 0 ? (
                        <p className="text-xs py-4 text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>No practitioner billing records found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}>
                                        <th className="pb-2.5">Practitioner</th>
                                        <th className="pb-2.5 text-center">Invoices</th>
                                        <th className="pb-2.5 text-right">Gross Billed</th>
                                        <th className="pb-2.5 text-right">Net Collected</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--umahz-border)' }}>
                                    {byPractitioner.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                                            <td className="py-2.5 font-medium" style={{ color: 'var(--umahz-text-primary)' }}>
                                                {p.name}
                                            </td>
                                            <td className="py-2.5 text-center" style={{ color: 'var(--umahz-text-secondary)' }}>
                                                {p.invoice_count}
                                            </td>
                                            <td className="py-2.5 text-right font-medium" style={{ color: 'var(--umahz-text-secondary)' }}>
                                                {p.gross_formatted || formatCents(p.total_cents ?? p.subtotal_cents, currency)}
                                            </td>
                                            <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                {p.net_formatted || formatCents(p.paid_cents, currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Revenue by Payment Method & Service */}
                <div className="space-y-6">
                    {/* By Payment Method */}
                    <div
                        className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                        style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                    >
                        <h2 className="font-semibold text-base flex items-center gap-2 mb-4" style={{ color: 'var(--umahz-text-primary)' }}>
                            <CreditCard className="w-4 h-4 text-purple-500" />
                            Collections by Payment Method
                        </h2>

                        {byMethod.length === 0 ? (
                            <p className="text-xs py-4 text-center" style={{ color: 'var(--umahz-text-tertiary)' }}>No payment transactions in range.</p>
                        ) : (
                            <div className="divide-y text-xs" style={{ borderColor: 'var(--umahz-border)' }}>
                                {byMethod.map((pm, idx) => (
                                    <div key={idx} className="py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-md flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                                                {pm.method ? pm.method.substring(0, 2).toUpperCase() : 'PM'}
                                            </div>
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--umahz-text-primary)' }}>{pm.label}</p>
                                                <p className="text-[11px]" style={{ color: 'var(--umahz-text-tertiary)' }}>{pm.count} transactions</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-sm" style={{ color: 'var(--umahz-text-primary)' }}>
                                            {pm.total_formatted || formatCents(pm.total_cents, currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* By Service */}
                    {byService.length > 0 && (
                        <div
                            className="p-6 rounded-xl border shadow-sm transition-colors duration-300"
                            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
                        >
                            <h2 className="font-semibold text-base flex items-center gap-2 mb-4" style={{ color: 'var(--umahz-text-primary)' }}>
                                <Receipt className="w-4 h-4 text-emerald-500" />
                                Revenue by Service
                            </h2>
                            <div className="space-y-3">
                                {byService.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                                        <div>
                                            <p className="font-medium" style={{ color: 'var(--umahz-text-primary)' }}>{s.name}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--umahz-text-tertiary)' }}>{s.count} sessions billed</p>
                                        </div>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {s.gross_formatted || formatCents(s.total_cents ?? s.paid_cents, currency)}
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
