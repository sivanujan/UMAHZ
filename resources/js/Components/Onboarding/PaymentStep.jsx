import React, { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { CreditCard, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

const BLUE = '#2563EB';
const TEAL = '#06B6D4';

/**
 * Final wizard step: capture a card via Stripe (SetupIntent) BEFORE the
 * application is submitted. No charge happens here — the card is validated and
 * saved; the monthly subscription only begins when an admin approves.
 *
 * Flow: POST the whole wizard payload to /clinics/register/prepare (creates a
 * pending registration + Stripe customer + SetupIntent), confirm the card with
 * Stripe.js, then POST /clinics/register to finalize and submit for review.
 */
function buildFormData(data) {
    const fd = new FormData();
    Object.entries(data).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') return;
        if (val instanceof File) { fd.append(key, val); return; }
        if (Array.isArray(val)) {
            val.forEach((item, i) => {
                if (item && typeof item === 'object') {
                    Object.entries(item).forEach(([k, v]) => fd.append(`${key}[${i}][${k}]`, v ?? ''));
                } else {
                    fd.append(`${key}[]`, item);
                }
            });
        } else if (typeof val === 'object') {
            Object.entries(val).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(`${key}[${k}]`, v); });
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

import { TIERS, calculateMonthlyTotal } from '@/Components/Onboarding/PlanStep';

export default function PaymentStep({ data }) {
    // 'preparing' | 'ready' | 'confirming' | 'submitting' | 'error'
    const [stage, setStage] = useState('preparing');
    const [error, setError] = useState(null);
    const cardRef = useRef(null);
    const stripeRef = useRef(null);
    const cardElementRef = useRef(null);
    const clientSecretRef = useRef(null);
    const pendingIdRef = useRef(null);

    const planTier = data.plan_tier || 'practice';
    const tierInfo = TIERS[planTier] || TIERS.practice;
    const pricing = calculateMonthlyTotal(planTier, data.full_time_practitioners_count, data.part_time_practitioners_count);

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
                const elements = stripeRef.current.elements();
                const card = elements.create('card', {
                    style: { base: { fontSize: '15px', color: '#0D1B2A', '::placeholder': { color: '#94A3B8' } } },
                });
                cardElementRef.current = card;
                setStage('ready');
                // Mount after the container renders.
                setTimeout(() => { if (!cancelled && cardRef.current) card.mount(cardRef.current); }, 0);
            } catch (e) {
                if (cancelled) return;
                const msg = e?.response?.data?.message
                    || (e?.response?.status === 422 ? 'Please review your earlier details and try again.' : 'Could not start the payment step. Please try again.');
                setError(msg);
                setStage('error');
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const handleConfirm = async () => {
        if (!stripeRef.current || !cardElementRef.current) return;
        setStage('confirming');
        setError(null);

        const { setupIntent, error: stripeError } = await stripeRef.current.confirmCardSetup(
            clientSecretRef.current,
            { payment_method: { card: cardElementRef.current } },
        );

        if (stripeError) {
            setError(stripeError.message || 'Your card could not be verified.');
            setStage('ready');
            return;
        }

        if (setupIntent && setupIntent.status === 'succeeded') {
            setStage('submitting');
            // Finalize: creates the tenant + submits for review. Redirects to
            // the clinic status page on success.
            router.post('/clinics/register', { pending_id: pendingIdRef.current }, {
                onError: () => { setError('We saved your card but could not submit the application. Please contact support.'); setStage('error'); },
            });
        }
    };

    return (
        <div className="space-y-5" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {/* Selected Plan Summary Banner */}
            <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-4.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-3">
                    <div>
                        <span className="text-[14px] font-bold text-[#0D1B2A] block">{tierInfo.name} Plan</span>
                        <span className="text-[12px] text-slate-500 font-medium">
                            {pricing.totalPractitioners} Practitioner{pricing.totalPractitioners > 1 ? 's' : ''} ({data.full_time_practitioners_count || 1} FT{data.part_time_practitioners_count > 0 ? `, ${data.part_time_practitioners_count} PT` : ''})
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-[16px] font-extrabold text-[#2563EB] block">${pricing.total.toFixed(2)} CAD</span>
                        <span className="text-[11px] text-slate-400 font-medium">monthly on approval</span>
                    </div>
                </div>
                <div className="text-[12px] text-slate-500 font-medium flex justify-between">
                    <span>Base plan (${tierInfo.basePrice}/mo)</span>
                    {pricing.extraFtCost > 0 && <span>+${pricing.extraFtCost.toFixed(2)} extra FT</span>}
                    {pricing.extraPtCost > 0 && <span>+${pricing.extraPtCost.toFixed(2)} PT</span>}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-4.5 flex items-start gap-3 bg-white shadow-xs">
                <ShieldCheck className="w-5 h-5 mt-0.5 text-[#06B6D4] flex-shrink-0" />
                <div className="text-[13px] leading-relaxed text-slate-600">
                    <span className="font-bold text-[#0D1B2A]">You won't be charged today.</span> We securely save your card to
                    verify your clinic. Your monthly subscription starts only after our team approves your application — if it's
                    declined, you're never charged.
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
                    Card details
                </label>

                {stage === 'preparing' && (
                    <div className="flex items-center gap-2 rounded-xl border px-4 py-4 text-sm text-slate-500" style={{ borderColor: '#E6EBF1' }}>
                        <Loader2 className="w-4 h-4 animate-spin" /> Preparing secure payment…
                    </div>
                )}

                <div hidden={stage === 'preparing' || stage === 'error'}>
                    <div
                        ref={cardRef}
                        className="rounded-xl border px-4 py-3.5 bg-white"
                        style={{ borderColor: '#E6EBF1' }}
                    />
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Lock className="w-3 h-3" /> Encrypted and processed by Stripe. We never see your full card number.
                    </p>
                </div>

                {error && (
                    <p className="mt-2 text-[12px] flex items-center gap-1" style={{ color: '#DC2626' }}>
                        <AlertCircle className="w-3.5 h-3.5" /> {error}
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={handleConfirm}
                disabled={stage !== 'ready'}
                className="w-full py-3.5 px-4 text-white font-semibold text-sm rounded-full transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${TEAL} 100%)`, boxShadow: '0 10px 30px -8px rgba(37,99,235,0.45)' }}
            >
                {stage === 'confirming' || stage === 'submitting'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {stage === 'submitting' ? 'Submitting application…' : 'Verifying card…'}</>
                    : <><CreditCard className="w-4 h-4" /> Save card & submit application</>}
            </button>
        </div>
    );
}
