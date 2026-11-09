import React, { useMemo, useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { X, Plus, Trash2, Receipt, Package, Search, AlertTriangle, Check, Loader2 } from 'lucide-react';

// Money helpers: staff type dollars; we send integer minor units to the server.
const toCents = (v) => {
    const n = Number.parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function NewInvoiceModal({
    clientId,
    appointments = [],
    onClose,
    initialMode = 'standard', // 'standard' | 'products'
}) {
    const [mode, setMode] = useState(initialMode);
    const [rows, setRows] = useState(
        initialMode === 'products'
            ? []
            : [{ description: '', quantity: 1, unit: '', tax: '', product_id: null, is_product: false }]
    );
    const [discount, setDiscount] = useState('');
    const [appointmentId, setAppointmentId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Product search picker state
    const [showProductPicker, setShowProductPicker] = useState(initialMode === 'products');
    const [productSearch, setProductSearch] = useState('');
    const [productsList, setProductsList] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        fetchProducts('');
    }, []);

    const fetchProducts = async (q = '') => {
        setLoadingProducts(true);
        try {
            const res = await axios.get('/app/products/search', { params: { q } });
            setProductsList(res.data.products || []);
        } catch {
            setProductsList([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleProductSearchChange = (e) => {
        const val = e.target.value;
        setProductSearch(val);
        fetchProducts(val);
    };

    const addProductRow = (product, variant = null) => {
        const chosenVariant = variant || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
        const unitPrice = chosenVariant ? chosenVariant.unit_price : product.unit_price;
        const unitDollars = (unitPrice / 100).toFixed(2);
        let taxDollars = '0.00';
        if (product.taxable && product.tax_rate) {
            const taxCents = Math.round(unitPrice * (product.tax_rate / 100));
            taxDollars = (taxCents / 100).toFixed(2);
        }

        let desc = product.name;
        if (chosenVariant && chosenVariant.name) {
            desc = `${product.name} - ${chosenVariant.name}`;
        } else if (chosenVariant?.sku || product.sku) {
            desc = `${product.name} [${chosenVariant?.sku || product.sku}]`;
        }

        const newRow = {
            description: desc,
            quantity: 1,
            unit: unitDollars,
            tax: taxDollars,
            product_id: product.id,
            product_variant_id: chosenVariant?.id || null,
            variant_name: chosenVariant?.name || null,
            is_product: true,
            taxable: product.taxable,
            tax_rate: product.tax_rate,
            track_inventory: product.track_inventory,
            stock_quantity: chosenVariant ? chosenVariant.stock_quantity : product.stock_quantity,
        };

        setRows((rs) => [...rs, newRow]);
        setShowProductPicker(false);
        setProductSearch('');
    };

    const totals = useMemo(() => {
        let subtotal = 0;
        let taxTotal = 0;
        rows.forEach((r) => {
            const qty = Math.max(1, parseInt(r.quantity, 10) || 1);
            const lineSub = qty * toCents(r.unit);
            const lineTax = toCents(r.tax);
            subtotal += lineSub;
            taxTotal += lineTax;
        });
        const disc = toCents(discount);
        return {
            subtotal,
            tax: taxTotal,
            discount: disc,
            total: Math.max(0, subtotal + taxTotal - disc),
        };
    }, [rows, discount]);

    const updateRow = (i, key, value) => {
        setRows((rs) =>
            rs.map((r, idx) => {
                if (idx !== i) return r;
                const updated = { ...r, [key]: value };

                // If user changes quantity or unit, re-estimate tax if it was a taxable product
                if ((key === 'quantity' || key === 'unit') && updated.is_product && updated.taxable && updated.tax_rate) {
                    const qty = Math.max(1, parseInt(updated.quantity, 10) || 1);
                    const unitCents = toCents(updated.unit);
                    const taxCents = Math.round(qty * unitCents * (updated.tax_rate / 100));
                    updated.tax = (taxCents / 100).toFixed(2);
                }

                return updated;
            })
        );
    };

    const addManualRow = () => {
        setRows((rs) => [
            ...rs,
            { description: '', quantity: 1, unit: '', tax: '', product_id: null, is_product: false },
        ]);
    };

    const removeRow = (i) => {
        setRows((rs) => rs.filter((_, idx) => idx !== i));
    };

    const submit = (status) => {
        setError(null);
        const line_items = rows
            .filter((r) => r.description.trim() !== '')
            .map((r) => ({
                product_id: r.product_id || null,
                product_variant_id: r.product_variant_id || null,
                description: r.description.trim(),
                quantity: Math.max(1, parseInt(r.quantity, 10) || 1),
                unit_amount: toCents(r.unit),
                tax_amount: toCents(r.tax),
            }));

        if (line_items.length === 0) {
            setError('Add at least one item or product line with a description.');
            return;
        }

        setProcessing(true);
        router.post(
            '/app/invoices',
            {
                client_id: clientId,
                appointment_id: mode === 'products' ? null : appointmentId || null,
                due_date: dueDate || null,
                discount_amount: toCents(discount),
                notes: notes || null,
                status,
                line_items,
            },
            {
                preserveScroll: true,
                onError: (errs) => {
                    setProcessing(false);
                    setError(Object.values(errs)[0] || 'Could not create the invoice.');
                },
                onSuccess: () => onClose(),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div
                    className="flex items-center justify-between p-5 border-b"
                    style={{ borderColor: 'var(--umahz-border)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                mode === 'products'
                                    ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            }`}
                        >
                            {mode === 'products' ? <Package className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                {mode === 'products' ? 'Sell Products & Supplies' : 'New Invoice'}
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {mode === 'products'
                                    ? 'Bill client directly for retail items, herbs, tape, or equipment.'
                                    : 'Create an invoice for services and items.'}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs px-3.5 py-2.5">
                            {error}
                        </div>
                    )}

                    {/* Product Picker Accordion */}
                    {showProductPicker && (
                        <div
                            className="p-4 rounded-xl border space-y-3"
                            style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Select Product to Add
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowProductPicker(false)}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                    Close Picker
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={productSearch}
                                    onChange={handleProductSearchChange}
                                    placeholder="Search catalog by name, SKU, or category…"
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none bg-white dark:bg-slate-900"
                                    style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 rounded-lg border bg-white dark:bg-slate-900" style={{ borderColor: 'var(--umahz-border)' }}>
                                {loadingProducts ? (
                                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Loading products…</span>
                                    </div>
                                ) : productsList.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        No active products found matching "{productSearch}".
                                    </div>
                                ) : (
                                    productsList.map((p) => {
                                        const hasMultiple = p.has_variants && p.variants && p.variants.length > 1;

                                        if (hasMultiple) {
                                            return (
                                                <div key={p.id} className="p-2.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center shrink-0">
                                                                <Package className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                                    {p.name}
                                                                </p>
                                                                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                                                                    {p.variants.length} sizes / variants available
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 pl-9">
                                                        {p.variants.map((v) => (
                                                            <button
                                                                key={v.id}
                                                                type="button"
                                                                onClick={() => addProductRow(p, v)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 hover:border-violet-300 dark:hover:bg-violet-950/60 transition text-xs"
                                                            >
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                    {v.name || 'Default'}
                                                                </span>
                                                                <span className="text-slate-500 font-mono text-[11px]">
                                                                    {v.formatted_price}
                                                                </span>
                                                                {p.track_inventory && (
                                                                    <span className={`text-[10px] ${v.stock_quantity <= 0 ? 'text-rose-500 font-bold' : v.is_low_stock ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                                                                        ({v.stock_quantity ?? 0} in stock)
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => addProductRow(p)}
                                                className="p-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer flex items-center justify-between transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center shrink-0">
                                                        <Package className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                            {p.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                            {p.sku && <span>SKU: {p.sku}</span>}
                                                            {p.track_inventory && (
                                                                <span className={p.stock_quantity <= 0 ? 'text-rose-500 font-bold' : p.is_low_stock ? 'text-amber-500 font-bold' : ''}>
                                                                    • Stock: {p.stock_quantity}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                        {p.formatted_price}
                                                    </p>
                                                    <span className="text-[10px] text-emerald-600 font-medium">
                                                        + Add to line
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Line items table */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                            <span className="col-span-5">Description</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-2 text-right">Unit Price</span>
                            <span className="col-span-2 text-right">Tax</span>
                            <span className="col-span-1" />
                        </div>

                        {rows.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl" style={{ borderColor: 'var(--umahz-border)' }}>
                                <Package className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                                <p>No items added yet. Click "+ Add Product" to pick from your catalog.</p>
                            </div>
                        ) : (
                            rows.map((r, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-5 relative">
                                            <input
                                                className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                                                style={{
                                                    background: 'var(--umahz-hover)',
                                                    borderColor: 'var(--umahz-border)',
                                                    color: 'var(--umahz-text-primary)',
                                                }}
                                                placeholder="e.g. Treatment Session or Product"
                                                value={r.description}
                                                onChange={(e) => updateRow(i, 'description', e.target.value)}
                                            />
                                            {r.is_product && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                                                    Product
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            className="col-span-2 px-2 py-2 rounded-lg text-xs border outline-none text-center"
                                            style={{
                                                background: 'var(--umahz-hover)',
                                                borderColor: 'var(--umahz-border)',
                                                color: 'var(--umahz-text-primary)',
                                            }}
                                            value={r.quantity}
                                            onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                                        />
                                        <input
                                            inputMode="decimal"
                                            className="col-span-2 px-3 py-2 rounded-lg text-xs border outline-none text-right font-medium"
                                            style={{
                                                background: 'var(--umahz-hover)',
                                                borderColor: 'var(--umahz-border)',
                                                color: 'var(--umahz-text-primary)',
                                            }}
                                            placeholder="0.00"
                                            value={r.unit}
                                            onChange={(e) => updateRow(i, 'unit', e.target.value)}
                                        />
                                        <input
                                            inputMode="decimal"
                                            className="col-span-2 px-3 py-2 rounded-lg text-xs border outline-none text-right font-medium"
                                            style={{
                                                background: 'var(--umahz-hover)',
                                                borderColor: 'var(--umahz-border)',
                                                color: 'var(--umahz-text-primary)',
                                            }}
                                            placeholder="0.00"
                                            value={r.tax}
                                            onChange={(e) => updateRow(i, 'tax', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeRow(i)}
                                            className="col-span-1 text-slate-400 hover:text-red-500 flex justify-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Inventory warning badge if requested > stock */}
                                    {r.track_inventory && r.stock_quantity !== null && (parseInt(r.quantity, 10) || 1) > r.stock_quantity && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                            <span>
                                                Quantity ({r.quantity}) exceeds available inventory ({r.stock_quantity} in stock). You may still continue.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowProductPicker(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800 hover:bg-violet-100 transition"
                            >
                                <Package className="w-3.5 h-3.5" />
                                <span>+ Add Product</span>
                            </button>
                            <button
                                type="button"
                                onClick={addManualRow}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Custom Service Line</span>
                            </button>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Discount ($)
                            </label>
                            <input
                                inputMode="decimal"
                                className="w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none"
                                style={{
                                    background: 'var(--umahz-hover)',
                                    borderColor: 'var(--umahz-border)',
                                    color: 'var(--umahz-text-primary)',
                                }}
                                placeholder="0.00"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Due Date
                            </label>
                            <input
                                type="date"
                                className="w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none"
                                style={{
                                    background: 'var(--umahz-hover)',
                                    borderColor: 'var(--umahz-border)',
                                    color: 'var(--umahz-text-primary)',
                                }}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        {mode !== 'products' && appointments.length > 0 && (
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    Link to appointment (optional)
                                </label>
                                <select
                                    className="w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none"
                                    style={{
                                        background: 'var(--umahz-hover)',
                                        borderColor: 'var(--umahz-border)',
                                        color: 'var(--umahz-text-primary)',
                                    }}
                                    value={appointmentId}
                                    onChange={(e) => setAppointmentId(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {appointments.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.service_name} — {new Date(a.starts_at).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Notes (optional)
                            </label>
                            <textarea
                                rows={2}
                                className="w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none"
                                style={{
                                    background: 'var(--umahz-hover)',
                                    borderColor: 'var(--umahz-border)',
                                    color: 'var(--umahz-text-primary)',
                                }}
                                placeholder="Payment terms, instructions, or clinic note…"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Totals */}
                    <div
                        className="rounded-xl border p-3.5 text-xs space-y-1.5"
                        style={{ borderColor: 'var(--umahz-border)' }}
                    >
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>{fmt(totals.subtotal)}</span>
                        </div>
                        {totals.tax > 0 && (
                            <div className="flex justify-between text-slate-500">
                                <span>Sales Tax</span>
                                <span>{fmt(totals.tax)}</span>
                            </div>
                        )}
                        {totals.discount > 0 && (
                            <div className="flex justify-between text-slate-500">
                                <span>Discount</span>
                                <span>-{fmt(totals.discount)}</span>
                            </div>
                        )}
                        <div
                            className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1.5 border-t"
                            style={{ borderColor: 'var(--umahz-border)' }}
                        >
                            <span>Total Due</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{fmt(totals.total)}</span>
                        </div>
                    </div>
                </div>

                <div
                    className="flex items-center justify-end gap-2 p-5 border-t"
                    style={{ borderColor: 'var(--umahz-border)' }}
                >
                    <button
                        type="button"
                        onClick={() => submit('draft')}
                        disabled={processing}
                        className="px-4 py-2 rounded-xl text-xs font-bold border transition"
                        style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                    >
                        Save as Draft
                    </button>
                    <button
                        type="button"
                        onClick={() => submit('open')}
                        disabled={processing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 shadow-sm transition"
                    >
                        {processing ? 'Creating…' : 'Create & Issue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
