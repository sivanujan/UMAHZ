import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import AddressPicker from '@/Components/AddressPicker';
import { ArrowLeft, Globe, Check, Loader2 } from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const labelClass = 'block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5';
const inputClass = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40';

function Field({ label, children, error }) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            {children}
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>
    );
}

export default function ClinicEdit({ tenant, subdomainSuffix, provinces = [], countries = [], cities = [], timezones = [], currencies = [], allDisciplines = [], customDisciplines = [], disciplineLabels = {} }) {
    const labelsMap = { ...DISCIPLINE_LABELS, ...disciplineLabels };
    const availableDisciplines = Array.from(new Set([...allDisciplines, ...(customDisciplines.map((c) => c.slug)), ...(tenant.requested_disciplines || [])]));
    const { data, setData, patch, processing, errors } = useForm({
        name: tenant.name || '',
        subdomain: tenant.subdomain || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        business_registration_number: tenant.business_registration_number || '',
        address_line1: tenant.address?.line1 || '',
        address_city: tenant.address?.city || '',
        address_region: tenant.address?.region || '',
        address_country: tenant.address?.country || countries[0] || 'Canada',
        address_lat: tenant.address?.lat ?? null,
        address_lng: tenant.address?.lng ?? null,
        timezone: tenant.timezone || 'America/Toronto',
        currency: tenant.currency || 'CAD',
        requested_disciplines: tenant.requested_disciplines || [],
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

    const toggle = (d) => {
        setData('requested_disciplines', data.requested_disciplines.includes(d)
            ? data.requested_disciplines.filter((x) => x !== d)
            : [...data.requested_disciplines, d]);
    };

    const submit = (e) => {
        e.preventDefault();
        patch(`/admin/clinics/${tenant.id}`);
    };

    return (
        <AdminLayout title={`Edit — ${tenant.name}`}>
            <Head title={`Edit — ${tenant.name}`} />

            <Link href={`/admin/clinics/${tenant.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to clinic
            </Link>

            <form onSubmit={submit} className="max-w-2xl space-y-4">
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
                    <h3 className="text-white font-semibold text-sm">Clinic Profile</h3>

                    <Field label="Clinic Name" error={errors.name}>
                        <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={inputClass} />
                    </Field>

                    <Field label="Subdomain" error={errors.subdomain}>
                        <div className="flex items-stretch">
                            <span className="flex items-center pl-3 pr-1 text-slate-500 bg-slate-950 border border-r-0 border-slate-800 rounded-l-xl">
                                <Globe className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                value={data.subdomain}
                                onChange={(e) => setData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="flex-1 min-w-0 bg-slate-950 border-y border-slate-800 px-2 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/40"
                            />
                            <span className="flex items-center px-3 text-sm text-slate-500 bg-slate-950 border border-l-0 border-slate-800 rounded-r-xl whitespace-nowrap">{subdomainSuffix}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">Changing this moves the clinic to a new address — existing links break.</p>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Contact Email" error={errors.email}>
                            <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Phone" error={errors.phone}>
                            <input type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className={inputClass} />
                        </Field>
                    </div>

                    <Field label="Business Registration Number" error={errors.business_registration_number}>
                        <input type="text" value={data.business_registration_number} onChange={(e) => setData('business_registration_number', e.target.value)} className={inputClass} />
                    </Field>

                    <AddressPicker dark provinces={provinces} lat={data.address_lat} lng={data.address_lng} onPick={onPick} />

                    <Field label="Street Address" error={errors.address_line1}>
                        <input type="text" value={data.address_line1} onChange={(e) => setData('address_line1', e.target.value)} className={inputClass} />
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="City" error={errors.address_city}>
                            <input type="text" list="ca-cities" value={data.address_city} onChange={(e) => setData('address_city', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Province" error={errors.address_region}>
                            <select value={data.address_region || ''} onChange={(e) => setData('address_region', e.target.value)} className={inputClass}>
                                <option value="">—</option>
                                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </Field>
                        <Field label="Country" error={errors.address_country}>
                            <select value={data.address_country} onChange={(e) => setData('address_country', e.target.value)} className={inputClass}>
                                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                    </div>
                    <datalist id="ca-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Timezone" error={errors.timezone}>
                            <select value={data.timezone} onChange={(e) => setData('timezone', e.target.value)} className={inputClass}>
                                {timezones.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                            </select>
                        </Field>
                        <Field label="Currency" error={errors.currency}>
                            <select value={data.currency} onChange={(e) => setData('currency', e.target.value)} className={inputClass}>
                                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                    <h3 className="text-white font-semibold text-sm mb-3">Disciplines Offered</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                        {availableDisciplines.map((d) => {
                            const active = data.requested_disciplines.includes(d);
                            const isCustom = customDisciplines.some((c) => c.slug === d);
                            return (
                                <button
                                    key={d} type="button" onClick={() => toggle(d)}
                                    className={`text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-between gap-2.5 ${
                                        active ? 'bg-violet-500/10 border-violet-500/40 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${active ? 'bg-violet-600 border-violet-600' : 'border-slate-700'}`}>
                                            {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </span>
                                        <span className="truncate">{labelsMap[d] || d}</span>
                                    </div>
                                    {isCustom && (
                                        <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-800/50 flex-shrink-0">
                                            Custom
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {errors.requested_disciplines && <p className="text-xs text-rose-400 mt-2">{errors.requested_disciplines}</p>}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </button>
                    <Link href={`/admin/clinics/${tenant.id}`} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
