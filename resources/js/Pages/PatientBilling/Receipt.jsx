import React from 'react';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';

const fmt = (cents, currency = 'CAD') => `${currency} $${(cents / 100).toFixed(2)}`;

export default function Receipt({ invoice, clinic = {} }) {
    const currency = invoice.currency;
    const paid = invoice.payments || [];
    const details = invoice.receipt_details || {};
    const isPaid = (invoice.amount_paid || 0) > 0;
    const docType = isPaid ? 'RECEIPT' : 'INVOICE';

    return (
        <>
            <Head title={`${isPaid ? 'Receipt' : 'Invoice'} ${invoice.reference}`} />
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4 print:bg-white print:py-0">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-end mb-3 print:hidden">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                        >
                            <Printer className="w-4 h-4" /> Print {isPaid ? 'Receipt' : 'Invoice'}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 print:shadow-none shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                        {/* Header: Clinic info and Document Type */}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{clinic.name}</h1>
                                {clinic.address_text && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{clinic.address_text}</p>
                                )}
                                {clinic.email && <p className="text-xs text-slate-500">{clinic.email}</p>}
                                {clinic.phone && <p className="text-xs text-slate-500">{clinic.phone}</p>}
                            </div>
                            <div className="text-right shrink-0">
                                <div className="flex items-center justify-end gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{docType}</p>
                                    {!isPaid && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                            Unpaid
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{invoice.reference}</p>
                                <p className="text-xs text-slate-500">{invoice.receipt_date}</p>
                            </div>
                        </div>

                        {invoice.client && (
                            <div className="mt-6 text-xs text-slate-500">
                                <span className="uppercase tracking-wider font-semibold text-slate-400">Billed to</span>
                                <p className="text-slate-700 dark:text-slate-200 mt-0.5 font-medium">{invoice.client.name}</p>
                            </div>
                        )}

                        {/* Healthcare Service & Insurance Reimbursement Details */}
                        {details && (
                            <div className="mt-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                                    Healthcare Service & Insurance Reimbursement Details
                                </p>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                    {details.service && (
                                        <div className="col-span-2">
                                            <span className="text-[10px] text-slate-400 block">Service</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {details.service}
                                            </span>
                                        </div>
                                    )}
                                    {details.service_date && (
                                        <div>
                                            <span className="text-[10px] text-slate-400 block">Date of Service</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {details.service_date}
                                            </span>
                                        </div>
                                    )}
                                    {details.practitioner_name && (
                                        <div>
                                            <span className="text-[10px] text-slate-400 block">Practitioner</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {details.practitioner_name}
                                            </span>
                                        </div>
                                    )}
                                    {details.profession && (
                                        <div>
                                            <span className="text-[10px] text-slate-400 block">Profession</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {details.profession}
                                            </span>
                                        </div>
                                    )}
                                    {/* Always show Registration / License # row */}
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Registration / License #</span>
                                        <span className={`font-mono font-semibold ${details.registration_number === 'Not provided' ? 'text-slate-500 dark:text-slate-400 font-sans italic' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {details.registration_number || 'Not provided'}
                                        </span>
                                    </div>
                                    {details.insurer_name && (
                                        <div>
                                            <span className="text-[10px] text-slate-400 block">Insurance Provider</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {details.insurer_name}
                                            </span>
                                        </div>
                                    )}
                                    {details.member_id_masked && (
                                        <div>
                                            <span className="text-[10px] text-slate-400 block">Member / Certificate ID</span>
                                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                {details.member_id_masked}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Line items */}
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

                        {/* Totals */}
                        <div className="mt-4 ml-auto max-w-[220px] text-sm space-y-1">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span>{fmt(invoice.subtotal_amount, currency)}</span>
                            </div>
                            {invoice.tax_amount > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>Tax</span>
                                    <span>{fmt(invoice.tax_amount, currency)}</span>
                                </div>
                            )}
                            {invoice.discount_amount > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>Discount</span>
                                    <span>-{fmt(invoice.discount_amount, currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                                <span>Total</span>
                                <span>{fmt(invoice.total_amount, currency)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 font-semibold">
                                <span>Paid</span>
                                <span>{fmt(invoice.amount_paid, currency)}</span>
                            </div>
                            {invoice.amount_due > 0 && (
                                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                                    <span>Balance Due</span>
                                    <span>{fmt(invoice.amount_due, currency)}</span>
                                </div>
                            )}
                        </div>

                        {/* Payments list */}
                        {paid.length > 0 && (
                            <div className="mt-6 text-xs text-slate-500">
                                <span className="uppercase tracking-wider font-semibold text-slate-400">Payments</span>
                                <ul className="mt-1 space-y-0.5">
                                    {paid.map((p) => (
                                        <li key={p.id} className="flex justify-between">
                                            <span className="capitalize">
                                                {p.method}
                                                {p.processed_at_formatted ? ` · ${p.processed_at_formatted}` : ''}
                                            </span>
                                            <span>{fmt(p.amount, currency)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="mt-8 text-center text-[10px] text-slate-400">
                            {isPaid ? 'Thank you for your business.' : 'Thank you for your business. Please remit payment by the due date.'}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
