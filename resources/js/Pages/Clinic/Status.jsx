import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    Clock, AlertTriangle, XCircle, Ban, Check, Loader2, Building2, MapPin,
    User, Mail, Phone, IdCard, FileText, Upload, X, LogOut,
} from 'lucide-react';
import Logo from '@/Components/Common/Logo';

const ROYAL_BLUE = '#5B2EFF';
const DEEP_NAVY = '#1E0B3C';
const UI_FONT = "'Satoshi', system-ui, -apple-system, sans-serif";

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const STATUS_META = {
    pending_review: {
        icon: Clock, color: '#5B2EFF', bg: 'rgba(91,46,255,0.1)',
        title: 'Your application is under review',
        body: "Our team is checking your license and registration details. We'll email you as soon as a decision is made — usually within 1–2 business days.",
    },
    needs_more_info: {
        icon: AlertTriangle, color: '#D97706', bg: 'rgba(217,119,6,0.1)',
        title: 'We need a bit more information',
        body: 'Please review the note below, update your application, and resubmit — no need to sign up again.',
    },
    rejected: {
        icon: XCircle, color: '#E11D48', bg: 'rgba(225,29,72,0.1)',
        title: 'Your application was not approved',
        body: 'See the reason below. If you believe this is a mistake, reply to the email we sent you.',
    },
    suspended: {
        icon: Ban, color: '#64748B', bg: 'rgba(100,116,139,0.1)',
        title: 'This workspace is suspended',
        body: 'Contact UMAHZ support for details on reactivating your clinic.',
    },
};

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 9 };

function Field({ label, value, onChange, error, type = 'text', required, icon: Icon }) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <div className="relative">
                {Icon && <Icon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={`w-full ${Icon ? 'pl-11' : 'pl-3.5'} pr-4 py-3 bg-white border rounded-xl text-sm outline-none transition-colors duration-200 text-[#1E0B3C] focus:ring-4 ${
                        error ? 'border-rose-300 focus:ring-rose-400/15' : 'border-slate-200 focus:border-[#5B2EFF] focus:ring-[#5B2EFF]/20'
                    }`}
                />
            </div>
            {error && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{error}</p>}
        </div>
    );
}

function ResubmitForm({ tenant, disciplines, disciplineLabels = {} }) {
    const labelsMap = { ...DISCIPLINE_LABELS, ...disciplineLabels };
    const { data, setData, patch, processing, errors } = useForm({
        clinic_name: tenant.name || '',
        business_registration_number: tenant.business_registration_number || '',
        address_line1: tenant.address?.line1 || '',
        address_city: tenant.address?.city || '',
        address_region: tenant.address?.region || '',
        address_country: tenant.address?.country || '',
        primary_contact_name: tenant.primary_contact_name || '',
        primary_contact_email: tenant.primary_contact_email || '',
        primary_contact_phone: tenant.primary_contact_phone || '',
        requested_disciplines: tenant.requested_disciplines || [],
        estimated_practitioner_count: tenant.estimated_practitioner_count || '',
        license_number: '',
        licensing_body: '',
        license_document: null,
    });

    const toggleDiscipline = (d) => {
        setData('requested_disciplines', data.requested_disciplines.includes(d)
            ? data.requested_disciplines.filter((x) => x !== d)
            : [...data.requested_disciplines, d]);
    };

    const submit = (e) => {
        e.preventDefault();
        patch('/clinic/status', { forceFormData: true });
    };

    return (
        <form onSubmit={submit} className="space-y-4 text-left">
            <Field icon={Building2} label="Clinic Name" value={data.clinic_name} onChange={(e) => setData('clinic_name', e.target.value)} error={errors.clinic_name} required />
            <Field icon={IdCard} label="Business Registration Number" value={data.business_registration_number} onChange={(e) => setData('business_registration_number', e.target.value)} error={errors.business_registration_number} />
            <Field icon={MapPin} label="Address" value={data.address_line1} onChange={(e) => setData('address_line1', e.target.value)} error={errors.address_line1} />
            <div className="grid grid-cols-3 gap-3">
                <Field label="City" value={data.address_city} onChange={(e) => setData('address_city', e.target.value)} error={errors.address_city} />
                <Field label="Region" value={data.address_region} onChange={(e) => setData('address_region', e.target.value)} error={errors.address_region} />
                <Field label="Country" value={data.address_country} onChange={(e) => setData('address_country', e.target.value)} error={errors.address_country} />
            </div>
            <Field icon={User} label="Contact Name" value={data.primary_contact_name} onChange={(e) => setData('primary_contact_name', e.target.value)} error={errors.primary_contact_name} required />
            <div className="grid grid-cols-2 gap-3">
                <Field icon={Mail} label="Contact Email" type="email" value={data.primary_contact_email} onChange={(e) => setData('primary_contact_email', e.target.value)} error={errors.primary_contact_email} required />
                <Field icon={Phone} label="Contact Phone" value={data.primary_contact_phone} onChange={(e) => setData('primary_contact_phone', e.target.value)} error={errors.primary_contact_phone} required />
            </div>

            <div>
                <label style={labelStyle}>Disciplines Offered</label>
                <div className="grid grid-cols-2 gap-2">
                    {disciplines.map((d) => {
                        const active = data.requested_disciplines.includes(d);
                        return (
                            <button
                                key={d} type="button" onClick={() => toggleDiscipline(d)}
                                className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                                    active ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-[#5B2EFF]/40'
                                }`}
                                style={active ? { background: ROYAL_BLUE, borderColor: ROYAL_BLUE } : undefined}
                            >
                                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 border ${active ? 'border-white' : 'border-slate-300'}`}>
                                    {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </span>
                                {labelsMap[d] || d}
                            </button>
                        );
                    })}
                </div>
                {errors.requested_disciplines && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{errors.requested_disciplines}</p>}
            </div>

            <Field label="Estimated Number of Practitioners" type="number" value={data.estimated_practitioner_count} onChange={(e) => setData('estimated_practitioner_count', e.target.value)} error={errors.estimated_practitioner_count} required />

            <div className="grid grid-cols-2 gap-3">
                <Field label="License Number" value={data.license_number} onChange={(e) => setData('license_number', e.target.value)} error={errors.license_number} placeholder="Only if changed" />
                <Field label="Licensing Body" value={data.licensing_body} onChange={(e) => setData('licensing_body', e.target.value)} error={errors.licensing_body} placeholder="Only if changed" />
            </div>

            <div>
                <label style={labelStyle}>Replace License Document</label>
                {data.license_document ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white">
                        <FileText className="w-4 h-4 text-[#5B2EFF] flex-shrink-0" />
                        <span className="text-xs font-medium text-[#1E0B3C] truncate flex-1">{data.license_document.name}</span>
                        <button type="button" onClick={() => setData('license_document', null)} className="text-slate-400 hover:text-rose-500 flex-shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <label className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-slate-300 cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-200">
                        <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-500">Only needed if replacing the original document</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setData('license_document', e.target.files?.[0] || null)} />
                    </label>
                )}
                {errors.license_document && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{errors.license_document}</p>}
            </div>

            <button
                type="submit"
                disabled={processing}
                className="w-full py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`, boxShadow: '0 10px 30px -8px rgba(91,46,255,0.45)' }}
            >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                {processing ? 'Resubmitting…' : 'Resubmit Application'}
            </button>
        </form>
    );
}

