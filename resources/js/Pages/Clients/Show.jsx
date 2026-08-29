import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ArrowLeft, Users, Mail, Phone, Calendar, HeartHandshake,
    Pencil, Power, Trash2, CheckCircle2, AlertCircle, Clock, ShieldCheck,
    FileCheck2, Plus, Eye, ShieldAlert, AlertTriangle, ClipboardList,
    Link2, Copy, Send, ClipboardEdit
} from 'lucide-react';
import RecordConsentModal from '@/Components/Consent/RecordConsentModal';
import ViewConsentModal from '@/Components/Consent/ViewConsentModal';
import WithdrawConsentModal from '@/Components/Consent/WithdrawConsentModal';
import GenerateIntakeLinkModal from '@/Components/Intake/GenerateIntakeLinkModal';
import StaffFillIntakeModal from '@/Components/Intake/StaffFillIntakeModal';
import ViewIntakeModal from '@/Components/Intake/ViewIntakeModal';

const fieldClass = 'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/50 border';
const fieldStyle = { background: 'var(--umahz-hover)', borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-primary)' };
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider mb-1.5';

function StatusPill({ active }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={active
                ? { background: 'rgba(34,197,94,0.12)', color: '#16A34A' }
                : { background: 'var(--umahz-hover)', color: 'var(--umahz-text-tertiary)' }}
        >
            <span className="w-2 h-2 rounded-full" style={{ background: active ? '#22C55E' : '#94A3B8' }} />
            {active ? 'Active Account' : 'Inactive'}
        </span>
    );
}

