import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    ArrowLeft, Building2, MapPin, IdCard, User, Mail, Phone, Users, Stethoscope,
    Check, AlertTriangle, XCircle, FileText, Loader2, Trash2,
} from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
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

export default function ClinicShow({ tenant, primaryPractitioner }) {
    const [modal, setModal] = useState(null); // 'needs_more_info' | 'reject' | 'remove' | null
    const [processing, setProcessing] = useState(false);

    const approve = () => {
        setProcessing(true);
        router.post(`/admin/clinics/${tenant.id}/approve`, {}, { onFinish: () => setProcessing(false) });
    };

    const submitNote = (note) => {
        setProcessing(true);
        const url = modal === 'reject' ? `/admin/clinics/${tenant.id}/reject` : `/admin/clinics/${tenant.id}/request-info`;
        router.post(url, { note }, { onFinish: () => { setProcessing(false); setModal(null); } });
    };

    const remove = () => {
        setProcessing(true);
        router.delete(`/admin/clinics/${tenant.id}`, { onFinish: () => { setProcessing(false); setModal(null); } });
    };

    const isPending = tenant.status === 'pending_review' || tenant.status === 'needs_more_info';
    const canRemove = tenant.status !== 'approved';

    return (
        <AdminLayout title={tenant.name}>
            <Head title={`Review — ${tenant.name}`} />

            <Link href="/admin/clinics" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to queue
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h2 className="text-white font-semibold text-lg mb-1">{tenant.name}</h2>
                        <p className="text-xs text-slate-500 mb-4">Submitted {tenant.submitted_at || '—'}</p>

                        <div className="divide-y divide-slate-800/60">
                            <InfoRow icon={IdCard} label="Business Registration #" value={tenant.business_registration_number} />
                            <InfoRow
                                icon={MapPin} label="Address"
                                value={[tenant.address?.line1, tenant.address?.city, tenant.address?.region, tenant.address?.country].filter(Boolean).join(', ')}
                            />
                            <InfoRow icon={User} label="Primary Contact" value={tenant.primary_contact_name} />
                            <InfoRow icon={Mail} label="Contact Email" value={tenant.primary_contact_email} />
                            <InfoRow icon={Phone} label="Contact Phone" value={tenant.primary_contact_phone} />
                            <InfoRow
                                icon={Stethoscope} label="Requested Disciplines"
                                value={(tenant.requested_disciplines || []).map((d) => DISCIPLINE_LABELS[d] || d).join(', ')}
                            />
                            <InfoRow icon={Users} label="Estimated Practitioners" value={tenant.estimated_practitioner_count} />
                        </div>
                    </div>

                    {primaryPractitioner && (
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                            <h3 className="text-white font-semibold text-sm mb-4">Primary Practitioner License</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
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
                        <h3 className="text-white font-semibold text-sm mb-4">Decision</h3>

                        {isPending ? (
                            <div className="space-y-2.5">
                                <button
                                    onClick={approve}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" /> Approve Clinic
                                </button>
                                <button
                                    onClick={() => setModal('needs_more_info')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <AlertTriangle className="w-4 h-4" /> Request More Info
                                </button>
                                <button
                                    onClick={() => setModal('reject')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
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

                        {canRemove && (
                            <>
                                <div className="h-px bg-slate-800 my-4" />
                                <button
                                    onClick={() => setModal('remove')}
                                    disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove Application &amp; Owner Account
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {(modal === 'reject' || modal === 'needs_more_info') && (
                <NoteModal
                    title={modal === 'reject' ? 'Reject this application' : 'Request more information'}
                    confirmLabel={modal === 'reject' ? 'Reject' : 'Send Request'}
                    confirmClass={modal === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'}
                    onCancel={() => setModal(null)}
                    onConfirm={submitNote}
                    processing={processing}
                />
            )}

            {modal === 'remove' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-white font-semibold text-base mb-1">Remove this application?</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            This permanently deletes <span className="text-slate-300 font-medium">{tenant.name}</span>'s
                            owner account and removes the application from the queue. This can't be undone.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={processing}
                                onClick={remove}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Remove Permanently
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
