import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Lock, Building2, Check, IdCard, Upload, FileText, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import PasswordStrengthMeter from '@/Components/UI/PasswordStrengthMeter';

const ROLE_LABELS = {
    clinic_owner: 'Clinic Owner',
    practitioner: 'Practitioner',
    receptionist: 'Receptionist',
};

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const fieldLabelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 };

/** Password input matching the registration wizard: show/hide toggle, inline
 * valid/error state, themed to the invite page's purple. */
function PasswordField({ label, value, onChange, onBlur, error, valid, show, onToggleShow, autoComplete, helper }) {
    const showError = !!error;
    const showValid = valid && !showError;
    return (
        <div>
            <label style={fieldLabelStyle}>{label}</label>
            <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required
                    autoComplete={autoComplete}
                    aria-invalid={showError}
                    className={`w-full pl-11 pr-16 py-3 bg-slate-50 border rounded-xl text-sm text-[#1E0B3C] focus:outline-none focus:ring-2 transition-colors ${
                        showError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15' : 'border-slate-200 focus:border-[#5B2EFF]'
                    }`}
                />
                {showValid && <Check className="w-4 h-4 text-emerald-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2.5} />}
                {showError && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-10 top-1/2 -translate-y-1/2" strokeWidth={2} />}
                <button
                    type="button"
                    onClick={onToggleShow}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    aria-pressed={show}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5B2EFF] transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B2EFF]"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {showError ? (
                <div className="text-xs text-rose-600 mt-1">{error}</div>
            ) : helper ? (
                <p className="text-[11px] text-slate-400 mt-1">{helper}</p>
            ) : null}
        </div>
    );
}

export default function AcceptInvite({ staffMembership, name, email, tenantName, role, signature, expires, requiresLicense, disciplines = [], disciplineLabels = {} }) {
    const labelsMap = { ...DISCIPLINE_LABELS, ...disciplineLabels };
    const { data, setData, post, processing, errors } = useForm({
        name: name || '',
        password: '',
        password_confirmation: '',
        discipline: '',
        license_number: '',
        licensing_body: '',
        license_document: null,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [touched, setTouched] = useState({});
    const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));

    const passwordFormatError = touched.password && data.password.length < 8 ? 'At least 8 characters' : null;
    const passwordError = errors.password || passwordFormatError;
    const passwordValid = data.password.length >= 8 && !errors.password;

    const confirmFormatError = touched.password_confirmation && data.password_confirmation && data.password_confirmation !== data.password ? 'Passwords must match' : null;
    const confirmError = errors.password_confirmation || confirmFormatError;
    const confirmValid = !!data.password_confirmation && data.password_confirmation === data.password && !errors.password_confirmation;

    const submit = (e) => {
        e.preventDefault();
        post(`/invite/accept/${staffMembership}?signature=${signature}&expires=${expires}`, { forceFormData: true });
    };

    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <Head title="Accept Invitation" />

            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[320px] h-[320px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <Link href="/" className="flex items-center justify-center mb-8">
                    <Logo size="lg" tagline />
                </Link>

                <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[#1E0B3C] tracking-tight">Join Your Team</h1>
                        <p className="mt-1 text-sm text-slate-500">Set a password to activate your account.</p>
                    </div>

                    <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
                        <span className="w-9 h-9 rounded-full bg-white border border-purple-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-[#5B2EFF]" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1E0B3C] truncate">{tenantName}</p>
                            <p className="text-xs text-slate-500">Joining as {ROLE_LABELS[role] || role}</p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 }}>
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                />
                            </div>
                            {errors.name && <div className="text-xs text-rose-600 mt-1">{errors.name}</div>}
                        </div>

                        <div>
                            <PasswordField
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

                        {requiresLicense && (
                            <>
                                <div className="h-px bg-slate-200" />
                                <div>
                                    <label style={fieldLabelStyle}>Discipline</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {disciplines.map((d) => {
                                            const active = data.discipline === d;
                                            return (
                                                <button
                                                    key={d} type="button" onClick={() => setData('discipline', d)}
                                                    className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                                                        active ? 'text-white bg-[#5B2EFF] border-[#5B2EFF]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#5B2EFF]/40'
                                                    }`}
                                                >
                                                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 border ${active ? 'border-white' : 'border-slate-300'}`}>
                                                        {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                                    </span>
                                                    {labelsMap[d] || d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.discipline && <div className="text-xs text-rose-600 mt-1">{errors.discipline}</div>}
                                </div>

                                <div>
                                    <label style={fieldLabelStyle}>License Number</label>
                                    <div className="relative">
                                        <IdCard className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text" value={data.license_number}
                                            onChange={(e) => setData('license_number', e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                        />
                                    </div>
                                    {errors.license_number && <div className="text-xs text-rose-600 mt-1">{errors.license_number}</div>}
                                </div>

                                <div>
                                    <label style={fieldLabelStyle}>Licensing Body</label>
                                    <div className="relative">
                                        <IdCard className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text" value={data.licensing_body}
                                            onChange={(e) => setData('licensing_body', e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] transition-colors"
                                        />
                                    </div>
                                    {errors.licensing_body && <div className="text-xs text-rose-600 mt-1">{errors.licensing_body}</div>}
                                </div>

                                <div>
                                    <label style={fieldLabelStyle}>License Document</label>
                                    {data.license_document ? (
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                                            <FileText className="w-4 h-4 text-[#5B2EFF] flex-shrink-0" />
                                            <span className="text-xs font-medium text-[#1E0B3C] truncate flex-1">{data.license_document.name}</span>
                                            <button type="button" onClick={() => setData('license_document', null)} className="text-slate-400 hover:text-rose-500 flex-shrink-0">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-slate-300 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors duration-200">
                                            <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <span className="text-xs text-slate-500">PDF, JPG, or PNG (max 10MB)</span>
                                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setData('license_document', e.target.files?.[0] || null)} />
                                        </label>
                                    )}
                                    {errors.license_document && <div className="text-xs text-rose-600 mt-1">{errors.license_document}</div>}
                                    <p className="text-[11px] text-slate-400 mt-1.5">You'll have full access right away — this is verified by our team in the background.</p>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors flex items-center justify-center"
                        >
                            Activate Account
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
