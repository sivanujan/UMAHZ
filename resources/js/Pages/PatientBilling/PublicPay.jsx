import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    ShieldCheck,
    Mail,
    KeyRound,
    Receipt,
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight,
    Lock,
    Building2,
    ChevronDown,
    ChevronUp,
    Printer,
    LogOut,
    RefreshCw,
    X,
} from 'lucide-react';

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

export default function PublicPay({
    clinic,
    verifiedEmail: initialEmail,
    sessionToken: initialToken,
    invoices: initialInvoices = [],
    publishableKey,
}) {
    const [step, setStep] = useState(initialEmail ? 'invoices' : 'email'); // 'email' | 'otp' | 'invoices'
    const [email, setEmail] = useState(initialEmail || '');
    const [code, setCode] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [sessionToken, setSessionToken] = useState(initialToken);
    const [invoices, setInvoices] = useState(initialInvoices);
    const [payingInvoice, setPayingInvoice] = useState(null);

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((c) => Math.max(0, c - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        setError(null);
        setNotice(null);
        setLoading(true);

        try {
            const res = await fetch('/pay/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ email: trimmed }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.reason || data.message || 'Could not send verification code.');
                if (data.cooldown) setCooldown(data.cooldown);
                setLoading(false);
                return;
            }

            setCooldown(data.cooldown || 60);
            setNotice(data.message || 'Verification code sent.');
            setStep('otp');
            setCode('');
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        const trimmedCode = code.trim();
        if (!trimmedCode) {
            setError('Please enter the 6-digit code sent to your email.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/pay/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ email: email.trim(), code: trimmedCode }),
            });

            const data = await res.json();

            if (!res.ok || !data.verified) {
                setError(data.reason || 'Verification failed.');
                setLoading(false);
                return;
            }

            setSessionToken(data.token);
            setInvoices(data.invoices || []);
            setStep('invoices');
        } catch (err) {
            setError('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        router.post('/pay/logout', {}, {
            onSuccess: () => {
                setSessionToken(null);
                setInvoices([]);
                setEmail('');
                setCode('');
                setStep('email');
            },
        });
    };

    const handlePaymentSuccess = (paidInvoiceId) => {
        setPayingInvoice(null);
        // Refresh invoice list
        setInvoices((prev) =>
            prev.map((inv) =>
                inv.id === paidInvoiceId
                    ? { ...inv, status: 'paid', is_payable: false, amount_paid: inv.total_amount, amount_due: 0 }
                    : inv
            )
        );
    };

    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
            <Head title={`Pay Invoices — ${clinic.name}`} />

            {/* Header / Brand Banner */}
            <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors border-slate-200/80 dark:border-slate-800">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {clinic.logo_url ? (
                            <img
                                src={clinic.logo_url}
                                alt={clinic.name}
                                className="w-9 h-9 rounded-xl object-contain border border-slate-200/80 dark:border-slate-800"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                <Building2 className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                                {clinic.name}
                            </h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Patient Payment Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full font-medium border border-emerald-200 dark:border-emerald-800/40">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Encrypted & Verified</span>
                        </div>
                        {step === 'invoices' && (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign out</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {step === 'email' && (
                    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                                <Mail className="w-6 h-6" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Access your invoices
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                Enter your email address to receive a secure one-time passcode. No account or password required.
                            </p>

                            {error && (
                                <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label htmlFor="patient-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="patient-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            autoFocus
                                            className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || cooldown > 0}
                                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Sending code…</span>
                                        </>
                                    ) : cooldown > 0 ? (
                                        <span>Resend available in {cooldown}s</span>
                                    ) : (
                                        <>
                                            <span>Send verification code</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Single-use code · 10 min expiry · Spam-free</span>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'otp' && (
                    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                                <KeyRound className="w-6 h-6" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Check your email
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                If you have an invoice at {clinic.name}, we've sent a 6-digit code to{' '}
                                <strong className="text-slate-900 dark:text-white">{email}</strong>.
                            </p>

                            {notice && (
                                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{notice}</span>
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div>
                                    <label htmlFor="otp-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                        6-Digit Passcode
                                    </label>
                                    <input
                                        id="otp-code"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        required
                                        autoFocus
                                        className="w-full text-center tracking-[0.4em] font-mono text-xl sm:text-2xl px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || code.length < 6}
                                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Verifying…</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>View My Invoices</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-5 flex items-center justify-between text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setError(null);
                                        setNotice(null);
                                    }}
                                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                                >
                                    Change email
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={cooldown > 0 || loading}
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline"
                                >
                                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'invoices' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Status bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                    Invoices for <strong className="text-slate-900 dark:text-white font-semibold">{email}</strong>
                                </p>
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Clinic: {clinic.name}
                            </span>
                        </div>

                        {invoices.length === 0 ? (
                            <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
                                    <Receipt className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                    No invoices found
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                                    There are currently no open or past invoices associated with this email address at {clinic.name}.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invoices.map((inv) => (
                                    <InvoiceCard
                                        key={inv.id}
                                        invoice={inv}
                                        clinic={clinic}
                                        onPayClick={() => setPayingInvoice(inv)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-6">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div>
                        <span>{clinic.name}</span>
                        {clinic.phone && <span className="ml-2">· {clinic.phone}</span>}
                        {clinic.email && <span className="ml-2">· {clinic.email}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>Powered securely by UMAHZ Health</span>
                    </div>
                </div>
            </footer>

            {/* Card Payment Modal */}
            {payingInvoice && (
                <PatientCardPaymentModal
                    invoice={payingInvoice}
                    clinic={clinic}
                    sessionToken={sessionToken}
                    publishableKey={publishableKey}
                    onClose={() => setPayingInvoice(null)}
                    onSuccess={() => handlePaymentSuccess(payingInvoice.id)}
                />
            )}
        </div>
    );
}

function InvoiceCard({ invoice, clinic, onPayClick }) {
    const [expanded, setExpanded] = useState(invoice.status === 'open');
    const isPaid = invoice.status === 'paid';
    const currency = invoice.currency;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            {/* Header */}
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start sm:items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                        }`}
                    >
                        {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {invoice.reference}
                            </h3>
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    isPaid
                                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                }`}
                            >
                                {isPaid ? 'Paid' : 'Due'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {invoice.issued_at
                                ? `Issued ${new Date(invoice.issued_at).toLocaleDateString()}`
                                : 'Invoice'}
                            {invoice.due_date && !isPaid && ` · Due ${invoice.due_date}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                        <span className="block text-[11px] text-slate-400 font-medium">
                            {isPaid ? 'Total Paid' : 'Amount Due'}
                        </span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                            {fmt(isPaid ? invoice.total_amount : invoice.amount_due, currency)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {invoice.is_payable && (
                            <button
                                type="button"
                                onClick={onPayClick}
                                disabled={!clinic.can_accept_cards}
                                title={clinic.can_accept_cards ? '' : 'Card payments unavailable.'}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-40"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Pay Now</span>
                            </button>
                        )}
                        {isPaid && (
                            <a
                                href={`/pay/invoices/${invoice.id}/receipt`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            aria-label={expanded ? 'Collapse line items' : 'Expand line items'}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Line items & details */}
            {expanded && (
                <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40">
                    <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                                <th className="py-2 pr-4 font-semibold">Description</th>
                                <th className="py-2 pr-4 text-center font-semibold">Qty</th>
                                <th className="py-2 pr-4 text-right font-semibold">Unit Price</th>
                                <th className="py-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.line_items.map((li) => (
                                <tr key={li.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                                    <td className="py-2.5 pr-4 text-slate-800 dark:text-slate-200 font-medium">
                                        {li.description}
                                    </td>
                                    <td className="py-2.5 pr-4 text-center text-slate-500 font-mono">
                                        {li.quantity}
                                    </td>
                                    <td className="py-2.5 pr-4 text-right text-slate-500 font-mono">
                                        {fmt(li.unit_amount, currency)}
                                    </td>
                                    <td className="py-2.5 text-right text-slate-800 dark:text-slate-200 font-semibold font-mono">
                                        {fmt(li.total_amount, currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 ml-auto max-w-xs space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span className="font-mono">{fmt(invoice.subtotal_amount, currency)}</span>
                        </div>
                        {invoice.tax_amount > 0 && (
                            <div className="flex justify-between text-slate-500">
                                <span>Tax</span>
                                <span className="font-mono">{fmt(invoice.tax_amount, currency)}</span>
                            </div>
                        )}
                        {invoice.discount_amount > 0 && (
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <span>Discount</span>
                                <span className="font-mono">-{fmt(invoice.discount_amount, currency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                            <span>Total</span>
                            <span className="font-mono">{fmt(invoice.total_amount, currency)}</span>
                        </div>
                        {invoice.amount_paid > 0 && !isPaid && (
                            <div className="flex justify-between text-slate-500">
                                <span>Paid to Date</span>
                                <span className="font-mono">{fmt(invoice.amount_paid, currency)}</span>
                            </div>
                        )}
                        {!isPaid && (
                            <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400 pt-1">
                                <span>Balance Due</span>
                                <span className="font-mono">{fmt(invoice.amount_due, currency)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function PatientCardPaymentModal({ invoice, clinic, sessionToken, publishableKey, onClose, onSuccess }) {
    const [status, setStatus] = useState('init'); // init | ready | processing | done | error
    const [error, setError] = useState(null);
    const stripeRef = useRef(null);
    const elementsRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/pay/invoices/${invoice.id}/card`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Patient-Pay-Token': sessionToken || '',
                    },
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Could not initialize card payment.');
                }

                const StripeCtor = await loadStripeJs();
                if (cancelled) return;

                const stripe = StripeCtor(data.publishable_key || publishableKey, {
                    stripeAccount: data.connected_account_id,
                });
                const elements = stripe.elements({ clientSecret: data.client_secret });

                stripeRef.current = stripe;
                elementsRef.current = elements;

                const paymentEl = elements.create('payment');
                paymentEl.mount('#patient-payment-element');
                setStatus('ready');
            } catch (e) {
                setError(e.message);
                setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [invoice.id, sessionToken, publishableKey]);

    const handlePay = async (e) => {
        e.preventDefault();
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
            setTimeout(() => {
                onSuccess();
            }, 1200);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            Pay {invoice.reference}
                        </h2>
                        <p className="text-xs text-slate-500">Direct payment to {clinic.name}</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {status === 'done' ? (
                    <div className="py-8 text-center text-emerald-600 animate-in zoom-in-95 duration-300">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment Succeeded</h3>
                        <p className="text-xs text-slate-500 mt-1">Thank you! Updating your invoice status…</p>
                    </div>
                ) : (
                    <form onSubmit={handlePay}>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 mb-4 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Total Amount Due</span>
                            <span className="font-extrabold text-base text-slate-900 dark:text-white font-mono">
                                {fmt(invoice.amount_due, invoice.currency)}
                            </span>
                        </div>

                        <div id="patient-payment-element" className="min-h-[140px] my-3" />

                        {status === 'init' && (
                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                                <span>Loading secure payment form…</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={status !== 'ready'}
                                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'processing' ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Processing…</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Pay {fmt(invoice.amount_due, invoice.currency)}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
