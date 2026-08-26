import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    User, Mail, Lock, Building2, Check, Eye, EyeOff, AlertCircle, Loader2,
    MapPin, Phone, IdCard, Upload, FileText, X, Hand, Flame, Dumbbell, Apple,
    Droplets, ShieldCheck, Clock, Stethoscope,
} from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';

const NAVY = '#0D1B2A';
const BLUE = '#2563EB';
const GREEN = '#22C55E';
const TEAL = '#06B6D4';
const UI_FONT = "'Satoshi', system-ui, -apple-system, sans-serif";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const SECTIONS = [
    { id: 'account', title: 'Your Account' },
    { id: 'clinic', title: 'Clinic Details' },
    { id: 'contact', title: 'Primary Contact' },
    { id: 'practice', title: 'Practice' },
    { id: 'license', title: 'Your License' },
];

/** One small tinted icon beside every step heading — gives each step a
 * consistent visual anchor so shorter steps (e.g. Primary Contact's 3
 * fields) don't read as sparse relative to the card's padding. */
const STEP_ICONS = {
    account: User,
    clinic: Building2,
    contact: Phone,
    practice: Stethoscope,
    license: ShieldCheck,
};

/** Every field that belongs to each step — used both to mark fields touched
 * when "Next" is blocked, and to route a server-side error (e.g. "email
 * already taken", which can only be known after a round trip) back to the
 * step that actually owns it. */
const STEP_FIELDS = {
    account: ['name', 'email', 'password', 'password_confirmation'],
    clinic: ['clinic_name', 'business_registration_number', 'address_line1', 'address_city', 'address_region', 'address_country'],
    contact: ['primary_contact_name', 'primary_contact_email', 'primary_contact_phone'],
    practice: ['requested_disciplines', 'estimated_practitioner_count'],
    license: ['license_number', 'licensing_body', 'license_document'],
};

const TRANSITION_STYLES = `
@media (prefers-reduced-motion: no-preference) {
    @keyframes umahzStepSlideInRight { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes umahzStepSlideInLeft { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
    .umahz-step-forward { animation: umahzStepSlideInRight 200ms ease-out both; }
    .umahz-step-back { animation: umahzStepSlideInLeft 200ms ease-out both; }
}
`;

const labelStyle = (required) => ({
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: required ? NAVY : '#94A3B8',
    marginBottom: 9,
});

function iconColorClass(showError) {
    return showError ? 'text-rose-400' : 'text-[#2563EB]/50 group-focus-within:text-[#2563EB]';
}

function inputBorderClass(showError, required) {
    if (showError) return 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15';
    if (!required) return 'border-slate-200/60 focus:border-[#2563EB] focus:ring-[#2563EB]/20';
    return 'border-slate-200 focus:border-[#2563EB] focus:ring-[#2563EB]/20';
}

function RequiredDot({ required }) {
    if (!required) return <span className="text-[9px] font-medium normal-case tracking-normal text-slate-400 ml-1">(optional)</span>;
    return <span className="text-rose-400 ml-0.5" aria-hidden="true">*</span>;
}

