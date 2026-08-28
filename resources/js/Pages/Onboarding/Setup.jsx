import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import OnboardingLayout from '@/Layouts/OnboardingLayout';
import { Building2, Mail, Phone, MapPin, Upload, Clock } from 'lucide-react';

const DAY_LABELS = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

function defaultHours(days, existing) {
    const hours = {};
    days.forEach((day) => {
        hours[day] = existing?.[day] ?? {
            closed: day === 'saturday' || day === 'sunday',
            open: '09:00',
            close: '17:00',
        };
    });
    return hours;
}

export default function OnboardingSetup({ tenant, timezones, currencies, provinces = [], countries = [], cities = [], days }) {
    const [step, setStep] = useState(1);

    const profileForm = useForm({
        name: tenant.name || '',
        // Pre-fill from what was already collected at registration so the
        // owner isn't re-typing details they've already given.
        email: tenant.email || tenant.primary_contact_email || '',
        phone: tenant.phone || tenant.primary_contact_phone || '',
        address_line1: tenant.address?.line1 || '',
        address_city: tenant.address?.city || '',
        address_region: tenant.address?.region || '',
        address_country: tenant.address?.country || countries[0] || 'Canada',
        timezone: tenant.timezone || 'America/Toronto',
        currency: tenant.currency || 'CAD',
    });

    const brandingForm = useForm({
        logo: null,
        brand_color: tenant.brand_color || '#5B2EFF',
    });

    const hoursForm = useForm({
        business_hours: defaultHours(days, tenant.business_hours),
    });

    const submitProfile = (e) => {
        e.preventDefault();
        profileForm.post('/app/onboarding/profile', { onSuccess: () => setStep(2) });
    };

    const submitBranding = (e) => {
        e.preventDefault();
        brandingForm.post('/app/onboarding/branding', { forceFormData: true, onSuccess: () => setStep(3) });
    };

    const submitHours = (e) => {
        e.preventDefault();
        hoursForm.post('/app/onboarding/hours');
    };

    const setDay = (day, field, value) => {
        hoursForm.setData('business_hours', {
            ...hoursForm.data.business_hours,
            [day]: { ...hoursForm.data.business_hours[day], [field]: value },
        });
    };

    return (
        <OnboardingLayout currentStep={step}>
            <Head title="Set Up Your Clinic" />

            {step === 1 && (
                <form onSubmit={submitProfile} className="space-y-4">
                    <div className="text-center mb-2">
                        <h1 className="text-xl font-bold text-[#1E0B3C]">Tell Us About Your Clinic</h1>
                        <p className="text-sm text-slate-500 mt-1">This appears on your bookings, invoices, and client communications.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Clinic Name</label>
                        <div className="relative">
                            <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={profileForm.data.name}
                                onChange={(e) => profileForm.setData('name', e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                            />
                        </div>
                        {profileForm.errors.name && <div className="text-xs text-rose-600 mt-1">{profileForm.errors.name}</div>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Contact Email</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    value={profileForm.data.email}
                                    onChange={(e) => profileForm.setData('email', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                                />
                            </div>
                            {profileForm.errors.email && <div className="text-xs text-rose-600 mt-1">{profileForm.errors.email}</div>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Phone</label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    value={profileForm.data.phone}
                                    onChange={(e) => profileForm.setData('phone', e.target.value)}
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                                />
                            </div>
                            {profileForm.errors.phone && <div className="text-xs text-rose-600 mt-1">{profileForm.errors.phone}</div>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Address</label>
                        <div className="relative mb-3">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Street address"
                                value={profileForm.data.address_line1}
                                onChange={(e) => profileForm.setData('address_line1', e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                            />
                        </div>
                        {profileForm.errors.address_line1 && <div className="text-xs text-rose-600 mb-2">{profileForm.errors.address_line1}</div>}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <input
                                    type="text"
                                    list="ca-cities"
                                    placeholder="City"
                                    value={profileForm.data.address_city}
                                    onChange={(e) => profileForm.setData('address_city', e.target.value)}
                                    required
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                                />
                                {profileForm.errors.address_city && <div className="text-xs text-rose-600 mt-1">{profileForm.errors.address_city}</div>}
                            </div>
                            <div>
                                <select
                                    value={profileForm.data.address_region}
                                    onChange={(e) => profileForm.setData('address_region', e.target.value)}
                                    required
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] text-[#1E0B3C]"
                                >
                                    <option value="" disabled>Province</option>
                                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {profileForm.errors.address_region && <div className="text-xs text-rose-600 mt-1">{profileForm.errors.address_region}</div>}
                            </div>
                            <div>
                                <select
                                    value={profileForm.data.address_country}
                                    onChange={(e) => profileForm.setData('address_country', e.target.value)}
                                    required
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF] text-[#1E0B3C]"
                                >
                                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {profileForm.errors.address_country && <div className="text-xs text-rose-600 mt-1">{profileForm.errors.address_country}</div>}
                            </div>
                        </div>
                        <datalist id="ca-cities">
                            {cities.map((c) => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Timezone</label>
                            <select
                                value={profileForm.data.timezone}
                                onChange={(e) => profileForm.setData('timezone', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                            >
                                {timezones.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Currency</label>
                            <select
                                value={profileForm.data.currency}
                                onChange={(e) => profileForm.setData('currency', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                            >
                                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={profileForm.processing}
                        className="w-full py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors mt-2"
                    >
                        Continue to Branding
                    </button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={submitBranding} className="space-y-5">
                    <div className="text-center mb-2">
                        <h1 className="text-xl font-bold text-[#1E0B3C]">Add Your Branding</h1>
                        <p className="text-sm text-slate-500 mt-1">Optional — you can always add this later from Clinic Settings.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Clinic Logo</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {brandingForm.data.logo ? (
                                    <img src={URL.createObjectURL(brandingForm.data.logo)} alt="Logo preview" className="w-full h-full object-cover" />
                                ) : tenant.logo_url ? (
                                    <img src={tenant.logo_url} alt="Current logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-[#5B2EFF] rounded-xl text-sm font-medium text-[#1E0B3C] cursor-pointer transition-colors">
                                <Upload className="w-4 h-4" />
                                Upload Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => brandingForm.setData('logo', e.target.files[0] ?? null)}
                                />
                            </label>
                        </div>
                        {brandingForm.errors.logo && <div className="text-xs text-rose-600 mt-1">{brandingForm.errors.logo}</div>}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Brand Colour</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={brandingForm.data.brand_color}
                                onChange={(e) => brandingForm.setData('brand_color', e.target.value)}
                                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={brandingForm.data.brand_color}
                                onChange={(e) => brandingForm.setData('brand_color', e.target.value)}
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-[#1E0B3C] rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                            />
                        </div>
                        {brandingForm.errors.brand_color && <div className="text-xs text-rose-600 mt-1">{brandingForm.errors.brand_color}</div>}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-6 py-3.5 rounded-full text-sm font-medium text-[#1E0B3C] border border-slate-200 hover:border-[#5B2EFF] transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={brandingForm.processing}
                            className="flex-1 py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors"
                        >
                            Continue to Business Hours
                        </button>
                    </div>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={submitHours} className="space-y-5">
                    <div className="text-center mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                            <Clock className="w-6 h-6 text-[#5B2EFF]" />
                        </div>
                        <h1 className="text-xl font-bold text-[#1E0B3C]">Set Your Business Hours</h1>
                        <p className="text-sm text-slate-500 mt-1">Used as your clinic's default availability window.</p>
                    </div>

                    <div className="space-y-2">
                        {days.map((day) => {
                            const dayData = hoursForm.data.business_hours[day];
                            return (
                                <div key={day} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                    <span className="text-sm font-semibold text-[#1E0B3C] w-24 flex-shrink-0">{DAY_LABELS[day]}</span>

                                    {dayData.closed ? (
                                        <span className="flex-1 text-sm text-slate-400">Closed</span>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={dayData.open}
                                                onChange={(e) => setDay(day, 'open', e.target.value)}
                                                className="px-3 py-2 bg-white border border-slate-200 text-[#1E0B3C] rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                                            />
                                            <span className="text-slate-400 text-sm">to</span>
                                            <input
                                                type="time"
                                                value={dayData.close}
                                                onChange={(e) => setDay(day, 'close', e.target.value)}
                                                className="px-3 py-2 bg-white border border-slate-200 text-[#1E0B3C] rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-[#5B2EFF]"
                                            />
                                        </div>
                                    )}

                                    <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={dayData.closed}
                                            onChange={(e) => setDay(day, 'closed', e.target.checked)}
                                            className="rounded border-slate-300 text-[#5B2EFF] focus:ring-[#5B2EFF] h-4 w-4"
                                        />
                                        <span className="text-xs text-slate-500">Closed</span>
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="px-6 py-3.5 rounded-full text-sm font-medium text-[#1E0B3C] border border-slate-200 hover:border-[#5B2EFF] transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={hoursForm.processing}
                            className="flex-1 py-3.5 px-4 bg-[#5B2EFF] hover:bg-purple-700 text-white font-medium text-sm rounded-full shadow-lg shadow-purple-500/20 transition-colors"
                        >
                            Finish Setup
                        </button>
                    </div>
                </form>
            )}
        </OnboardingLayout>
    );
}
