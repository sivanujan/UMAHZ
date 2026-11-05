import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    ShieldCheck,
    Plus,
    CheckCircle2,
    Clock,
    Trash2,
    Edit3,
    FileText,
    Building2,
    Eye,
    EyeOff,
    Check,
} from 'lucide-react';

export default function ClientInsuranceSection({
    client,
    policies = [],
    providers = [],
    canManage = false,
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [revealedIds, setRevealedIds] = useState({});
    const [revealedData, setRevealedData] = useState({});
    const [loadingReveal, setLoadingReveal] = useState({});

    const toggleReveal = async (policyId) => {
        if (!canManage) return;

        if (revealedIds[policyId]) {
            setRevealedIds((prev) => ({ ...prev, [policyId]: false }));
            return;
        }

        if (revealedData[policyId]) {
            setRevealedIds((prev) => ({ ...prev, [policyId]: true }));
            return;
        }

        setLoadingReveal((prev) => ({ ...prev, [policyId]: true }));
        try {
            const res = await axios.post(`/app/clients/${client.id}/insurance/policies/${policyId}/reveal`);
            setRevealedData((prev) => ({ ...prev, [policyId]: res.data }));
            setRevealedIds((prev) => ({ ...prev, [policyId]: true }));
        } catch (e) {
            console.error('Failed to reveal insurance policy details', e);
        } finally {
            setLoadingReveal((prev) => ({ ...prev, [policyId]: false }));
        }
    };

    const handleOpenCreate = () => {
        setEditingPolicy(null);
        setModalOpen(true);
    };

    const handleOpenEdit = async (policy) => {
        let fullPolicy = { ...policy };
        if (canManage) {
            if (revealedData[policy.id]) {
                fullPolicy = { ...fullPolicy, ...revealedData[policy.id] };
            } else {
                try {
                    const res = await axios.post(`/app/clients/${client.id}/insurance/policies/${policy.id}/reveal`);
                    setRevealedData((prev) => ({ ...prev, [policy.id]: res.data }));
                    fullPolicy = { ...fullPolicy, ...res.data };
                } catch (e) {
                    console.error('Failed to fetch full policy for edit', e);
                }
            }
        }
        setEditingPolicy(fullPolicy);
        setModalOpen(true);
    };

    const handleDelete = (policy) => {
        if (!window.confirm(`Are you sure you want to remove the insurance policy for ${policy.provider?.name || 'this provider'}?`)) {
            return;
        }

        router.delete(`/app/clients/${client.id}/insurance/policies/${policy.id}`, {
            preserveScroll: true,
        });
    };

    const handleVerify = (policy) => {
        router.post(`/app/clients/${client.id}/insurance/policies/${policy.id}/verify`, {}, {
            preserveScroll: true,
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Patient Insurance & Extended Health
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Extended health coverage, primary/secondary insurers, and verification details for {client.name}.
                        </p>
                    </div>
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Insurance Policy
                    </button>
                )}
            </div>

            {policies.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                    <Building2 className="w-10 h-10 mx-auto mb-2.5 opacity-35 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Insurance Policies on File</p>
                    <p className="text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        Store patient policy numbers, member certificates, and coverage for extended health billing and receipts.
                    </p>
                    {canManage && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 font-semibold text-xs transition"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Insurance Policy
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {policies.map((policy) => {
                        const isRevealed = revealedIds[policy.id];
                        const isPrimary = policy.priority === 'primary';

                        return (
                            <div
                                key={policy.id}
                                className={`rounded-xl border p-4 transition-all ${
                                    isPrimary
                                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {policy.provider?.name || 'Insurance Provider'}
                                            </h3>
                                            <span
                                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                                    isPrimary
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}
                                            >
                                                {policy.priority}
                                            </span>
                                            {policy.provider?.network && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                    {policy.provider.network.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Plan Holder: <span className="font-semibold text-slate-700 dark:text-slate-200">{policy.plan_holder_name}</span> ({policy.relationship_to_patient})
                                        </p>
                                    </div>

                                    {canManage && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(policy)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                                                title="Edit Policy"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(policy)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                                title="Delete Policy"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs py-2.5 my-2 border-y border-slate-100 dark:border-slate-800">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                            Member / Certificate ID
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                                            <span>
                                                {isRevealed
                                                    ? (revealedData[policy.id]?.member_id || policy.masked_member_id)
                                                    : policy.masked_member_id}
                                            </span>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleReveal(policy.id)}
                                                    disabled={loadingReveal[policy.id]}
                                                    className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                                                    title={isRevealed ? 'Hide full number' : 'Show full number'}
                                                >
                                                    {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                            Policy / Group #
                                        </span>
                                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                                            {isRevealed
                                                ? (revealedData[policy.id]?.policy_number || policy.masked_policy_number)
                                                : policy.masked_policy_number}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                    <div className="flex items-center gap-1.5">
                                        {policy.is_verified ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                                {policy.verified_by && ` by ${policy.verified_by.name}`}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-[11px]">
                                                <Clock className="w-3.5 h-3.5" /> Unverified
                                            </span>
                                        )}
                                    </div>

                                    {!policy.is_verified && canManage && (
                                        <button
                                            type="button"
                                            onClick={() => handleVerify(policy)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                                        >
                                            <Check className="w-3 h-3" /> Mark as verified
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalOpen && (
                <PolicyModal
                    client={client}
                    providers={providers}
                    policy={editingPolicy}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
}

function PolicyModal({ client, providers, policy, onClose }) {
    const isEditing = Boolean(policy);

    const [form, setForm] = useState({
        insurance_provider_id: policy?.insurance_provider_id || (providers[0]?.id || ''),
        priority: policy?.priority || 'primary',
        policy_number: policy?.policy_number || '',
        group_number: policy?.group_number || '',
        member_id: policy?.member_id || '',
        certificate_id: policy?.certificate_id || '',
        plan_holder_name: policy?.plan_holder_name || client.name || '',
        relationship_to_patient: policy?.relationship_to_patient || 'self',
        plan_holder_dob: policy?.plan_holder_dob || '',
        coverage_start_date: policy?.coverage_start_date || '',
        coverage_end_date: policy?.coverage_end_date || '',
        notes: policy?.notes || '',
    });

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const url = isEditing
            ? `/app/clients/${client.id}/insurance/policies/${policy.id}`
            : `/app/clients/${client.id}/insurance/policies`;

        const method = isEditing ? 'put' : 'post';

        router[method](url, form, {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs);
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {isEditing ? 'Edit Insurance Policy' : 'Add Patient Insurance Policy'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Insurance Provider *
                        </label>
                        <select
                            value={form.insurance_provider_id}
                            onChange={(e) => setForm({ ...form, insurance_provider_id: e.target.value })}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500"
                            required
                        >
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.province ? `(${p.province})` : ''}
                                </option>
                            ))}
                        </select>
                        {errors.insurance_provider_id && (
                            <p className="text-rose-500 text-[11px] mt-1">{errors.insurance_provider_id}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Priority *
                            </label>
                            <select
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="primary">Primary Coverage</option>
                                <option value="secondary">Secondary Coverage</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Relationship to Patient *
                            </label>
                            <select
                                value={form.relationship_to_patient}
                                onChange={(e) => setForm({ ...form, relationship_to_patient: e.target.value })}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="self">Self (Patient)</option>
                                <option value="spouse">Spouse</option>
                                <option value="child">Child / Dependant</option>
                                <option value="parent">Parent</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Member / Certificate ID *
                            </label>
                            <input
                                type="text"
                                value={form.member_id}
                                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                                placeholder="e.g. 12345678"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500 font-mono"
                                required
                            />
                            {errors.member_id && <p className="text-rose-500 text-[11px] mt-1">{errors.member_id}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Policy / Group # *
                            </label>
                            <input
                                type="text"
                                value={form.policy_number}
                                onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
                                placeholder="e.g. 987654"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500 font-mono"
                                required
                            />
                            {errors.policy_number && (
                                <p className="text-rose-500 text-[11px] mt-1">{errors.policy_number}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Plan Holder Full Name *
                            </label>
                            <input
                                type="text"
                                value={form.plan_holder_name}
                                onChange={(e) => setForm({ ...form, plan_holder_name: e.target.value })}
                                placeholder="Full Name"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500"
                                required
                            />
                            {errors.plan_holder_name && (
                                <p className="text-rose-500 text-[11px] mt-1">{errors.plan_holder_name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Plan Holder Date of Birth
                            </label>
                            <input
                                type="date"
                                value={form.plan_holder_dob}
                                onChange={(e) => setForm({ ...form, plan_holder_dob: e.target.value })}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Coverage Start Date
                            </label>
                            <input
                                type="date"
                                value={form.coverage_start_date}
                                onChange={(e) => setForm({ ...form, coverage_start_date: e.target.value })}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Coverage End Date
                            </label>
                            <input
                                type="date"
                                value={form.coverage_end_date}
                                onChange={(e) => setForm({ ...form, coverage_end_date: e.target.value })}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Notes / Benefit Details
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="e.g. $500 annual limit, requires doctor referral for acupuncture..."
                            rows={2}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3"
                        />
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        🔒 Policy and certificate numbers are securely encrypted at rest.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Policy'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

