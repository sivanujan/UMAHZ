import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ArrowLeft, User, Mail, Building2, Stethoscope, FileText, Check, XCircle, Loader2 } from 'lucide-react';

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

function RejectModal({ onCancel, onConfirm, processing }) {
    const [note, setNote] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-white font-semibold text-base mb-1">Reject this verification</h3>
                <p className="text-xs text-slate-500 mb-4">Sent to the practitioner by email.</p>
                <textarea
                    autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
                    placeholder="Explain what's wrong with the submitted license…"
                />
                <div className="flex items-center gap-2 mt-4">
                    <button
                        disabled={!note.trim() || processing} onClick={() => onConfirm(note)}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                        Reject
                    </button>
                    <button onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PractitionerShow({ practitioner }) {
    const [showReject, setShowReject] = useState(false);
    const [processing, setProcessing] = useState(false);

    const approve = () => {
        setProcessing(true);
        router.post(`/admin/practitioners/${practitioner.id}/approve`, {}, { onFinish: () => setProcessing(false) });
    };

    const reject = (note) => {
        setProcessing(true);
        router.post(`/admin/practitioners/${practitioner.id}/reject`, { note }, { onFinish: () => { setProcessing(false); setShowReject(false); } });
    };

    const isPending = practitioner.verification_status === 'pending';

    return (
        <AdminLayout title={practitioner.name}>
            <Head title={`Verify — ${practitioner.name}`} />

            <Link href="/admin/practitioners" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to queue
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h2 className="text-white font-semibold text-lg mb-4">{practitioner.name}</h2>
                        <div className="divide-y divide-slate-800/60">
                            <InfoRow icon={Mail} label="Email" value={practitioner.email} />
                            <InfoRow icon={Building2} label="Clinic" value={practitioner.tenant_name} />
                            <InfoRow icon={Stethoscope} label="Discipline" value={DISCIPLINE_LABELS[practitioner.profession] || practitioner.profession} />
                            <InfoRow icon={User} label="License Number" value={practitioner.license_number} />
                            <InfoRow icon={User} label="Licensing Body" value={practitioner.licensing_body} />
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h3 className="text-white font-semibold text-sm mb-4">License Document</h3>
                        {practitioner.document_url ? (
                            practitioner.document_mime === 'application/pdf' ? (
                                <iframe src={practitioner.document_url} title="License document" className="w-full h-[520px] rounded-lg border border-slate-800 bg-white" />
                            ) : (
                                <img src={practitioner.document_url} alt="License document" className="w-full max-h-[520px] object-contain rounded-lg border border-slate-800 bg-white" />
                            )
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-500 border border-dashed border-slate-800 rounded-lg py-8 justify-center">
                                <FileText className="w-4 h-4" /> No document on file
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 sticky top-6">
                        <h3 className="text-white font-semibold text-sm mb-4">Decision</h3>
                        {isPending ? (
                            <div className="space-y-2.5">
                                <button
                                    onClick={approve} disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" /> Verify Practitioner
                                </button>
                                <button
                                    onClick={() => setShowReject(true)} disabled={processing}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 space-y-2">
                                <p>Status: <span className="text-slate-200 font-semibold capitalize">{practitioner.verification_status}</span></p>
                                {practitioner.review_note && (
                                    <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 mt-2">{practitioner.review_note}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showReject && <RejectModal onCancel={() => setShowReject(false)} onConfirm={reject} processing={processing} />}
        </AdminLayout>
    );
}