function StepHeading({ stepId, title, subtitle }) {
    const Icon = STEP_ICONS[stepId];
    return (
        <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.08)' }}>
                <Icon className="w-5 h-5" style={{ color: BLUE }} />
            </span>
            <div>
                <h2 className="text-[15px]" style={{ color: NAVY, fontFamily: UI_FONT, fontWeight: 700 }}>{title}</h2>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

function Field({ id, icon: Icon, label, type = 'text', value, onChange, onBlur, error, valid, placeholder, helper, required, autoComplete }) {
    const showError = !!error;
    const showValid = valid && !showError;
    return (
        <div>
            <label htmlFor={id} style={labelStyle(required)}>{label}<RequiredDot required={required} /></label>
            <div className="relative group">
                {Icon && <Icon className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(showError)}`} />}
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
                    aria-describedby={(showError || helper) ? `${id}-hint` : undefined}
                    className={`w-full ${Icon ? 'pl-11' : 'pl-3.5'} pr-10 py-3.5 border rounded-2xl text-sm outline-none transition-all duration-200 focus:ring-4 ${
                        required ? 'bg-white text-[#0D1B2A] font-medium' : 'bg-white/60 text-[#64748B] font-normal'
                    } ${inputBorderClass(showError, required)}`}
                />
                {showValid && <Check className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2.5} />}
                {showError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />}
            </div>
            {showError ? (
                <p id={`${id}-hint`} className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p id={`${id}-hint`} className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

function PasswordField({ id, label, value, onChange, onBlur, error, valid, helper, show, onToggleShow, autoComplete }) {
    const showError = !!error;
    const showValid = valid && !showError;
    return (
        <div>
            <label htmlFor={id} style={labelStyle(true)}>{label}<RequiredDot required /></label>
            <div className="relative group">
                <Lock className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${iconColorClass(showError)}`} />
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    autoComplete={autoComplete}
                    aria-invalid={showError}
                    aria-describedby={(showError || helper) ? `${id}-hint` : undefined}
                    className={`w-full pl-11 pr-16 py-3.5 bg-white border rounded-2xl text-sm font-medium outline-none transition-all duration-200 text-[#0D1B2A] focus:ring-4 ${inputBorderClass(showError, true)}`}
                />
                {showValid && <Check className="w-4 h-4 text-emerald-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2.5} />}
                {showError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2} />}
                <button
                    type="button"
                    onClick={onToggleShow}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    aria-pressed={show}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2563EB] transition-colors duration-200 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {showError ? (
                <p id={`${id}-hint`} className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>
            ) : helper ? (
                <p id={`${id}-hint`} className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

function DisciplineCards({ disciplines, selected, onToggle, error }) {
    return (
        <div>
            <label style={labelStyle(true)} id="disciplines-label">Disciplines Offered<RequiredDot required /></label>
            <p className="text-[11px] text-slate-400 -mt-1 mb-2.5">Select every discipline this clinic practices — you can pick more than one.</p>
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-labelledby="disciplines-label">
                {disciplines.map((d) => {
                    const active = selected.includes(d);
                    const Icon = DISCIPLINE_ICONS[d] || Hand;
                    return (
                        <button
                            key={d}
                            type="button"
                            role="checkbox"
                            aria-checked={active}
                            onClick={() => onToggle(d)}
                            className={`relative text-left p-3.5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                                active ? 'bg-[#2563EB]/[0.06] border-[#2563EB]' : 'bg-white border-slate-200 hover:border-[#2563EB]/40'
                            }`}
                        >
                            <span
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                                style={{ background: active ? BLUE : '#F1F5F9', color: active ? '#fff' : '#64748B' }}
                            >
                                <Icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className={`text-xs font-semibold leading-tight ${active ? 'text-[#0D1B2A]' : 'text-slate-600'}`}>
                                {DISCIPLINE_LABELS[d] || d}
                            </span>
                            {active && (
                                <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: GREEN }}>
                                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {error && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>}
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
            <label style={labelStyle(true)}>License / Registration Document<RequiredDot required /></label>

            {processing && progress ? (
                <div className="px-4 py-3.5 rounded-2xl border border-[#2563EB]/30 bg-[#2563EB]/[0.04]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0D1B2A] mb-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: BLUE }} />
                        Uploading {file?.name}… {progress.percentage}%
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress.percentage}%`, background: `linear-gradient(90deg, ${BLUE}, ${TEAL})` }} />
                    </div>
                </div>
            ) : file ? (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white ${showError ? 'border-rose-300' : 'border-slate-200'}`}>
                    {previewUrl ? (
                        <img src={previewUrl} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-slate-200" />
                    ) : (
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F1F5F9' }}>
                            <FileText className="w-4 h-4" style={{ color: BLUE }} />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#0D1B2A] truncate">{file.name}</p>
                        <p className="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                    </div>
                    <span className="flex-shrink-0" style={{ color: GREEN }}>
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                    <button
                        type="button"
                        onClick={() => handleFile(null)}
                        aria-label="Remove file"
                        className="text-slate-400 hover:text-rose-500 flex-shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-dashed cursor-pointer bg-white hover:bg-[#2563EB]/[0.03] transition-colors duration-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2563EB] ${
                        showError ? 'border-rose-300' : 'border-slate-300'
                    }`}
                >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F1F5F9' }}>
                        <Upload className="w-4 h-4 text-slate-400" />
                    </span>
                    <span className="text-xs text-slate-500">
                        <span className="font-semibold" style={{ color: BLUE }}>Click to upload</span> — PDF, JPG, or PNG (max 10MB)
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
                <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}</p>
            ) : helper ? (
                <p className="text-[11px] text-slate-400 mt-1.5">{helper}</p>
            ) : null}
        </div>
    );
}

/** Horizontal stepper matching the client-signup flow's pattern: numbered
 * circles connected by a line, current step outlined in Royal Blue,
 * completed steps filled Emerald with a check and clickable to jump back to
 * (never forward — you can't skip ahead of validation). */
function StepIndicator({ current, onJump }) {
    return (
        <div>
            <div className="flex items-start">
                {SECTIONS.map((s, i) => {
                    const isDone = i < current;
                    const isActive = i === current;
                    return (
                        <React.Fragment key={s.id}>
                            <div className="flex flex-col items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => isDone && onJump(i)}
                                    disabled={!isDone}
                                    aria-current={isActive ? 'step' : undefined}
                                    aria-label={`${s.title}${isDone ? ' (completed, click to return)' : ''}`}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-300 ${
                                        isDone ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]' : 'cursor-default'
                                    }`}
                                    style={{
                                        background: isDone ? GREEN : '#fff',
                                        color: isDone ? '#fff' : isActive ? BLUE : '#94A3B8',
                                        border: isActive ? `2px solid ${BLUE}` : isDone ? 'none' : '1.5px solid #E2E8F0',
                                    }}
                                >
                                    {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                                </button>
                                <span className="hidden sm:block text-[10px] font-semibold whitespace-nowrap" style={{ color: i <= current ? NAVY : '#94A3B8' }}>
                                    {s.title}
                                </span>
                            </div>
                            {i < SECTIONS.length - 1 && (
                                <div
                                    className="flex-1 h-[2px] rounded-full mt-4 sm:mt-[15px] mx-1.5 transition-all duration-300"
                                    style={{ background: isDone ? `linear-gradient(90deg, ${BLUE}, ${TEAL})` : '#E2E8F0' }}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            <p className="sm:hidden text-center text-[11px] font-semibold text-slate-500 mt-2">
                Step {current + 1} of {SECTIONS.length} — <span style={{ color: NAVY }}>{SECTIONS[current].title}</span>
            </p>
        </div>
    );
}

export default function ClinicRegister({ disciplines = [] }) {
    const { data, setData, post, processing, progress, errors } = useForm({
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
    const [attemptedSteps, setAttemptedSteps] = useState({});
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState('forward');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const cardRef = useRef(null);

    const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));

    useEffect(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [currentStep]);

    // A server-only error (e.g. "email already taken") can land on a field
    // that belongs to a step the user has already moved past — send them
    // back to the step that actually owns it, rather than leaving it hidden.
    useEffect(() => {
        const errorKeys = Object.keys(errors);
        if (!errorKeys.length) return;
        const idx = SECTIONS.findIndex((s) => STEP_FIELDS[s.id].some((f) => errorKeys.includes(f)));
        if (idx !== -1 && idx !== currentStep) {
            setDirection('back');
            setCurrentStep(idx);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errors]);

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

    const contactNameError = errors.primary_contact_name || (touched.primary_contact_name && !data.primary_contact_name.trim() ? 'Required' : null);
    const contactNameValid = !!data.primary_contact_name.trim() && !errors.primary_contact_name;

    const contactEmailFormatError = touched.primary_contact_email && data.primary_contact_email && !EMAIL_RE.test(data.primary_contact_email) ? 'Enter a valid email address' : null;
    const contactEmailError = errors.primary_contact_email || contactEmailFormatError || (touched.primary_contact_email && !data.primary_contact_email ? 'Required' : null);
    const contactEmailValid = !!data.primary_contact_email && EMAIL_RE.test(data.primary_contact_email) && !errors.primary_contact_email;

    const contactPhoneError = errors.primary_contact_phone || (touched.primary_contact_phone && !data.primary_contact_phone.trim() ? 'Required' : null);
    const contactPhoneValid = !!data.primary_contact_phone.trim() && !errors.primary_contact_phone;

    const practitionerCountError = errors.estimated_practitioner_count || (touched.estimated_practitioner_count && !data.estimated_practitioner_count ? 'Required' : null);
    const practitionerCountValid = !!data.estimated_practitioner_count && !errors.estimated_practitioner_count;

    const disciplinesError = errors.requested_disciplines || (attemptedSteps.practice && data.requested_disciplines.length === 0 ? 'Select at least one discipline.' : null);

    const licenseNumberError = errors.license_number || (touched.license_number && !data.license_number.trim() ? 'Required' : null);
    const licenseNumberValid = !!data.license_number.trim() && !errors.license_number;

    const licensingBodyError = errors.licensing_body || (touched.licensing_body && !data.licensing_body.trim() ? 'Required' : null);
    const licensingBodyValid = !!data.licensing_body.trim() && !errors.licensing_body;

    const licenseDocumentError = errors.license_document || (attemptedSteps.license && !data.license_document ? 'Upload your license document.' : null);

    const toggleDiscipline = (d) => {
        setData('requested_disciplines', data.requested_disciplines.includes(d)
            ? data.requested_disciplines.filter((x) => x !== d)
            : [...data.requested_disciplines, d]);
    };

    const completion = {
        account: nameValid && emailValid && passwordValid && confirmValid,
        clinic: clinicNameValid,
        contact: contactNameValid && contactEmailValid && contactPhoneValid,
        practice: data.requested_disciplines.length > 0 && practitionerCountValid,
        license: licenseNumberValid && licensingBodyValid && !!data.license_document,
    };

    const isLastStep = currentStep === SECTIONS.length - 1;

    const goNext = () => {
        const sectionId = SECTIONS[currentStep].id;
        STEP_FIELDS[sectionId].forEach(markTouched);
        setAttemptedSteps((s) => ({ ...s, [sectionId]: true }));
        if (completion[sectionId]) {
            setDirection('forward');
            setCurrentStep((s) => Math.min(s + 1, SECTIONS.length - 1));
        }
    };

    const goBack = () => {
        setDirection('back');
        setCurrentStep((s) => Math.max(s - 1, 0));
    };

    // Only completed steps are reachable this way — jumping ahead of
    // validation would let someone submit with unchecked required fields.
    const jumpTo = (i) => {
        if (i < currentStep) {
            setDirection('back');
            setCurrentStep(i);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        const sectionId = SECTIONS[currentStep].id;
        STEP_FIELDS[sectionId].forEach(markTouched);
        setAttemptedSteps((s) => ({ ...s, [sectionId]: true }));
        if (!completion[sectionId]) return;
        post('/clinics/register', { forceFormData: true });
    };

    return (
        <div
            className="min-h-screen antialiased text-slate-800 px-6 py-16"
            style={{ fontFamily: UI_FONT, background: '#F1F5F9' }}
        >
            <Head title="Apply to Join UMAHZ" />
            <style>{TRANSITION_STYLES}</style>

            <div className="max-w-xl mx-auto">
                <div className="relative mb-10">
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[280px] rounded-full pointer-events-none"
                        style={{ background: `radial-gradient(ellipse, rgba(37,99,235,0.10) 0%, rgba(6,182,212,0.06) 45%, transparent 75%)`, filter: 'blur(20px)' }}
                        aria-hidden="true"
                    />
                    <Link href="/" className="relative flex items-center justify-center mb-8">
                        <Logo size="lg" tagline />
                    </Link>

                    <div className="relative text-center">
                        <h1 className="text-[34px] sm:text-[38px] leading-[1.1]" style={{ fontFamily: UI_FONT, fontWeight: 800, letterSpacing: '-0.02em' }}>
                            <span style={{ color: NAVY }}>Apply to Join </span>
                            <span style={{ color: BLUE }}>UMAHZ</span>
                        </h1>
                        <p className="mt-2.5 text-[13px] text-slate-400">Every clinic is reviewed by our team before going live.</p>
                    </div>
                </div>

                <div className="mb-6">
                    <StepIndicator current={currentStep} onJump={jumpTo} />
                </div>

                <div
                    ref={cardRef}
                    className="rounded-[28px] p-7 sm:p-9 border border-slate-200/70 bg-white overflow-hidden scroll-mt-8"
                    style={{ boxShadow: '0 2px 6px rgba(13,27,42,0.03), 0 32px 56px -28px rgba(13,27,42,0.16)' }}
                >
                    <form onSubmit={submit} className="space-y-6">
                        <div key={currentStep} className={direction === 'forward' ? 'umahz-step-forward' : 'umahz-step-back'}>
                            {currentStep === 0 && (
                                <section className="space-y-4">
                                    <StepHeading stepId="account" title="Your Account" subtitle="You'll sign in with this while your application is reviewed." />
                                    <Field
                                        id="name" icon={User} label="Your Full Name" value={data.name}
                                        onChange={(e) => setData('name', e.target.value)} onBlur={() => markTouched('name')}
                                        error={nameError} valid={nameValid} required autoComplete="name"
                                    />
                                    <Field
                                        id="email" icon={Mail} label="Email" type="email" value={data.email}
                                        onChange={(e) => setData('email', e.target.value)} onBlur={() => markTouched('email')}
                                        error={emailError} valid={emailValid} required autoComplete="email"
                                    />
                                    <PasswordField
                                        id="password" label="Password" value={data.password}
                                        onChange={(e) => setData('password', e.target.value)} onBlur={() => markTouched('password')}
                                        error={passwordError} valid={passwordValid} show={showPassword}
                                        onToggleShow={() => setShowPassword((s) => !s)} autoComplete="new-password" helper="Minimum 8 characters."
                                    />
                                    <PasswordStrengthMeter password={data.password} />
                                    <PasswordField
                                        id="password_confirmation" label="Confirm Password" value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)} onBlur={() => markTouched('password_confirmation')}
                                        error={confirmError} valid={confirmValid} show={showConfirm}
                                        onToggleShow={() => setShowConfirm((s) => !s)} autoComplete="new-password"
                                    />
                                </section>
                            )}

                            {currentStep === 1 && (
                                <section className="space-y-4">
                                    <StepHeading stepId="clinic" title="Clinic Details" />
                                    <Field
                                        id="clinic_name" icon={Building2} label="Clinic Name" value={data.clinic_name}
                                        onChange={(e) => setData('clinic_name', e.target.value)} onBlur={() => markTouched('clinic_name')}
                                        error={clinicNameError} valid={clinicNameValid} required placeholder="Lotus Wellness Studio"
                                    />
                                    <Field
                                        id="business_registration_number" icon={IdCard} label="Business Registration Number" value={data.business_registration_number}
                                        onChange={(e) => setData('business_registration_number', e.target.value)}
                                        error={errors.business_registration_number}
                                    />
                                    <Field
                                        id="address_line1" icon={MapPin} label="Address" value={data.address_line1}
                                        onChange={(e) => setData('address_line1', e.target.value)}
                                        error={errors.address_line1} placeholder="Street address"
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field id="address_city" label="City" value={data.address_city} onChange={(e) => setData('address_city', e.target.value)} error={errors.address_city} />
                                        <Field id="address_region" label="Region" value={data.address_region} onChange={(e) => setData('address_region', e.target.value)} error={errors.address_region} />
                                        <Field id="address_country" label="Country" value={data.address_country} onChange={(e) => setData('address_country', e.target.value)} error={errors.address_country} />
                                    </div>
                                </section>
                            )}

                            {currentStep === 2 && (
                                <section className="space-y-4">
                                    <StepHeading stepId="contact" title="Primary Contact" subtitle="Who our review team should reach if we have questions." />
                                    <Field
                                        id="primary_contact_name" icon={User} label="Contact Name" value={data.primary_contact_name}
                                        onChange={(e) => setData('primary_contact_name', e.target.value)} onBlur={() => markTouched('primary_contact_name')}
                                        error={contactNameError} valid={contactNameValid} required
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field
                                            id="primary_contact_email" icon={Mail} label="Contact Email" type="email" value={data.primary_contact_email}
                                            onChange={(e) => setData('primary_contact_email', e.target.value)} onBlur={() => markTouched('primary_contact_email')}
                                            error={contactEmailError} valid={contactEmailValid} required
                                        />
                                        <Field
                                            id="primary_contact_phone" icon={Phone} label="Contact Phone" type="tel" value={data.primary_contact_phone}
                                            onChange={(e) => setData('primary_contact_phone', e.target.value)} onBlur={() => markTouched('primary_contact_phone')}
                                            error={contactPhoneError} valid={contactPhoneValid} required
                                        />
                                    </div>
                                </section>
                            )}

                            {currentStep === 3 && (
                                <section className="space-y-4">
                                    <StepHeading stepId="practice" title="Practice" />
                                    <DisciplineCards
                                        disciplines={disciplines}
                                        selected={data.requested_disciplines}
                                        onToggle={toggleDiscipline}
                                        error={disciplinesError}
                                    />
                                    <Field
                                        id="estimated_practitioner_count" label="Estimated Number of Practitioners" type="number" value={data.estimated_practitioner_count}
                                        onChange={(e) => setData('estimated_practitioner_count', e.target.value)} onBlur={() => markTouched('estimated_practitioner_count')}
                                        error={practitionerCountError} valid={practitionerCountValid} required placeholder="e.g. 3"
                                    />
                                </section>
                            )}

                            {currentStep === 4 && (
                                <section className="space-y-4">
                                    <StepHeading stepId="license" title="Your License" subtitle="As the primary practitioner on this application. You can add more practitioners once you're approved." />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field
                                            id="license_number" label="License Number" value={data.license_number}
                                            onChange={(e) => setData('license_number', e.target.value)} onBlur={() => markTouched('license_number')}
                                            error={licenseNumberError} valid={licenseNumberValid} required
                                        />
                                        <Field
                                            id="licensing_body" label="Licensing Body" value={data.licensing_body}
                                            onChange={(e) => setData('licensing_body', e.target.value)} onBlur={() => markTouched('licensing_body')}
                                            error={licensingBodyError} valid={licensingBodyValid} required
                                        />
                                    </div>
                                    <DocumentUpload
                                        file={data.license_document}
                                        onChange={(file) => setData('license_document', file)}
                                        serverError={licenseDocumentError}
                                        helper="A photo or scan of your license or registration certificate."
                                        progress={progress}
                                        processing={processing}
                                    />
                                </section>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {currentStep > 0 && (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="px-6 py-3.5 rounded-full text-sm font-semibold text-[#0D1B2A] border border-slate-200 hover:border-[#2563EB] hover:bg-white transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                                >
                                    Back
                                </button>
                            )}

                            {!isLastStep ? (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="flex-1 py-3.5 px-4 text-white font-semibold text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D1B2A]"
                                    style={{
                                        background: `linear-gradient(135deg, ${BLUE} 0%, ${TEAL} 100%)`,
                                        boxShadow: '0 10px 30px -8px rgba(37,99,235,0.45)',
                                    }}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 py-3.5 px-4 text-white font-semibold text-sm rounded-full transition-all duration-300 ease-out flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D1B2A]"
                                    style={{
                                        background: `linear-gradient(135deg, ${BLUE} 0%, ${TEAL} 100%)`,
                                        boxShadow: '0 10px 30px -8px rgba(37,99,235,0.45)',
                                    }}
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {processing ? 'Submitting Application…' : 'Submit Application'}
                                </button>
                            )}
                        </div>

                        {isLastStep && (
                            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                                <Clock className="w-3 h-3" style={{ color: TEAL }} />
                                Reviewed within 1–2 business days — we'll email you either way.
                            </p>
                        )}
                    </form>

                    <p className="text-center text-sm text-slate-400 mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold transition-opacity duration-200 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] rounded" style={{ color: BLUE }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
