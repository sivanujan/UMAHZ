import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    User, Mail, Lock, Building2, Check, Eye, EyeOff, AlertCircle, Loader2,
    MapPin, Phone, IdCard, Upload, FileText, X, Hand, Flame, Dumbbell, Apple,
    Droplets, ShieldCheck, Clock, Stethoscope, Globe, Plus, Sparkles, Trash2,
    ArrowRight,
} from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import AuthVisualPanel from '@/Components/Auth/AuthVisualPanel';
import PhoneInput from '@/Components/UI/PhoneInput';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';
import AddressPicker from '@/Components/AddressPicker';
import PaymentStep from '@/Components/Onboarding/PaymentStep';
import PlanStep from '@/Components/Onboarding/PlanStep';
import StepIndicator, { SECTIONS } from '@/Components/Onboarding/StepIndicator';
import { validateField, validateStep, EMAIL_RE, NAME_RE, SUBDOMAIN_RE, LICENSE_RE, getDigits } from '@/Components/Onboarding/validation';
import { ThemeProvider } from '@/Contexts/ThemeContext';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const DISCIPLINE_ICONS = {
    massage_therapy: Hand,
    acupuncture_tcm: Flame,
    personal_training: Dumbbell,
    nutrition: Apple,
    colon_hydrotherapy: Droplets,
};

const STEP_FIELDS = {
    account: ['name', 'email', 'password', 'password_confirmation'],
    clinic: ['clinic_name', 'subdomain', 'address_line1', 'address_city', 'business_registration_number'],
    contact: ['primary_contact_name', 'primary_contact_email', 'primary_contact_phone'],
    practice: ['requested_disciplines'],
    license: ['license_number', 'licensing_body', 'license_document'],
    plan: ['plan_tier'],
    payment: [],
};

function RequiredDot({ required }) {
    if (!required) {
        return (
            <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500 ml-1">
                (optional)
            </span>
        );
    }
    return (
        <span className="text-rose-500 dark:text-rose-400 ml-0.5" aria-hidden="true">
            *
        </span>
    );
}

