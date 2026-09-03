import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    FileText, Plus, Trash2, RotateCcw, Check, ChevronDown, ChevronUp,
    Shield, AlertCircle, Save, Sparkles, Layers, CheckCircle2, HelpCircle
} from 'lucide-react';

const FIELD_TYPES = [
    { value: 'long_text', label: 'Long Paragraph / Clinical Text' },
    { value: 'short_text', label: 'Short Text / Metric' },
    { value: 'select', label: 'Dropdown Select' },
    { value: 'radio', label: 'Radio Choice' },
    { value: 'multiselect', label: 'Multi-select Tags' },
];

export default function ClinicalNoteTemplates({ templates = {}, offeredDisciplines = [], disciplineLabels = {} }) {
    const [activeDiscipline, setActiveDiscipline] = useState(offeredDisciplines[0] || 'massage_therapy');
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    const currentTemplate = templates[activeDiscipline] || {
        discipline: activeDiscipline,
        name: `${disciplineLabels[activeDiscipline] || activeDiscipline} Note Template`,
        description: '',
        version: 1,
        schema: { sections: [] },
        is_active: true,
    };

    const [formState, setFormState] = useState({
        name: currentTemplate.name,
        description: currentTemplate.description || '',
        schema: currentTemplate.schema || { sections: [] },
        is_active: currentTemplate.is_active ?? true,
    });

    const handleDisciplineChange = (disc) => {
        setActiveDiscipline(disc);
        const t = templates[disc] || {
            discipline: disc,
            name: `${disciplineLabels[disc] || disc} Note Template`,
            description: '',
            version: 1,
            schema: { sections: [] },
            is_active: true,
        };
        setFormState({
            name: t.name,
            description: t.description || '',
            schema: t.schema || { sections: [] },
            is_active: t.is_active ?? true,
        });
    };

    const addSection = () => {
        const newSecId = `sec_${Date.now()}`;
        setFormState((prev) => ({
            ...prev,
            schema: {
                ...prev.schema,
                sections: [
                    ...(prev.schema?.sections || []),
                    {
                        id: newSecId,
                        title: 'New Clinical Section',
                        description: '',
                        fields: [
                            {
                                id: `field_${Date.now()}`,
                                label: 'Encounter Notes',
                                type: 'long_text',
                                placeholder: 'Enter clinical observations...',
                                required: true,
                            },
                        ],
                    },
                ],
            },
        }));
    };

    const removeSection = (sIdx) => {
        setFormState((prev) => {
            const nextSections = [...prev.schema.sections];
            nextSections.splice(sIdx, 1);
            return {
                ...prev,
                schema: { ...prev.schema, sections: nextSections },
            };
        });
    };

    const updateSection = (sIdx, key, val) => {
        setFormState((prev) => {
            const nextSections = [...prev.schema.sections];
            nextSections[sIdx] = { ...nextSections[sIdx], [key]: val };
            return {
                ...prev,
                schema: { ...prev.schema, sections: nextSections },
            };
        });
    };

    const addField = (sIdx) => {
        setFormState((prev) => {
            const nextSections = [...prev.schema.sections];
            const sec = nextSections[sIdx];
            const newField = {
                id: `field_${Date.now()}`,
                label: 'Clinical Observation / Field',
                type: 'long_text',
                placeholder: '',
                required: false,
            };
            nextSections[sIdx] = {
                ...sec,
                fields: [...(sec.fields || []), newField],
            };
            return {
                ...prev,
                schema: { ...prev.schema, sections: nextSections },
            };
        });
    };

    const updateField = (sIdx, fIdx, key, val) => {
        setFormState((prev) => {
            const nextSections = [...prev.schema.sections];
            const sec = nextSections[sIdx];
            const nextFields = [...sec.fields];
            nextFields[fIdx] = { ...nextFields[fIdx], [key]: val };
            nextSections[sIdx] = { ...sec, fields: nextFields };
            return {
                ...prev,
                schema: { ...prev.schema, sections: nextSections },
            };
        });
    };

    const removeField = (sIdx, fIdx) => {
        setFormState((prev) => {
            const nextSections = [...prev.schema.sections];
            const sec = nextSections[sIdx];
            const nextFields = [...sec.fields];
            nextFields.splice(fIdx, 1);
            nextSections[sIdx] = { ...sec, fields: nextFields };
            return {
                ...prev,
                schema: { ...prev.schema, sections: nextSections },
            };
        });
    };

    const saveTemplate = (e) => {
        e.preventDefault();
        if (!currentTemplate.id) return;
        setSaving(true);
        router.patch(`/app/settings/clinical-note-templates/${currentTemplate.id}`, formState, {
            preserveScroll: true,
            onSuccess: () => setSaving(false),
            onError: () => setSaving(false),
        });
    };

    const resetToDefaults = () => {
        if (!currentTemplate.id) return;
        if (!confirm('Are you sure you want to reset this template to platform defaults? Any customizations will be replaced with standard starter sections.')) {
            return;
        }
        setResetting(true);
        router.post(`/app/settings/clinical-note-templates/${currentTemplate.id}/reset`, {}, {
            preserveScroll: true,
            onSuccess: () => setResetting(false),
            onError: () => setResetting(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Clinical Note Templates — Settings" />

            <div className="max-w-6xl mx-auto space-y-6 pb-12">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Clinical Note Templates
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
                                Versioned & Immutable
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Configure profession-specific clinical documentation schemas for each health discipline offered at your clinic.
                        </p>
                    </div>
                </div>

                {/* Discipline Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
                    {offeredDisciplines.map((disc) => {
                        const isSelected = activeDiscipline === disc;
                        const label = disciplineLabels[disc] || disc;
                        return (
                            <button
                                key={disc}
                                type="button"
                                onClick={() => handleDisciplineChange(disc)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                                    isSelected
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{label}</span>
                                {templates[disc]?.version && (
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                        isSelected ? 'bg-violet-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                        v{templates[disc].version}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Template Editor Form */}
                <form onSubmit={saveTemplate} className="space-y-6">
                    {/* General Template Meta Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                <Layers className="w-4 h-4 text-violet-600" />
                                Template Settings for {disciplineLabels[activeDiscipline] || activeDiscipline}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">
                                    Current Version: <strong>v{currentTemplate.version}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={resetToDefaults}
                                    disabled={resetting}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                    title="Reset template to default starter schema"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset to Starter</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Template Title
                                </label>
                                <input
                                    type="text"
                                    value={formState.name}
                                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Scope / Description
                                </label>
                                <input
                                    type="text"
                                    value={formState.description}
                                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="e.g. Standard SOAP encounter documentation..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Template Sections */}
                    <div className="space-y-4">
                        {(formState.schema?.sections || []).map((sec, sIdx) => (
                            <div
                                key={sec.id || sIdx}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center">
                                            {sIdx + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={sec.title}
                                            onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
                                            className="text-sm font-bold text-slate-900 dark:text-white bg-transparent border-none p-0 focus:ring-0"
                                            placeholder="Section Title..."
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSection(sIdx)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                        title="Delete Section"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={sec.description || ''}
                                    onChange={(e) => updateSection(sIdx, 'description', e.target.value)}
                                    className="w-full text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 pb-1 focus:outline-none"
                                    placeholder="Section instructions for the practitioner (optional)..."
                                />

                                {/* Fields in this section */}
                                <div className="space-y-3 pt-2">
                                    {(sec.fields || []).map((field, fIdx) => (
                                        <div
                                            key={field.id || fIdx}
                                            className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Field Label / Prompt
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => updateField(sIdx, fIdx, 'label', e.target.value)}
                                                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                        placeholder="e.g. Palpation Findings"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Field Type
                                                    </label>
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => updateField(sIdx, fIdx, 'type', e.target.value)}
                                                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    >
                                                        {FIELD_TYPES.map((ft) => (
                                                            <option key={ft.value} value={ft.value}>
                                                                {ft.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Options for select / radio / multiselect */}
                                            {['select', 'radio', 'multiselect'].includes(field.type) && (
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Dropdown Options (comma-separated)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')}
                                                        onChange={(e) => updateField(sIdx, fIdx, 'options', e.target.value.split(',').map((s) => s.trim()))}
                                                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                        placeholder="Option 1, Option 2, Option 3"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-1">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required || false}
                                                        onChange={(e) => updateField(sIdx, fIdx, 'required', e.target.checked)}
                                                        className="rounded text-violet-600 focus:ring-violet-500"
                                                    />
                                                    <span>Mandatory field for finalization</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeField(sIdx, fIdx)}
                                                    className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                                                >
                                                    Remove Field
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => addField(sIdx)}
                                        className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-violet-600 flex items-center justify-center gap-1.5 transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Field to this Section</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addSection}
                            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-500 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-violet-600 flex items-center justify-center gap-2 transition bg-slate-50/50 dark:bg-slate-900/30"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Section</span>
                        </button>
                    </div>

                    {/* Bottom Save Bar */}
                    <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <span>Saving creates <strong>v{currentTemplate.version + 1}</strong>. Historical finalized notes preserve their snapshotted schema version.</span>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-600/25 transition"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : `Save Template (v${currentTemplate.version + 1})`}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
