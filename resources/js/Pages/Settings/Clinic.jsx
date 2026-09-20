import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AddressPicker from '@/Components/AddressPicker';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassButton } from '@/Components/UI/GlassButton';
import { GlassInput, GlassSelect, GlassLabel, GlassError } from '@/Components/UI/FormControls';
import {
    Building2, Mail, Phone, MapPin, Stethoscope, Palette, Upload,
    Check, ShieldCheck, ClipboardList, Plus, Trash2, Globe, ArrowRight,
    Sparkles, Save, FileText, CheckCircle2, ChevronRight, Sliders
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
    physiotherapy: 'Physiotherapy',
    chiropractor: 'Chiropractor',
};

const SETTINGS_TABS = [
    {
        id: 'profile',
        label: 'Clinic Profile',
        description: 'Name, address, contact & currency',
        icon: Building2,
    },
    {
        id: 'disciplines',
        label: 'Disciplines',
        description: 'Offered medical & wellness services',
        icon: Stethoscope,
    },
    {
        id: 'branding',
        label: 'Branding',
        description: 'Logo & brand accent colors',
        icon: Palette,
    },
    {
        id: 'public_page',
        label: 'Public Page',
        description: 'Patient homepage & visual page builder',
        icon: Globe,
    },
    {
        id: 'compliance',
        label: 'Compliance',
        description: 'Consent agreements & intake forms',
        icon: ShieldCheck,
    },
    {
        id: 'clinical_docs',
        label: 'Clinical Docs',
        description: 'Encounter & SOAP note templates',
        icon: FileText,
    },
];

/* ----------------------------- Profile Section ----------------------------- */

function ProfileSection({ tenant, timezones, currencies, provinces, countries, cities }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: tenant.name || '',
        email: tenant.email || tenant.primary_contact_email || '',
        phone: tenant.phone || tenant.primary_contact_phone || '',
        address_line1: tenant.address?.line1 || '',
        address_city: tenant.address?.city || '',
        address_region: tenant.address?.region || '',
        address_country: tenant.address?.country || countries[0] || 'Canada',
        address_lat: tenant.address?.lat ?? null,
        address_lng: tenant.address?.lng ?? null,
        timezone: tenant.timezone || 'America/Toronto',
        currency: tenant.currency || 'CAD',
    });

    const onPick = (a) => setData((prev) => ({
        ...prev,
        address_line1: a.line1 || prev.address_line1,
        address_city: a.city || prev.address_city,
        address_region: a.region || prev.address_region,
        address_country: a.country || prev.address_country,
        address_lat: a.lat,
        address_lng: a.lng,
    }));

    const submit = (e) => {
        e.preventDefault();
        patch('/app/settings/profile', { preserveScroll: true });
    };

    const fullAddress = [data.address_line1, data.address_city, data.address_region, data.address_country]
        .filter(Boolean)
        .join(', ');

    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/10">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Clinic Profile</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your clinic details shown on client receipts, invoices, and booking confirmations.
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <GlassLabel required>Clinic Official Name</GlassLabel>
                    <GlassInput
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        placeholder="e.g. Astrogenapp Health & Wellness"
                    />
                    <GlassError message={errors.name} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <GlassLabel required>Contact Email</GlassLabel>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                            <GlassInput
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                className="pl-10"
                                placeholder="clinic@domain.com"
                            />
                        </div>
                        <GlassError message={errors.email} />
                    </div>
                    <div>
                        <GlassLabel required>Contact Phone</GlassLabel>
                        <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                            <GlassInput
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                required
                                className="pl-10"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <GlassError message={errors.phone} />
                    </div>
                </div>

                {/* Address & Interactive Map */}
                <div className="space-y-3 pt-2">
                    <GlassLabel required>Street Address & Map Pin</GlassLabel>
                    <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <GlassInput
                            type="text"
                            value={data.address_line1}
                            onChange={(e) => setData('address_line1', e.target.value)}
                            required
                            placeholder="Street address line (e.g. 123 Health Ave, Suite 200)"
                            className="pl-10"
                        />
                    </div>
                    <GlassError message={errors.address_line1} />

                    <div className="pt-2">
                        <AddressPicker
                            provinces={provinces}
                            lat={data.address_lat}
                            lng={data.address_lng}
                            onPick={onPick}
                            addressText={fullAddress}
                        />
                    </div>
                </div>

                {/* City, Province, Country */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <GlassLabel required>City</GlassLabel>
                        <GlassInput
                            type="text"
                            list="ca-cities"
                            value={data.address_city}
                            onChange={(e) => setData('address_city', e.target.value)}
                            required
                            placeholder="Toronto"
                        />
                        <GlassError message={errors.address_city} />
                    </div>
                    <div>
                        <GlassLabel required>Province / State</GlassLabel>
                        <GlassSelect
                            value={data.address_region}
                            onChange={(e) => setData('address_region', e.target.value)}
                            required
                        >
                            <option value="" disabled>Select province</option>
                            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                        </GlassSelect>
                        <GlassError message={errors.address_region} />
                    </div>
                    <div>
                        <GlassLabel required>Country</GlassLabel>
                        <GlassSelect
                            value={data.address_country}
                            onChange={(e) => setData('address_country', e.target.value)}
                            required
                        >
                            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                        </GlassSelect>
                    </div>
                </div>
                <datalist id="ca-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>

                {/* Timezone & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <GlassLabel>Clinic Timezone</GlassLabel>
                        <GlassSelect
                            value={data.timezone}
                            onChange={(e) => setData('timezone', e.target.value)}
                        >
                            {timezones.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                        </GlassSelect>
                    </div>
                    <div>
                        <GlassLabel>Billing Currency</GlassLabel>
                        <GlassSelect
                            value={data.currency}
                            onChange={(e) => setData('currency', e.target.value)}
                        >
                            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                        </GlassSelect>
                    </div>
                </div>

                {/* Sticky Save Bar */}
                <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end">
                    <GlassButton
                        type="submit"
                        variant="primary"
                        disabled={processing}
                        icon={<Save className="w-4 h-4" />}
                    >
                        Save Profile Changes
                    </GlassButton>
                </div>
            </form>
        </GlassCard>
    );
}

