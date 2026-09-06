import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ArrowLeft, Receipt, CreditCard, Banknote, Printer, Ban, CheckCircle2, Clock } from 'lucide-react';

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
    const [payMode, setPayMode] = useState(null); // 'card' | 'manual' | null
    const currency = invoice.currency;

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
                                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">{invoice.reference}</h1>
                                    {invoice.client && <p className="text-xs text-slate-500">{invoice.client.name}</p>}
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${STATUS_STYLES[invoice.status]}`}>{invoice.status}</span>
                        </div>
                        {invoice.status === 'void' && invoice.void_reason && (
                            <p className="mt-3 text-xs text-slate-500">Voided: {invoice.void_reason}</p>
                        )}
                    </div>

                    {/* Line items */}
                    <div className="p-6">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b" style={{ borderColor: 'var(--umahz-border)' }}>
                                    <th className="py-2 pr-4">Description</th>
                                    <th className="py-2 pr-4 text-center">Qty</th>
                                    <th className="py-2 pr-4 text-right">Unit</th>
                                    <th className="py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.line_items.map((li) => (
                                    <tr key={li.id} className="border-b last:border-0" style={{ borderColor: 'var(--umahz-border)' }}>
                                        <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{li.description}</td>
                                        <td className="py-2.5 pr-4 text-center text-slate-500">{li.quantity}</td>
                                        <td className="py-2.5 pr-4 text-right text-slate-500">{fmt(li.unit_amount, currency)}</td>
                                        <td className="py-2.5 text-right text-slate-700 dark:text-slate-200">{fmt(li.total_amount, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

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
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-200">{fmt(p.amount, currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {payMode === 'manual' && <ManualPaymentModal invoice={invoice} onClose={() => setPayMode(null)} />}
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
