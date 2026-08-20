import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    User, Mail, Lock, Building2, Check, Eye, EyeOff, AlertCircle, Loader2,
    MapPin, Phone, IdCard, Upload, FileText, X,
} from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';

const ROYAL_BLUE = '#5B2EFF';
const DEEP_NAVY = '#1E0B3C';
const MANROPE = "'Manrope', system-ui, -apple-system, sans-serif";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 9 };

function iconColorClass(showError) {
    return showError ? 'text-rose-400' : 'text-[#5B2EFF]/45 group-focus-within:text-[#5B2EFF]';
}

function inputBorderClass(showError) {
    return showError
        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15'
        : 'border-slate-200/80 focus:border-[#5B2EFF] focus:ring-[#5B2EFF]/20';
}

function SectionHeading({ step, title, subtitle }) {
    return (
        <div className="flex items-start gap-3">
            <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: ROYAL_BLUE }}
            >
                {step}
            </span>
            <div>
                <h2 className="text-sm font-bold" style={{ color: DEEP_NAVY }}>{title}</h2>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
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

function DisciplineGrid({ disciplines, selected, onToggle, error }) {
    return (
        <div>
            <label style={labelStyle}>Disciplines Offered</label>
            <div className="grid grid-cols-2 gap-2">
                {disciplines.map((d) => {
                    const active = selected.includes(d);
                    return (
                        <button
                            key={d}
                            type="button"
                            onClick={() => onToggle(d)}
                            className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                                active ? 'text-white' : 'bg-white/70 text-slate-600 border-slate-200/80 hover:border-[#5B2EFF]/40'
                            }`}
                            style={active ? { background: ROYAL_BLUE, borderColor: ROYAL_BLUE } : undefined}
                        >
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 border ${active ? 'border-white' : 'border-slate-300'}`}>
                                {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                            </span>
                            {DISCIPLINE_LABELS[d] || d}
                        </button>
                    );
                })}
            </div>
            {error && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>}
        </div>
    );
}

