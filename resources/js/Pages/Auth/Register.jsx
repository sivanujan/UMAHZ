import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Mail, Lock, Phone, Cake, Building2, Check, Eye, EyeOff, AlertCircle, Search } from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';

const ROYAL_BLUE = '#5B2EFF';
const DEEP_NAVY = '#1E0B3C';
const MANROPE = "'Manrope', system-ui, -apple-system, sans-serif";

const CONTACT_METHODS = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'sms', label: 'SMS' },
];

const STEPS = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Account & Clinic' },
    { num: 3, label: 'Password' },
];

const STEP_FIELDS = {
    1: ['first_name', 'last_name', 'date_of_birth'],
    2: ['email', 'phone', 'tenant_id'],
    3: ['password', 'password_confirmation'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-.\s]{7,20}$/;

function validateField(name, value, data) {
    switch (name) {
        case 'first_name':
        case 'last_name':
            return value.trim() ? null : 'Required';
        case 'date_of_birth':
            if (!value) return 'Required';
            return new Date(value) < new Date() ? null : 'Must be in the past';
        case 'email':
            if (!value) return 'Required';
            return EMAIL_RE.test(value) ? null : 'Enter a valid email address';
        case 'phone':
            if (!value) return 'Required';
            return PHONE_RE.test(value) && value.replace(/\D/g, '').length >= 7 ? null : 'Enter a valid phone number';
        case 'tenant_id':
            return value ? null : 'Select a clinic';
        case 'password':
            return value.length >= 12 ? null : 'At least 12 characters';
        case 'password_confirmation':
            return value && value === data.password ? null : 'Passwords must match';
        default:
            return null;
    }
}

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 9 };

function iconColorClass(showError) {
    return showError ? 'text-rose-400' : 'text-[#5B2EFF]/45 group-focus-within:text-[#5B2EFF]';
}

function inputBorderClass(showError) {
    return showError
        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15'
        : 'border-slate-200/80 focus:border-[#5B2EFF] focus:ring-[#5B2EFF]/20';
}

