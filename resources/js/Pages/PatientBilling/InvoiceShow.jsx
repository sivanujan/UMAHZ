import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ArrowLeft, Receipt, CreditCard, Banknote, Printer, Ban, CheckCircle2, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

const fmt = (cents, currency = 'CAD') => `${currency} $${(cents / 100).toFixed(2)}`;

function loadStripeJs() {
    return new Promise((resolve, reject) => {
        if (window.Stripe) return resolve(window.Stripe);
        const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Stripe));
            existing.addEventListener('error', reject);
            return;
        }
        const el = document.createElement('script');
        el.src = 'https://js.stripe.com/v3/';
        el.onload = () => resolve(window.Stripe);
        el.onerror = reject;
        document.head.appendChild(el);
    });
}

const STATUS_STYLES = {
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    open: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    paid: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    void: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
};

export default function InvoiceShow({ invoice, canAcceptCards, stripePublishableKey }) {
    const [payMode, setPayMode] = useState(null); // 'card' | 'manual' | 'insurance' | null
    const currency = invoice.currency;

    const handleMarkClaimPaid = (claimId) => {
        if (!window.confirm('Mark insurance payment as received? This will apply the payment to the invoice balance.')) {
            return;
        }
        router.post(`/app/invoices/${invoice.id}/insurance-claims/${claimId}/mark-paid`, {}, {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Invoice ${invoice.reference}`} />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {invoice.client && (
                    <Link href={`/app/clients/${invoice.client.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to {invoice.client.name}
                    </Link>
                )}

                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    <div className="p-6 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.01em] text-slate-900 dark:text-white">{invoice.reference}</h1>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                                        {invoice.client && <span>{invoice.client.name}</span>}
                                        {invoice.issued_at_formatted && <span>· Issued: {invoice.issued_at_formatted}</span>}
                                        {invoice.due_date_formatted && <span>· Due: {invoice.due_date_formatted}</span>}
                                    </div>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${STATUS_STYLES[invoice.status]}`}>{invoice.status}</span>
                        </div>
                        {invoice.status === 'void' && invoice.void_reason && (
                            <p className="mt-3 text-xs text-slate-500 font-medium">Voided: {invoice.void_reason}</p>
                        )}

                        {(!invoice.receipt_details?.has_registration_number || invoice.receipt_details?.registration_number === 'Not provided') && (
                            <div className="mt-4 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-amber-800 dark:text-amber-300">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>Practitioner registration number is missing. Insurers may reject this receipt.</span>
                                </div>
                                <Link
                                    href="/app/staff"
                                    className="text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline whitespace-nowrap"
                                >
                                    Edit practitioner profile
                                </Link>
                            </div>
                        )}

                        {invoice.active_policy && (
                            <div className="mt-4 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {invoice.active_policy.provider_name}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                                {invoice.active_policy.priority}
                                            </span>
                                            {invoice.active_policy.is_verified && (
                                                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                                                    <CheckCircle2 className="w-3 h-3" /> Verified
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Member ID: <span className="font-mono font-medium">{invoice.active_policy.masked_member_id}</span> · Policy #: <span className="font-mono font-medium">{invoice.active_policy.masked_policy_number}</span> · Plan Holder: {invoice.active_policy.plan_holder_name} ({invoice.active_policy.relationship})
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Line items */}
                    <div className="p-6">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                                    <th className="py-2 pr-4">Description</th>
                                    <th className="py-2 pr-4 text-center">Qty</th>
                                    <th className="py-2 pr-4 text-right">Unit</th>
                                    <th className="py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.line_items.map((li) => (
                                    <tr key={li.id} className="border-b last:border-0" style={{ borderColor: 'var(--umahz-border)' }}>
                                        <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span>{li.description}</span>
                                                {li.is_product && (
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                                                        Product
                                                    </span>
                                                )}
                                            </div>
                                            {li.tax_amount > 0 && (
                                                <p className="text-[10px] text-slate-400">
                                                    Tax: {fmt(li.tax_amount, currency)} {li.product_tax_rate ? `(${li.product_tax_rate}%)` : ''}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-4 text-center text-slate-500">{li.quantity}</td>
                                        <td className="py-2.5 pr-4 text-right text-slate-500">{fmt(li.unit_amount, currency)}</td>
                                        <td className="py-2.5 text-right text-slate-700 dark:text-slate-200">{fmt(li.total_amount, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {invoice.line_items?.some((li) => li.is_product || li.product_id) && Number(invoice.amount_paid) > 0 && Number(invoice.amount_due) > 0 && invoice.status !== 'paid' && invoice.status !== 'void' && (
                            <div className="mt-4 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Stock will be updated when the invoice is fully paid.</span>
                            </div>
                        )}

                        <div className="mt-4 ml-auto max-w-xs text-sm space-y-1">
                            <Row label="Subtotal" value={fmt(invoice.subtotal_amount, currency)} />
                            {invoice.tax_amount > 0 && <Row label="Tax" value={fmt(invoice.tax_amount, currency)} />}
                            {invoice.discount_amount > 0 && <Row label="Discount" value={`-${fmt(invoice.discount_amount, currency)}`} />}
                            <Row label="Total" value={fmt(invoice.total_amount, currency)} bold />
                            <Row label="Paid" value={fmt(invoice.amount_paid, currency)} />
                            <Row label="Balance due" value={fmt(invoice.amount_due, currency)} bold />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--umahz-border)' }}>
                        {invoice.is_payable && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setPayMode('card')}
                                    disabled={!canAcceptCards}
                                    title={canAcceptCards ? '' : 'Connect a Stripe account in Settings → Connect payments'}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40"
                                >
                                    <CreditCard className="w-4 h-4" /> Pay by card
                                </button>
                                <button type="button" onClick={() => setPayMode('manual')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}>
                                    <Banknote className="w-4 h-4" /> Record manual payment
                                </button>
                                {invoice.client_policies && invoice.client_policies.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPayMode('insurance')}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-sm"
                                    >
                                        <ShieldCheck className="w-4 h-4" /> Record insurance portion
                                    </button>
                                )}
                            </>
                        )}
                        <a href={`/app/invoices/${invoice.id}/receipt`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}>
                            <Printer className="w-4 h-4" /> Receipt
                        </a>
                        {invoice.status !== 'paid' && invoice.status !== 'void' && (
                            <VoidButton invoiceId={invoice.id} />
                        )}
                    </div>
                </div>

                {/* Payment history */}
                <div className="rounded-2xl border shadow-sm p-6" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Payment history</h2>
                    {invoice.payments.length === 0 ? (
                        <p className="text-xs text-slate-400">No payments recorded yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {invoice.payments.map((p) => (
                                <li key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2" style={{ borderColor: 'var(--umahz-border)' }}>
                                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        {p.status === 'succeeded' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-500" />}
                                        <span className="capitalize">{p.method}</span>
                                        <span className="text-xs text-slate-400 capitalize">· {p.status}</span>
                                        {p.processed_at_formatted && (
                                            <span className="text-xs text-slate-400">· {p.processed_at_formatted}</span>
                                        )}
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-200">{fmt(p.amount, currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Insurance claims history */}
                {invoice.insurance_claims && invoice.insurance_claims.length > 0 && (
                    <div className="rounded-2xl border shadow-sm p-6" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-violet-600" /> Insurance Claims & Benefits
                        </h2>
                        <ul className="space-y-3">
                            {invoice.insurance_claims.map((c) => (
                                <li key={c.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{c.insurer_name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${c.status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                }`}>
                                                {c.status === 'approved' ? 'Approved (Awaiting Payment)' : c.status}
                                            </span>
                                            <span className="text-slate-400 font-mono text-[11px]">{c.masked_member_id}</span>
                                        </div>
                                        {c.external_reference && (
                                            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Ref: {c.external_reference}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        <div className="text-right">
                                            <p className="font-semibold text-emerald-600">Covered: {fmt(c.amount_approved, currency)}</p>
                                            <p className="text-[11px] text-slate-400">Patient balance: {fmt(c.patient_balance, currency)}</p>
                                        </div>
                                        {c.status === 'approved' && invoice.status !== 'void' && (
                                            <button
                                                type="button"
                                                onClick={() => handleMarkClaimPaid(c.id)}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm whitespace-nowrap"
                                            >
                                                Mark Payment Received
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {payMode === 'manual' && <ManualPaymentModal invoice={invoice} onClose={() => setPayMode(null)} />}
            {payMode === 'insurance' && <InsuranceClaimModal invoice={invoice} onClose={() => setPayMode(null)} />}
            {payMode === 'card' && (
                <CardPaymentModal invoice={invoice} publishableKey={stripePublishableKey} onClose={() => setPayMode(null)} />
            )}
        </AuthenticatedLayout>
    );
}

function Row({ label, value, bold }) {
    return (
        <div className={`flex justify-between ${bold ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            <span>{label}</span><span>{value}</span>
        </div>
    );
}

function VoidButton({ invoiceId }) {
    const doVoid = () => {
        const reason = window.prompt('Reason for voiding this invoice?');
        if (!reason) return;
        router.post(`/app/invoices/${invoiceId}/void`, { reason }, { preserveScroll: true });
    };
    return (
        <button type="button" onClick={doVoid} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 text-xs font-bold ml-auto">
            <Ban className="w-4 h-4" /> Void
        </button>
    );
}

function ManualPaymentModal({ invoice, onClose }) {
    const [method, setMethod] = useState('cash');
    const [amount, setAmount] = useState((invoice.amount_due / 100).toFixed(2));
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const submit = () => {
        setError(null);
        const cents = Math.round(parseFloat(amount) * 100);
        if (!Number.isFinite(cents) || cents <= 0) { setError('Enter a valid amount.'); return; }
        setProcessing(true);
        router.post(`/app/invoices/${invoice.id}/pay/manual`, { method, amount: cents, notes: notes || null }, {
            preserveScroll: true,
            onError: (errs) => { setProcessing(false); setError(Object.values(errs)[0] || 'Could not record payment.'); },
            onSuccess: () => onClose(),
        });
    };

    return (
        <Modal title="Record manual payment" onClose={onClose}>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs px-3 py-2 mb-3">{error}</div>}
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}>
                <option value="cash">Cash</option>
                <option value="etransfer">E-transfer</option>
                <option value="other">Other</option>
            </select>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount ($)</label>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }} />
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }} />
            <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}>Cancel</button>
                <button type="button" onClick={submit} disabled={processing} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">{processing ? 'Recording…' : 'Record payment'}</button>
            </div>
        </Modal>
    );
}

function InsuranceClaimModal({ invoice, onClose }) {
    const policies = invoice.client_policies || [];
    const [policyId, setPolicyId] = useState(invoice.active_policy?.id || policies[0]?.id || '');
    const [amount, setAmount] = useState((invoice.amount_due / 100).toFixed(2));
    const [refNum, setRefNum] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('approved');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const currency = invoice.currency;
    const amountDue = invoice.amount_due;
    const approvedCents = Math.round(parseFloat(amount || 0) * 100);
    const calculatedPatientBalance = Math.max(0, amountDue - (Number.isFinite(approvedCents) ? approvedCents : 0));

    const submit = () => {
        setError(null);
        if (!policyId) {
            setError('Please select an insurance policy.');
            return;
        }
        if (!Number.isFinite(approvedCents) || approvedCents <= 0) {
            setError('Enter a valid insurance coverage amount.');
            return;
        }
        if (approvedCents > amountDue) {
            setError(`Amount covered cannot exceed the remaining balance due.`);
            return;
        }

        setProcessing(true);
        router.post(`/app/invoices/${invoice.id}/insurance-claim`, {
            client_insurance_policy_id: policyId,
            amount_approved: approvedCents,
            external_reference: refNum || null,
            notes: notes || null,
            status,
        }, {
            preserveScroll: true,
            onError: (errs) => {
                setProcessing(false);
                setError(Object.values(errs)[0] || 'Could not record insurance portion.');
            },
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
        });
    };

    return (
        <Modal title="Record Insurance Portion" onClose={onClose}>
            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs px-3 py-2 mb-3">
                    {error}
                </div>
            )}

            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Patient Insurance Policy
            </label>
            <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className="w-full mt-1 mb-3 px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
            >
                {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.provider_name} ({p.priority}) · {p.masked_member_id}
                    </option>
                ))}
            </select>

            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Amount Covered by Insurance ($)
            </label>
            <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 mb-2 px-3 py-2 rounded-lg text-sm border outline-none font-mono"
                style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
            />

            <div className="p-3 my-3 rounded-xl border border-violet-100 dark:border-violet-950/50 bg-violet-50/40 dark:bg-violet-950/20 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                    <span>Balance Due:</span>
                    <span>{fmt(amountDue, currency)}</span>
                </div>
                <div className="flex justify-between text-violet-700 dark:text-violet-400 font-semibold">
                    <span>Insurance Covered:</span>
                    <span>-{fmt(approvedCents || 0, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-violet-200/60 dark:border-violet-900/40">
                    <span>Remaining Patient Balance:</span>
                    <span>{fmt(calculatedPatientBalance, currency)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Claim Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none"
                        style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                    >
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        EOB / Claim Ref #
                    </label>
                    <input
                        value={refNum}
                        onChange={(e) => setRefNum(e.target.value)}
                        placeholder="e.g. TELUS-87654"
                        className="w-full mt-1 px-3 py-2 rounded-lg text-xs border outline-none"
                        style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                    />
                </div>
            </div>

            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Notes (Optional)
            </label>
            <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Extended health manual claim"
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
            />

            <div className="flex justify-end gap-2 mt-5">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold border"
                    style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={processing}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50 shadow-sm"
                >
                    {processing ? 'Recording…' : 'Record Claim Portion'}
                </button>
            </div>
        </Modal>
    );
}

function CardPaymentModal({ invoice, publishableKey, onClose }) {
    const [status, setStatus] = useState('init'); // init | ready | processing | done | error
    const [error, setError] = useState(null);
    const stripeRef = useRef(null);
    const elementsRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/app/invoices/${invoice.id}/pay/card`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                if (!res.ok) throw new Error('Could not start the card payment.');
                const data = await res.json();
                const StripeCtor = await loadStripeJs();
                if (cancelled) return;
                // Initialise Stripe.js ON the connected account (direct charge).
                const stripe = StripeCtor(data.publishable_key || publishableKey, { stripeAccount: data.connected_account_id });
                const elements = stripe.elements({ clientSecret: data.client_secret });
                stripeRef.current = stripe;
                elementsRef.current = elements;
                const paymentEl = elements.create('payment');
                paymentEl.mount('#umahz-payment-element');
                setStatus('ready');
            } catch (e) {
                setError(e.message);
                setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [invoice.id]);

    const pay = async () => {
        setStatus('processing');
        setError(null);
        const { error: err, paymentIntent } = await stripeRef.current.confirmPayment({
            elements: elementsRef.current,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
        });
        if (err) {
            setError(err.message);
            setStatus('ready');
            return;
        }
        if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
            setStatus('done');
            // The webhook is the source of truth; reload to reflect the paid status.
            setTimeout(() => router.reload(), 1200);
        }
    };

    return (
        <Modal title="Pay by card" onClose={onClose}>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs px-3 py-2 mb-3">{error}</div>}
            {status === 'done' ? (
                <div className="py-8 text-center text-emerald-600">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Payment received. Updating…</p>
                </div>
            ) : (
                <>
                    <p className="text-xs text-slate-500 mb-3">Charging {fmt(invoice.amount_due, invoice.currency)} to the clinic's connected account.</p>
                    <div id="umahz-payment-element" className="min-h-[40px]" />
                    {status === 'init' && <p className="text-xs text-slate-400 mt-2">Loading secure card form…</p>}
                    <div className="flex justify-end gap-2 mt-5">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' }}>Cancel</button>
                        <button type="button" onClick={pay} disabled={status !== 'ready'} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
                            {status === 'processing' ? 'Processing…' : 'Pay now'}
                        </button>
                    </div>
                </>
            )}
        </Modal>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border shadow-2xl p-6" style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
}
