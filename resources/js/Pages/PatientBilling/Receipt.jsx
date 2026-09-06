import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';

const fmt = (cents, currency = 'CAD') => `${currency} $${(cents / 100).toFixed(2)}`;

export default function Receipt({ invoice, clinic }) {
    const currency = invoice.currency;
    const paid = invoice.payments || [];

    return (
        <>
            <Head title={`Receipt ${invoice.reference}`} />
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4 print:bg-white print:py-0">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-end mb-3 print:hidden">
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 print:shadow-none shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{clinic.name}</h1>
                                {clinic.email && <p className="text-xs text-slate-500">{clinic.email}</p>}
                                {clinic.phone && <p className="text-xs text-slate-500">{clinic.phone}</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Receipt</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{invoice.reference}</p>
                                {invoice.paid_at && <p className="text-xs text-slate-500">{new Date(invoice.paid_at).toLocaleDateString()}</p>}
                            </div>
                        </div>

                        {invoice.client && (
                            <div className="mt-6 text-xs text-slate-500">
                                <span className="uppercase tracking-wider font-semibold text-slate-400">Billed to</span>
                                <p className="text-slate-700 dark:text-slate-200 mt-0.5">{invoice.client.name}</p>
                            </div>
                        )}

                        <table className="w-full text-left text-sm mt-6">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-2">Description</th>
                                    <th className="py-2 text-center">Qty</th>
                                    <th className="py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.line_items.map((li) => (
                                    <tr key={li.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                                        <td className="py-2 text-slate-700 dark:text-slate-200">{li.description}</td>
                                        <td className="py-2 text-center text-slate-500">{li.quantity}</td>
                                        <td className="py-2 text-right text-slate-700 dark:text-slate-200">{fmt(li.total_amount, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 ml-auto max-w-[220px] text-sm space-y-1">
                            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmt(invoice.subtotal_amount, currency)}</span></div>
                            {invoice.tax_amount > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{fmt(invoice.tax_amount, currency)}</span></div>}
                            {invoice.discount_amount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>-{fmt(invoice.discount_amount, currency)}</span></div>}
                            <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800"><span>Total</span><span>{fmt(invoice.total_amount, currency)}</span></div>
                            <div className="flex justify-between text-emerald-600 font-semibold"><span>Paid</span><span>{fmt(invoice.amount_paid, currency)}</span></div>
                        </div>

                        {paid.length > 0 && (
                            <div className="mt-6 text-xs text-slate-500">
                                <span className="uppercase tracking-wider font-semibold text-slate-400">Payments</span>
                                <ul className="mt-1 space-y-0.5">
                                    {paid.map((p) => (
                                        <li key={p.id} className="flex justify-between">
                                            <span className="capitalize">{p.method}{p.processed_at ? ` · ${new Date(p.processed_at).toLocaleDateString()}` : ''}</span>
                                            <span>{fmt(p.amount, currency)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="mt-8 text-center text-[10px] text-slate-400">Thank you for your business.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