function Field({ icon: Icon, label, type = 'text', value, onChange, onBlur, error, valid, placeholder, helper, required, autoComplete }) {
    const showError = !!error;
    const showValid = valid && !showError;
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <div className="relative group">
                {Icon && <Icon className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(showError)}`} />}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required={required}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    className={`w-full ${Icon ? 'pl-11' : 'pl-3.5'} pr-10 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#1E0B3C] focus:bg-white focus:ring-4 ${inputBorderClass(showError)}`}
                />
                {showValid && <Check className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2.5} />}
                {showError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />}
            </div>
            {showError ? (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

function PasswordField({ label, value, onChange, onBlur, error, valid, helper, show, onToggleShow, autoComplete }) {
    const showError = !!error;
    const showValid = valid && !showError;
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <div className="relative group">
                <Lock className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(showError)}`} />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    autoComplete={autoComplete}
                    className={`w-full pl-11 pr-16 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#1E0B3C] focus:bg-white focus:ring-4 ${inputBorderClass(showError)}`}
                />
                {showValid && <Check className="w-4 h-4 text-emerald-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2.5} />}
                {showError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2} />}
                <button
                    type="button"
                    onClick={onToggleShow}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5B2EFF] transition-colors duration-200"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {showError ? (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

function ClinicField({ tenants, value, onChange, onBlur, error, disabled, disabledName }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const list = tenants || [];
    const selected = list.find((t) => t.id === value);

    useEffect(() => {
        if (selected && !open) setQuery(selected.name);
    }, [selected?.id]);

    useEffect(() => {
        if (!open) return;
        function handleOutside(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setQuery(selected ? selected.name : '');
                onBlur();
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [open, selected, onBlur]);

    if (disabled) {
        return (
            <div>
                <label style={labelStyle}>Clinic</label>
                <div className="relative">
                    <Building2 className="w-4 h-4 text-[#5B2EFF]/45 absolute left-4 top-1/2 -translate-y-1/2" />
                    <div className="w-full pl-11 pr-4 py-3.5 bg-slate-100/70 border border-slate-200/80 text-slate-500 rounded-xl text-sm">{disabledName}</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Pre-selected from your invite link.</p>
            </div>
        );
    }

    const filtered = list.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
    const showError = !!error;

    return (
        <div ref={wrapRef} className="relative">
            <label style={labelStyle}>Clinic</label>
            <div className="relative group">
                <Building2 className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(showError)}`} />
                <input
                    type="text"
                    value={query}
                    onFocus={(e) => { setOpen(true); e.target.select(); }}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange(''); }}
                    placeholder="Search your clinic…"
                    className={`w-full pl-11 pr-10 py-3.5 bg-white/70 border rounded-xl text-sm outline-none transition-all duration-200 text-[#1E0B3C] focus:bg-white focus:ring-4 ${inputBorderClass(showError)}`}
                />
                {value ? (
                    <Check className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2.5} />
                ) : (
                    <Search className="w-3.5 h-3.5 text-slate-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
            </div>
            {open && (
                <div className="absolute z-20 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto py-1.5">
                    {filtered.length ? filtered.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onChange(t.id); setQuery(t.name); setOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-[#1E0B3C] hover:bg-violet-50 transition-colors flex items-center justify-between"
                        >
                            {t.name}
                            {value === t.id && <Check className="w-3.5 h-3.5 text-[#5B2EFF]" />}
                        </button>
                    )) : (
                        <p className="px-4 py-3 text-sm text-slate-400">No clinics match "{query}"</p>
                    )}
                </div>
            )}
            {showError && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>}
        </div>
    );
}

function ConsentCheckbox({ checked, onChange, required, children }) {
    return (
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={onChange} required={required} className="sr-only" />
            <span
                className="mt-0.5 w-[18px] h-[18px] rounded-[6px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                    borderColor: checked ? 'transparent' : '#cbd5e1',
                    background: checked ? `linear-gradient(135deg, ${ROYAL_BLUE}, #2E9BE6)` : 'transparent',
                }}
            >
                <Check className="w-3 h-3 text-white transition-opacity duration-150" style={{ opacity: checked ? 1 : 0 }} strokeWidth={3} />
            </span>
            <span className="text-xs text-slate-500 leading-relaxed">{children}</span>
        </label>
    );
}

function StepProgress({ current }) {
    return (
        <div className="flex items-start mb-1">
            {STEPS.map((s, i) => (
                <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-all duration-300"
                            style={{
                                background: s.num < current ? `linear-gradient(135deg, ${ROYAL_BLUE}, #2E9BE6)` : '#fff',
                                color: s.num < current ? '#fff' : s.num === current ? ROYAL_BLUE : '#94a3b8',
                                border: s.num === current ? `2px solid ${ROYAL_BLUE}` : s.num < current ? 'none' : '1.5px solid #e2e8f0',
                            }}
                        >
                            {s.num < current ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s.num}
                        </div>
                        <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: s.num <= current ? DEEP_NAVY : '#94a3b8' }}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div
                            className="flex-1 h-[2px] rounded-full mt-[13px] mx-1.5 transition-all duration-300"
                            style={{ background: s.num < current ? `linear-gradient(90deg, ${ROYAL_BLUE}, #2E9BE6)` : '#e2e8f0' }}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

export default function Register({ tenants, preselectedTenantSlug, tosVersion }) {
    const preselected = tenants?.find((t) => t.slug === preselectedTenantSlug);

    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        date_of_birth: '',
        preferred_contact_method: 'email',
        tenant_id: preselected?.id || '',
        tos_accepted: false,
        marketing_opt_in: false,
    });

    const [step, setStep] = useState(1);
    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [oauthNotice, setOauthNotice] = useState('');

    const fieldError = (name) => errors[name] || (touched[name] ? validateField(name, data[name], data) : null);
    const fieldValid = (name) => !!data[name] && !validateField(name, data[name], data) && !errors[name];
    const stepValid = (n) => STEP_FIELDS[n].every((f) => !validateField(f, data[f], data));

    const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));
    const markStepTouched = (n) => setTouched((t) => ({ ...t, ...Object.fromEntries(STEP_FIELDS[n].map((f) => [f, true])) }));

    useEffect(() => {
        const errorKeys = Object.keys(errors);
        if (!errorKeys.length) return;
        for (const [stepNum, fields] of Object.entries(STEP_FIELDS)) {
            if (fields.some((f) => errorKeys.includes(f))) {
                setStep(Number(stepNum));
                break;
            }
        }
    }, [errors]);

    const goNext = () => {
        markStepTouched(step);
        if (stepValid(step)) setStep((s) => s + 1);
    };

    const goBack = () => setStep((s) => Math.max(1, s - 1));

    const submit = (e) => {
        e.preventDefault();
        markStepTouched(3);
        markTouched('tos_accepted');
        if (!stepValid(3) || !data.tos_accepted) return;
        post('/register');
    };

    const handleFormKeyDown = (e) => {
        if (e.key === 'Enter' && step < 3) {
            e.preventDefault();
            goNext();
        }
    };

    return (
        <div
            className="min-h-screen antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden"
            style={{ fontFamily: MANROPE, background: '#F8FAFC' }}
        >
            <Head title="Create Account" />

            {/* Gradient mesh background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 45%, #ECFDF5 100%)' }} />
                <div className="absolute top-[-120px] right-[-100px] w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(91,46,255,0.22)', filter: 'blur(110px)' }} />
                <div className="absolute bottom-[-100px] left-[-80px] w-[420px] h-[420px] rounded-full" style={{ background: 'rgba(34,197,94,0.16)', filter: 'blur(110px)' }} />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full" style={{ background: 'rgba(13,27,42,0.05)', filter: 'blur(130px)' }} />
            </div>

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-10">
                    <Logo size="lg" tagline />
                </Link>

                <div
                    className="rounded-[20px] p-8 sm:p-9 space-y-7 border border-white/60 backdrop-blur-xl"
                    style={{
                        background: 'rgba(255,255,255,0.78)',
                        boxShadow: '0 25px 70px -25px rgba(13,27,42,0.25), 0 8px 24px -12px rgba(91,46,255,0.15)',
                    }}
                >
                    <div className="text-center">
                        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: DEEP_NAVY }}>Create Your Client Account</h1>
                        <p className="mt-2 text-sm text-slate-400">Book appointments, fill forms, and manage your care.</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setOauthNotice("Google sign-up isn't connected yet — use the form below for now.")}
                            className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-[#1E0B3C] transition-all duration-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
                        >
                            <GoogleIcon /> Continue with Google
                        </button>
                        {oauthNotice && (
                            <p className="text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
                                {oauthNotice}
                            </p>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.12em] whitespace-nowrap">or sign up with email</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                    </div>

                    <StepProgress current={step} />

                    <form onSubmit={submit} onKeyDown={handleFormKeyDown} className="space-y-5">
                        {step === 1 && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field
                                        icon={User}
                                        label="First Name"
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        onBlur={() => markTouched('first_name')}
                                        error={fieldError('first_name')}
                                        valid={fieldValid('first_name')}
                                        required
                                        autoComplete="given-name"
                                    />
                                    <Field
                                        label="Last Name"
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        onBlur={() => markTouched('last_name')}
                                        error={fieldError('last_name')}
                                        valid={fieldValid('last_name')}
                                        required
                                        autoComplete="family-name"
                                    />
                                </div>

                                <Field
                                    icon={Cake}
                                    label="Date of Birth"
                                    type="date"
                                    value={data.date_of_birth}
                                    onChange={(e) => setData('date_of_birth', e.target.value)}
                                    onBlur={() => markTouched('date_of_birth')}
                                    error={fieldError('date_of_birth')}
                                    valid={fieldValid('date_of_birth')}
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="w-full py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                    style={{
                                        background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`,
                                        boxShadow: '0 10px 30px -8px rgba(91,46,255,0.45)',
                                    }}
                                >
                                    Continue
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Field
                                    icon={Mail}
                                    label="Email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    onBlur={() => markTouched('email')}
                                    error={fieldError('email')}
                                    valid={fieldValid('email')}
                                    required
                                    autoComplete="email"
                                    helper="We'll send your booking confirmations here."
                                />

                                <Field
                                    icon={Phone}
                                    label="Phone"
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    onBlur={() => markTouched('phone')}
                                    error={fieldError('phone')}
                                    valid={fieldValid('phone')}
                                    required
                                    placeholder="(555) 234-5678"
                                    autoComplete="tel"
                                    helper="We'll only use this for appointment reminders."
                                />

                                <div>
                                    <label style={labelStyle}>Contact Via</label>
                                    <select
                                        value={data.preferred_contact_method}
                                        onChange={(e) => setData('preferred_contact_method', e.target.value)}
                                        className="w-full px-3.5 py-3.5 bg-white/70 border border-slate-200/80 text-[#1E0B3C] rounded-xl text-sm outline-none transition-all duration-200 focus:bg-white focus:border-[#5B2EFF] focus:ring-4 focus:ring-[#5B2EFF]/20"
                                    >
                                        {CONTACT_METHODS.map((m) => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <ClinicField
                                    tenants={tenants}
                                    value={data.tenant_id}
                                    onChange={(id) => setData('tenant_id', id)}
                                    onBlur={() => markTouched('tenant_id')}
                                    error={fieldError('tenant_id')}
                                    disabled={!!preselected}
                                    disabledName={preselected?.name}
                                />

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="px-6 py-3.5 rounded-full text-sm font-medium text-[#1E0B3C] border border-slate-200 hover:border-[#5B2EFF] hover:bg-white transition-all duration-200"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="flex-1 py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                        style={{
                                            background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`,
                                            boxShadow: '0 10px 30px -8px rgba(91,46,255,0.45)',
                                        }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div>
                                    <PasswordField
                                        label="Password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        onBlur={() => markTouched('password')}
                                        error={fieldError('password')}
                                        valid={fieldValid('password')}
                                        show={showPassword}
                                        onToggleShow={() => setShowPassword((s) => !s)}
                                        autoComplete="new-password"
                                        helper="Minimum 12 characters."
                                    />
                                    <PasswordStrengthMeter password={data.password} />
                                </div>

                                <PasswordField
                                    label="Confirm Password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    onBlur={() => markTouched('password_confirmation')}
                                    error={fieldError('password_confirmation')}
                                    valid={fieldValid('password_confirmation')}
                                    show={showConfirm}
                                    onToggleShow={() => setShowConfirm((s) => !s)}
                                    autoComplete="new-password"
                                />

                                <div className="space-y-3.5 pt-1">
                                    <ConsentCheckbox
                                        checked={data.tos_accepted}
                                        onChange={(e) => setData('tos_accepted', e.target.checked)}
                                        required
                                    >
                                        I agree to the{' '}
                                        <a href="#" className="font-semibold transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>Terms of Service</a>
                                        {' '}and{' '}
                                        <a href="#" className="font-semibold transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>Privacy Policy</a>
                                        {' '}(v{tosVersion}).
                                    </ConsentCheckbox>
                                    {(errors.tos_accepted || (touched.tos_accepted && !data.tos_accepted)) && (
                                        <div className="text-xs text-rose-600 font-medium">
                                            {errors.tos_accepted || 'You must agree to the Terms of Service to create an account.'}
                                        </div>
                                    )}

                                    <ConsentCheckbox
                                        checked={data.marketing_opt_in}
                                        onChange={(e) => setData('marketing_opt_in', e.target.checked)}
                                    >
                                        Send me wellness tips and clinic offers by email. (Optional — separate from the Terms above.)
                                    </ConsentCheckbox>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="px-6 py-3.5 rounded-full text-sm font-medium text-[#1E0B3C] border border-slate-200 hover:border-[#5B2EFF] hover:bg-white transition-all duration-200"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        onClick={() => markTouched('tos_accepted')}
                                        aria-disabled={!data.tos_accepted}
                                        className={`flex-1 py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center active:scale-[0.98] disabled:opacity-70 ${data.tos_accepted ? 'hover:scale-[1.02] hover:shadow-lg' : 'opacity-50'}`}
                                        style={{
                                            background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`,
                                            boxShadow: data.tos_accepted ? '0 10px 30px -8px rgba(91,46,255,0.45)' : 'none',
                                        }}
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <p className="text-center text-sm text-slate-400">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold transition-opacity duration-200 hover:opacity-75" style={{ color: ROYAL_BLUE }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
