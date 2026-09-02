import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ClipboardEdit, X, Check, AlertTriangle, ShieldAlert, Sparkles,
    UserCheck, Clock, FileCheck2, Camera, Trash2, Image as ImageIcon
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture & TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietetics & Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

export default function StaffFillIntakeModal({
    client,
    offeredDisciplines = [],
    disciplineLabels = {},
    intakeTemplates = [],
    appointments = [],
    onClose,
}) {
    const [selectedDiscipline, setSelectedDiscipline] = useState(offeredDisciplines[0] || 'massage_therapy');
    const [responses, setResponses] = useState({});
    const [imagePreviews, setImagePreviews] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const activeTemplate = intakeTemplates.find((t) => t.discipline === selectedDiscipline) || intakeTemplates[0];
    const rawSchema = activeTemplate?.schema || { sections: [] };

    // Filter questions based on client.sex (female_only, male_only, fail-open if unset or other)
    const clientSex = client?.sex;
    const schema = {
        ...rawSchema,
        sections: (rawSchema.sections || []).map((sec) => ({
            ...sec,
            fields: (sec.fields || []).filter((f) => {
                const appliesTo = f.applies_to || 'all';
                if (clientSex === 'male' && appliesTo === 'female_only') return false;
                if (clientSex === 'female' && appliesTo === 'male_only') return false;
                return true;
            }),
        })).filter((sec) => sec.fields.length > 0),
    };

    const handleDisciplineChange = (disc) => {
        setSelectedDiscipline(disc);
        setResponses({});
        setImagePreviews({});
    };

    const handleResponseChange = (fieldId, value) => {
        setResponses((prev) => ({
            ...prev,
            [fieldId]: value,
        }));
    };

    const handleImageSelect = (fieldId, file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit. Please select a smaller photo.');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setImagePreviews((prev) => ({ ...prev, [fieldId]: { url: previewUrl, name: file.name, size: file.size } }));
        handleResponseChange(fieldId, file);
    };

    const handleImageRemove = (fieldId) => {
        setImagePreviews((prev) => {
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
        handleResponseChange(fieldId, null);
    };

    // Calculate triggered contraindication warnings in real-time
    const activeFlags = [];
    (schema.sections || []).forEach((sec) => {
        (sec.fields || []).forEach((field) => {
            if (field.is_contraindication) {
                const val = responses[field.id];
                const trigger = field.flag_trigger || 'yes';
                if (val !== undefined && String(val).toLowerCase() === String(trigger).toLowerCase()) {
                    activeFlags.push({
                        label: field.label,
                        warning: field.flag_warning || 'Contraindication flag reported.',
                    });
                }
            }
        });
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        setSubmitting(true);
        router.post(`/app/clients/${client.id}/intakes/staff`, {
            discipline: selectedDiscipline,
            responses,
        }, {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
                style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'var(--umahz-border)', background: 'var(--umahz-surface-alt, #fafafa)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold">
                            <ClipboardEdit className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Record In-Person Health History & Intake
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Staff-completed questionnaire for <span className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</span>
                                {client.sex && (
                                    <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 capitalize">
                                        {client.sex.replace(/_/g, ' ')}
                                    </span>
                                )}
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Discipline Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            1. Select Health Discipline
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {offeredDisciplines.map((disc) => {
                                const isSelected = disc === selectedDiscipline;
                                return (
                                    <button
                                        key={disc}
                                        type="button"
                                        onClick={() => handleDisciplineChange(disc)}
                                        className={`p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                                            isSelected
                                                ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-600 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'
                                        }`}
                                    >
                                        {disciplineLabels?.[disc] || DISCIPLINE_LABELS[disc] || disc}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Live Contraindication Warning Summary */}
                    {activeFlags.length > 0 && (
                        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2 text-xs text-rose-800 dark:text-rose-200">
                            <div className="flex items-center gap-2 font-bold text-sm text-rose-900 dark:text-rose-100">
                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                                {activeFlags.length} Contraindication Warning(s) Detected
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {activeFlags.map((flag, idx) => (
                                    <li key={idx}>
                                        <strong>{flag.label}:</strong> {flag.warning}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Questions by Section */}
                    {(schema.sections || []).map((section, sIdx) => (
                        <div key={sIdx} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {section.title}
                            </h3>

                            <div className="space-y-4">
                                {(section.fields || []).map((field) => (
                                    <div key={field.id} className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            {field.label}
                                            {field.required && <span className="text-rose-500 ml-1">*</span>}
                                        </label>

                                        {field.type === 'textarea' && (
                                            <textarea
                                                rows={2}
                                                value={responses[field.id] || ''}
                                                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                placeholder={field.placeholder || ''}
                                                required={Boolean(field.required)}
                                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                            />
                                        )}

                                        {field.type === 'text' && (
                                            <input
                                                type="text"
                                                value={responses[field.id] || ''}
                                                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                placeholder={field.placeholder || ''}
                                                required={Boolean(field.required)}
                                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                            />
                                        )}

                                        {field.type === 'select' && (
                                            <select
                                                value={responses[field.id] || ''}
                                                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                required={Boolean(field.required)}
                                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                            >
                                                <option value="">Select an option...</option>
                                                {(field.options || []).map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'radio' && (
                                            <div className="flex items-center gap-4 text-xs pt-0.5">
                                                {(field.options || ['no', 'yes']).map((opt) => (
                                                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer capitalize text-slate-700 dark:text-slate-300">
                                                        <input
                                                            type="radio"
                                                            name={field.id}
                                                            value={opt}
                                                            checked={responses[field.id] === opt}
                                                            onChange={() => handleResponseChange(field.id, opt)}
                                                            required={Boolean(field.required)}
                                                            className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {field.type === 'image' && (
                                            <div>
                                                {imagePreviews[field.id] ? (
                                                    <div className="relative p-2.5 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 flex items-center gap-3">
                                                        <img
                                                            src={imagePreviews[field.id].url}
                                                            alt="Uploaded preview"
                                                            className="w-12 h-12 rounded-lg object-cover border border-violet-200 dark:border-violet-800 shadow-sm shrink-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                {imagePreviews[field.id].name}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                {(imagePreviews[field.id].size / 1024).toFixed(1)} KB • Image attached
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleImageRemove(field.id)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                                            title="Remove image"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 hover:bg-violet-50/20 transition group">
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
                                                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition">
                                                            <Camera className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-violet-600">
                                                                Click or drag to attach patient photo
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                JPG, PNG, WEBP up to 10MB
                                                            </p>
                                                        </div>
                                                    </label>
                                                )}
                                            </div>
                                        )}

                                        {field.is_contraindication && (
                                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                                ⚠️ Answering "{field.flag_trigger || 'yes'}" flags a contraindication warning for practitioner review.
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
                        >
                            <FileCheck2 className="w-4 h-4" />
                            {submitting ? 'Recording Intake...' : 'Record Completed Intake'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