export default function ClinicStatus({ tenant, canEdit, disciplines = [], disciplineLabels = {} }) {
    const [editing, setEditing] = useState(false);
    const meta = STATUS_META[tenant.status] || STATUS_META.pending_review;
    const Icon = meta.icon;

    return (
        <div className="min-h-screen antialiased text-slate-800 flex items-center justify-center px-6 py-16 relative overflow-hidden" style={{ fontFamily: UI_FONT, background: '#F8FAFC' }}>
            <Head title="Application Status" />

            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 45%, #ECFDF5 100%)' }} />
                <div className="absolute top-[-120px] right-[-100px] w-[480px] h-[480px] rounded-full" style={{ background: 'rgba(91,46,255,0.18)', filter: 'blur(110px)' }} />
            </div>

            <div className="max-w-lg w-full relative z-10">
                <div className="flex items-center justify-between mb-10">
                    <Link href="/" className="flex items-center">
                        <Logo size="md" />
                    </Link>
                    <Link
                        href="/logout" method="post" as="button"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors duration-200"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                    </Link>
                </div>

                <div
                    className="rounded-[20px] p-8 sm:p-9 space-y-6 border border-white/60 backdrop-blur-xl text-center"
                    style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 25px 70px -25px rgba(13,27,42,0.25)' }}
                >
                    <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: meta.bg }}>
                        <Icon className="w-6 h-6" style={{ color: meta.color }} />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: DEEP_NAVY }}>{meta.title}</h1>
                        <p className="text-sm text-slate-500 mt-2">{meta.body}</p>
                    </div>

                    <div className="text-left rounded-xl border border-slate-200 bg-white/70 px-4 py-3.5 space-y-1.5">
                        <p className="text-sm font-bold" style={{ color: DEEP_NAVY }}>{tenant.name}</p>
                        {tenant.submitted_at && <p className="text-xs text-slate-500">Submitted {tenant.submitted_at}</p>}
                        {tenant.reviewed_at && <p className="text-xs text-slate-500">Reviewed {tenant.reviewed_at}</p>}
                    </div>

                    {tenant.review_note && (tenant.status === 'needs_more_info' || tenant.status === 'rejected') && (
                        <div
                            className="text-left rounded-xl px-4 py-3.5 text-sm"
                            style={{ background: meta.bg, color: meta.color }}
                        >
                            {tenant.review_note}
                        </div>
                    )}

                    {canEdit && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="w-full py-3.5 px-4 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                            style={{ background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #2E9BE6 100%)`, boxShadow: '0 10px 30px -8px rgba(91,46,255,0.45)' }}
                        >
                            Update &amp; Resubmit
                        </button>
                    )}

                    {canEdit && editing && <ResubmitForm tenant={tenant} disciplines={disciplines} disciplineLabels={disciplineLabels} />}
                </div>
            </div>
        </div>
    );
}