function EditClientModal({ client, onClose }) {
    const { data, setData, patch, processing, errors } = useForm({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        date_of_birth: client.date_of_birth || '',
        sex: client.sex || '',
        preferred_contact_method: client.preferred_contact_method || 'email',
        emergency_contact_name: client.emergency_contact?.name || '',
        emergency_contact_phone: client.emergency_contact?.phone || '',
        emergency_contact_relationship: client.emergency_contact?.relationship || '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(`/app/clients/${client.id}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--umahz-border)' }}>
                    <h2 className="text-base font-bold text-slate-900">Edit Client Profile</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>First Name</label>
                            <input
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                                required
                            />
                            {errors.first_name && <p className="text-xs mt-1 text-rose-500">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Last Name</label>
                            <input
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                                required
                            />
                            {errors.last_name && <p className="text-xs mt-1 text-rose-500">{errors.last_name}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Email</label>
                            <input
                                type="email"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-xs mt-1 text-rose-500">{errors.email}</p>}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Phone</label>
                            <input
                                type="tel"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                            />
                            {errors.phone && <p className="text-xs mt-1 text-rose-500">{errors.phone}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Date of Birth</label>
                            <input
                                type="date"
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.date_of_birth}
                                onChange={(e) => setData('date_of_birth', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            {errors.date_of_birth && <p className="text-xs mt-1 text-rose-500">{errors.date_of_birth}</p>}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Sex / Gender</label>
                            <select
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.sex}
                                onChange={(e) => setData('sex', e.target.value)}
                            >
                                <option value="">Select Sex...</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                                <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                            {errors.sex && <p className="text-xs mt-1 text-rose-500">{errors.sex}</p>}
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Preferred Contact</label>
                            <select
                                className={fieldClass}
                                style={fieldStyle}
                                value={data.preferred_contact_method}
                                onChange={(e) => setData('preferred_contact_method', e.target.value)}
                            >
                                <option value="email">Email</option>
                                <option value="phone">Phone Call</option>
                                <option value="sms">SMS / Text</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-3 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <HeartHandshake className="w-4 h-4 text-violet-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Emergency Contact</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Contact Name</label>
                                    <input
                                        className={fieldClass}
                                        style={fieldStyle}
                                        value={data.emergency_contact_name}
                                        onChange={(e) => setData('emergency_contact_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Relationship</label>
                                    <input
                                        className={fieldClass}
                                        style={fieldStyle}
                                        value={data.emergency_contact_relationship}
                                        onChange={(e) => setData('emergency_contact_relationship', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass} style={{ color: 'var(--umahz-text-secondary)' }}>Phone</label>
                                <input
                                    type="tel"
                                    className={fieldClass}
                                    style={fieldStyle}
                                    value={data.emergency_contact_phone}
                                    onChange={(e) => setData('emergency_contact_phone', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--umahz-border)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[var(--umahz-hover)] text-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-violet-800 hover:bg-violet-900 transition shadow-sm disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ClientsShow({
    client,
    consents = [],
    consentTypes = [],
    intakes = [],
    intakeTemplates = [],
    clientAppointments = [],
    offeredDisciplines = [],
}) {
    const [editing, setEditing] = useState(false);
    const [recordingConsent, setRecordingConsent] = useState(false);
    const [viewingConsent, setViewingConsent] = useState(null);
    const [withdrawingConsent, setWithdrawingConsent] = useState(null);

    const [generatingIntakeLink, setGeneratingIntakeLink] = useState(false);
    const [staffFillingIntake, setStaffFillingIntake] = useState(false);
    const [viewingIntake, setViewingIntake] = useState(null);
    const [copiedIntakeId, setCopiedIntakeId] = useState(null);

    const { errors } = usePage().props;

    const fallbackCopy = (text, id) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            setCopiedIntakeId(id);
            setTimeout(() => setCopiedIntakeId(null), 2500);
        } catch (err) {
            console.error('Fallback copy failed: ', err);
        }
    };

    const copyToClipboard = (text, id) => {
        if (!text) return;
        if (navigator?.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    setCopiedIntakeId(id);
                    setTimeout(() => setCopiedIntakeId(null), 2500);
                })
                .catch(() => fallbackCopy(text, id));
        } else {
            fallbackCopy(text, id);
        }
    };

    const handleDeleteIntake = (intake) => {
        if (confirm(`Remove this pending intake link for ${intake.discipline ? intake.discipline.replace('_', ' ') : 'intake'}?`)) {
            router.delete(`/app/clients/${client.id}/intakes/${intake.id}`, {
                preserveScroll: true,
            });
        }
    };

    const handleToggle = () => {
        router.patch(`/app/clients/${client.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to remove client "${client.name}"?`)) {
            router.delete(`/app/clients/${client.id}`);
        }
    };

    return (
        <AuthenticatedLayout title={`${client.name} - Profile`}>
            <Head title={`${client.name} - Client Profile`} />

            {/* Back button */}
            <div className="mb-6">
                <Link
                    href="/app/clients"
                    className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Clients
                </Link>
            </div>

            {/* Error banner */}
            {errors?.client && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Action restricted</p>
                        <p className="text-xs text-amber-700 mt-0.5">{errors.client}</p>
                    </div>
                </div>
            )}

            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 font-bold text-xl flex items-center justify-center shadow-inner">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.name}</h1>
                                <StatusPill active={client.is_active} />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                <span>Patient record created {client.created_at}</span>
                                <span>•</span>
                                <span>{client.appointments_count} {client.appointments_count === 1 ? 'appointment' : 'appointments'} on file</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setRecordingConsent(true)}
                            className="inline-flex items-center px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                            <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                            Record Consent
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition"
                        >
                            <Pencil className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            Edit Profile
                        </button>
                        <button
                            type="button"
                            onClick={handleToggle}
                            className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${client.is_active ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'}`}
                        >
                            <Power className="w-3.5 h-3.5 mr-1.5" />
                            {client.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-slate-200 dark:border-slate-800 transition"
                            title="Delete Client"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Contact Information */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                        Contact & Personal Information
                    </h2>

                    <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        <div className="py-3 flex justify-between">
                            <dt className="text-slate-500 font-medium">Email Address</dt>
                            <dd className="font-semibold text-slate-800 dark:text-slate-200">
                                {client.email ? (
                                    <a href={`mailto:${client.email}`} className="text-violet-700 dark:text-violet-400 hover:underline">
                                        {client.email}
                                    </a>
                                ) : (
                                    <span className="text-slate-400">Not provided</span>
                                )}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between">
                            <dt className="text-slate-500 font-medium">Phone Number</dt>
                            <dd className="font-semibold text-slate-800 dark:text-slate-200">
                                {client.phone ? (
                                    <a href={`tel:${client.phone}`} className="text-violet-700 dark:text-violet-400 hover:underline">
                                        {client.phone}
                                    </a>
                                ) : (
                                    <span className="text-slate-400">Not provided</span>
                                )}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between">
                            <dt className="text-slate-500 font-medium">Date of Birth</dt>
                            <dd className="font-semibold text-slate-800 dark:text-slate-200">
                                {client.date_of_birth || <span className="text-slate-400">Not provided</span>}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between">
                            <dt className="text-slate-500 font-medium">Sex / Gender</dt>
                            <dd className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                {client.sex ? client.sex.replace(/_/g, ' ') : <span className="text-slate-400">Not specified</span>}
                            </dd>
                        </div>
                        <div className="py-3 flex justify-between">
                            <dt className="text-slate-500 font-medium">Preferred Contact Method</dt>
                            <dd className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                {client.preferred_contact_method || 'Email'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                        Emergency Contact
                    </h2>

                    {client.emergency_contact?.name || client.emergency_contact?.phone ? (
                        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            <div className="py-3 flex justify-between">
                                <dt className="text-slate-500 font-medium">Contact Name</dt>
                                <dd className="font-semibold text-slate-800 dark:text-slate-200">
                                    {client.emergency_contact?.name || '—'}
                                </dd>
                            </div>
                            <div className="py-3 flex justify-between">
                                <dt className="text-slate-500 font-medium">Relationship</dt>
                                <dd className="font-semibold text-slate-800 dark:text-slate-200">
                                    {client.emergency_contact?.relationship || '—'}
                                </dd>
                            </div>
                            <div className="py-3 flex justify-between">
                                <dt className="text-slate-500 font-medium">Phone</dt>
                                <dd className="font-semibold text-slate-800 dark:text-slate-200">
                                    {client.emergency_contact?.phone ? (
                                        <a href={`tel:${client.emergency_contact.phone}`} className="text-violet-700 dark:text-violet-400 hover:underline">
                                            {client.emergency_contact.phone}
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <div className="py-8 text-center text-slate-400 text-xs">
                            <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                            <p>No emergency contact specified.</p>
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="mt-2 text-violet-700 dark:text-violet-400 font-semibold hover:underline"
                            >
                                Add Emergency Contact
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Informed Consent Management Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Informed Consents & Agreements
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {consents.length} {consents.length === 1 ? 'record' : 'records'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Signed, timestamped healthcare agreements and audit trail for {client.name}.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setRecordingConsent(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Record New Consent
                    </button>
                </div>

                {consents.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                        <FileCheck2 className="w-10 h-10 mx-auto mb-2.5 opacity-35 text-slate-400" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Consents Recorded Yet</p>
                        <p className="text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                            Capture general treatment consent, sensitive-area consent, or custom agreements with a digital signature.
                        </p>
                        <button
                            type="button"
                            onClick={() => setRecordingConsent(true)}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 hover:bg-violet-100 font-semibold text-xs transition"
                        >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Record Client Consent
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                                    <th className="pb-3 pr-4">Agreement Type</th>
                                    <th className="pb-3 px-4">Status</th>
                                    <th className="pb-3 px-4">Agreed Date</th>
                                    <th className="pb-3 px-4">Signer & Method</th>
                                    <th className="pb-3 px-4">Witness (Staff)</th>
                                    <th className="pb-3 pl-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {consents.map((consent) => {
                                    const isWithdrawn = consent.status === 'withdrawn';
                                    return (
                                        <tr key={consent.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                            <td className="py-3.5 pr-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {consent.consent_type_name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    ID: {consent.id.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isWithdrawn
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isWithdrawn ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                    {isWithdrawn ? 'Withdrawn' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                                                {new Date(consent.agreed_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {consent.signer_name}
                                                </div>
                                                <span className="text-[10px] text-slate-400 capitalize">
                                                    {consent.signature_type === 'draw' ? '✍️ Drawn signature' : '⌨️ Typed signature'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                {consent.witnessed_by || 'Staff'}
                                            </td>
                                            <td className="py-3.5 pl-4 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingConsent(consent)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                        View
                                                    </button>
                                                    {!isWithdrawn && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setWithdrawingConsent(consent)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                                            title="Withdraw consent agreement"
                                                        >
                                                            Withdraw
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Health History & Intake Questionnaires Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Health History & Intake Questionnaires
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {intakes.length} {intakes.length === 1 ? 'record' : 'records'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Profession-specific health records, contraindication alerts, and patient magic links.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setStaffFillingIntake(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                        >
                            <ClipboardEdit className="w-3.5 h-3.5" />
                            Staff Fill Intake
                        </button>
                        <button
                            type="button"
                            onClick={() => setGeneratingIntakeLink(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition shadow-sm"
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            Send Patient Link
                        </button>
                    </div>
                </div>

                {intakes.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2.5 opacity-35 text-slate-400" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Intake Questionnaires on File</p>
                        <p className="text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                            Generate a personalized 7-day magic link for {client.name} to self-complete, or record an intake directly during an in-person visit.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => setGeneratingIntakeLink(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 hover:bg-violet-100 font-semibold text-xs transition"
                            >
                                <Link2 className="w-3.5 h-3.5" />
                                Send Patient Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setStaffFillingIntake(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
                            >
                                <ClipboardEdit className="w-3.5 h-3.5" />
                                Staff Fill
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                                    <th className="pb-3 pr-4">Discipline</th>
                                    <th className="pb-3 px-4">Completion Mode</th>
                                    <th className="pb-3 px-4">Date Submitted / Created</th>
                                    <th className="pb-3 px-4">Status & Clinical Alerts</th>
                                    <th className="pb-3 pl-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {intakes.map((intake) => {
                                    const isFlagged = intake.status === 'flagged';
                                    const isCompleted = intake.status === 'completed';
                                    const isPending = intake.status === 'pending';

                                    return (
                                        <tr key={intake.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="py-3.5 pr-4">
                                                <div className="font-bold text-slate-900 dark:text-white capitalize">
                                                    {intake.discipline ? intake.discipline.replace('_', ' ') : 'Health History'}
                                                </div>
                                                <span className="text-[11px] text-slate-400">
                                                    {intake.template_name || 'Standard Intake'}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 capitalize">
                                                {intake.submission_type === 'patient_link' ? 'Patient Magic Link' : 'Staff Recorded'}
                                            </td>

                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                {intake.submitted_at
                                                    ? new Date(intake.submitted_at).toLocaleDateString()
                                                    : intake.expires_at
                                                        ? `Expires: ${new Date(intake.expires_at).toLocaleDateString()}`
                                                        : '—'}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {isFlagged ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        ⚠️ Contraindications ({intake.flags_count || 1})
                                                    </span>
                                                ) : isCompleted ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                        <Clock className="w-3 h-3" />
                                                        Pending Patient Link
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3.5 pl-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isPending && intake.public_fill_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(intake.public_fill_url, intake.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
                                                            title="Copy unguessable patient fill link"
                                                        >
                                                            <Copy className="w-3 h-3 text-slate-400" />
                                                            {copiedIntakeId === intake.id ? 'Copied!' : 'Copy Link'}
                                                        </button>
                                                    )}

                                                    {isPending && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteIntake(intake)}
                                                            className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                                            title="Delete pending intake link"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {(isCompleted || isFlagged) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingIntake(intake)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-violet-500" />
                                                            View & Print
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Profile Modal */}
            {editing && (
                <EditClientModal
                    client={client}
                    onClose={() => setEditing(false)}
                />
            )}

            {/* Record Consent Modal */}
            {recordingConsent && (
                <RecordConsentModal
                    client={client}
                    consentTypes={consentTypes}
                    onClose={() => setRecordingConsent(false)}
                />
            )}

            {/* View Signed Consent Modal */}
            {viewingConsent && (
                <ViewConsentModal
                    consent={viewingConsent}
                    onClose={() => setViewingConsent(null)}
                    onWithdraw={(consent) => setWithdrawingConsent(consent)}
                />
            )}

            {/* Withdraw Consent Modal */}
            {withdrawingConsent && (
                <WithdrawConsentModal
                    consent={withdrawingConsent}
                    onClose={() => setWithdrawingConsent(null)}
                />
            )}

            {/* Generate Intake Link Modal */}
            {generatingIntakeLink && (
                <GenerateIntakeLinkModal
                    client={client}
                    offeredDisciplines={offeredDisciplines}
                    appointments={clientAppointments}
                    onClose={() => setGeneratingIntakeLink(false)}
                />
            )}

            {/* Staff Fill Intake Modal */}
            {staffFillingIntake && (
                <StaffFillIntakeModal
                    client={client}
                    offeredDisciplines={offeredDisciplines}
                    intakeTemplates={intakeTemplates}
                    appointments={clientAppointments}
                    onClose={() => setStaffFillingIntake(false)}
                />
            )}

            {/* View Intake Modal */}
            {viewingIntake && (
                <ViewIntakeModal
                    client={client}
                    intakeSummary={viewingIntake}
                    onClose={() => setViewingIntake(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}

