import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar, CheckCircle2, Clock, FileText, MapPin, User, XCircle, AlertCircle } from 'lucide-react';

export default function PublicBookingManage({
    clinic,
    booked = false,
    statusMessage = null,
    token,
    appointment,
}) {
    const brandColor = clinic?.brand_color || '#6d28d9';
    const { data, setData, post, processing, errors } = useForm({ reason: '' });

    const isRequested = appointment.status === 'requested';
    const isCancelled = appointment.status === 'cancelled';
    const isDeclined = appointment.status === 'declined';

    const handleCancel = (e) => {
        e.preventDefault();
        post(`/book/manage/${token}/cancel`, { preserveScroll: true });
    };

    const heading = isCancelled
        ? 'Appointment Cancelled'
        : isDeclined
            ? 'Booking Request Declined'
            : isRequested
                ? 'Request Received'
                : 'Appointment Confirmed';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4">
            <Head title={`${heading} — ${clinic.name}`} />

            <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div style={{ backgroundColor: brandColor }} className="px-6 py-6 text-white">
                    <div className="flex items-center gap-3">
                        {isCancelled || isDeclined ? (
                            <XCircle className="w-7 h-7" />
                        ) : isRequested ? (
                            <Clock className="w-7 h-7" />
                        ) : (
                            <CheckCircle2 className="w-7 h-7" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold">{heading}</h1>
                            <p className="text-xs text-white/85">{clinic.name}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {statusMessage && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                            {statusMessage}
                        </div>
                    )}

                    {isRequested && (
                        <p className="text-sm text-slate-600">
                            Your booking request has been sent to {clinic.name}. You will receive an email as soon as staff confirms it.
                        </p>
                    )}

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-sm">
                        <div className="font-bold text-slate-900">{appointment.service_name}</div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>
                                {appointment.starts_at_local} – {appointment.ends_at_local} ({appointment.timezone})
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>With {appointment.practitioner_name}</span>
                        </div>
                        {appointment.location_name && (
                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span>{appointment.location_name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {!isCancelled && !isDeclined && (
                            <a
                                href={appointment.ics_url}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Calendar className="w-4 h-4" />
                                Add to Calendar (.ics)
                            </a>
                        )}
                        {appointment.intake_url && !isCancelled && !isDeclined && (
                            <a
                                href={appointment.intake_url}
                                style={{ backgroundColor: brandColor }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white hover:opacity-95"
                            >
                                <FileText className="w-4 h-4" />
                                Complete Intake Form
                            </a>
                        )}
                    </div>

                    {errors.appointment && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errors.appointment}</span>
                        </div>
                    )}

                    {appointment.can_cancel && (
                        <form onSubmit={handleCancel} className="pt-4 border-t border-slate-200 space-y-3">
                            <label htmlFor="cancel-reason" className="block text-xs font-semibold text-slate-600">
                                Need to cancel? (Optional reason)
                            </label>
                            <input
                                id="cancel-reason"
                                type="text"
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                placeholder="e.g. Schedule conflict"
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                                {processing ? 'Cancelling…' : 'Cancel Appointment'}
                            </button>
                        </form>
                    )}

                    <div className="pt-2 flex items-center justify-between text-xs">
                        <Link href="/book" className="font-semibold text-indigo-600 hover:underline">
                            Book another appointment
                        </Link>
                        <Link href="/" className="text-slate-500 hover:underline">
                            Back to {clinic.name}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
