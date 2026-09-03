import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { FileText, Calendar, Clock, Plus, ArrowRight, Stethoscope } from 'lucide-react';

export default function NewNoteModal({ client, appointments = [], onClose }) {
    const [selectedAppointmentId, setSelectedAppointmentId] = useState('');

    const handleProceed = (e) => {
        e.preventDefault();
        const url = selectedAppointmentId
            ? `/app/clients/${client.id}/notes/create?appointment_id=${selectedAppointmentId}`
            : `/app/clients/${client.id}/notes/create`;
        router.visit(url);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-5 z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                New Clinical Encounter Note
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleProceed} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Attach to Scheduled Appointment (Optional)
                        </label>
                        <select
                            value={selectedAppointmentId}
                            onChange={(e) => setSelectedAppointmentId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">General Client Encounter (No Appointment Attached)</option>
                            {appointments.map((appt) => (
                                <option key={appt.id} value={appt.id}>
                                    {appt.service_name || 'Appointment'} • {formatDate(appt.starts_at)} ({appt.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-violet-900 dark:text-violet-200 text-[11px] leading-relaxed">
                        The note will open with your profession's specific template schema (e.g. SOAP, TCM points & tongue, etc.) with real-time continuous autosaving.
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 shadow-md shadow-violet-600/25 transition"
                        >
                            <span>Open Note Editor</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
