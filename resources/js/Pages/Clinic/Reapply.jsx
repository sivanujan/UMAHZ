import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Building2, MapPin, User, Mail, Phone, IdCard, FileText, Upload,
    X, LogOut, AlertTriangle, CheckCircle2, ShieldCheck, Loader2,
    ArrowLeft, AlertCircle, Sparkles, Check, CheckCircle
} from 'lucide-react';
import Logo from '@/Components/Common/Logo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { ThemeProvider } from '@/Contexts/ThemeContext';

const SECTION_LABELS = {
    clinic_details: 'Clinic Details & Subdomain',
    documents_license: 'Licence & Credentials',
    disciplines: 'Offered Disciplines',
    contact: 'Contact Information',
    other: 'Other Requirements',
};

function ClinicReapplyContent({
    tenant,
    primaryPractitioner,
    allDisciplines = [],
    provinces = [],
    subdomainSuffix = '.umahz.com',
}) {
    // Form state pre-filled from existing tenant data
    const [clinicName, setClinicName] = useState(tenant.name || '');
    const [subdomain, setSubdomain] = useState(tenant.subdomain || '');
    const [businessReg, setBusinessReg] = useState(tenant.business_registration_number || '');
    const [addressLine1, setAddressLine1] = useState(tenant.address?.line1 || '');
    const [addressCity, setAddressCity] = useState(tenant.address?.city || '');
    const [addressRegion, setAddressRegion] = useState(tenant.address?.region || 'ON');
    const [addressCountry, setAddressCountry] = useState(tenant.address?.country || 'CA');
    const [contactName, setContactName] = useState(tenant.primary_contact_name || '');
    const [contactPhone, setContactPhone] = useState(tenant.primary_contact_phone || '');
    const [requestedDisciplines, setRequestedDisciplines] = useState(tenant.requested_disciplines || []);
    const [estimatedPractitioners, setEstimatedPractitioners] = useState(tenant.estimated_practitioner_count || 1);

    // Licensing state
    const [licenseNumber, setLicenseNumber] = useState(primaryPractitioner?.license_number || '');
    const [licensingBody, setLicensingBody] = useState(primaryPractitioner?.licensing_body || '');
    const [licenseDocument, setLicenseDocument] = useState(null);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Flagged sections from admin review
    const flagged = tenant.rejection_sections || [];
    const isSectionFlagged = (sec) => flagged.includes(sec);

    const toggleDiscipline = (val) => {
        if (requestedDisciplines.includes(val)) {
            setRequestedDisciplines(requestedDisciplines.filter((d) => d !== val));
        } else {
            setRequestedDisciplines([...requestedDisciplines, val]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});

        // Client-side quick check
        const localErrors = {};
        if (!clinicName.trim()) localErrors.clinic_name = 'Clinic name is required';
        if (!subdomain.trim()) localErrors.subdomain = 'Workspace subdomain is required';
        if (!contactName.trim()) localErrors.primary_contact_name = 'Primary contact name is required';
        if (!contactPhone.trim()) localErrors.primary_contact_phone = 'Primary contact phone is required';
        if (requestedDisciplines.length === 0) localErrors.requested_disciplines = 'Please select at least one healthcare discipline';
        if (!licenseNumber.trim()) localErrors.license_number = 'License or registration number is required';
        if (!licensingBody.trim()) localErrors.licensing_body = 'Licensing college or body is required';

        if (Object.keys(localErrors).length > 0) {
            setErrors(localErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);

        const fd = new FormData();
        fd.append('clinic_name', clinicName.trim());
        fd.append('subdomain', subdomain.trim());
        fd.append('business_registration_number', businessReg.trim());
        fd.append('address_line1', addressLine1.trim());
        fd.append('address_city', addressCity.trim());
        fd.append('address_region', addressRegion);
        fd.append('address_country', addressCountry);
        fd.append('primary_contact_name', contactName.trim());
        fd.append('primary_contact_phone', contactPhone.trim());
        requestedDisciplines.forEach((d) => fd.append('requested_disciplines[]', d));
        fd.append('estimated_practitioner_count', estimatedPractitioners);
        fd.append('license_number', licenseNumber.trim());
        fd.append('licensing_body', licensingBody.trim());
        if (licenseDocument) {
            fd.append('license_document', licenseDocument);
        }

        router.post('/clinic/reapply', fd, {
            forceFormData: true,
            onError: (errs) => {
                setErrors(errs);
                setIsSubmitting(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300">
            <Head title="Update & Re-apply — Clinic Application" />

            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl opacity-70" />
                <div className="absolute top-1/3 -right-[200px] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            {/* Top Navigation */}
            <header className="relative z-20 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 transition-colors">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Logo size="md" />
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/clinic/status"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to status
                        </Link>
                        <ThemeToggle size="sm" />
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" /> Sign out
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 relative z-10 space-y-7">
                {/* Hero Header */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Resubmitting as Attempt {tenant.next_attempt} of {tenant.max_attempts}</span>
                        <span className="text-amber-400/60">•</span>
                        <span>{tenant.attempts_remaining} {tenant.attempts_remaining === 1 ? 'attempt' : 'attempts'} remaining</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Update &amp; Re-apply
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                        Review the feedback from our team, update your clinic details, and resubmit your application. Your existing account and credentials remain active.
                    </p>
                </div>

                {/* Subdomain Conflict Alert */}
                {tenant.subdomain_conflict && (
                    <div className="rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{tenant.subdomain_conflict}</span>
                    </div>
                )}

                {/* Review Feedback Card */}
                <div className="rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/30 backdrop-blur-sm p-6 space-y-4 shadow-sm">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h2 className="text-base font-bold text-amber-950 dark:text-amber-200">
                                Changes Requested by Review Team
                            </h2>
                            <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
                                Please address the items below before resubmitting.
                            </p>
                        </div>
                    </div>

                    {tenant.rejection_note && (
                        <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-800/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed shadow-xs">
                            <p className="font-semibold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                                Review Team Note
                            </p>
                            <p className="whitespace-pre-line">{tenant.rejection_note}</p>
                        </div>
                    )}

                    {flagged.length > 0 && (
                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-2">
                                Sections requiring updates:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {flagged.map((sec) => (
                                    <span
                                        key={sec}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60"
                                    >
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        {SECTION_LABELS[sec] || sec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: Clinic Details */}
                    <section
                        className={`rounded-2xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-5 ${
                            isSectionFlagged('clinic_details')
                                ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                                : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                                    <Building2 className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Clinic Details &amp; Subdomain
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        General practice details and dedicated workspace address
                                    </p>
                                </div>
                            </div>
                            {isSectionFlagged('clinic_details') && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Flagged for changes
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Clinic Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                        errors.clinic_name
                                            ? 'border-rose-400 focus:border-rose-500'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                                    }`}
                                    placeholder="e.g. Pure Health Wellness Clinic"
                                />
                                {errors.clinic_name && <p className="text-[11px] text-rose-500 mt-1">{errors.clinic_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Workspace Address (Subdomain) <span className="text-rose-500">*</span>
                                </label>
                                <div className={`flex items-center rounded-xl border overflow-hidden bg-white dark:bg-slate-950/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all ${
                                    errors.subdomain
                                        ? 'border-rose-400 focus-within:border-rose-500'
                                        : 'border-slate-200 dark:border-slate-700 focus-within:border-indigo-500'
                                }`}>
                                    <input
                                        type="text"
                                        value={subdomain}
                                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        className="w-full px-4 py-3 text-sm bg-transparent text-slate-900 dark:text-white outline-none"
                                        placeholder="purehealth"
                                    />
                                    <span className="px-3.5 py-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 font-medium shrink-0">
                                        {subdomainSuffix}
                                    </span>
                                </div>
                                {errors.subdomain && <p className="text-[11px] text-rose-500 mt-1">{errors.subdomain}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Business Registration Number
                            </label>
                            <input
                                type="text"
                                value={businessReg}
                                onChange={(e) => setBusinessReg(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="Optional official registration or corporate number"
                            />
                            {errors.business_registration_number && (
                                <p className="text-[11px] text-rose-500 mt-1">{errors.business_registration_number}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Street Address
                                </label>
                                <input
                                    type="text"
                                    value={addressLine1}
                                    onChange={(e) => setAddressLine1(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="123 Wellness Way"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={addressCity}
                                    onChange={(e) => setAddressCity(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Toronto"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Province
                                </label>
                                <select
                                    value={addressRegion}
                                    onChange={(e) => setAddressRegion(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                >
                                    {provinces.map((prov) => (
                                        <option key={prov.code || prov} value={prov.code || prov}>
                                            {prov.name || prov}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: Contact Information */}
                    <section
                        className={`rounded-2xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-5 ${
                            isSectionFlagged('contact')
                                ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                                : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                                    <User className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Contact Information
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Primary representative details
                                    </p>
                                </div>
                            </div>
                            {isSectionFlagged('contact') && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Flagged for changes
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Primary Contact Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                        errors.primary_contact_name
                                            ? 'border-rose-400 focus:border-rose-500'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                                    }`}
                                />
                                {errors.primary_contact_name && (
                                    <p className="text-[11px] text-rose-500 mt-1">{errors.primary_contact_name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Primary Contact Phone <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                        errors.primary_contact_phone
                                            ? 'border-rose-400 focus:border-rose-500'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                                    }`}
                                />
                                {errors.primary_contact_phone && (
                                    <p className="text-[11px] text-rose-500 mt-1">{errors.primary_contact_phone}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: Disciplines */}
                    <section
                        className={`rounded-2xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-5 ${
                            isSectionFlagged('disciplines')
                                ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                                : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                                    <Sparkles className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Offered Disciplines
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Select all healthcare specialties provided at your clinic
                                    </p>
                                </div>
                            </div>
                            {isSectionFlagged('disciplines') && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Flagged for changes
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {allDisciplines.map((d) => {
                                    const code = d.code || d;
                                    const label = d.label || d;
                                    const isSelected = requestedDisciplines.includes(code);

                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            onClick={() => toggleDiscipline(code)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-xs'
                                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            <span>{label}</span>
                                            {isSelected && (
                                                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.requested_disciplines && (
                                <p className="text-[11px] text-rose-500 mt-2">{errors.requested_disciplines}</p>
                            )}
                        </div>

                        <div className="max-w-xs pt-1">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Estimated Practitioners
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="500"
                                value={estimatedPractitioners}
                                onChange={(e) => setEstimatedPractitioners(parseInt(e.target.value, 10) || 1)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                    </section>

                    {/* SECTION 4: Licence & Credentials */}
                    <section
                        className={`rounded-2xl p-6 sm:p-7 bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-5 ${
                            isSectionFlagged('documents_license')
                                ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                                : 'border-slate-200/80 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                                    <IdCard className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Licence &amp; Credentials
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Professional credentials and verification document
                                    </p>
                                </div>
                            </div>
                            {isSectionFlagged('documents_license') && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Flagged for changes
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    License / Registration Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                        errors.license_number
                                            ? 'border-rose-400 focus:border-rose-500'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                                    }`}
                                />
                                {errors.license_number && (
                                    <p className="text-[11px] text-rose-500 mt-1">{errors.license_number}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Licensing College / Body <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={licensingBody}
                                    onChange={(e) => setLicensingBody(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                                        errors.licensing_body
                                            ? 'border-rose-400 focus:border-rose-500'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                                    }`}
                                />
                                {errors.licensing_body && (
                                    <p className="text-[11px] text-rose-500 mt-1">{errors.licensing_body}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Verification Document {primaryPractitioner?.has_document ? '(Optional replacement)' : '*'}
                            </label>

                            {primaryPractitioner?.has_document && !licenseDocument && (
                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                            Current file: {primaryPractitioner.document_name || 'Uploaded license document'}
                                        </span>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0 ml-2">
                                        On file
                                    </span>
                                </div>
                            )}

                            {licenseDocument ? (
                                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="font-medium truncate">{licenseDocument.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setLicenseDocument(null)}
                                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                                        title="Remove selected replacement file"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                        {primaryPractitioner?.has_document
                                            ? 'Click to choose replacement document (PDF, PNG, JPG, max 10MB)'
                                            : 'Upload license document (PDF, PNG, JPG, max 10MB)'}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => setLicenseDocument(e.target.files?.[0] || null)}
                                    />
                                </label>
                            )}
                            {errors.license_document && (
                                <p className="text-[11px] text-rose-500 mt-1">{errors.license_document}</p>
                            )}
                        </div>
                    </section>

                    {/* SECTION 5: Reassuring Payment Notice (Card already verified) */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/40 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Payment Method Already Verified
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                    On file
                                </span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Your payment card was already authorized and safely verified during your initial application. You do not need to re-enter your card details. You will only be charged after your clinic is reviewed and approved.
                            </p>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                        <Link
                            href="/clinic/status"
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Cancel and return to status page
                        </Link>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Resubmitting Application…</span>
                                </>
                            ) : (
                                <>
                                    <span>Resubmit Application (Attempt {tenant.next_attempt})</span>
                                    <Sparkles className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default function ClinicReapply(props) {
    return (
        <ThemeProvider>
            <ClinicReapplyContent {...props} />
        </ThemeProvider>
    );
}
