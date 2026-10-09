import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    ArrowLeft, Building2, MapPin, IdCard, User, Mail, Phone, Users, Stethoscope,
    Check, AlertTriangle, XCircle, FileText, Loader2, Trash2, Pencil, Ban, RotateCcw, AlertCircle,
    RefreshCw, Clock, History,
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
    physiotherapy: 'Physiotherapy',
    chiropractor: 'Chiropractor',
};

function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
                <p className="text-sm text-slate-200 mt-0.5">{value || '—'}</p>
            </div>
        </div>
    );
}

function NoteModal({ title, confirmLabel, confirmClass, onCancel, onConfirm, processing }) {
    const [note, setNote] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-white font-semibold text-base mb-1">{title}</h3>
                <p className="text-xs text-slate-500 mb-4">This note is sent to the clinic's primary contact by email.</p>
                <textarea
                    autoFocus
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                    placeholder="Explain what's missing or why…"
                />
                <div className="flex items-center gap-2 mt-4">
                    <button
                        disabled={!note.trim() || processing}
                        onClick={() => onConfirm(note)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${confirmClass}`}
                    >
                        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                    <button onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function RejectModal({ tenant, onCancel, onConfirm, processing }) {
    const [note, setNote] = useState('');
    const [sections, setSections] = useState([]);

    const toggleSection = (s) => {
        setSections((prev) =>
            prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
        );
    };

    const isFinal = (tenant.reapply_count || 1) >= (tenant.max_attempts || 3);
    const attemptsRemainingAfter = Math.max(0, (tenant.max_attempts || 3) - (tenant.reapply_count || 1));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
                <div>
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-rose-500" />
                        <span>Reject Application</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        State the rejection reason and tick which sections the applicant needs to fix.
                    </p>
                </div>

                {isFinal ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-semibold block">Final Allowed Attempt</strong>
                            This clinic has reached attempt {tenant.reapply_count} of {tenant.max_attempts}. Rejecting will close the application permanently and block this email from re-applying.
                        </div>
                    </div>
                ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-semibold block">Re-application Allowed</strong>
                            Attempt {tenant.reapply_count} of {tenant.max_attempts} ({attemptsRemainingAfter} {attemptsRemainingAfter === 1 ? 'attempt' : 'attempts'} remaining). The applicant will receive an expiring update & re-apply link.
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                        Sections needing updates <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                            { id: 'clinic_details', label: 'Clinic Details' },
                            { id: 'documents_license', label: 'Documents / Licence' },
                            { id: 'disciplines', label: 'Disciplines' },
                            { id: 'contact', label: 'Contact Info' },
                            { id: 'other', label: 'Other' },
                        ].map((sec) => (
                            <label
                                key={sec.id}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                    sections.includes(sec.id)
                                        ? 'bg-rose-500/10 border-rose-500/40 text-white'
                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={sections.includes(sec.id)}
                                    onChange={() => toggleSection(sec.id)}
                                    className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                                />
                                <span className="text-xs font-medium">{sec.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                        Rejection Reason & Feedback <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        autoFocus
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        placeholder="Detail the reasons and what the applicant should fix..."
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                        onClick={onCancel}
                        disabled={processing}
                        className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!note.trim() || sections.length === 0 || processing}
                        onClick={() => onConfirm(note, sections)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {isFinal ? 'Reject & Block Email' : 'Reject with Re-apply'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PermanentRejectModal({ tenant, onCancel, onConfirm, processing }) {
    const [note, setNote] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6">
            <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div>
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <Ban className="w-5 h-5 text-rose-500" />
                        <span>Reject Permanently</span>
                    </h3>
                    <p className="text-xs text-rose-300/80 mt-1">
                        This action cannot be undone. It immediately bars <strong className="text-white">{tenant.name}</strong> ({tenant.primary_contact_email}) from re-applying, regardless of attempts remaining.
                    </p>
                </div>

                <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                        Permanent Rejection Reason <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        autoFocus
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        placeholder="Explain why this clinic is being permanently rejected..."
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                        onClick={onCancel}
                        disabled={processing}
                        className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!note.trim() || processing}
                        onClick={() => onConfirm(note)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-700 hover:bg-rose-600 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Confirm Permanent Rejection
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ClinicShow({ tenant, primaryPractitioner }) {
    const { errors, flash } = usePage().props;
    const [modal, setModal] = useState(null); // 'needs_more_info' | 'reject' | 'reject_permanent' | 'remove' | null
    const [processing, setProcessing] = useState(false);
    const [confirmName, setConfirmName] = useState('');

    const approve = () => {
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/approve`, {}, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const submitNote = (note) => {
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/request-info`, { note }, {
            preserveScroll: true,
            onFinish: () => { setProcessing(false); setModal(null); },
        });
    };

    const submitReject = (note, sections) => {
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/reject`, { note, sections }, {
            preserveScroll: true,
            onFinish: () => { setProcessing(false); setModal(null); },
        });
    };

    const submitPermanentReject = (note) => {
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/reject-permanent`, { note }, {
            preserveScroll: true,
            onFinish: () => { setProcessing(false); setModal(null); },
        });
    };

    const setStatus = (action) => {
        setProcessing(true);
        router.patch(`/admin/clinics/${tenant.id}/${action}`, {}, { preserveScroll: true, onFinish: () => setProcessing(false) });
    };

    const remove = () => {
        setProcessing(true);
        router.delete(`/admin/clinics/${tenant.id}`, {
            data: { confirmation: confirmName },
            onFinish: () => setProcessing(false),
        });
    };

    const isPending = tenant.status === 'pending_review' || tenant.status === 'needs_more_info';

    return (
        <AdminLayout title={tenant.name}>
            <Head title={`Review — ${tenant.name}`} />

            <Link href="/admin/clinics" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to queue
            </Link>

            {/* Warning Banner: Matches Blocked Application */}
            {tenant.matches_blocked && (
                <div className="mb-6 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="font-bold text-white block">Warning: Matches Blocked Application Record</strong>
                        <span>This application shares identifier details with a previously blocked clinic ({tenant.blocked_match_reason}). Review carefully before taking action.</span>
                    </div>
                </div>
            )}

            {/* Re-application Banner */}
            {tenant.reapply_count > 1 && (
                <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-sm flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2.5">
                        <RefreshCw className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div>
                            <span className="font-bold text-white">Re-application (Attempt {tenant.reapply_count} of {tenant.max_attempts})</span>
                            <p className="text-xs text-amber-300/80 mt-0.5">
                                This application was previously reviewed and resubmitted by the applicant.
                            </p>
                        </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-500/30">
                        Attempt {tenant.reapply_count}/{tenant.max_attempts}
                    </span>
                </div>
            )}

            {/* Error or Flash Alerts */}
            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        {Object.values(errors).map((err, i) => (
                            <p key={i} className="font-medium">{err}</p>
                        ))}
                    </div>
                </div>
            )}

            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <p className="font-medium">{flash.success}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <div className="flex items-start justify-between gap-4 mb-1">
                            <h2 className="text-white font-semibold text-lg">{tenant.name}</h2>
                            {tenant.is_permanently_rejected && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    Permanently Rejected
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Submitted {tenant.submitted_at || '—'}</p>

                        <div className="divide-y divide-slate-800/60">
                            <InfoRow icon={Building2} label="Subdomain" value={`${tenant.slug || '—'}.umahz.com`} />
                            <InfoRow icon={IdCard} label="Business Registration #" value={tenant.business_registration_number} />
                            <InfoRow
                                icon={MapPin}
                                label="Address"
                                value={[
                                    tenant.address?.line1,
                                    tenant.address?.city,
                                    tenant.address?.region,
                                    tenant.address?.country,
                                ].filter(Boolean).join(', ')}
                            />
                            <InfoRow icon={User} label="Primary Contact" value={tenant.primary_contact_name} />
                            <InfoRow icon={Mail} label="Contact Email" value={tenant.primary_contact_email} />
                            <InfoRow icon={Phone} label="Contact Phone" value={tenant.primary_contact_phone} />
                            <InfoRow
                                icon={Stethoscope}
                                label="Offered Disciplines"
                                value={(tenant.requested_disciplines || []).map((d) => tenant.discipline_labels?.[d] || DISCIPLINE_LABELS[d] || d).join(', ')}
                            />
                            <InfoRow icon={Users} label="Estimated Practitioners" value={tenant.estimated_practitioner_count} />
                        </div>
                    </div>

                    {/* Previous Rejections & Change History */}
                    {tenant.rejection_history && tenant.rejection_history.length > 0 && (
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
                            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                <History className="w-4 h-4 text-violet-400" />
                                <span>Application History & Changes</span>
                            </h3>

                            <div className="space-y-3">
                                {tenant.rejection_history.map((h, idx) => (
                                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-2">
                                        <div className="flex items-center justify-between text-slate-400">
                                            <span className="font-bold text-white">
                                                {h.is_permanent ? 'Permanent Rejection' : `Rejection Attempt ${h.attempt}`}
                                            </span>
                                            <span>{h.rejected_at ? new Date(h.rejected_at).toLocaleDateString() : ''} by {h.rejected_by}</span>
                                        </div>

                                        <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 italic">
                                            "{h.review_note}"
                                        </p>

                                        {h.sections && h.sections.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                                <span className="text-slate-500 text-[11px]">Sections flagged:</span>
                                                {h.sections.map((s, si) => (
                                                    <span key={si} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-medium capitalize">
                                                        {s.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {h.changes_resubmitted && (
                                            <div className="pt-2 border-t border-slate-800/60 text-emerald-300/90">
                                                <span className="font-semibold block text-[11px] mb-1">Applicant Updates Resubmitted:</span>
                                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                                                    {h.changes_resubmitted.map((c, ci) => (
                                                        <li key={ci}>{c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tenant.billing_breakdown && (
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-white font-semibold text-sm">Subscription Plan & Billing</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Cadence: <span className="text-slate-200 font-medium capitalize">{tenant.billing_interval === 'year' ? 'Annual (Yearly)' : 'Monthly'}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {tenant.applied_promo_code && (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Promo: {tenant.applied_promo_code}
                                        </span>
                                    )}
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                        {tenant.billing_breakdown.tier_name || tenant.plan_name} Plan
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-3 mb-4">
                                <div className="flex justify-between text-xs text-slate-300">
                                    <span>Base Plan ({tenant.billing_breakdown.tier_name || tenant.plan_name})</span>
                                    <span className="font-semibold text-white">
                                        {tenant.billing_breakdown.base_price_formatted || `$${tenant.billing_breakdown.base_price?.toFixed(2)} CAD/mo`}
                                    </span>
                                </div>

                                {tenant.billing_breakdown.is_dynamic ? (
                                    <>
                                        {(tenant.billing_breakdown.extra_seats > 0) && (
                                            <div className="flex justify-between text-xs text-slate-300">
                                                <span>+ {tenant.billing_breakdown.extra_seats} Extra Practitioner Seat(s)</span>
                                                <span className="font-semibold text-white">
                                                    +{tenant.billing_breakdown.extra_seats_formatted}
                                                </span>
                                            </div>
                                        )}
                                        {tenant.billing_breakdown.discount_amount > 0 && (
                                            <div className="flex justify-between text-xs text-emerald-400 font-medium">
                                                <span>Promo Discount ({tenant.applied_promo_code})</span>
                                                <span>-{tenant.billing_breakdown.discount_formatted}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {tenant.billing_breakdown.additional_ft_count > 0 && (
                                            <div className="flex justify-between text-xs text-slate-300">
                                                <span>+ {tenant.billing_breakdown.additional_ft_count} Extra Full-Time Practitioner(s)</span>
                                                <span className="font-semibold text-white">+${tenant.billing_breakdown.additional_ft_cost?.toFixed(2)} CAD/mo</span>
                                            </div>
                                        )}
                                        {tenant.billing_breakdown.additional_pt_count > 0 && (
                                            <div className="flex justify-between text-xs text-slate-300">
                                                <span>+ {tenant.billing_breakdown.additional_pt_count} Part-Time Practitioner(s)</span>
                                                <span className="font-semibold text-white">+${tenant.billing_breakdown.additional_pt_cost?.toFixed(2)} CAD/mo</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center text-sm font-semibold">
                                    <div>
                                        <span className="text-slate-200">First Charge on Approval</span>
                                        {tenant.billing_breakdown.trial_days > 0 && (
                                            <p className="text-[11px] text-amber-400 font-normal mt-0.5">
                                                {tenant.billing_breakdown.trial_days}-day free trial applied
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-emerald-400 text-base">
                                            {tenant.billing_breakdown.first_charge_formatted ||
                                                tenant.billing_breakdown.total_formatted ||
                                                tenant.billing_breakdown.total_monthly_formatted ||
                                                (tenant.billing_breakdown.total !== undefined ? `$${Number(tenant.billing_breakdown.total).toFixed(2)} CAD/mo` : '—')}
                                        </span>
                                        {tenant.billing_breakdown.trial_days > 0 && (
                                            <p className="text-[10px] text-slate-400">
                                                Renews at {tenant.billing_breakdown.total_due_formatted}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {primaryPractitioner && (
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                            <h3 className="text-white font-semibold text-sm mb-4">Primary Practitioner License</h3>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Profession</p>
                                    <p className="text-sm text-slate-200 mt-0.5">{primaryPractitioner.profession_label || DISCIPLINE_LABELS[primaryPractitioner.profession] || primaryPractitioner.profession || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">License Number</p>
                                    <p className="text-sm text-slate-200 mt-0.5">{primaryPractitioner.license_number || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Licensing Body</p>
                                    <p className="text-sm text-slate-200 mt-0.5">{primaryPractitioner.licensing_body || '—'}</p>
                                </div>
                            </div>

                            {primaryPractitioner.document_url ? (
                                primaryPractitioner.document_mime === 'application/pdf' ? (
                                    <iframe
                                        src={primaryPractitioner.document_url}
                                        title="License document"
                                        className="w-full h-[520px] rounded-lg border border-slate-800 bg-white"
                                    />
                                ) : (
                                    <img
                                        src={primaryPractitioner.document_url}
                                        alt="License document"
                                        className="w-full max-h-[520px] object-contain rounded-lg border border-slate-800 bg-white"
                                    />
                                )
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-slate-500 border border-dashed border-slate-800 rounded-lg py-8 justify-center">
                                    <FileText className="w-4 h-4" /> No document on file
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold text-sm">Decision</h3>
                            <span className="text-xs text-slate-400">
                                Attempt {tenant.reapply_count}/{tenant.max_attempts}
                            </span>
                        </div>

                        {isPending ? (
                            <div className="space-y-2.5">
                                <button
                                    onClick={approve}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Approving & Charging...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" /> Approve Clinic
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setModal('needs_more_info')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <AlertTriangle className="w-4 h-4" /> Request More Info
                                </button>
                                <button
                                    onClick={() => setModal('reject')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <XCircle className="w-4 h-4" /> Reject Application
                                </button>
                                <button
                                    onClick={() => setModal('reject_permanent')}
                                    disabled={processing}
                                    className="w-full py-2 rounded-lg text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-900/40 border border-rose-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <Ban className="w-3.5 h-3.5" /> Reject Permanently
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 space-y-2">
                                <p>Status: <span className="text-slate-200 font-semibold capitalize">{tenant.status.replace(/_/g, ' ')}</span></p>
                                {tenant.reviewed_at && <p className="text-xs text-slate-500">Reviewed {tenant.reviewed_at}</p>}
                                {tenant.review_note && (
                                    <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 mt-2">{tenant.review_note}</p>
                                )}
                            </div>
                        )}

                        <div className="h-px bg-slate-800 my-4" />
                        <h3 className="text-white font-semibold text-sm mb-3">Manage</h3>
                        <div className="space-y-2.5">
                            <Link
                                href={`/admin/clinics/${tenant.id}/edit`}
                                className="w-full py-2.5 rounded-lg text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Pencil className="w-4 h-4" /> Edit Clinic Details
                            </Link>

                            {tenant.status === 'approved' && (
                                <button
                                    onClick={() => setStatus('suspend')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Ban className="w-4 h-4" /> Suspend Clinic
                                </button>
                            )}
                            {tenant.status === 'suspended' && (
                                <button
                                    onClick={() => setStatus('reactivate')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4" /> Reactivate Clinic
                                </button>
                            )}

                            <button
                                onClick={() => { setConfirmName(''); setModal('remove'); }}
                                disabled={processing}
                                className="w-full py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {modal === 'needs_more_info' && (
                <NoteModal
                    title="Request more information"
                    confirmLabel="Send Request"
                    confirmClass="bg-amber-600 hover:bg-amber-500"
                    onCancel={() => setModal(null)}
                    onConfirm={submitNote}
                    processing={processing}
                />
            )}

            {modal === 'reject' && (
                <RejectModal
                    tenant={tenant}
                    onCancel={() => setModal(null)}
                    onConfirm={submitReject}
                    processing={processing}
                />
            )}

            {modal === 'reject_permanent' && (
                <PermanentRejectModal
                    tenant={tenant}
                    onCancel={() => setModal(null)}
                    onConfirm={submitPermanentReject}
                    processing={processing}
                />
            )}

            {modal === 'remove' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-white font-semibold text-base mb-1">Permanently delete this clinic?</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            This <span className="text-rose-400 font-semibold">permanently erases</span>{' '}
                            <span className="text-slate-300 font-medium">{tenant.name}</span> and <span className="text-slate-300">all of its data</span> —
                            staff, clients, appointments, clinical notes and invoices. This cannot be undone.
                            {tenant.status === 'approved' && ' Consider suspending instead.'}
                        </p>
                        <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                            Type <span className="text-slate-300 normal-case">{tenant.name}</span> to confirm
                        </label>
                        <input
                            autoFocus
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/40 mb-4"
                            placeholder={tenant.name}
                        />
                        <div className="flex items-center gap-2">
                            <button
                                disabled={processing || confirmName !== tenant.name}
                                onClick={remove}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete Permanently
                            </button>
                            <button
                                onClick={() => setModal(null)}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
