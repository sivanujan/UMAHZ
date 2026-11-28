import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

function formatPrice(cents, currency = 'CAD') {
    if (!cents) return 'Free / Included';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(cents / 100);
}

export default function PublicBook({
    clinic,
    bookingEnabled = false,
    settings = {},
    locations = [],
    services = [],
    practitioners = [],
}) {
    const brandColor = clinic?.brand_color || '#6d28d9';
    const [selectedLocationId, setSelectedLocationId] = useState(
        locations.length === 1 ? locations[0].id : ''
    );
    const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
    const [selectedPractitionerId, setSelectedPractitionerId] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
    });
    const [slots, setSlots] = useState([]);
    const [closedReason, setClosedReason] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        service_id: services[0]?.id || '',
        location_id: locations.length === 1 ? locations[0].id : '',
        staff_membership_id: '',
        starts_at: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        notes: '',
        website: '',
    });

    const selectedService = useMemo(
        () => services.find((s) => s.id === selectedServiceId) || null,
        [services, selectedServiceId]
    );

    useEffect(() => {
        setData((prev) => ({
            ...prev,
            service_id: selectedServiceId,
            location_id: selectedLocationId || '',
            staff_membership_id: selectedPractitionerId || '',
        }));
    }, [selectedServiceId, selectedLocationId, selectedPractitionerId]);

    useEffect(() => {
        if (!bookingEnabled || !selectedServiceId || !selectedDate) {
            setSlots([]);
            return;
        }

        let cancelled = false;
        setLoadingSlots(true);
        const params = new URLSearchParams({
            service_id: selectedServiceId,
            date: selectedDate,
        });
        if (selectedLocationId) params.set('location_id', selectedLocationId);
        if (selectedPractitionerId) params.set('staff_membership_id', selectedPractitionerId);

        fetch(`/book/slots?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : { slots: [], closed_reason: null }))
            .then((json) => {
                if (cancelled) return;
                setSlots(Array.isArray(json.slots) ? json.slots : []);
                setClosedReason(json.closed_reason || null);
            })
            .catch(() => {
                if (!cancelled) {
                    setSlots([]);
                    setClosedReason(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingSlots(false);
            });

        return () => {
            cancelled = true;
        };
    }, [bookingEnabled, selectedServiceId, selectedLocationId, selectedPractitionerId, selectedDate]);

    const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const maxDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + (settings.max_days_ahead || 60));
        return d.toISOString().slice(0, 10);
    }, [settings.max_days_ahead]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/book', { preserveScroll: true });
    };

    if (!bookingEnabled) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Head title={`Online Booking — ${clinic?.name || 'Clinic'}`} />
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
                    <h1 className="text-xl font-bold text-slate-900">Online booking is not available</h1>
                    <p className="text-sm text-slate-600">
                        {clinic?.name} does not currently accept online self-booking.
                        {clinic?.phone ? ` Please call ${clinic.phone} to schedule.` : ''}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to {clinic?.name}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Head title={`Book Appointment — ${clinic.name}`} />

            <header style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #1e1b4b 100%)` }} className="text-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {clinic.logo_url && (
                            <img src={clinic.logo_url} alt={clinic.name} className="h-10 w-auto rounded-lg bg-white/95 p-1" />
                        )}
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Book at {clinic.name}</h1>
                            <p className="text-xs sm:text-sm text-white/80">
                                All times shown in {clinic.timezone} &bull;{' '}
                                {settings.mode === 'auto_confirm' ? 'Instant confirmation' : 'Request confirmed by clinic staff'}
                            </p>
                        </div>
                    </div>
                    <Link href="/" className="text-xs font-semibold text-white/90 hover:text-white underline">
                        Clinic Home
                    </Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {services.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
                        No services are currently available for online booking.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Honeypot */}
                        <input
                            type="text"
                            name="website"
                            value={data.website}
                            onChange={(e) => setData('website', e.target.value)}
                            tabIndex={-1}
                            autoComplete="off"
                            className="hidden"
                            aria-hidden="true"
                        />

                        {/* Step 1: Location & Service */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
                                Choose service{locations.length > 1 ? ' & location' : ''}
                            </h2>

                            {locations.length > 1 && (
                                <div>
                                    <label htmlFor="book-location" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        Location
                                    </label>
                                    <select
                                        id="book-location"
                                        value={selectedLocationId}
                                        onChange={(e) => setSelectedLocationId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    >
                                        <option value="">Any location</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {services.map((svc) => {
                                    const active = svc.id === selectedServiceId;
                                    return (
                                        <button
                                            key={svc.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedServiceId(svc.id);
                                                setData('starts_at', '');
                                            }}
                                            className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                                                active
                                                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-semibold text-sm text-slate-900">{svc.name}</span>
                                                <span className="text-xs font-bold text-indigo-700">
                                                    {formatPrice(svc.price_cents, clinic.currency)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {svc.duration_minutes} min
                                                {svc.discipline ? ` · ${svc.discipline.replace(/_/g, ' ')}` : ''}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Step 2: Practitioner, Date & Time */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
                                Pick practitioner, date & time
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="book-practitioner" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        Practitioner
                                    </label>
                                    <select
                                        id="book-practitioner"
                                        value={selectedPractitionerId}
                                        onChange={(e) => {
                                            setSelectedPractitionerId(e.target.value);
                                            setData('starts_at', '');
                                        }}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    >
                                        <option value="">Any available practitioner</option>
                                        {practitioners.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}{p.profession ? ` (${p.profession})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="book-date" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        Date ({clinic.timezone})
                                    </label>
                                    <input
                                        id="book-date"
                                        type="date"
                                        min={minDate}
                                        max={maxDate}
                                        value={selectedDate}
                                        onChange={(e) => {
                                            setSelectedDate(e.target.value);
                                            setData('starts_at', '');
                                        }}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-600 mb-2">
                                    Available Times ({selectedService?.duration_minutes || 60} min)
                                </p>
                                {loadingSlots ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading available times…
                                    </div>
                                ) : closedReason ? (
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                        Closed: {closedReason}. Please choose another date.
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                                        No open slots on this date. Try another date or select "Any available practitioner".
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                        {slots.map((slot) => {
                                            const active = data.starts_at === slot.starts_at_local;
                                            return (
                                                <button
                                                    key={slot.starts_at_local}
                                                    type="button"
                                                    onClick={() => setData('starts_at', slot.starts_at_local)}
                                                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                                        active
                                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.starts_at && (
                                    <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> {errors.starts_at}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Step 3: Patient Details */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">3</span>
                                Your details
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="book-first-name" className="block text-xs font-semibold text-slate-600 mb-1">
                                        First name *
                                    </label>
                                    <input
                                        id="book-first-name"
                                        type="text"
                                        required
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    />
                                    {errors.first_name && <p className="text-xs text-rose-600 mt-1">{errors.first_name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="book-last-name" className="block text-xs font-semibold text-slate-600 mb-1">
                                        Last name *
                                    </label>
                                    <input
                                        id="book-last-name"
                                        type="text"
                                        required
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    />
                                    {errors.last_name && <p className="text-xs text-rose-600 mt-1">{errors.last_name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="book-email" className="block text-xs font-semibold text-slate-600 mb-1">
                                        Email address *
                                    </label>
                                    <input
                                        id="book-email"
                                        type="email"
                                        required
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    />
                                    {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label htmlFor="book-phone" className="block text-xs font-semibold text-slate-600 mb-1">
                                        Phone number *
                                    </label>
                                    <input
                                        id="book-phone"
                                        type="tel"
                                        required
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                    />
                                    {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="book-notes" className="block text-xs font-semibold text-slate-600 mb-1">
                                    Reason for visit / notes (optional)
                                </label>
                                <textarea
                                    id="book-notes"
                                    rows={2}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !data.starts_at}
                                style={{ backgroundColor: brandColor }}
                                className="w-full py-3.5 px-6 rounded-full text-white font-semibold text-sm shadow-md hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>
                                    {settings.mode === 'auto_confirm' ? 'Confirm Appointment' : 'Submit Booking Request'}
                                </span>
                            </button>
                        </section>
                    </form>
                )}
            </main>
        </div>
    );
}
