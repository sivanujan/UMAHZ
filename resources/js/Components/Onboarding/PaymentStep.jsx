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
import OrderSummary from '@/Components/Onboarding/OrderSummary';

/**
 * Visa, Mastercard, Amex SVG badge icons
 */
const CardBadges = () => (
    <div className="flex items-center gap-1.5" aria-label="Accepted card brands">
        {/* Visa */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold tracking-normal text-[#1A1F71] dark:text-blue-300 select-none shadow-2xs">
            VISA
        </span>
        {/* Mastercard */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold tracking-normal text-[#EB001B] dark:text-rose-400 select-none shadow-2xs">
            MC
        </span>
        {/* Amex */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold tracking-normal text-[#006FCF] dark:text-cyan-400 select-none shadow-2xs">
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
        if (typeof window !== 'undefined' && window.Stripe) {
            return resolve(window.Stripe);
        }
        const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
        if (existing) {
            // Safari / fast navigation: check if Stripe became ready
            const interval = setInterval(() => {
                if (window.Stripe) {
                    clearInterval(interval);
                    resolve(window.Stripe);
                }
            }, 50);
            existing.addEventListener('load', () => {
                clearInterval(interval);
                resolve(window.Stripe);
            });
            existing.addEventListener('error', (err) => {
                clearInterval(interval);
                reject(err);
            });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => resolve(window.Stripe);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export default function PaymentStep({ data, setData, tiers, plans = [] }) {
    // 'preparing' | 'ready' | 'confirming' | 'submitting' | 'success' | 'error'
    const [stage, setStage] = useState('preparing');
    const [error, setError] = useState(null);
    const [cardholderName, setCardholderName] = useState(data.name || '');
    const [postalCode, setPostalCode] = useState('');

    // Promo code state
    const [promoInput, setPromoInput] = useState(data.promo_code || '');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState(null);
    const [validatingPromo, setValidatingPromo] = useState(false);

    const cardRef = useRef(null);
    const stripeRef = useRef(null);
    const cardElementRef = useRef(null);
    const clientSecretRef = useRef(null);
    const pendingIdRef = useRef(null);

    // Dynamic vs Legacy plan resolution
    const selectedPlan = plans?.find((p) => p.id === data.plan_id || p.slug === data.plan_tier) || null;
    const isAnnual = data.billing_interval === 'year';

    const activeTiers = normalizeTiers(tiers);
    const planTier = data.plan_tier || 'practice';
    const tierInfo = activeTiers[planTier] || activeTiers.practice;

    // Pricing calculation
    let basePrice = 0;
    let extraSeats = 0;
    let extraSeatPrice = 0;
    let extraCost = 0;
    let planDisplayName = '';
    let trialDays = 0;

    if (selectedPlan) {
        planDisplayName = selectedPlan.name;
        trialDays = selectedPlan.trial_days || 0;
        const priceConfig = isAnnual ? selectedPlan.annual_price : selectedPlan.monthly_price;
        basePrice = priceConfig ? priceConfig.base_price : 0;
        extraSeatPrice = priceConfig ? priceConfig.extra_practitioner_price : 0;
        const totalFt = Math.max(1, parseInt(data.full_time_practitioners_count, 10) || 1);
        if (selectedPlan.allows_extra_practitioners) {
            extraSeats = Math.max(0, totalFt - (selectedPlan.included_practitioners || 1));
            if (selectedPlan.show_extra_seat_price !== false) {
                extraCost = extraSeats * extraSeatPrice;
            } else {
                extraCost = 0;
            }
        }
    } else {
        const pricing = calculateMonthlyTotal(
            planTier,
            data.full_time_practitioners_count,
            0,
            activeTiers
        );
        planDisplayName = `${tierInfo.name} Tier`;
        basePrice = pricing.basePrice;
        extraCost = pricing.extraFtCost;
    }

    const subtotal = basePrice + extraCost;
    const discountAmount = appliedPromo?.breakdown?.discount_amount || 0;
    const totalDue = appliedPromo?.breakdown?.total ?? Math.max(0, subtotal - discountAmount);

    const handleApplyPromo = async (e) => {
        if (e) {
            e.preventDefault?.();
            e.stopPropagation?.();
        }
        if (!promoInput.trim()) return;

        setValidatingPromo(true);
        setPromoError(null);

        try {
            const { data: res } = await window.axios.post('/clinics/register/validate-promo', {
                promo_code: promoInput.trim(),
                plan_id: data.plan_id || data.plan_tier || 'practice',
                billing_interval: data.billing_interval || 'month',
                practitioners_count: (data.full_time_practitioners_count || 1) + (data.part_time_practitioners_count || 0),
                pending_id: pendingIdRef.current || null,
            });

            if (res.valid) {
                setAppliedPromo(res);
                data.promo_code = res.promo.code;
                if (setData) {
                    setData('promo_code', res.promo.code);
                }
            }
        } catch (err) {
            setPromoError(err?.response?.data?.reason || 'Invalid or expired promo code.');
            setAppliedPromo(null);
        } finally {
            setValidatingPromo(false);
        }
    };

    const handleRemovePromo = async (e) => {
        if (e) {
            e.preventDefault?.();
            e.stopPropagation?.();
        }
        setAppliedPromo(null);
        setPromoInput('');
        setPromoError(null);
        data.promo_code = '';
        if (setData) {
            setData('promo_code', '');
        }
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setStage('preparing');
                setError(null);

                // SAFARI FIX: Do NOT set Content-Type header on FormData!
                // Passing FormData without custom headers lets Axios and WebKit/Safari
                // generate the correct multipart/form-data; boundary=... string.
                const { data: res } = await window.axios.post('/clinics/register/prepare', buildFormData(data));
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

                // SAFARI FIX: Use requestAnimationFrame + timeout to guarantee container is in the DOM
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (!cancelled && cardRef.current) {
                            card.mount(cardRef.current);
                        }
                    }, 80);
                });
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
                {
                    pending_id: pendingIdRef.current,
                    promo_code: data.promo_code || appliedPromo?.promo?.code || '',
                },
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
            {/* Two-column layout inside form: LEFT = Card details (~55%), RIGHT = Order summary (~45%) */}
            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
                {/* LEFT COLUMN: Card Details Form (~55% on desktop, top on mobile/tablet) */}
                <div className="lg:col-span-6 space-y-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-sm dark:shadow-xl">
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
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all font-sans"
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
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all uppercase font-sans"
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

                {/* RIGHT COLUMN: Order Summary Card (~45% on desktop, stacked below on tablet/mobile) */}
                <div className="lg:col-span-5">
                    <OrderSummary
                        planName={selectedPlan ? selectedPlan.name : (activeTiers[planTier]?.name || planTier)}
                        billingInterval={data.billing_interval || 'month'}
                        basePrice={basePrice}
                        extraSeats={extraSeats}
                        extraCost={extraCost}
                        showExtraSeatPrice={selectedPlan ? selectedPlan.show_extra_seat_price !== false : true}
                        trialDays={trialDays}
                        subtotal={subtotal}
                        totalDue={totalDue}
                        showPromoInput={true}
                        promoInput={promoInput}
                        onPromoInputChange={setPromoInput}
                        onApplyPromo={handleApplyPromo}
                        onRemovePromo={handleRemovePromo}
                        validatingPromo={validatingPromo}
                        promoError={promoError}
                        appliedPromo={appliedPromo}
                    />
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
