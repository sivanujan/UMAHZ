import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AddressPicker from '@/Components/AddressPicker';
import { Building2, Mail, Phone, MapPin, Stethoscope, Palette, Upload, Check, ShieldCheck } from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';
const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-700 focus:border-violet-700';

function Card({ icon: Icon, title, subtitle, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-start gap-2 mb-5">
                <Icon className="w-4 h-4 text-violet-700 mt-0.5" />
                <div>
                    <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function SaveButton({ processing, children = 'Save changes' }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="px-5 py-2.5 bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors"
        >
            {children}
        </button>
    );
}

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

    return (
        <Card icon={Building2} title="Clinic Profile" subtitle="Shown on bookings, invoices and client communications.">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className={labelClass}>Clinic Name</label>
                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} required className={inputClass} />
                    {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Contact Email</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required className={`${inputClass} pl-9`} />
                        </div>
                        {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Phone</label>
                        <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} required className={`${inputClass} pl-9`} />
                        </div>
                        {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
                    </div>
                </div>

                <AddressPicker provinces={provinces} lat={data.address_lat} lng={data.address_lng} onPick={onPick} />

                <div>
                    <label className={labelClass}>Street Address</label>
                    <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={data.address_line1} onChange={(e) => setData('address_line1', e.target.value)} required placeholder="Street address" className={`${inputClass} pl-9`} />
                    </div>
                    {errors.address_line1 && <p className="text-xs text-rose-600 mt-1">{errors.address_line1}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={labelClass}>City</label>
                        <input type="text" list="ca-cities" value={data.address_city} onChange={(e) => setData('address_city', e.target.value)} required className={inputClass} />
                        {errors.address_city && <p className="text-xs text-rose-600 mt-1">{errors.address_city}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Province</label>
                        <select value={data.address_region} onChange={(e) => setData('address_region', e.target.value)} required className={inputClass}>
                            <option value="" disabled>Province</option>
                            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {errors.address_region && <p className="text-xs text-rose-600 mt-1">{errors.address_region}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Country</label>
                        <select value={data.address_country} onChange={(e) => setData('address_country', e.target.value)} required className={inputClass}>
                            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <datalist id="ca-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Timezone</label>
                        <select value={data.timezone} onChange={(e) => setData('timezone', e.target.value)} className={inputClass}>
                            {timezones.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Currency</label>
                        <select value={data.currency} onChange={(e) => setData('currency', e.target.value)} className={inputClass}>
                            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="pt-1"><SaveButton processing={processing} /></div>
            </form>
        </Card>
    );
}

function DisciplinesSection({ tenant, allDisciplines }) {
    const { data, setData, patch, processing, errors } = useForm({
        disciplines: tenant.requested_disciplines || [],
    });

    const toggle = (d) => {
        setData('disciplines', data.disciplines.includes(d)
            ? data.disciplines.filter((x) => x !== d)
            : [...data.disciplines, d]);
    };

    const submit = (e) => {
        e.preventDefault();
        patch('/app/settings/disciplines', { preserveScroll: true });
    };

    return (
        <Card icon={Stethoscope} title="Disciplines Offered" subtitle="Practitioners can only be assigned to disciplines your clinic offers.">
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allDisciplines.map((d) => {
                        const active = data.disciplines.includes(d);
                        return (
                            <button
                                key={d} type="button" onClick={() => toggle(d)}
                                aria-pressed={active}
                                className={`text-left px-3.5 py-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-2.5 ${
                                    active ? 'bg-violet-50 border-violet-500 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-300'
                                }`}
                            >
                                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${active ? 'bg-violet-700 border-violet-700' : 'border-slate-300 bg-white'}`}>
                                    {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </span>
                                {DISCIPLINE_LABELS[d] || d}
                            </button>
                        );
                    })}
                </div>
                {errors.disciplines && <p className="text-xs text-rose-600">{errors.disciplines}</p>}
                <div className="pt-1"><SaveButton processing={processing} children="Update disciplines" /></div>
            </form>
        </Card>
    );
}

function BrandingSection({ tenant }) {
    const { data, setData, post, processing, errors } = useForm({
        logo: null,
        brand_color: tenant.brand_color || '#5B2EFF',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/app/settings/branding', { forceFormData: true, preserveScroll: true });
    };

    return (
        <Card icon={Palette} title="Branding" subtitle="Your logo and colour on client-facing pages.">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className={labelClass}>Clinic Logo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {data.logo ? (
                                <img src={URL.createObjectURL(data.logo)} alt="Logo preview" className="w-full h-full object-cover" />
                            ) : tenant.logo_url ? (
                                <img src={tenant.logo_url} alt="Current logo" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 className="w-6 h-6 text-slate-300" />
                            )}
                        </div>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-violet-500 rounded-lg text-sm font-medium text-slate-800 cursor-pointer transition-colors">
                            <Upload className="w-4 h-4" />
                            Upload Image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setData('logo', e.target.files[0] ?? null)} />
                        </label>
                    </div>
                    {errors.logo && <p className="text-xs text-rose-600 mt-1">{errors.logo}</p>}
                </div>

                <div>
                    <label className={labelClass}>Brand Colour</label>
                    <div className="flex items-center gap-3">
                        <input type="color" value={data.brand_color} onChange={(e) => setData('brand_color', e.target.value)} className="w-11 h-11 rounded-lg border border-slate-200 cursor-pointer" />
                        <input type="text" value={data.brand_color} onChange={(e) => setData('brand_color', e.target.value)} className={`${inputClass} flex-1`} />
                    </div>
                    {errors.brand_color && <p className="text-xs text-rose-600 mt-1">{errors.brand_color}</p>}
                </div>

                <div className="pt-1"><SaveButton processing={processing} /></div>
            </form>
        </Card>
    );
}

export default function ClinicSettings({ tenant, timezones, currencies, provinces = [], countries = [], cities = [], allDisciplines = [] }) {
    const { flash } = usePage().props;

    return (
        <AuthenticatedLayout title="Clinic Settings">
            <Head title="Clinic Settings" />

            {flash?.success && (
                <div className="mb-6 p-3 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                    {flash.success}
                </div>
            )}

            <div className="max-w-3xl space-y-6">
                <ProfileSection tenant={tenant} timezones={timezones} currencies={currencies} provinces={provinces} countries={countries} cities={cities} />
                <DisciplinesSection tenant={tenant} allDisciplines={allDisciplines} />
                <BrandingSection tenant={tenant} />

                <Card icon={ShieldCheck} title="Informed Consent Agreements" subtitle="Configure legal agreement texts and consent forms for your clinic.">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                            Set up the required consent agreements that patients must sign prior to treatment, including general treatment and sensitive-area agreements.
                        </p>
                        <Link
                            href="/app/settings/consents"
                            className="inline-flex items-center px-4 py-2 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-xl border border-violet-200 dark:border-violet-800 transition shrink-0"
                        >
                            Configure Consents &rarr;
                        </Link>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
