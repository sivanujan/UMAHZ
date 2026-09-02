import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

const STATUS_LABELS = {
    pending_review: 'Pending Review',
    needs_more_info: 'Needs More Info',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
};

const STATUS_COLORS = {
    pending_review: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    needs_more_info: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rejected: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    suspended: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage',
    acupuncture_tcm: 'Acupuncture/TCM',
    personal_training: 'Personal Training',
    nutrition: 'Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

export default function ClinicsIndex({ tenants, status, statuses }) {
    return (
        <AdminLayout title="Clinic Applications">
            <Head title="Clinic Applications" />

            <div className="flex items-center gap-2 mb-6">
                {statuses.map((s) => (
                    <Link
                        key={s}
                        href={`/admin/clinics?status=${s}`}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            s === status ? STATUS_COLORS[s] : 'text-slate-400 bg-slate-900 border-slate-800 hover:text-slate-200'
                        }`}
                    >
                        {STATUS_LABELS[s]}
                    </Link>
                ))}
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-violet-400" />
                    <h2 className="font-semibold text-white text-base">{STATUS_LABELS[status]}</h2>
                    <span className="text-xs text-slate-500 ml-1">({tenants.length})</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="py-3 px-6">Clinic</th>
                                <th className="py-3 px-6">Contact</th>
                                <th className="py-3 px-6">Disciplines</th>
                                <th className="py-3 px-6">Practitioners</th>
                                <th className="py-3 px-6">Submitted</th>
                                <th className="py-3 px-6" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {tenants.length > 0 ? (
                                tenants.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-white">{t.name}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-slate-300">{t.primary_contact_name}</div>
                                            <div className="text-xs text-slate-500">{t.primary_contact_email}</div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-400 text-xs">
                                            {(t.requested_disciplines || []).map((d) => t.discipline_labels?.[d] || DISCIPLINE_LABELS[d] || d).join(', ') || '—'}
                                        </td>
                                        <td className="py-4 px-6 text-slate-300">{t.estimated_practitioner_count ?? '—'}</td>
                                        <td className="py-4 px-6 text-slate-400 text-xs">{t.submitted_ago || '—'}</td>
                                        <td className="py-4 px-6 text-right">
                                            <Link
                                                href={`/admin/clinics/${t.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300"
                                            >
                                                Review <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-10 text-center text-slate-500 text-sm">
                                        No clinics in this status.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
