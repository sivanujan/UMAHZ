import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { X, Plus, Trash2, Receipt } from 'lucide-react';

// Money helpers: staff type dollars; we send integer minor units to the server.
const toCents = (v) => {
    const n = Number.parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function NewInvoiceModal({ clientId, appointments = [], onClose }) {
    const [rows, setRows] = useState([{ description: '', quantity: 1, unit: '' }]);
    const [discount, setDiscount] = useState('');
    const [appointmentId, setAppointmentId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const totals = useMemo(() => {
        let subtotal = 0;
        rows.forEach((r) => {
            subtotal += Math.max(1, parseInt(r.quantity, 10) || 1) * toCents(r.unit);
        });
        const disc = toCents(discount);
        return { subtotal, discount: disc, total: Math.max(0, subtotal - disc) };
    }, [rows, discount]);

    const updateRow = (i, key, value) => {
        setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
    };
    const addRow = () => setRows((rs) => [...rs, { description: '', quantity: 1, unit: '' }]);
    const removeRow = (i) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

    const submit = (status) => {
        setError(null);
        const line_items = rows
            .filter((r) => r.description.trim() !== '')
            .map((r) => ({
                description: r.description.trim(),
                quantity: Math.max(1, parseInt(r.quantity, 10) || 1),
                unit_amount: toCents(r.unit),
            }));

        if (line_items.length === 0) {
            setError('Add at least one line item with a description.');
            return;
        }

        setProcessing(true);
        router.post(
            '/app/invoices',
            {
                client_id: clientId,
                appointment_id: appointmentId || null,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">New Invoice</h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs px-3 py-2">{error}</div>
                    )}

                    {/* Line items */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                            <span className="col-span-6">Description</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-3 text-right">Unit price</span>
                            <span className="col-span-1" />
                        </div>
                        {rows.map((r, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                <input
                                    className="col-span-6 px-3 py-2 rounded-lg text-sm border outline-none"
                                    style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                    placeholder="e.g. Acupuncture session"
                                    value={r.description}
                                    onChange={(e) => updateRow(i, 'description', e.target.value)}
                                />
                                <input
                                    type="number" min="1"
                                    className="col-span-2 px-2 py-2 rounded-lg text-sm border outline-none text-center"
                                    style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                    value={r.quantity}
                                    onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                                />
                                <input
                                    inputMode="decimal"
                                    className="col-span-3 px-3 py-2 rounded-lg text-sm border outline-none text-right"
                                    style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                    placeholder="0.00"
                                    value={r.unit}
                                    onChange={(e) => updateRow(i, 'unit', e.target.value)}
                                />
                                <button type="button" onClick={() => removeRow(i)} className="col-span-1 text-slate-400 hover:text-red-500 flex justify-center">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline mt-1">
                            <Plus className="w-3.5 h-3.5" /> Add line item
                        </button>
                    </div>

                    {/* Meta */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Discount ($)</label>
                            <input
                                inputMode="decimal"
                                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                placeholder="0.00"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Due date</label>
                            <input
                                type="date"
                                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        {appointments.length > 0 && (
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Link to appointment (optional)</label>
                                <select
                                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                    style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
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
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes (optional)</label>
                            <textarea
                                rows={2}
                                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="rounded-xl border p-3 text-sm space-y-1" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>Discount</span><span>-{fmt(totals.discount)}</span></div>
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                            <span>Total</span><span>{fmt(totals.total)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-5 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                    <button type="button" onClick={() => submit('draft')} disabled={processing} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}>
                        Save as draft
                    </button>
                    <button type="button" onClick={() => submit('open')} disabled={processing} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
                        {processing ? 'Creating…' : 'Create & issue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
