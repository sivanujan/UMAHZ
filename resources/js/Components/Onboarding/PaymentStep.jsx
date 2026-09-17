import React, { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CreditCard,
    Lock,
    Loader2,
    AlertCircle,
    ShieldCheck,
    CheckCircle2,
    Sparkles,
    User,
    MapPin,
    ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIERS, normalizeTiers, calculateMonthlyTotal } from '@/Components/Onboarding/PlanStep';

/**
 * Visa, Mastercard, Amex SVG badge icons
 */
const CardBadges = () => (
    <div className="flex items-center gap-1.5" aria-label="Accepted card brands">
        {/* Visa */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-extrabold tracking-tighter text-[#1A1F71] dark:text-blue-300 select-none shadow-2xs">
            VISA
        </span>
        {/* Mastercard */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-extrabold tracking-tighter text-[#EB001B] dark:text-rose-400 select-none shadow-2xs">
            MC
        </span>
        {/* Amex */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-extrabold tracking-tighter text-[#006FCF] dark:text-cyan-400 select-none shadow-2xs">
            AMEX
        </span>
    </div>
);

function buildFormData(data) {
    const fd = new FormData();
    Object.entries(data).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') return;
        if (val instanceof File) {
            fd.append(key, val);
            return;
        }
        if (Array.isArray(val)) {
            val.forEach((item, i) => {
                if (item && typeof item === 'object') {
                    Object.entries(item).forEach(([k, v]) => fd.append(`${key}[${i}][${k}]`, v ?? ''));
                } else {
                    fd.append(`${key}[]`, item);
                }
            });
        } else if (typeof val === 'object') {
            Object.entries(val).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(`${key}[${k}]`, v);
            });
        } else {
            fd.append(key, val);
        }
    });
    return fd;
}

function loadStripeJs() {
    return new Promise((resolve, reject) => {
        if (window.Stripe) return resolve(window.Stripe);
        const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Stripe));
            existing.addEventListener('error', reject);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => resolve(window.Stripe);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export default function PaymentStep({ data, tiers }) {
    // 'preparing' | 'ready' | 'confirming' | 'submitting' | 'success' | 'error'
    const [stage, setStage] = useState('preparing');
    const [error, setError] = useState(null);
    const [cardholderName, setCardholderName] = useState(data.name || '');
    const [postalCode, setPostalCode] = useState('');

    const cardRef = useRef(null);
    const stripeRef = useRef(null);
    const cardElementRef = useRef(null);
    const clientSecretRef = useRef(null);
    const pendingIdRef = useRef(null);

    const activeTiers = normalizeTiers(tiers);
    const planTier = data.plan_tier || 'practice';
    const tierInfo = activeTiers[planTier] || activeTiers.practice;
    const pricing = calculateMonthlyTotal(
        planTier,
        data.full_time_practitioners_count,
        data.part_time_practitioners_count,
        activeTiers
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setStage('preparing');
                setError(null);

                const { data: res } = await window.axios.post('/clinics/register/prepare', buildFormData(data), {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (cancelled) return;

                pendingIdRef.current = res.pending_id;
                clientSecretRef.current = res.client_secret;

                const Stripe = await loadStripeJs();
                if (cancelled) return;

                stripeRef.current = Stripe(res.publishable_key);
                const isDark = document.documentElement.classList.contains('dark');
                const elements = stripeRef.current.elements();
                const card = elements.create('card', {
                    style: {
                        base: {
                            fontSize: '14px',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                            iconColor: '#6366F1',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            '::placeholder': {
                                color: isDark ? '#64748B' : '#94A3B8',
                            },
                        },
                        invalid: {
                            color: '#EF4444',
                            iconColor: '#EF4444',
                        },
                    },
                });

                card.on('change', (event) => {
                    if (event.error) {
                        setError(event.error.message);
                    } else {
                        setError(null);
                    }
                });

                cardElementRef.current = card;
                setStage('ready');

                // Mount after container is ready
                setTimeout(() => {
                    if (!cancelled && cardRef.current) {
                        card.mount(cardRef.current);
                    }
                }, 50);
            } catch (e) {
                if (cancelled) return;
                const msg =
                    e?.response?.data?.message ||
                    (e?.response?.status === 422
                        ? 'Please review your earlier details and try again.'
                        : 'Could not prepare the secure payment step. Please try again.');
                setError(msg);
                setStage('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleConfirm = async (e) => {
        e && e.preventDefault();
        if (!stripeRef.current || !cardElementRef.current || stage === 'confirming' || stage === 'submitting') return;

        setStage('confirming');
        setError(null);

        const { setupIntent, error: stripeError } = await stripeRef.current.confirmCardSetup(
            clientSecretRef.current,
            {
                payment_method: {
                    card: cardElementRef.current,
                    billing_details: {
                        name: cardholderName.trim() || data.name,
                        address: {
                            postal_code: postalCode.trim() || undefined,
                        },
                    },
                },
            }
        );

        if (stripeError) {
            setError(stripeError.message || 'Your card could not be verified. Please check the card details.');
            setStage('ready');
            return;
        }

        if (setupIntent && setupIntent.status === 'succeeded') {
            setStage('submitting');
            // Finalize registration: creates tenant and submits application for review
            router.post(
                '/clinics/register',
                { pending_id: pendingIdRef.current },
                {
                    onSuccess: () => {
                        setStage('success');
                    },
                    onError: () => {
                        setError('Card saved, but submitting the application failed. Please contact support.');
                        setStage('error');
                    },
                }
            );
        }
    };

    if (stage === 'success') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-4"
            >
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Application Submitted!
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        We're reviewing your clinic details and will email confirmation within 1–2 business days.
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Two-column layout inside form: LEFT = Card details, RIGHT = Order summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Card Details Form (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Payment Method</span>
                        </span>
                        <CardBadges />
                    </div>

                    {/* Cardholder Name */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            Cardholder Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative group">
                            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 pointer-events-none transition-colors" />
                            <input
                                type="text"
                                value={cardholderName}
                                onChange={(e) => setCardholderName(e.target.value)}
                                placeholder="Full Name as on Card"
                                required
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Stripe Card Element Container */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            Card Information <span className="text-rose-500">*</span>
                        </label>

                        {stage === 'preparing' ? (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                                <span>Establishing secure Stripe session…</span>
                            </div>
                        ) : (
                            <div
                                ref={cardRef}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-3 bg-white dark:bg-slate-800/80 shadow-2xs focus-within:border-indigo-600 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all"
                            />
                        )}
                    </div>

                    {/* Postal / ZIP Code */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            Billing Postal / ZIP Code
                        </label>
                        <div className="relative group">
                            <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 pointer-events-none transition-colors" />
                            <input
                                type="text"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                placeholder="A1A 1A1 or 90210"
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all uppercase"
                            />
                        </div>
                    </div>

                    {/* Security Subtext */}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>
                            Secure payment · card captured now, billed only after approval.
                        </span>
                    </div>

                    {/* Stripe Error Alert */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2"
                            >
                                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* RIGHT COLUMN: Order Summary Card (5 cols) */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Order Summary
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            Monthly
                        </span>
                    </div>

                    {/* Selected Plan Details */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {tierInfo.name} Tier
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                ${tierInfo.basePrice}.00
                            </span>
                        </div>

                        {/* Extra Practitioner Line Items */}
                        {pricing.extraFtCost > 0 && (
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Extra FT Seat</span>
                                <span className="font-mono">+${pricing.extraFtCost.toFixed(2)}</span>
                            </div>
                        )}
                        {pricing.extraPtCost > 0 && (
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Extra PT Seat</span>
                                <span className="font-mono">+${pricing.extraPtCost.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">Total</span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Billed monthly</p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                                    ${pricing.total.toFixed(2)}{' '}
                                    <span className="text-xs font-semibold">CAD</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reassuring Green Notice */}
                    <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-bold">You won't be charged today.</strong> Billing starts only after your clinic application is approved.
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Application Button */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={stage !== 'ready'}
                    className={`group w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                        stage === 'ready'
                            ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                            : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                    }`}
                >
                    {stage === 'confirming' || stage === 'submitting' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{stage === 'submitting' ? 'Submitting Application…' : 'Verifying Card…'}</span>
                        </>
                    ) : (
                        <>
                            <span>Submit Application</span>
                            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
