import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ClipboardList, ArrowLeft, ShieldAlert, Plus, Trash2, Check,
    AlertTriangle, RotateCcw, Save, Sparkles, FileText, CheckCircle2
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture & TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietetics & Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

const FIELD_TYPES = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Paragraph' },
    { value: 'select', label: 'Dropdown Select' },
    { value: 'radio', label: 'Yes / No (Radio)' },
];

export default function IntakeForms({ tenant, templates = [], offeredDisciplines = [] }) {
    const [activeDiscipline, setActiveDiscipline] = useState(offeredDisciplines[0] || templates[0]?.discipline || 'massage_therapy');

    const currentTemplate = templates.find((t) => t.discipline === activeDiscipline) || templates[0];

    const [schema, setSchema] = useState(currentTemplate?.schema || { sections: [] });
    const [templateName, setTemplateName] = useState(currentTemplate?.name || '');
    const [templateDescription, setTemplateDescription] = useState(currentTemplate?.description || '');
    const [saving, setSaving] = useState(false);

    // Sync state when switching disciplines
    const handleDisciplineSwitch = (disciplineCode) => {
        setActiveDiscipline(disciplineCode);
        const t = templates.find((item) => item.discipline === disciplineCode);
        if (t) {
            setSchema(t.schema || { sections: [] });
            setTemplateName(t.name || '');
            setTemplateDescription(t.description || '');
        }
    };

    // Update section title
    const handleSectionTitleChange = (sIdx, title) => {
        const next = { ...schema };
        next.sections[sIdx].title = title;
        setSchema(next);
    };

    // Update field attribute
    const handleFieldChange = (sIdx, fIdx, key, val) => {
        const next = { ...schema };
        next.sections[sIdx].fields[fIdx][key] = val;
        setSchema(next);
    };

    // Add field to section
    const handleAddField = (sIdx) => {
        const next = { ...schema };
        const id = 'custom_' + Date.now().toString(36);
        next.sections[sIdx].fields.push({
            id,
            label: 'New Clinical Question',
            type: 'textarea',
            required: false,
            applies_to: 'all',
            placeholder: '',
            is_contraindication: false,
            flag_trigger: 'yes',
            flag_warning: 'Medical consideration flagged.',
        });
        setSchema(next);
    };

    // Remove field from section
    const handleRemoveField = (sIdx, fIdx) => {
        const next = { ...schema };
        next.sections[sIdx].fields.splice(fIdx, 1);
        setSchema(next);
    };

    // Save changes
    const handleSave = (e) => {
        e.preventDefault();
        if (!currentTemplate) return;

        setSaving(true);
        router.patch(`/app/settings/intake-forms/${currentTemplate.id}`, {
            name: templateName,
            description: templateDescription,
            schema,
            is_active: true,
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    // Reset to defaults
    const handleReset = () => {
        if (!currentTemplate) return;
        if (confirm('Reset this template back to baseline starter questions? Any custom questions you added will be replaced.')) {
            router.post(`/app/settings/intake-forms/${currentTemplate.id}/reset`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    // Refetch will update props
                },
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Intake Form Templates" />

            <div className="max-w-5xl mx-auto space-y-6 pb-16">
                {/* Back Nav & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/settings"
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-violet-700 dark:text-violet-400" />
                                Health History & Intake Form Templates
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Customize clinical questionnaires and contraindication flags for the disciplines {tenant.name} offers.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Defaults
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </div>

                {/* Professional Regulatory Notice Disclaimer Banner */}
                <div className="rounded-2xl border border-amber-300/80 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-bold text-sm">Regulatory Notice & Clinical Responsibility</p>
                        <p className="leading-relaxed text-amber-700 dark:text-amber-400">
                            Starter questions provided below are generic placeholders. The clinic and its registered healthcare practitioners
                            are solely responsible for reviewing, customizing, and ensuring that all health history questions, pain assessment fields,
                            and contraindication screenings adhere strictly to your provincial/state regulatory college guidelines (e.g. CMTO, CTCMPAO, CSEP).
                        </p>
                    </div>
                </div>

                {/* Discipline Navigation Tabs (Only Offered Disciplines) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
                    {offeredDisciplines.map((code) => {
                        const isSelected = code === activeDiscipline;
                        const label = DISCIPLINE_LABELS[code] || code;
                        return (
                            <button
                                key={code}
                                type="button"
                                onClick={() => handleDisciplineSwitch(code)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                                    isSelected
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-200' : 'text-slate-400'}`} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Form Editor Body */}
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Template Overview Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Intake Form Title
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Clinical Scope / Purpose
                                </label>
                                <input
                                    type="text"
                                    value={templateDescription}
                                    onChange={(e) => setTemplateDescription(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                    placeholder="Brief guidance for patients..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Sections & Questions */}
                    {(schema.sections || []).map((section, sIdx) => (
                        <div
                            key={sIdx}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
                        >
                            {/* Section Header */}
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center">
                                        {sIdx + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={section.title}
                                        onChange={(e) => handleSectionTitleChange(sIdx, e.target.value)}
                                        className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-violet-600 outline-none px-1 py-0.5 w-full max-w-md"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleAddField(sIdx)}
                                    className="text-xs font-semibold text-violet-700 dark:text-violet-400 hover:text-violet-800 flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Question
                                </button>
                            </div>

                            {/* Section Questions */}
                            <div className="p-6 space-y-5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                {(section.fields || []).map((field, fIdx) => (
                                    <div key={field.id || fIdx} className={fIdx > 0 ? 'pt-5 space-y-3' : 'space-y-3'}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                {/* Question Label */}
                                                <div className="sm:col-span-8">
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                        Question Text
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => handleFieldChange(sIdx, fIdx, 'label', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-violet-500"
                                                    />
                                                </div>

                                                {/* Input Type */}
                                                <div className="sm:col-span-4">
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                        Answer Type
                                                    </label>
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => handleFieldChange(sIdx, fIdx, 'type', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-violet-500"
                                                    >
                                                        {FIELD_TYPES.map((t) => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Remove Field */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveField(sIdx, fIdx)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition mt-6"
                                                title="Remove question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Toggles: Required, Contraindication Flag, & Applies To */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(field.required)}
                                                        onChange={(e) => handleFieldChange(sIdx, fIdx, 'required', e.target.checked)}
                                                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                                                    />
                                                    <span>Mandatory Question</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer select-none text-rose-700 dark:text-rose-400 font-semibold">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(field.is_contraindication)}
                                                        onChange={(e) => handleFieldChange(sIdx, fIdx, 'is_contraindication', e.target.checked)}
                                                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                                                    />
                                                    <span className="flex items-center gap-1">
                                                        <ShieldAlert className="w-3.5 h-3.5" />
                                                        Flag as Clinical Contraindication Warning
                                                    </span>
                                                </label>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                                    Applies To:
                                                </span>
                                                <select
                                                    value={field.applies_to || 'all'}
                                                    onChange={(e) => handleFieldChange(sIdx, fIdx, 'applies_to', e.target.value)}
                                                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-violet-500"
                                                >
                                                    <option value="all">Everyone (Default)</option>
                                                    <option value="female_only">Female only</option>
                                                    <option value="male_only">Male only</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Contraindication Trigger Details */}
                                        {field.is_contraindication && (
                                            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-xs space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                                                        Trigger warning when answer is:
                                                    </span>
                                                    <select
                                                        value={field.flag_trigger || 'yes'}
                                                        onChange={(e) => handleFieldChange(sIdx, fIdx, 'flag_trigger', e.target.value)}
                                                        className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white font-semibold text-xs"
                                                    >
                                                        <option value="yes">"Yes"</option>
                                                        <option value="no">"No"</option>
                                                    </select>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={field.flag_warning || ''}
                                                    onChange={(e) => handleFieldChange(sIdx, fIdx, 'flag_warning', e.target.value)}
                                                    placeholder="Warning message to show staff (e.g. History of blood clots - avoid deep work)..."
                                                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Bottom Save Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        >
                            Reset to Starter Template
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving Changes...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
