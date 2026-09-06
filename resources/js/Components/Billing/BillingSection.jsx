import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Receipt, Plus, CreditCard, AlertCircle } from 'lucide-react';
import NewInvoiceModal from '@/Components/Billing/NewInvoiceModal';

const fmt = (cents, currency = 'CAD') => `${currency} $${(cents / 100).toFixed(2)}`;

const STATUS_STYLES = {
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    open: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    paid: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    void: 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through',
};

export default function BillingSection({ clientId, invoices = [], canBill = false, canAcceptCards = false, appointments = [] }) {
    const [creating, setCreating] = useState(false);

    return (
        <div
            className="rounded-2xl border shadow-sm p-6"
            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Billing & Payments</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                {invoices.length} invoices
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Invoices and payment history for this client.
                        </p>
                    </div>
                </div>

                {canBill && (
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Invoice</span>
                    </button>
                )}
            </div>

            {canBill && !canAcceptCards && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Card payments are unavailable until the clinic connects its Stripe account in Settings → Connect payments. You can still record cash / e-transfer payments.</span>
                </div>
            )}

            {invoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p>No invoices for this client yet.</p>
                    {canBill && (
                        <button type="button" onClick={() => setCreating(true)} className="mt-2 text-emerald-600 hover:underline font-semibold">
                            Create first invoice
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                                <th className="py-2 pr-4">Invoice</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4 text-right">Total</th>
                                <th className="py-2 pr-4 text-right">Balance</th>
                                <th className="py-2 pr-4">Issued</th>
                                <th className="py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: 'var(--umahz-border)' }}>
                                    <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">{inv.reference}</td>
                                    <td className="py-2.5 pr-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_STYLES[inv.status] || ''}`}>{inv.status}</span>
                                    </td>
                                    <td className="py-2.5 pr-4 text-right text-slate-600 dark:text-slate-300">{fmt(inv.total_amount, inv.currency)}</td>
                                    <td className="py-2.5 pr-4 text-right text-slate-600 dark:text-slate-300">{fmt(inv.amount_due, inv.currency)}</td>
                                    <td className="py-2.5 pr-4 text-slate-500">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}</td>
                                    <td className="py-2.5 text-right">
                                        <Link href={`/app/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold">
                                            {inv.status === 'open' ? <><CreditCard className="w-3.5 h-3.5" /> Pay / view</> : 'View'}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {creating && (
                <NewInvoiceModal clientId={clientId} appointments={appointments} onClose={() => setCreating(false)} />
            )}
        </div>
    );
}
