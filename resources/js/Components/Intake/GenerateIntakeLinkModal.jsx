import React, { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    Link2, X, Check, Copy, Sparkles, Mail, Calendar, Clock,
    AlertCircle, CheckCircle2, Send
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture & TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietetics & Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

export default function GenerateIntakeLinkModal({
    client,
    offeredDisciplines = [],
    disciplineLabels = {},
    appointments = [],
    onClose,
}) {
    const { flash } = usePage().props;
    const [copied, setCopied] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState(flash?.generated_intake_link || null);

    const { data, setData, post, processing, errors } = useForm({
        discipline: offeredDisciplines[0] || 'massage_therapy',
        appointment_id: '',
        send_email: Boolean(client.email),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(`/app/clients/${client.id}/intakes/link`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const link = page.props.flash?.generated_intake_link;
                if (link) {
                    setGeneratedUrl(link);
                }
            },
        });
    };

    const fallbackCopy = (text) => {
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
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
    };

    const handleCopy = () => {
        if (!generatedUrl) return;
        if (navigator?.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(generatedUrl)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                })
                .catch(() => fallbackCopy(generatedUrl));
        } else {
            fallbackCopy(generatedUrl);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'var(--umahz-border)', background: 'var(--umahz-surface-alt, #fafafa)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Send Intake Form Link
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                    {generatedUrl ? (
                        /* Generated Success State */
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 text-xs">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm">Secure Intake Link Ready</p>
                                    <p className="mt-0.5 leading-relaxed">
                                        This single-use magic link is personalized for <strong>{client.name}</strong>.
                                        It expires in 7 days and requires no login.
                                    </p>
                                </div>
                            </div>

                            {/* Copyable Box */}
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                    Patient Intake URL
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedUrl}
                                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-300 select-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                                You can copy and send this link to the patient via SMS, WhatsApp, or chat.
                                Once the patient submits, their answers and any contraindication flags will automatically appear on their profile.
                            </p>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Form State */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Discipline Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                    Discipline
                                </label>
                                <select
                                    value={data.discipline}
                                    onChange={(e) => setData('discipline', e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-semibold"
                                >
                                    {offeredDisciplines.map((disc) => (
                                        <option key={disc} value={disc}>
                                            {disciplineLabels?.[disc] || DISCIPLINE_LABELS[disc] || disc}
                                        </option>
                                    ))}
                                </select>
                                {errors.discipline && (
                                    <p className="text-xs text-rose-600 mt-1">{errors.discipline}</p>
                                )}
                            </div>

                            {/* Optional Appointment Association */}
                            {appointments.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Tie to Appointment (Optional)
                                    </label>
                                    <select
                                        value={data.appointment_id}
                                        onChange={(e) => setData('appointment_id', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                    >
                                        <option value="">No specific appointment</option>
                                        {appointments.map((apt) => (
                                            <option key={apt.id} value={apt.id}>
                                                {new Date(apt.starts_at).toLocaleDateString()} — {apt.service_name || 'Appointment'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Send Email Option */}
                            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={data.send_email}
                                        onChange={(e) => setData('send_email', e.target.checked)}
                                        disabled={!client.email}
                                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                                    />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-violet-600" />
                                        Also send intake link to client's email
                                    </span>
                                </label>
                                {client.email ? (
                                    <p className="text-[11px] text-slate-500 ml-6">
                                        Will deliver via clinic-branded email to <strong>{client.email}</strong>.
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-amber-600 ml-6">
                                        No email on file for {client.name}. You can copy the generated link directly.
                                    </p>
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    {processing ? 'Generating...' : 'Generate Intake Link'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
