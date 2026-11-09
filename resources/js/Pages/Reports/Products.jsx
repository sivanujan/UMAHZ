import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import ReportLayout from './ReportLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    Package,
    DollarSign,
    Boxes,
    Receipt,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Filter,
    ChevronDown,
} from 'lucide-react';

export default function ProductSalesReport({
    rows = [],
    summary = {},
    filters = {},
    categories = [],
    currency = 'CAD',
    canManage = false,
}) {
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [onlySold, setOnlySold] = useState(filters.only_sold === 'true');
    const [expandedProducts, setExpandedProducts] = useState({});

    const toggleExpand = (id) => {
        setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCategoryChange = (cat) => {
        setSelectedCategory(cat);
        const query = {
            ...filters,
            category: cat === 'all' ? undefined : cat,
            only_sold: onlySold ? 'true' : undefined,
        };
        router.get('/app/reports/products', query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleOnlySoldToggle = (checked) => {
        setOnlySold(checked);
        const query = {
            ...filters,
            category: selectedCategory === 'all' ? undefined : selectedCategory,
            only_sold: checked ? 'true' : undefined,
        };
        router.get('/app/reports/products', query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <ReportLayout
            title="Product Sales & Inventory Report"
            activeTab="products"
            canViewFinancial={true}
            filters={filters}
            currency={currency}
        >
            <Head title="Product Sales Report" />

            <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                    <GlassCard className="p-4">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Units Sold</span>
                            <Boxes className="w-4 h-4 text-violet-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {summary.total_units_sold ?? 0}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-4">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Product Revenue</span>
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.total_revenue_formatted ?? '$0.00'}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-4">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Sales Tax</span>
                            <Receipt className="w-4 h-4 text-sky-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {summary.total_tax_formatted ?? '$0.00'}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-4">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Current Stock</span>
                            <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {summary.current_stock_units ?? 0}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Across active catalog</p>
                    </GlassCard>

                    <GlassCard className="p-4">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {summary.low_stock_count ?? 0}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Below alert threshold</p>
                    </GlassCard>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Filter by category:</span>
                        <select
                            value={selectedCategory}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="text-xs py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c.charAt(0).toUpperCase() + c.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <input
                            type="checkbox"
                            checked={onlySold}
                            onChange={(e) => handleOnlySoldToggle(e.target.checked)}
                            className="rounded text-violet-600 focus:ring-violet-500"
                        />
                        <span>Only show products with sales in this period</span>
                    </label>
                </div>

                {/* Sales Table */}
                <GlassCard className="overflow-hidden">
                    {rows.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No product sales in this period</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                No products were billed on paid invoices in the selected date range. Try widening your date filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/50 dark:bg-slate-900/40">
                                        <th className="py-3 px-4">Product Name</th>
                                        <th className="py-3 px-4">Category</th>
                                        <th className="py-3 px-4 text-right">Unit Price</th>
                                        <th className="py-3 px-4 text-center">Units Sold</th>
                                        <th className="py-3 px-4 text-right">Revenue</th>
                                        <th className="py-3 px-4 text-right">Tax Collected</th>
                                        <th className="py-3 px-4 text-right">Current Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {rows.map((row) => {
                                        const isExpanded = expandedProducts[row.id];
                                        const hasMultiple = row.has_variants && row.variants && row.variants.length > 1;

                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr
                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {hasMultiple && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(row.id)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                                                >
                                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </button>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                                                        {row.name}
                                                                    </span>
                                                                    {hasMultiple && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                                                                            {row.variants.length} sizes
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {row.sku && (
                                                                    <span className="text-[10px] font-mono text-slate-400 block">
                                                                        SKU: {row.sku}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                            {row.category_label}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                                                        {row.formatted_price}
                                                    </td>

                                                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                                                        {row.units_sold}
                                                    </td>

                                                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                        {row.revenue_formatted}
                                                    </td>

                                                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                                                        {row.tax_formatted}
                                                    </td>

                                                    <td className="py-3 px-4 text-right">
                                                        {row.track_inventory ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <span
                                                                    className={`font-semibold ${
                                                                        row.current_stock <= 0
                                                                            ? 'text-rose-600 font-bold'
                                                                            : row.is_low_stock
                                                                            ? 'text-amber-600 font-bold'
                                                                            : 'text-slate-700 dark:text-slate-300'
                                                                    }`}
                                                                >
                                                                    {row.current_stock}
                                                                </span>
                                                                {row.is_low_stock && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                                                        Low
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Variants Breakdown Sub-rows */}
                                                {hasMultiple && isExpanded && row.variants.map((v) => (
                                                    <tr
                                                        key={v.id}
                                                        className="bg-slate-50/70 dark:bg-slate-900/50 text-[11px]"
                                                    >
                                                        <td className="py-2 px-4 pl-11 text-slate-600 dark:text-slate-400">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">↳ {v.name}</span>
                                                            {v.sku && <span className="font-mono text-[10px] text-slate-400 ml-1.5">[{v.sku}]</span>}
                                                        </td>
                                                        <td className="py-2 px-4 text-slate-400">
                                                            {v.size_value ? `${v.size_value} ${v.size_unit || ''}` : 'Variant'}
                                                        </td>
                                                        <td className="py-2 px-4 text-right font-mono text-slate-500">
                                                            ${(v.unit_price / 100).toFixed(2)}
                                                        </td>
                                                        <td className="py-2 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                                                            {v.units_sold}
                                                        </td>
                                                        <td className="py-2 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {v.revenue_formatted}
                                                        </td>
                                                        <td className="py-2 px-4 text-right text-slate-500">
                                                            {v.tax_formatted}
                                                        </td>
                                                        <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400">
                                                            {row.track_inventory ? (v.current_stock ?? 0) : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
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

