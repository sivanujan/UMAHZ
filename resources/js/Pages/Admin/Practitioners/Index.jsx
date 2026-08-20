import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { IdCard, ArrowRight } from 'lucide-react';

const DISCIPLINE_LABELS = {
    massage_therapy: 'Massage Therapy',
    acupuncture_tcm: 'Acupuncture / TCM',
    personal_training: 'Personal Training',
    nutrition: 'Dietitian / Nutrition',
    colon_hydrotherapy: 'Colon Hydrotherapy',
};

export default function PractitionersIndex({ practitioners }) {
    return (
        <AdminLayout title="Practitioner Verification">
            <Head title="Practitioner Verification" />

            <p className="text-sm text-slate-500 mb-6 max-w-2xl">
                Practitioners added to an already-approved clinic. Their clinic keeps operating normally while
                these are pending — this queue is just for verifying the individual's license.
            </p>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-violet-400" />
                    <h2 className="font-semibold text-white text-base">Pending Verification</h2>
                    <span className="text-xs text-slate-500 ml-1">({practitioners.length})</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="py-3 px-6">Practitioner</th>
                                <th className="py-3 px-6">Clinic</th>
                                <th className="py-3 px-6">Discipline</th>
                                <th className="py-3 px-6">Submitted</th>
                                <th className="py-3 px-6" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                            {practitioners.length > 0 ? (
                                practitioners.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-4 px-6 font-medium text-white">{p.name}</td>
                                        <td className="py-4 px-6 text-slate-300">{p.tenant_name}</td>
                                        <td className="py-4 px-6 text-slate-400 text-xs">{DISCIPLINE_LABELS[p.profession] || p.profession}</td>
                                        <td className="py-4 px-6 text-slate-400 text-xs">{p.submitted_ago}</td>
                                        <td className="py-4 px-6 text-right">
                                            <Link
                                                href={`/admin/practitioners/${p.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300"
                                            >
                                                Review <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-slate-500 text-sm">
                                        Nothing pending verification.
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