function DocumentUpload({ file, onChange, error, helper }) {
    const showError = !!error;
    return (
        <div>
            <label style={labelStyle}>License / Registration Document</label>
            {file ? (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white/70 ${showError ? 'border-rose-300' : 'border-slate-200/80'}`}>
                    <FileText className="w-4 h-4 text-[#5B2EFF] flex-shrink-0" />
                    <span className="text-xs font-medium text-[#1E0B3C] truncate flex-1">{file.name}</span>
                    <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-rose-500 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed cursor-pointer bg-white/50 hover:bg-white/80 transition-colors duration-200 ${
                        showError ? 'border-rose-300' : 'border-slate-300'
                    }`}
                >
                    <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Click to upload PDF, JPG, or PNG (max 10MB)</span>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => onChange(e.target.files?.[0] || null)}
                    />
                </label>
            )}
            {showError ? (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

export default function ClinicRegister({ disciplines = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',

        clinic_name: '',
        business_registration_number: '',
        address_line1: '',
        address_city: '',
        address_region: '',
        address_country: '',

        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',

        requested_disciplines: [],
        estimated_practitioner_count: '',

        license_number: '',
        licensing_body: '',
        license_document: null,
    });

    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));

    const nameError = errors.name || (touched.name && !data.name.trim() ? 'Required' : null);
    const nameValid = !!data.name.trim() && !errors.name;

    const emailFormatError = touched.email && data.email && !EMAIL_RE.test(data.email) ? 'Enter a valid email address' : null;
    const emailError = errors.email || emailFormatError || (touched.email && !data.email ? 'Required' : null);
    const emailValid = !!data.email && EMAIL_RE.test(data.email) && !errors.email;

    const clinicNameError = errors.clinic_name || (touched.clinic_name && !data.clinic_name.trim() ? 'Required' : null);
    const clinicNameValid = !!data.clinic_name.trim() && !errors.clinic_name;

    const passwordFormatError = touched.password && data.password.length < 8 ? 'At least 8 characters' : null;
    const passwordError = errors.password || passwordFormatError;
    const passwordValid = data.password.length >= 8 && !errors.password;

    const confirmFormatError = touched.password_confirmation && data.password_confirmation && data.password_confirmation !== data.password ? 'Passwords must match' : null;
    const confirmError = errors.password_confirmation || confirmFormatError;
    const confirmValid = !!data.password_confirmation && data.password_confirmation === data.password && !errors.password_confirmation;

    const toggleDiscipline = (d) => {
        setData('requested_disciplines', data.requested_disciplines.includes(d)
            ? data.requested_disciplines.filter((x) => x !== d)
            : [...data.requested_disciplines, d]);
    };

    const submit = (e) => {
        e.preventDefault();
        post('/clinics/register', { forceFormData: true });
    };

    return (
        <div
            className="min-h-screen antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden"
            style={{ fontFamily: MANROPE, background: '#F8FAFC' }}
        >
            <Head title="Apply to Join UMAHZ" />

            {/* Gradient mesh background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 45%, #ECFDF5 100%)' }} />
                <div className="absolute top-[-120px] right-[-100px] w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(91,46,255,0.22)', filter: 'blur(110px)' }} />
                <div className="absolute bottom-[-100px] left-[-80px] w-[420px] h-[420px] rounded-full" style={{ background: 'rgba(34,197,94,0.16)', filter: 'blur(110px)' }} />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full" style={{ background: 'rgba(13,27,42,0.05)', filter: 'blur(130px)' }} />
            </div>

            <div className="max-w-xl w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-10">
                    <Logo size="lg" tagline />
                </Link>

                <div
                    className="rounded-[20px] p-8 sm:p-9 space-y-8 border border-white/60 backdrop-blur-xl"
                    style={{
                        background: 'rgba(255,255,255,0.78)',
                        boxShadow: '0 25px 70px -25px rgba(13,27,42,0.25), 0 8px 24px -12px rgba(91,46,255,0.15)',
                    }}
                >
                    <div className="text-center">
                        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: DEEP_NAVY }}>Apply to Join UMAHZ</h1>
                        <p className="mt-2 text-sm text-slate-400">Every clinic is reviewed by our team before going live — usually within 1–2 business days.</p>
                    </div>

                    <form onSubmit={submit} className="space-y-8">
                        {/* Step 1 — account */}
                        <div className="space-y-4">
                            <SectionHeading step={1} title="Your Account" subtitle="You'll sign in with this while your application is reviewed." />
                            <Field
                                icon={User} label="Your Full Name" value={data.name}
                                onChange={(e) => setData('name', e.target.value)} onBlur={() => markTouched('name')}
                                error={nameError} valid={nameValid} required autoComplete="name"
                            />
                            <Field
                                icon={Mail} label="Email" type="email" value={data.email}
                                onChange={(e) => setData('email', e.target.value)} onBlur={() => markTouched('email')}
                                error={emailError} valid={emailValid} required autoComplete="email"
                            />
                            <PasswordField
                                label="Password" value={data.password}
                                onChange={(e) => setData('password', e.target.value)} onBlur={() => markTouched('password')}
                                error={passwordError} valid={passwordValid} show={showPassword}
                                onToggleShow={() => setShowPassword((s) => !s)} autoComplete="new-password" helper="Minimum 8 characters."
                            />
                            <PasswordStrengthMeter password={data.password} />
                            <PasswordField
                                label="Confirm Password" value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)} onBlur={() => markTouched('password_confirmation')}
                                error={confirmError} valid={confirmValid} show={showConfirm}
                                onToggleShow={() => setShowConfirm((s) => !s)} autoComplete="new-password"
                            />
                        </div>

                        <div className="h-px bg-slate-200/70" />

                        {/* Step 2 — business info */}
                        <div className="space-y-4">
                            <SectionHeading step={2} title="Clinic Details" />
                            <Field
                                icon={Building2} label="Clinic Name" value={data.clinic_name}
                                onChange={(e) => setData('clinic_name', e.target.value)} onBlur={() => markTouched('clinic_name')}
                                error={clinicNameError} valid={clinicNameValid} required placeholder="Lotus Wellness Studio"
                            />
                            <Field
                                icon={IdCard} label="Business Registration Number" value={data.business_registration_number}
                                onChange={(e) => setData('business_registration_number', e.target.value)}
                                error={errors.business_registration_number} placeholder="Optional"
                            />
                            <Field
                                icon={MapPin} label="Address" value={data.address_line1}
                                onChange={(e) => setData('address_line1', e.target.value)}
                                error={errors.address_line1} placeholder="Street address"
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="City" value={data.address_city} onChange={(e) => setData('address_city', e.target.value)} error={errors.address_city} />
                                <Field label="Region" value={data.address_region} onChange={(e) => setData('address_region', e.target.value)} error={errors.address_region} />
                                <Field label="Country" value={data.address_country} onChange={(e) => setData('address_country', e.target.value)} error={errors.address_country} />
                            </div>
                        </div>

                        <div className="h-px bg-slate-200/70" />

                        {/* Step 3 — primary contact */}
                        <div className="space-y-4">
                            <SectionHeading step={3} title="Primary Contact" subtitle="Who our review team should reach if we have questions." />
                            <Field
                                icon={User} label="Contact Name" value={data.primary_contact_name}
                                onChange={(e) => setData('primary_contact_name', e.target.value)}
                                error={errors.primary_contact_name} required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    icon={Mail} label="Contact Email" type="email" value={data.primary_contact_email}
                                    onChange={(e) => setData('primary_contact_email', e.target.value)}
                                    error={errors.primary_contact_email} required
                                />
                                <Field
                                    icon={Phone} label="Contact Phone" type="tel" value={data.primary_contact_phone}
                                    onChange={(e) => setData('primary_contact_phone', e.target.value)}
                                    error={errors.primary_contact_phone} required
                                />
                            </div>
                        </div>

                        <div className="h-px bg-slate-200/70" />

                        {/* Step 4 — disciplines & scale */}
                        <div className="space-y-4">
                            <SectionHeading step={4} title="Practice" />
                            <DisciplineGrid
                                disciplines={disciplines}
                                selected={data.requested_disciplines}
                                onToggle={toggleDiscipline}
                                error={errors.requested_disciplines}
                            />
                            <Field
                                label="Estimated Number of Practitioners" type="number" value={data.estimated_practitioner_count}
                                onChange={(e) => setData('estimated_practitioner_count', e.target.value)}
                                error={errors.estimated_practitioner_count} required placeholder="e.g. 3"
                            />
                        </div>

                        <div className="h-px bg-slate-200/70" />

                        {/* Step 5 — primary practitioner license */}
                        <div className="space-y-4">
                            <SectionHeading
                                step={5} title="Your License"
                                subtitle="As the primary practitioner on this application. You can add more practitioners once you're approved."
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    label="License Number" value={data.license_number}
                                    onChange={(e) => setData('license_number', e.target.value)}
                                    error={errors.license_number} required
                                />
                                <Field
                                    label="Licensing Body" value={data.licensing_body}
                                    onChange={(e) => setData('licensing_body', e.target.value)}
                                    error={errors.licensing_body} required
                                />
                            </div>
                            <DocumentUpload
                                file={data.license_document}
                                onChange={(file) => setData('license_document', file)}
                                error={errors.license_document}
                                helper="A photo or scan of your license or registration certificate."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                            style={{
                                background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`,
                                boxShadow: '0 10px 30px -8px rgba(91,46,255,0.45)',
                            }}
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? 'Submitting Application…' : 'Submit Application'}
                        </button>
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