function StepHeading({ stepId, title, subtitle }) {
    const section = SECTIONS.find((s) => s.id === stepId);
    const Icon = section?.icon || Sparkles;
    return (
        <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                <Icon className="w-4 h-4" />
            </span>
            <div>
                <h2 className="text-base font-bold tracking-normal text-slate-900 dark:text-white [word-spacing:0.04em]">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 [word-spacing:0.02em]">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

function Field({
    id,
    icon: Icon,
    label,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    valid,
    placeholder,
    helper,
    required,
    autoComplete,
}) {
    const showError = !!error;
    const showValid = valid && !showError;

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
            >
                {label}
                <RequiredDot required={required} />
            </label>
            <div className="relative group">
                {Icon && (
                    <Icon
                        className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${
                            showError
                                ? 'text-rose-500'
                                : 'text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'
                        }`}
                    />
                )}
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required={required}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    aria-invalid={showError}
                    aria-describedby={showError ? `${id}-error` : helper ? `${id}-hint` : undefined}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-white dark:bg-slate-800/80 border ${
                        showError
                            ? 'border-rose-300 dark:border-rose-500/60 text-rose-900 dark:text-rose-100 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'
                    }`}
                />
                <AnimatePresence>
                    {showValid && (
                        <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
                        >
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                        </motion.span>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {showError && (
                        <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none"
                        >
                            <AlertCircle className="w-4 h-4" strokeWidth={2} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
            <AnimatePresence>
                {showError && (
                    <motion.p
                        id={`${id}-error`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.p>
                )}
            </AnimatePresence>
            {!showError && helper && (
                <p id={`${id}-hint`} className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    {helper}
                </p>
            )}
        </div>
    );
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    onBlur,
    error,
    valid,
    show,
    onToggleShow,
    helper,
    autoComplete,
}) {
    const showError = !!error;
    const showValid = valid && !showError;

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
            >
                {label}
                <RequiredDot required />
            </label>
            <div className="relative group">
                <Lock
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${
                        showError
                            ? 'text-rose-500'
                            : 'text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400'
                    }`}
                />
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    autoComplete={autoComplete}
                    placeholder="••••••••"
                    aria-invalid={showError}
                    aria-describedby={showError ? `${id}-error` : helper ? `${id}-hint` : undefined}
                    className={`w-full pl-10 pr-20 py-3 rounded-xl text-sm outline-none transition-all duration-200 bg-white dark:bg-slate-800/80 border ${
                        showError
                            ? 'border-rose-300 dark:border-rose-500/60 text-rose-900 dark:text-rose-100 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'
                    }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <AnimatePresence>
                        {showValid && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="text-emerald-500 pointer-events-none mr-1"
                            >
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                            </motion.span>
                        )}
                        {showError && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="text-rose-500 pointer-events-none mr-1"
                            >
                                <AlertCircle className="w-4 h-4" strokeWidth={2} />
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <button
                        type="button"
                        onClick={onToggleShow}
                        tabIndex={-1}
                        className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-md focus:outline-none"
                        aria-label={show ? 'Hide password' : 'Show password'}
                    >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {showError && (
                    <motion.p
                        id={`${id}-error`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.p>
                )}
            </AnimatePresence>
            {!showError && helper && (
                <p id={`${id}-hint`} className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    {helper}
                </p>
            )}
        </div>
    );
}

function SubdomainField({ id, value, onChange, onBlur, suffix, error, status, message }) {
    const showError = !!error || status === 'invalid' || status === 'taken';
    const showValid = status === 'available' && !error;

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
            >
                Clinic Web Address
                <RequiredDot required />
            </label>
            <div
                className={`flex items-stretch rounded-xl border overflow-hidden transition-all duration-200 bg-white dark:bg-slate-800/70 ${
                    showError
                        ? 'border-rose-300 dark:border-rose-500/50 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/15'
                        : showValid
                            ? 'border-emerald-300 dark:border-emerald-500/50 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15'
                            : 'border-slate-200 dark:border-slate-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15'
                }`}
            >
                <span className="flex items-center pl-3.5 pr-1 text-slate-400 dark:text-slate-500">
                    <Globe className="w-4 h-4" />
                </span>
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="lotus-wellness"
                    aria-invalid={showError}
                    aria-describedby={`${id}-hint`}
                    className="flex-1 min-w-0 py-3 pl-2 pr-2 text-sm font-medium text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
                <span className="flex items-center pr-3.5 pl-1 text-sm font-medium text-slate-400 dark:text-slate-500 select-none whitespace-nowrap">
                    {suffix}
                    {status === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin ml-2 text-slate-400" />}
                    {showValid && <Check className="w-4 h-4 ml-2 text-emerald-500" strokeWidth={2.5} />}
                    {showError && <AlertCircle className="w-4 h-4 ml-2 text-rose-500" strokeWidth={2} />}
                </span>
            </div>
            <p
                id={`${id}-hint`}
                className={`text-[12px] mt-1.5 ${
                    showError
                        ? 'text-rose-500 dark:text-rose-400 font-medium'
                        : showValid
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-slate-500 dark:text-slate-400'
                }`}
            >
                {error || message || 'Lowercase letters, numbers and hyphens — this is where your staff sign in.'}
            </p>
        </div>
    );
}

function EmailVerification({ email, emailValid, verified, onVerifiedChange }) {
    const [sent, setSent] = useState(false);
    const [code, setCode] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState(null);
    const [resendIn, setResendIn] = useState(0);

    useEffect(() => {
        setSent(false);
        setCode('');
        setStatus('idle');
        setMessage(null);
        setResendIn(0);
        onVerifiedChange(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email]);

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    const send = async () => {
        setStatus('sending');
        setMessage(null);
        try {
            const { data } = await window.axios.post('/clinics/register/send-code', { email });
            if (data.sent) {
                setSent(true);
                setStatus('sent');
                setResendIn(data.cooldown || 60);
                setMessage(`We sent a 6-digit code to ${email}.`);
            }
        } catch (e) {
            const r = e.response?.data;
            setStatus('error');
            if (r?.cooldown) {
                setSent(true);
                setResendIn(r.cooldown);
            }
            setMessage(r?.reason || 'Could not send the code — please try again.');
        }
    };

    const verify = async () => {
        if (code.length !== 6) return;
        setStatus('verifying');
        setMessage(null);
        try {
            const { data } = await window.axios.post('/clinics/register/verify-code', { email, code });
            if (data.verified) {
                setStatus('verified');
                setMessage(null);
                onVerifiedChange(true);
            } else {
                setStatus('error');
                setMessage(data.reason || 'That code is incorrect.');
            }
        } catch (e) {
            setStatus('error');
            setMessage('Could not verify the code — please try again.');
        }
    };

    if (verified) {
        return (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Email verified</span>
            </div>
        );
    }

    if (!emailValid) return null;

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 space-y-3">
            {!sent ? (
                <button
                    type="button"
                    onClick={send}
                    disabled={status === 'sending'}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 active:scale-[0.99] bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-sm cursor-pointer"
                >
                    {status === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    {status === 'sending' ? 'Sending code…' : 'Send email verification code'}
                </button>
            ) : (
                <>
                    <p className="text-[12px] text-slate-600 dark:text-slate-400">
                        Enter the 6-digit code sent to <strong className="text-slate-900 dark:text-white font-medium">{email}</strong>
                    </p>
                    <div className="flex items-stretch gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="w-32 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-center tracking-widest text-slate-900 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                        />
                        <button
                            type="button"
                            onClick={verify}
                            disabled={code.length !== 6 || status === 'verifying'}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {status === 'verifying' ? 'Verifying…' : 'Verify'}
                        </button>
                        <button
                            type="button"
                            onClick={send}
                            disabled={resendIn > 0 || status === 'sending'}
                            className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition-colors ml-auto"
                        >
                            {resendIn > 0 ? `Resend (${resendIn}s)` : 'Resend'}
                        </button>
                    </div>
                </>
            )}

            {message && (
                <p className={`text-[12px] ${status === 'error' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}

function DisciplineCards({
    disciplines = [],
    customDisciplines = [],
    selected = [],
    onToggle,
    onAddCustom,
    onRemoveCustom,
    error,
}) {
    const [newCustomName, setNewCustomName] = useState('');
    const [localError, setLocalError] = useState(null);

    const handleAdd = () => {
        const trimmed = newCustomName.trim();
        if (!trimmed) return;
        const res = onAddCustom(trimmed);
        if (res && res.error) {
            setLocalError(res.error);
        } else {
            setNewCustomName('');
            setLocalError(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {disciplines.map((d) => {
                    const active = selected.includes(d);
                    const Icon = DISCIPLINE_ICONS[d] || Stethoscope;
                    const label = DISCIPLINE_LABELS[d] || d;

                    return (
                        <button
                            key={d}
                            type="button"
                            role="checkbox"
                            aria-checked={active}
                            onClick={() => onToggle(d)}
                            className={`relative text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                active
                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-2 border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                        >
                            <span
                                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                                    active
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-semibold leading-snug flex-1">
                                {label}
                            </span>
                            {active && (
                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3" strokeWidth={3} />
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Custom Disciplines */}
                {customDisciplines.map((item) => {
                    const active = selected.includes(item.slug);
                    return (
                        <div
                            key={item.slug}
                            className={`relative text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2 ${
                                active
                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-2 border-indigo-600 dark:border-indigo-500'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                        >
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={active}
                                onClick={() => onToggle(item.slug)}
                                className="flex items-center gap-3 flex-1 text-left focus:outline-none min-w-0 cursor-pointer"
                            >
                                <span
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                                        active
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-semibold leading-tight block truncate text-slate-900 dark:text-white">
                                        {item.label}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        Custom
                                    </span>
                                </div>
                            </button>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {active && (
                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                        <Check className="w-3 h-3" strokeWidth={3} />
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemoveCustom(item.slug)}
                                    title={`Remove ${item.label}`}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Inline Custom Discipline Input */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Add Custom Discipline</span>
                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        e.g. Physiotherapy, Reiki, Chiropractic
                    </span>
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCustomName}
                        onChange={(e) => {
                            setNewCustomName(e.target.value);
                            setLocalError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                        placeholder="Enter discipline name..."
                        className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                    </button>
                </div>
                {localError && <p className="text-[12px] text-rose-500 dark:text-rose-400 font-medium">{localError}</p>}
            </div>

            {error && <p className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5">{error}</p>}
        </div>
    );
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentUpload({ file, onChange, serverError, helper, progress, processing }) {
    const [localError, setLocalError] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (file && file.type?.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
        return undefined;
    }, [file]);

    const error = localError || serverError;
    const showError = !!error;

    const handleFile = (selected) => {
        if (!selected) {
            onChange(null);
            setLocalError(null);
            return;
        }
        const ext = selected.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            setLocalError('Only PDF, JPG, or PNG files are accepted.');
            onChange(null);
            return;
        }
        if (selected.size > MAX_FILE_BYTES) {
            setLocalError(`That file is ${formatBytes(selected.size)} — the limit is 10MB.`);
            onChange(null);
            return;
        }
        setLocalError(null);
        onChange(selected);
    };

    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                License / Registration Document
                <RequiredDot required />
            </label>

            {processing && progress ? (
                <div className="px-4 py-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.04]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white mb-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                        Uploading {file?.name}… {progress.percentage}%
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600"
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                </div>
            ) : file ? (
                <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 ${
                        showError ? 'border-rose-300 dark:border-rose-500/50' : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                    ) : (
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-4 h-4" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatBytes(file.size)}
                        </p>
                    </div>
                    <span className="flex-shrink-0 text-emerald-500">
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                    <button
                        type="button"
                        onClick={() => handleFile(null)}
                        aria-label="Remove file"
                        className="text-slate-400 hover:text-rose-500 flex-shrink-0 p-1 rounded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed cursor-pointer bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors duration-200 ${
                        showError
                            ? 'border-rose-300 dark:border-rose-500/50'
                            : 'border-slate-300 dark:border-slate-700'
                    }`}
                >
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                        <Upload className="w-4 h-4" />
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span> — PDF, JPG, or PNG (max 10MB)
                    </span>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    />
                </label>
            )}
            {showError ? (
                <p className="text-[13px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                </p>
            ) : helper ? (
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                    {helper}
                </p>
            ) : null}
        </div>
    );
}

function ClinicRegisterForm({ disciplines = [], subdomainSuffix = '.umahz.com', provinces = [], tiers = {} }) {
    const shouldReduceMotion = useReducedMotion();
    const { data, setData, post, processing, progress, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',

        clinic_name: '',
        subdomain: '',
        business_registration_number: '',
        address_line1: '',
        address_city: '',
        address_region: '',
        address_country: '',
        address_lat: null,
        address_lng: null,

        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',

        requested_disciplines: [],
        custom_disciplines: [],

        plan_tier: 'practice',
        full_time_practitioners_count: 1,
        part_time_practitioners_count: 0,
        estimated_practitioner_count: 1,

        license_number: '',
        licensing_body: '',
        license_document: null,
    });

    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState('forward');
    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);

    // Subdomain availability state
    const [subdomainStatus, setSubdomainStatus] = useState('idle');
    const [subdomainMessage, setSubdomainMessage] = useState(null);
    const debounceTimerRef = useRef(null);
    const formTopRef = useRef(null);

    const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

    // Realtime subdomain availability checking
    const checkAvailability = async (slug) => {
        if (!slug || !SUBDOMAIN_RE.test(slug)) {
            setSubdomainStatus(slug ? 'invalid' : 'idle');
            setSubdomainMessage(slug ? 'Must be 3–40 characters, lowercase letters, numbers, and hyphens only.' : null);
            return;
        }

        setSubdomainStatus('checking');
        setSubdomainMessage('Checking availability…');

        try {
            const { data: res } = await window.axios.get('/clinics/register/subdomain', {
                params: { subdomain: slug },
            });
            if (res.available) {
                setSubdomainStatus('available');
                setSubdomainMessage(`${slug}${subdomainSuffix} is available!`);
            } else {
                setSubdomainStatus('taken');
                setSubdomainMessage(res.reason || 'This address is already taken.');
            }
        } catch (e) {
            setSubdomainStatus('error');
            setSubdomainMessage('Could not verify address right now.');
        }
    };

    const onSubdomainChange = (val) => {
        const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setData('subdomain', cleaned);
        markTouched('subdomain');

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (!cleaned) {
            setSubdomainStatus('idle');
            setSubdomainMessage(null);
            return;
        }

        debounceTimerRef.current = setTimeout(() => {
            checkAvailability(cleaned);
        }, 400);
    };

    const onPickAddress = (addr) => {
        setData((prev) => ({
            ...prev,
            address_line1: addr.line1 || prev.address_line1,
            address_city: addr.city || prev.address_city,
            address_region: addr.region || prev.address_region,
            address_country: addr.country || prev.address_country || 'Canada',
            address_lat: addr.lat,
            address_lng: addr.lng,
        }));
    };

    const toggleDiscipline = (disc) => {
        const currentList = data.requested_disciplines;
        if (currentList.includes(disc)) {
            setData('requested_disciplines', currentList.filter((d) => d !== disc));
        } else {
            setData('requested_disciplines', [...currentList, disc]);
        }
    };

    const handleAddCustom = (name) => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (!slug) return { error: 'Invalid name' };
        if (disciplines.includes(slug) || data.custom_disciplines.some((c) => c.slug === slug)) {
            return { error: 'Discipline already added' };
        }
        setData((prev) => ({
            ...prev,
            custom_disciplines: [...prev.custom_disciplines, { slug, label: name }],
            requested_disciplines: [...prev.requested_disciplines, slug],
        }));
        return { success: true };
    };

    const handleRemoveCustom = (slug) => {
        setData((prev) => ({
            ...prev,
            custom_disciplines: prev.custom_disciplines.filter((c) => c.slug !== slug),
            requested_disciplines: prev.requested_disciplines.filter((s) => s !== slug),
        }));
    };

    // Validation per step using centralized validation module
    const nameValid = !validateField('name', data.name);
    const nameError = touched.name ? validateField('name', data.name) : errors.name;

    const emailFormatValid = !validateField('email', data.email);
    const emailValid = emailFormatValid && emailVerified;
    const emailError = touched.email ? validateField('email', data.email) : errors.email;

    const passwordValid = !validateField('password', data.password);
    const passwordError = touched.password ? validateField('password', data.password) : errors.password;

    const confirmValid = !validateField('password_confirmation', data.password_confirmation, data);
    const confirmError = touched.password_confirmation
        ? validateField('password_confirmation', data.password_confirmation, data)
        : errors.password_confirmation;

    const clinicNameValid = !validateField('clinic_name', data.clinic_name);
    const clinicNameError = touched.clinic_name ? validateField('clinic_name', data.clinic_name) : errors.clinic_name;

    const subdomainValid =
        !validateField('subdomain', data.subdomain, data, { subdomainStatus }) &&
        subdomainStatus === 'available';
    const subdomainError = touched.subdomain
        ? validateField('subdomain', data.subdomain, data, { subdomainStatus })
        : errors.subdomain;

    const addressLine1Valid = !validateField('address_line1', data.address_line1);
    const addressLine1Error = touched.address_line1 ? validateField('address_line1', data.address_line1) : errors.address_line1;

    const addressCityValid = !validateField('address_city', data.address_city);
    const addressCityError = touched.address_city ? validateField('address_city', data.address_city) : errors.address_city;

    const contactNameValid = !validateField('primary_contact_name', data.primary_contact_name);
    const contactNameError = touched.primary_contact_name
        ? validateField('primary_contact_name', data.primary_contact_name)
        : errors.primary_contact_name;

    const contactEmailValid = !validateField('primary_contact_email', data.primary_contact_email);
    const contactEmailError = touched.primary_contact_email
        ? validateField('primary_contact_email', data.primary_contact_email)
        : errors.primary_contact_email;

    const contactPhoneValid = !validateField('primary_contact_phone', data.primary_contact_phone);
    const contactPhoneError = touched.primary_contact_phone
        ? validateField('primary_contact_phone', data.primary_contact_phone)
        : errors.primary_contact_phone;

    const disciplinesValid = data.requested_disciplines.length > 0;
    const disciplinesError =
        touched.requested_disciplines && !disciplinesValid
            ? 'Please select at least one healthcare discipline.'
            : errors.requested_disciplines;

    const licenseNumberValid = !validateField('license_number', data.license_number);
    const licenseNumberError = touched.license_number
        ? validateField('license_number', data.license_number)
        : errors.license_number;

    const licensingBodyValid = !validateField('licensing_body', data.licensing_body);
    const licensingBodyError = touched.licensing_body
        ? validateField('licensing_body', data.licensing_body)
        : errors.licensing_body;

    const licenseDocumentValid = !!data.license_document;
    const licenseDocumentError =
        touched.license_document && !licenseDocumentValid
            ? 'Please upload your license or registration document.'
            : errors.license_document;

    const planValid = !!data.plan_tier;

    const isStepValid = (step) => {
        switch (step) {
            case 0:
                return nameValid && emailValid && passwordValid && confirmValid;
            case 1:
                return clinicNameValid && subdomainValid && addressLine1Valid && addressCityValid;
            case 2:
                return contactNameValid && contactEmailValid && contactPhoneValid;
            case 3:
                return disciplinesValid;
            case 4:
                return licenseNumberValid && licensingBodyValid && licenseDocumentValid;
            case 5:
                return planValid;
            case 6:
                return true;
            default:
                return false;
        }
    };

    const stepComplete = isStepValid(currentStep);

    const goNext = () => {
        // Trim inputs where appropriate
        const trimmed = {
            name: typeof data.name === 'string' ? data.name.trim() : data.name,
            clinic_name: typeof data.clinic_name === 'string' ? data.clinic_name.trim() : data.clinic_name,
            address_line1: typeof data.address_line1 === 'string' ? data.address_line1.trim() : data.address_line1,
            address_city: typeof data.address_city === 'string' ? data.address_city.trim() : data.address_city,
            primary_contact_name: typeof data.primary_contact_name === 'string' ? data.primary_contact_name.trim() : data.primary_contact_name,
            primary_contact_phone: typeof data.primary_contact_phone === 'string' ? data.primary_contact_phone.trim() : data.primary_contact_phone,
            license_number: typeof data.license_number === 'string' ? data.license_number.trim() : data.license_number,
            licensing_body: typeof data.licensing_body === 'string' ? data.licensing_body.trim() : data.licensing_body,
        };
        setData((prev) => ({ ...prev, ...trimmed }));

        const fields = STEP_FIELDS[SECTIONS[currentStep].id] || [];
        fields.forEach(markTouched);

        const { isValid, errors: stepErrors } = validateStep(currentStep, { ...data, ...trimmed }, {
            subdomainStatus,
            emailVerified,
            requireEmailVerification: true,
        });

        if (!isValid) {
            // Find first invalid field and focus it
            const firstInvalid = fields.find((f) => !!stepErrors[f]);
            if (firstInvalid) {
                const el = document.getElementById(firstInvalid);
                if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }

        setDirection('forward');
        setCurrentStep((s) => Math.min(SECTIONS.length - 1, s + 1));
        if (formTopRef.current) {
            formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const goBack = () => {
        setDirection('back');
        setCurrentStep((s) => Math.max(0, s - 1));
        if (formTopRef.current) {
            formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const jumpTo = (step) => {
        if (step < currentStep) {
            setDirection('back');
            setCurrentStep(step);
            if (formTopRef.current) {
                formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const submit = (e) => {
        e.preventDefault();
        // Payment step handles final submit directly
    };

    const isPaymentStep = currentStep === 6;

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300 font-sans transition-colors duration-300 relative overflow-x-hidden">
            <Head title="Apply to Join UMAHZ — Practice Onboarding" />

            {/* Left Column: Form Surface */}
            <div
                className={`flex flex-col justify-between p-6 sm:p-10 min-h-screen relative z-10 transition-all duration-300 ${
                    currentStep === 5
                        ? 'lg:pl-8 lg:pr-10 xl:pl-12 xl:pr-14'
                        : 'lg:pl-12 lg:pr-14 xl:pl-16 xl:pr-20'
                }`}
            >
                {/* Top Navigation Bar */}
                <div ref={formTopRef} className="flex items-center justify-between gap-4 pb-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        <Logo size="md" tagline />
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                            Sign in instead →
                        </Link>
                        <ThemeToggle size="sm" />
                    </div>
                </div>

                {/* Form Center Container */}
                <div
                    className={`w-full mx-auto my-auto py-6 space-y-6 transition-all duration-300 ${
                        currentStep === 5 ? 'max-w-[780px] xl:max-w-[840px]' : 'max-w-[540px]'
                    }`}
                >
                    {/* Header with Title */}
                    <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-normal text-slate-900 dark:text-white flex items-center flex-wrap gap-x-2">
                            <span>Apply to Join</span>
                            <span className="text-indigo-600 dark:text-indigo-400">UMAHZ</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 [word-spacing:0.02em]">
                            Every clinic is reviewed by our team before going live
                        </p>
                    </div>

                    {/* Stepper Above the Form */}
                    <StepIndicator current={currentStep} onJump={jumpTo} />

                    {/* Step Card Form */}
                    <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/40">
                        <form onSubmit={submit} className="space-y-6">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={currentStep}
                                    initial={
                                        shouldReduceMotion
                                            ? { opacity: 1 }
                                            : { opacity: 0, x: direction === 'forward' ? 14 : -14 }
                                    }
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={
                                        shouldReduceMotion
                                            ? { opacity: 0 }
                                            : { opacity: 0, x: direction === 'forward' ? -14 : 14 }
                                    }
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                >
                                    {currentStep === 0 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="account"
                                                title="Your Account"
                                                subtitle="You'll sign in with this while your application is reviewed."
                                            />
                                            <Field
                                                id="name"
                                                icon={User}
                                                label="Your Full Name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                onBlur={() => markTouched('name')}
                                                error={nameError}
                                                valid={nameValid}
                                                required
                                                autoComplete="name"
                                                placeholder="Dr. Jane Doe"
                                            />
                                            <Field
                                                id="email"
                                                icon={Mail}
                                                label="Email address"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                onBlur={() => markTouched('email')}
                                                error={emailError}
                                                valid={emailValid}
                                                required
                                                autoComplete="email"
                                                placeholder="jane@clinic.com"
                                            />
                                            <EmailVerification
                                                email={data.email}
                                                emailValid={emailFormatValid}
                                                verified={emailVerified}
                                                onVerifiedChange={setEmailVerified}
                                            />
                                            <div>
                                                <PasswordField
                                                    id="password"
                                                    label="Password"
                                                    value={data.password}
                                                    onChange={(e) => setData('password', e.target.value)}
                                                    onBlur={() => markTouched('password')}
                                                    error={passwordError}
                                                    valid={passwordValid}
                                                    show={showPassword}
                                                    onToggleShow={() => setShowPassword((s) => !s)}
                                                    autoComplete="new-password"
                                                    helper="Minimum 8 characters."
                                                />
                                                <PasswordStrengthMeter password={data.password} />
                                            </div>
                                            <PasswordField
                                                id="password_confirmation"
                                                label="Confirm Password"
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                                onBlur={() => markTouched('password_confirmation')}
                                                error={confirmError}
                                                valid={confirmValid}
                                                show={showConfirm}
                                                onToggleShow={() => setShowConfirm((s) => !s)}
                                                autoComplete="new-password"
                                            />
                                        </section>
                                    )}

                                    {currentStep === 1 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="clinic"
                                                title="Clinic Details"
                                                subtitle="Basic information about your practice location and brand."
                                            />
                                            <Field
                                                id="clinic_name"
                                                icon={Building2}
                                                label="Clinic Name"
                                                value={data.clinic_name}
                                                onChange={(e) => setData('clinic_name', e.target.value)}
                                                onBlur={() => markTouched('clinic_name')}
                                                error={clinicNameError}
                                                valid={clinicNameValid}
                                                required
                                                placeholder="Lotus Wellness Studio"
                                            />
                                            <SubdomainField
                                                id="subdomain"
                                                value={data.subdomain}
                                                onChange={(e) => onSubdomainChange(e.target.value)}
                                                onBlur={() => markTouched('subdomain')}
                                                suffix={subdomainSuffix}
                                                error={errors.subdomain}
                                                status={subdomainStatus}
                                                message={subdomainMessage}
                                            />
                                            <Field
                                                id="business_registration_number"
                                                icon={IdCard}
                                                label="Business Registration Number"
                                                value={data.business_registration_number}
                                                onChange={(e) => setData('business_registration_number', e.target.value)}
                                                error={errors.business_registration_number}
                                                placeholder="e.g. BC1234567"
                                            />
                                            <AddressPicker
                                                provinces={provinces}
                                                lat={data.address_lat}
                                                lng={data.address_lng}
                                                onPick={onPickAddress}
                                            />
                                            <Field
                                                id="address_line1"
                                                icon={MapPin}
                                                label="Street Address"
                                                value={data.address_line1}
                                                onChange={(e) => setData('address_line1', e.target.value)}
                                                onBlur={() => markTouched('address_line1')}
                                                error={addressLine1Error}
                                                valid={addressLine1Valid}
                                                required
                                                placeholder="123 Wellness Way, Suite 200"
                                            />
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field
                                                    id="address_city"
                                                    label="City"
                                                    value={data.address_city}
                                                    onChange={(e) => setData('address_city', e.target.value)}
                                                    onBlur={() => markTouched('address_city')}
                                                    error={addressCityError}
                                                    valid={addressCityValid}
                                                    required
                                                    placeholder="Vancouver"
                                                />
                                                <Field
                                                    id="address_region"
                                                    label="Province / State"
                                                    value={data.address_region}
                                                    onChange={(e) => setData('address_region', e.target.value)}
                                                    error={errors.address_region}
                                                    placeholder="BC"
                                                />
                                                <Field
                                                    id="address_country"
                                                    label="Country"
                                                    value={data.address_country}
                                                    onChange={(e) => setData('address_country', e.target.value)}
                                                    error={errors.address_country}
                                                    placeholder="Canada"
                                                />
                                            </div>
                                        </section>
                                    )}

                                    {currentStep === 2 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="contact"
                                                title="Primary Contact"
                                                subtitle="Who our review team should reach if we have questions about your application."
                                            />
                                            <Field
                                                id="primary_contact_name"
                                                icon={User}
                                                label="Contact Name"
                                                value={data.primary_contact_name}
                                                onChange={(e) => setData('primary_contact_name', e.target.value)}
                                                onBlur={() => markTouched('primary_contact_name')}
                                                error={contactNameError}
                                                valid={contactNameValid}
                                                required
                                                placeholder="Dr. Jane Doe"
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Field
                                                    id="primary_contact_email"
                                                    icon={Mail}
                                                    label="Contact Email"
                                                    type="email"
                                                    value={data.primary_contact_email}
                                                    onChange={(e) => setData('primary_contact_email', e.target.value)}
                                                    onBlur={() => markTouched('primary_contact_email')}
                                                    error={contactEmailError}
                                                    valid={contactEmailValid}
                                                    required
                                                    placeholder="jane@clinic.com"
                                                />
                                                <PhoneInput
                                                    id="primary_contact_phone"
                                                    label="Contact Phone"
                                                    value={data.primary_contact_phone}
                                                    onChange={(val) => setData('primary_contact_phone', val)}
                                                    onBlur={() => markTouched('primary_contact_phone')}
                                                    error={contactPhoneError}
                                                    valid={contactPhoneValid}
                                                    required
                                                    placeholder="(555) 000-0000"
                                                />
                                            </div>
                                        </section>
                                    )}

                                    {currentStep === 3 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="practice"
                                                title="Disciplines Offered"
                                                subtitle="Select every discipline your clinic provides to clients."
                                            />
                                            <DisciplineCards
                                                disciplines={disciplines}
                                                customDisciplines={data.custom_disciplines}
                                                selected={data.requested_disciplines}
                                                onToggle={toggleDiscipline}
                                                onAddCustom={handleAddCustom}
                                                onRemoveCustom={handleRemoveCustom}
                                                error={disciplinesError}
                                            />
                                        </section>
                                    )}

                                    {currentStep === 4 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="license"
                                                title="Your License"
                                                subtitle="As the primary practitioner on this application. You can add more practitioners once approved."
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Field
                                                    id="license_number"
                                                    label="License Number"
                                                    value={data.license_number}
                                                    onChange={(e) => setData('license_number', e.target.value)}
                                                    onBlur={() => markTouched('license_number')}
                                                    error={licenseNumberError}
                                                    valid={licenseNumberValid}
                                                    required
                                                    placeholder="RMT-12345"
                                                />
                                                <Field
                                                    id="licensing_body"
                                                    label="Licensing Body"
                                                    value={data.licensing_body}
                                                    onChange={(e) => setData('licensing_body', e.target.value)}
                                                    onBlur={() => markTouched('licensing_body')}
                                                    error={licensingBodyError}
                                                    valid={licensingBodyValid}
                                                    required
                                                    placeholder="e.g. CMTBC"
                                                />
                                            </div>
                                            <DocumentUpload
                                                file={data.license_document}
                                                onChange={(file) => setData('license_document', file)}
                                                serverError={licenseDocumentError}
                                                helper="A clear photo or scan of your professional license or registration certificate."
                                                progress={progress}
                                                processing={processing}
                                            />
                                        </section>
                                    )}

                                    {currentStep === 5 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="plan"
                                                title="Choose Your Plan"
                                                subtitle="Select a subscription tier and practitioner count. Card captured now; billed only on approval."
                                            />
                                            <PlanStep
                                                selectedTier={data.plan_tier}
                                                onSelectTier={(tier) => setData('plan_tier', tier)}
                                                ftCount={data.full_time_practitioners_count}
                                                onChangeFt={(count) =>
                                                    setData((prev) => ({
                                                        ...prev,
                                                        full_time_practitioners_count: count,
                                                        estimated_practitioner_count: count + (prev.part_time_practitioners_count || 0),
                                                    }))
                                                }
                                                ptCount={data.part_time_practitioners_count}
                                                onChangePt={(count) =>
                                                    setData((prev) => ({
                                                        ...prev,
                                                        part_time_practitioners_count: count,
                                                        estimated_practitioner_count: (prev.full_time_practitioners_count || 1) + count,
                                                    }))
                                                }
                                                error={errors.plan_tier}
                                                tiers={tiers}
                                            />
                                        </section>
                                    )}

                                    {currentStep === 6 && (
                                        <section className="space-y-4">
                                            <StepHeading
                                                stepId="payment"
                                                title="Secure your spot"
                                                subtitle="Add a card to verify your clinic. You're only charged once we approve you."
                                            />
                                            <PaymentStep data={data} tiers={tiers} />
                                        </section>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Wizard Buttons */}
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                {currentStep > 0 && (
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="px-6 py-3 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                                    >
                                        Back
                                    </button>
                                )}

                                {!isPaymentStep && (
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        disabled={!stepComplete}
                                        aria-disabled={!stepComplete}
                                        className={`group flex-1 py-3 px-5 font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                                            stepComplete
                                                ? 'text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer'
                                                : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-not-allowed'
                                        }`}
                                    >
                                        <span className="[letter-spacing:0.01em] [word-spacing:0.04em]">Next Step</span>
                                        <ArrowRight
                                            className={`w-4 h-4 transition-transform duration-200 ${
                                                stepComplete ? 'group-hover:translate-x-1' : ''
                                            }`}
                                        />
                                    </button>
                                )}
                            </div>

                            {isPaymentStep && (
                                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                                    Reviewed within 1–2 business days — we'll email you either way.
                                </p>
                            )}
                        </form>
                    </div>

                    {/* Bottom Sign-In Link */}
                    <div className="text-center pt-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer Legal Subtext */}
                <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-4">
                    © {new Date().getFullYear()} UMAHZ Technologies Inc. All rights reserved.
                </div>
            </div>

            {/* Right Column: Branded Visual Panel (Hidden on Mobile) */}
            <AuthVisualPanel currentStep={currentStep} data={data} tiers={tiers} />
        </div>
    );
}

export default function ClinicRegister(props) {
    return (
        <ThemeProvider>
            <ClinicRegisterForm {...props} />
        </ThemeProvider>
    );
}
