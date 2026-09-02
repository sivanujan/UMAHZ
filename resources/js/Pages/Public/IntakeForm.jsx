import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    ClipboardList, CheckCircle2, AlertTriangle, ShieldCheck,
    Lock, HeartPulse, Building2, ChevronRight, Send,
    Camera, Trash2, Image as ImageIcon
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture & Traditional Chinese Medicine',
    personal_training: 'Personal Training & Fitness',
    nutrition: 'Dietetics & Holistic Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

export default function PublicIntakeForm({
    state = 'active',
    errorMessage,
    token,
    clientFirstName,
    clientSex,
    clinicName = 'Clinic',
    clinicPhone,
    clinicEmail,
    discipline = 'massage_therapy',
    disciplineLabel,
    templateName,
    schema: rawSchema = { sections: [] },
    submittedAt,
}) {
    const [responses, setResponses] = useState({});
    const [imagePreviews, setImagePreviews] = useState({});
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Client-side safety: filter rawSchema sections & fields by sex
    const schema = useMemo(() => {
        if (!rawSchema || !Array.isArray(rawSchema.sections)) {
            return { sections: [] };
        }
        return {
            ...rawSchema,
            sections: rawSchema.sections.map((sec) => ({
                ...sec,
                fields: (sec.fields || []).filter((field) => {
                    if (field.applies_to === 'female_only' && clientSex !== 'female') return false;
                    if (field.applies_to === 'male_only' && clientSex !== 'male') return false;
                    return true;
                }),
            })).filter((sec) => (sec.fields || []).length > 0),
        };
    }, [rawSchema, clientSex]);

    const handleFieldChange = (id, val) => {
        setResponses((prev) => ({ ...prev, [id]: val }));
    };

    const handleImageSelect = (fieldId, file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit. Please choose a smaller image.');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setImagePreviews((prev) => ({ ...prev, [fieldId]: { url: previewUrl, name: file.name, size: file.size } }));
        handleFieldChange(fieldId, file);
    };

    const handleImageRemove = (fieldId) => {
        setImagePreviews((prev) => {
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
        handleFieldChange(fieldId, null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!confirmed) {
            alert('Please check the confirmation box certifying your responses are accurate.');
            return;
        }

        for (const sec of schema.sections || []) {
            for (const f of sec.fields || []) {
                if (f.required && (responses[f.id] === undefined || responses[f.id] === null || responses[f.id] === '')) {
                    alert(`Please provide a response for: "${f.label}"`);
                    return;
                }
            }
        }

        setSubmitting(true);
        router.post(`/intake/${token}`, {
            responses,
        }, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    // 1. Invalid Link Screen
    if (state === 'invalid_link') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Head title="Invalid Intake Link" />
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">Intake Link Unavailable</h1>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {errorMessage || 'This secure intake form link is invalid or no longer active. Please reach out to your clinic for assistance.'}
                    </p>
                </div>
            </div>
        );
    }

    // 2. Already Completed Screen
    if (state === 'already_completed') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Head title="Intake Form Completed" />
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Intake Form Completed</h1>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Thank you, <strong>{clientFirstName}</strong>. Your health history questionnaire has already been securely received by <strong>{clinicName}</strong>.
                    </p>
                    {submittedAt && (
                        <p className="text-[11px] text-slate-400">
                            Submitted on {new Date(submittedAt).toLocaleDateString()} at {new Date(submittedAt).toLocaleTimeString()}
                        </p>
                    )}
                    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        If you need to make updates, please let your practitioner know at your next visit.
                    </div>
                </div>
            </div>
        );
    }

    // 3. Expired Link Screen
    if (state === 'expired') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Head title="Link Expired" />
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">Intake Link Expired</h1>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Hi {clientFirstName}, this secure questionnaire link expired after 7 days for your privacy.
                    </p>
                    <p className="text-xs text-slate-500">
                        Please contact <strong>{clinicName}</strong> {clinicPhone && `at ${clinicPhone}`} to receive a refreshed link.
                    </p>
                </div>
            </div>
        );
    }

    // 4. Active Fillable Form
    return (
        <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 antialiased pb-20">
            <Head title={`${disciplineLabel || DISCIPLINE_LABELS[discipline] || 'Health'} Intake — ${clinicName}`} />

            {/* Top Brand Banner */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-bold text-sm text-slate-900 block leading-tight">{clinicName}</span>
                            <span className="text-[11px] text-slate-500">Patient Health History Form</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <Lock className="w-3 h-3" />
                        <span>Secure & Encrypted</span>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
                {/* Greeting Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-2">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                        {disciplineLabel || DISCIPLINE_LABELS[discipline] || discipline}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Welcome, {clientFirstName}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        Please take a few moments to fill out your health history questionnaire before your appointment.
                        Your answers ensure your practitioner can safely provide the highest standard of individualized care.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {(schema.sections || []).map((section, sIdx) => (
                        <div key={sIdx} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                            <div className="border-b border-slate-100 pb-3">
                                <h2 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                                        {sIdx + 1}
                                    </span>
                                    {section.title}
                                </h2>
                            </div>

                            <div className="space-y-5">
                                {(section.fields || []).map((field) => (
                                    <div key={field.id} className="space-y-2">
                                        <label className="block text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                            {field.label}
                                            {field.required && <span className="text-rose-500 ml-1">*</span>}
                                        </label>

                                        {field.type === 'textarea' && (
                                            <textarea
                                                rows={3}
                                                value={responses[field.id] || ''}
                                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                placeholder={field.placeholder || 'Type your response here...'}
                                                required={Boolean(field.required)}
                                                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                                            />
                                        )}

                                        {field.type === 'text' && (
                                            <input
                                                type="text"
                                                value={responses[field.id] || ''}
                                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                placeholder={field.placeholder || ''}
                                                required={Boolean(field.required)}
                                                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                                            />
                                        )}

                                        {field.type === 'select' && (
                                            <select
                                                value={responses[field.id] || ''}
                                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                required={Boolean(field.required)}
                                                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                                            >
                                                <option value="">Please select an option...</option>
                                                {(field.options || []).map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'radio' && (
                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                {(field.options || ['no', 'yes']).map((opt) => {
                                                    const isChecked = responses[field.id] === opt;
                                                    return (
                                                        <label
                                                            key={opt}
                                                            className={`p-3 rounded-2xl border flex items-center justify-center gap-2.5 cursor-pointer font-semibold text-xs capitalize transition ${
                                                                isChecked
                                                                    ? 'bg-violet-50 border-violet-600 text-violet-700 ring-2 ring-violet-500/20'
                                                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={field.id}
                                                                value={opt}
                                                                checked={isChecked}
                                                                onChange={() => handleFieldChange(field.id, opt)}
                                                                required={Boolean(field.required)}
                                                                className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                                                            />
                                                            <span>{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {field.type === 'image' && (
                                            <div>
                                                {imagePreviews[field.id] ? (
                                                    <div className="relative p-3.5 rounded-2xl border border-violet-200 bg-violet-50/40 flex items-center gap-4">
                                                        <img
                                                            src={imagePreviews[field.id].url}
                                                            alt="Uploaded preview"
                                                            className="w-16 h-16 rounded-xl object-cover border border-violet-200 shadow-sm shrink-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-slate-800 truncate">
                                                                {imagePreviews[field.id].name}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                                {(imagePreviews[field.id].size / 1024).toFixed(1)} KB • Image attached
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleImageRemove(field.id)}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                                            title="Remove image"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-violet-50/20 transition group">
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    handleImageSelect(field.id, e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition">
                                                            <Camera className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-semibold text-slate-700 group-hover:text-violet-700">
                                                                Click or drag to upload photo
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                                JPG, PNG, WEBP or HEIC up to 10MB
                                                            </p>
                                                        </div>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Patient Certification Checkbox */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded-lg text-violet-600 focus:ring-violet-500 border-slate-300"
                            />
                            <span className="text-xs text-slate-700 leading-relaxed font-medium">
                                I certify that the health history information provided above is complete and accurate to the best of my knowledge.
                                I will notify my practitioner if any change occurs in my physical condition or medications.
                            </span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || !confirmed}
                        className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Submitting Form...' : 'Submit Health History'}
                    </button>

                    <p className="text-center text-[11px] text-slate-400">
                        Confidential medical data protected under applicable health privacy legislation.
                    </p>
                </form>
            </main>
        </div>
    );
}