/* ---------------------------- Disciplines Section ---------------------------- */

function DisciplinesSection({ tenant, allDisciplines = [], customDisciplines = [], disciplineLabels = {} }) {
    const labelsMap = { ...DISCIPLINE_LABELS, ...disciplineLabels };
    const { data, setData, patch, processing, errors } = useForm({
        disciplines: tenant.requested_disciplines || [],
        custom_disciplines: customDisciplines.length ? customDisciplines : (tenant.custom_disciplines || []),
    });

    const [newCustomName, setNewCustomName] = useState('');
    const [localError, setLocalError] = useState(null);

    const toggle = (d) => {
        setData('disciplines', data.disciplines.includes(d)
            ? data.disciplines.filter((x) => x !== d)
            : [...data.disciplines, d]);
    };

    const handleAddCustom = () => {
        const trimmed = newCustomName.trim();
        if (!trimmed) return;
        if (trimmed.length < 2) {
            setLocalError('Discipline name must be at least 2 characters.');
            return;
        }
        if (trimmed.length > 50) {
            setLocalError('Discipline name must not exceed 50 characters.');
            return;
        }

        const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (!slug) {
            setLocalError('Please enter a valid discipline name.');
            return;
        }

        if (allDisciplines.includes(slug) || Object.values(DISCIPLINE_LABELS).some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
            setLocalError(`"${trimmed}" is already a standard platform discipline.`);
            return;
        }

        if ((data.custom_disciplines || []).some((c) => c.slug === slug || c.label.toLowerCase() === trimmed.toLowerCase())) {
            setLocalError(`"${trimmed}" is already added.`);
            return;
        }

        const newItem = { slug, label: trimmed };
        setData((prev) => ({
            ...prev,
            custom_disciplines: [...(prev.custom_disciplines || []), newItem],
            disciplines: [...prev.disciplines, slug],
        }));
        setNewCustomName('');
        setLocalError(null);
    };

    const handleRemoveCustom = (slug) => {
        setData((prev) => ({
            ...prev,
            custom_disciplines: (prev.custom_disciplines || []).filter((c) => c.slug !== slug),
            disciplines: prev.disciplines.filter((d) => d !== slug),
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        patch('/app/settings/disciplines', { preserveScroll: true });
    };

    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/10">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Disciplines Offered</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Practitioners and services can only be assigned to disciplines your clinic offers.
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        Platform Standard Disciplines
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allDisciplines.map((d) => {
                            const active = data.disciplines.includes(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => toggle(d)}
                                    aria-pressed={active}
                                    className={`text-left px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3 ${
                                        active
                                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-950 dark:text-purple-200 shadow-xs'
                                            : 'bg-white/40 dark:bg-white/[0.03] border-white/40 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                        active ? 'bg-[#8200db] border-[#8200db]' : 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/10'
                                    }`}>
                                        {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                    </span>
                                    <span>{labelsMap[d] || d}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Disciplines */}
                {(data.custom_disciplines || []).length > 0 && (
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                            Custom Clinic Disciplines
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(data.custom_disciplines || []).map((item) => {
                                const active = data.disciplines.includes(item.slug);
                                return (
                                    <div
                                        key={item.slug}
                                        className={`px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 ${
                                            active
                                                ? 'bg-purple-500/15 border-purple-500/40 text-purple-950 dark:text-purple-200 shadow-xs'
                                                : 'bg-white/40 dark:bg-white/[0.03] border-white/40 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggle(item.slug)}
                                            className="flex items-center gap-3 flex-1 text-left min-w-0"
                                        >
                                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                                active ? 'bg-[#8200db] border-[#8200db]' : 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/10'
                                            }`}>
                                                {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                            </span>
                                            <span className="truncate flex-1">{item.label}</span>
                                            <span className="text-[10px] uppercase tracking-wider text-purple-700 dark:text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-md">
                                                Custom
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustom(item.slug)}
                                            title={`Remove custom discipline "${item.label}"`}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add Custom Discipline Box */}
                <div className="bg-white/50 dark:bg-white/[0.03] border border-white/40 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Add Custom Discipline</span>
                        <span className="text-[11px] font-normal text-slate-400">e.g. Physiotherapy, Reiki, Chiropractic, Kinesiology</span>
                    </label>
                    <div className="flex gap-2.5">
                        <GlassInput
                            type="text"
                            value={newCustomName}
                            onChange={(e) => { setNewCustomName(e.target.value); setLocalError(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
                            placeholder="Enter discipline name..."
                            className="flex-1"
                        />
                        <GlassButton
                            type="button"
                            variant="secondary"
                            onClick={handleAddCustom}
                            icon={<Plus className="w-4 h-4" />}
                        >
                            Add
                        </GlassButton>
                    </div>
                    {localError && <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{localError}</p>}
                </div>

                {errors.disciplines && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.disciplines}</p>}
                {errors.custom_disciplines && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.custom_disciplines}</p>}

                {/* Sticky Save Bar */}
                <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end">
                    <GlassButton
                        type="submit"
                        variant="primary"
                        disabled={processing}
                        icon={<Save className="w-4 h-4" />}
                    >
                        Update Disciplines
                    </GlassButton>
                </div>
            </form>
        </GlassCard>
    );
}

/* ----------------------------- Branding Section ----------------------------- */

function BrandingSection({ tenant }) {
    const { data, setData, post, processing, errors } = useForm({
        logo: null,
        brand_color: tenant.brand_color || '#8200db',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/app/settings/branding', { forceFormData: true, preserveScroll: true });
    };

    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/10">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Palette className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Branding & Theme</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Customize your clinic logo and primary brand accent across all client-facing pages.
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                {/* Clinic Logo */}
                <div>
                    <GlassLabel>Clinic Logo</GlassLabel>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                        <div className="w-20 h-20 rounded-2xl bg-white/60 dark:bg-white/10 border border-slate-200/80 dark:border-white/15 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                            {data.logo ? (
                                <img src={URL.createObjectURL(data.logo)} alt="Logo preview" className="w-full h-full object-cover" />
                            ) : tenant.logo_url ? (
                                <img src={tenant.logo_url} alt="Current logo" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 className="w-8 h-8 text-slate-400" />
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-white/10 border border-slate-200/80 dark:border-white/15 hover:border-purple-500 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer transition-colors shadow-xs">
                                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                Choose New Logo
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setData('logo', e.target.files[0] ?? null)}
                                />
                            </label>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Recommended: Square or wide PNG/SVG with transparent background (min 250×250px).
                            </p>
                        </div>
                    </div>
                    <GlassError message={errors.logo} />
                </div>

                {/* Brand Color & Live Preview */}
                <div className="pt-2">
                    <GlassLabel>Brand Accent Colour</GlassLabel>
                    <div className="flex items-center gap-3 mt-1.5 max-w-sm">
                        <input
                            type="color"
                            value={data.brand_color}
                            onChange={(e) => setData('brand_color', e.target.value)}
                            className="w-12 h-11 rounded-xl border border-slate-200 dark:border-white/15 cursor-pointer bg-transparent shrink-0"
                        />
                        <GlassInput
                            type="text"
                            value={data.brand_color}
                            onChange={(e) => setData('brand_color', e.target.value)}
                            className="flex-1 font-mono uppercase"
                        />
                    </div>
                    <GlassError message={errors.brand_color} />

                    {/* Live Accent Preview Box */}
                    <div className="mt-4 p-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] space-y-2.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Live Color Preview:
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                style={{ backgroundColor: data.brand_color }}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 pointer-events-none"
                            >
                                Primary Button
                            </button>
                            <span
                                style={{
                                    backgroundColor: `${data.brand_color}18`,
                                    borderColor: `${data.brand_color}40`,
                                    color: data.brand_color,
                                }}
                                className="px-3 py-1 rounded-full text-xs font-bold border"
                            >
                                Active Pill Badge
                            </span>
                            <span
                                style={{ color: data.brand_color }}
                                className="text-xs font-extrabold"
                            >
                                Active Link Preview
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sticky Save Bar */}
                <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end">
                    <GlassButton
                        type="submit"
                        variant="primary"
                        disabled={processing}
                        icon={<Save className="w-4 h-4" />}
                    >
                        Save Branding
                    </GlassButton>
                </div>
            </form>
        </GlassCard>
    );
}

/* ---------------------------- Public Page Section ---------------------------- */

function PublicPageSection() {
    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/10">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Globe className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Public Clinic Home Page</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure what patients see when visiting your clinic subdomain.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Action Row 1: Simple Settings */}
                <div className="p-5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/[0.06]">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Standard Home Page Settings</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                Default
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                            Configure clinic tagline, introductory narrative, business operating hours, social media links, and call-to-action buttons.
                        </p>
                    </div>
                    <Link href="/app/settings/homepage" className="shrink-0">
                        <GlassButton variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Configure Settings
                        </GlassButton>
                    </Link>
                </div>

                {/* Action Row 2: Visual Page Builder */}
                <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-purple-500/10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-[#8200db] dark:text-purple-300" />
                                Visual Drag-and-Drop Page Builder
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300">
                                Advanced
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                            Build a custom marketing site with interactive blocks, treatment carousels, practitioner profiles, and Google reviews.
                        </p>
                    </div>
                    <Link href="/app/settings/page-builder" className="shrink-0">
                        <GlassButton variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Launch Page Builder
                        </GlassButton>
                    </Link>
                </div>
            </div>
        </GlassCard>
    );
}

/* ---------------------------- Compliance Section ---------------------------- */

function ComplianceSection() {
    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/10">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compliance & Clinical Intake</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage patient legal consents, terms of service, and health-history intake templates.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Action Row 1: Consents */}
                <div className="p-5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/[0.06]">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Informed Consent Agreements</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                Legal Mandatory
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                            Configure required legal terms, treatment agreements, and sensitive-area consent forms with digital signatures prior to booking.
                        </p>
                    </div>
                    <Link href="/app/settings/consents" className="shrink-0">
                        <GlassButton variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Configure Consents
                        </GlassButton>
                    </Link>
                </div>

                {/* Action Row 2: Intake Questionnaires */}
                <div className="p-5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/[0.06]">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Discipline Intake Questionnaires</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                Clinical Screening
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                            Customize health-history templates and automated red-flag contraindication screening across all clinic disciplines.
                        </p>
                    </div>
                    <Link href="/app/settings/intake-forms" className="shrink-0">
                        <GlassButton variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Manage Intake Forms
                        </GlassButton>
                    </Link>
                </div>
            </div>
        </GlassCard>
    );
}

/* -------------------------- Clinical Docs Section -------------------------- */

function ClinicalDocsSection() {
    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/10">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-[#8200db] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Clinical Documentation</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure customized clinical charting, SOAP note structures, and encounter templates.
                    </p>
                </div>
            </div>

            <div className="p-5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/[0.06]">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Clinical Note & Charting Templates</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                            Customizable
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                        Customize versioned encounter note templates for practitioners across all offered disciplines. Supports SOAP notes, TCM tongue/pulse observations, personal training progression, and nutrition assessments.
                    </p>
                </div>
                <Link href="/app/settings/clinical-note-templates" className="shrink-0">
                    <GlassButton variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Configure Templates
                    </GlassButton>
                </Link>
            </div>
        </GlassCard>
    );
}

/* ------------------------------- Main Page ------------------------------- */

export default function ClinicSettings({
    tenant,
    timezones = [],
    currencies = [],
    provinces = [],
    countries = [],
    cities = [],
    allDisciplines = [],
    customDisciplines = [],
    disciplineLabels = {},
}) {
    const { flash } = usePage().props;
    const shouldReduceMotion = useReducedMotion();

    // Deep-linked active tab state from URL query param
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)) {
                return tabParam;
            }
        }
        return 'profile';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tabId);
            window.history.replaceState({}, '', url.toString());
        }
    };

    return (
        <AuthenticatedLayout title="Clinic Settings">
            <Head title="Clinic Settings" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <PageHeader
                    eyebrow="Administration"
                    title="Clinic Settings"
                    subtitle="Configure clinic profile details, offered disciplines, branding, and clinical documentation."
                />

                {flash?.success && (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Mobile / Tablet Horizontal Scrollable Tab Bar */}
                <div className="lg:hidden p-1.5 rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-white/40 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
                    {SETTINGS_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabChange(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-white dark:bg-white/15 text-[#8200db] dark:text-white shadow-sm border border-slate-200/50 dark:border-white/10'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8200db] dark:text-purple-300' : ''}`} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Desktop 2-Column Layout: Left Tab Rail + Right Section Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Sub-Navigation Rail */}
                    <div className="hidden lg:block lg:col-span-4 sticky top-24">
                        <GlassCard className="p-3 space-y-1">
                            {SETTINGS_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 flex items-center justify-between group ${
                                            isActive
                                                ? 'bg-white/80 dark:bg-white/15 shadow-sm border border-slate-200/60 dark:border-white/15'
                                                : 'hover:bg-white/40 dark:hover:bg-white/[0.05] border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                isActive
                                                    ? 'bg-[#8200db] text-white shadow-xs'
                                                    : 'bg-purple-500/10 dark:bg-purple-400/10 text-slate-600 dark:text-slate-400 group-hover:text-[#8200db] dark:group-hover:text-purple-300'
                                            }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className={`text-xs font-bold block truncate transition-colors ${
                                                    isActive
                                                        ? 'text-slate-900 dark:text-white font-extrabold'
                                                        : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                                }`}>
                                                    {tab.label}
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                                                    {tab.description}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                                            isActive
                                                ? 'text-[#8200db] dark:text-purple-300 translate-x-0.5'
                                                : 'text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5'
                                        }`} />
                                    </button>
                                );
                            })}
                        </GlassCard>
                    </div>

                    {/* Right Active Section Content */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                            >
                                {activeTab === 'profile' && (
                                    <ProfileSection
                                        tenant={tenant}
                                        timezones={timezones}
                                        currencies={currencies}
                                        provinces={provinces}
                                        countries={countries}
                                        cities={cities}
                                    />
                                )}

                                {activeTab === 'disciplines' && (
                                    <DisciplinesSection
                                        tenant={tenant}
                                        allDisciplines={allDisciplines}
                                        customDisciplines={customDisciplines}
                                        disciplineLabels={disciplineLabels}
                                    />
                                )}

                                {activeTab === 'branding' && (
                                    <BrandingSection tenant={tenant} />
                                )}

                                {activeTab === 'public_page' && (
                                    <PublicPageSection />
                                )}

                                {activeTab === 'compliance' && (
                                    <ComplianceSection />
                                )}

                                {activeTab === 'clinical_docs' && (
                                    <ClinicalDocsSection />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
