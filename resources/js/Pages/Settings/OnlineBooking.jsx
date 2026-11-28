import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Calendar, Clock, Plus, Trash2, Check, ExternalLink } from 'lucide-react';

export default function OnlineBooking({
    bookingSettings,
    timezone,
    publicBookingUrl,
    services = [],
    practitioners = [],
    closedDates = [],
    timeOffs = [],
    disciplines = [],
}) {
    const settingsForm = useForm({ ...bookingSettings });

    const serviceForm = useForm({
        name: '',
        discipline: disciplines[0]?.code || '',
        duration_minutes: 60,
        price_cents: 12000,
        buffer_minutes: '',
        bookable_online: true,
    });

    const closedForm = useForm({ date: '', reason: '' });

    const timeOffForm = useForm({
        staff_membership_id: practitioners[0]?.staff_membership_id || '',
        starts_at: '',
        ends_at: '',
        reason: '',
    });

    const saveSettings = (e) => {
        e.preventDefault();
        settingsForm.patch('/app/settings/booking', { preserveScroll: true });
    };

    const addService = (e) => {
        e.preventDefault();
        serviceForm.post('/app/settings/booking/services', {
            preserveScroll: true,
            onSuccess: () => serviceForm.reset('name'),
        });
    };

    const addClosedDate = (e) => {
        e.preventDefault();
        closedForm.post('/app/settings/booking/closed-dates', {
            preserveScroll: true,
            onSuccess: () => closedForm.reset(),
        });
    };

    const addTimeOff = (e) => {
        e.preventDefault();
        timeOffForm.post('/app/settings/booking/time-offs', {
            preserveScroll: true,
            onSuccess: () => timeOffForm.reset('starts_at', 'ends_at', 'reason'),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Online Booking Settings" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Online Booking Settings</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Control patient self-booking, services, holidays, and practitioner availability ({timezone}).
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/settings"
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                        >
                            Back to Settings
                        </Link>
                        {settingsForm.data.enabled && publicBookingUrl && (
                            <a
                                href={publicBookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                            >
                                Open /book <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </div>

                {/* General Settings */}
                <form onSubmit={saveSettings} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold">Public Self-Booking</h2>
                            <p className="text-xs text-slate-500">Allow patients to book appointments directly on your clinic website.</p>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settingsForm.data.enabled}
                                onChange={(e) => settingsForm.setData('enabled', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600"
                            />
                            <span>Enabled</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Approval Mode</label>
                            <select
                                value={settingsForm.data.mode}
                                onChange={(e) => settingsForm.setData('mode', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                            >
                                <option value="request">Request — staff approves</option>
                                <option value="auto_confirm">Auto-confirm</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Min Notice (hours)</label>
                            <input
                                type="number"
                                min={0}
                                max={168}
                                value={settingsForm.data.min_notice_hours}
                                onChange={(e) => settingsForm.setData('min_notice_hours', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Max Days Ahead</label>
                            <input
                                type="number"
                                min={1}
                                max={365}
                                value={settingsForm.data.max_days_ahead}
                                onChange={(e) => settingsForm.setData('max_days_ahead', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Default Buffer (min)</label>
                            <input
                                type="number"
                                min={0}
                                max={120}
                                value={settingsForm.data.buffer_minutes}
                                onChange={(e) => settingsForm.setData('buffer_minutes', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cancel Notice (hours)</label>
                            <input
                                type="number"
                                min={0}
                                max={168}
                                value={settingsForm.data.cancellation_notice_hours}
                                onChange={(e) => settingsForm.setData('cancellation_notice_hours', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6 text-xs font-medium">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settingsForm.data.allow_patient_cancellation}
                                onChange={(e) => settingsForm.setData('allow_patient_cancellation', e.target.checked)}
                            />
                            Allow patient online cancellation
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settingsForm.data.require_intake}
                                onChange={(e) => settingsForm.setData('require_intake', e.target.checked)}
                            />
                            Require intake form before first visit
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settingsForm.data.require_consent}
                                onChange={(e) => settingsForm.setData('require_consent', e.target.checked)}
                            />
                            Require consent before visit
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settingsForm.data.send_24h_reminder}
                                onChange={(e) => settingsForm.setData('send_24h_reminder', e.target.checked)}
                            />
                            Send 24-hour reminder email
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={settingsForm.processing}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                        {settingsForm.processing ? 'Saving…' : 'Save Booking Settings'}
                    </button>
                </form>

                {/* Services */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                    <h2 className="text-base font-bold">Bookable Services</h2>
                    <form onSubmit={addService} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                        <input
                            type="text"
                            required
                            placeholder="Service name"
                            value={serviceForm.data.name}
                            onChange={(e) => serviceForm.setData('name', e.target.value)}
                            className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                        />
                        <input
                            type="number"
                            min={5}
                            max={480}
                            placeholder="Duration (min)"
                            value={serviceForm.data.duration_minutes}
                            onChange={(e) => serviceForm.setData('duration_minutes', Number(e.target.value))}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                        />
                        <input
                            type="number"
                            min={0}
                            placeholder="Price (cents)"
                            value={serviceForm.data.price_cents}
                            onChange={(e) => serviceForm.setData('price_cents', Number(e.target.value))}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={serviceForm.processing}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                        >
                            + Add Service
                        </button>
                    </form>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {services.map((svc) => (
                            <div key={svc.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                                <div>
                                    <span className="font-semibold">{svc.name}</span>
                                    <span className="text-xs text-slate-500 ml-2">
                                        {svc.duration_minutes} min &bull; ${(svc.price_cents / 100).toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.delete(`/app/settings/booking/services/${svc.id}`, { preserveScroll: true })}
                                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Practitioners */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                    <h2 className="text-base font-bold">Practitioner Online Booking</h2>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {practitioners.map((p) => (
                            <div key={p.staff_membership_id} className="py-3 flex items-center justify-between gap-4 text-sm">
                                <div>
                                    <span className="font-semibold">{p.name}</span>
                                    {p.profession && <span className="text-xs text-slate-500 ml-2">{p.profession}</span>}
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={p.accepts_online_booking}
                                        onChange={(e) =>
                                            router.patch(
                                                `/app/settings/booking/practitioners/${p.staff_membership_id}`,
                                                { accepts_online_booking: e.target.checked, working_hours: p.working_hours },
                                                { preserveScroll: true }
                                            )
                                        }
                                    />
                                    Accepts online booking
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Closed Dates & Time Off */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <h2 className="text-base font-bold">Clinic Closed Dates (Holidays)</h2>
                        <form onSubmit={addClosedDate} className="flex gap-2">
                            <input
                                type="date"
                                required
                                value={closedForm.data.date}
                                onChange={(e) => closedForm.setData('date', e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                            />
                            <input
                                type="text"
                                placeholder="Reason"
                                value={closedForm.data.reason}
                                onChange={(e) => closedForm.setData('reason', e.target.value)}
                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                            />
                            <button type="submit" className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">
                                Add
                            </button>
                        </form>
                        <div className="space-y-2 text-xs">
                            {closedDates.map((d) => (
                                <div key={d.id} className="flex items-center justify-between py-1">
                                    <span>{d.date} {d.reason ? `— ${d.reason}` : ''}</span>
                                    <button
                                        type="button"
                                        onClick={() => router.delete(`/app/settings/booking/closed-dates/${d.id}`, { preserveScroll: true })}
                                        className="text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <h2 className="text-base font-bold">Practitioner Time Off</h2>
                        <form onSubmit={addTimeOff} className="space-y-2">
                            <select
                                value={timeOffForm.data.staff_membership_id}
                                onChange={(e) => timeOffForm.setData('staff_membership_id', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                            >
                                {practitioners.map((p) => (
                                    <option key={p.staff_membership_id} value={p.staff_membership_id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    required
                                    placeholder="YYYY-MM-DD HH:MM"
                                    value={timeOffForm.data.starts_at}
                                    onChange={(e) => timeOffForm.setData('starts_at', e.target.value)}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                                />
                                <input
                                    type="text"
                                    required
                                    placeholder="YYYY-MM-DD HH:MM"
                                    value={timeOffForm.data.ends_at}
                                    onChange={(e) => timeOffForm.setData('ends_at', e.target.value)}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                                />
                            </div>
                            <button type="submit" className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">
                                Add Time Off
                            </button>
                        </form>
                        <div className="space-y-2 text-xs">
                            {timeOffs.map((o) => (
                                <div key={o.id} className="flex items-center justify-between py-1">
                                    <span>{o.practitioner_name}: {o.starts_at_local} → {o.ends_at_local}</span>
                                    <button
                                        type="button"
                                        onClick={() => router.delete(`/app/settings/booking/time-offs/${o.id}`, { preserveScroll: true })}
                                        className="text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
