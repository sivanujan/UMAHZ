import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Tag, ArrowLeft, Building2, Calendar, CreditCard, ExternalLink } from 'lucide-react';

export default function PromoCodeRedemptions({ promoCode, redemptions = [] }) {
    return (
        <AdminLayout title={`Redemptions — ${promoCode.code}`}>
            <Head title={`Admin — Redemptions for ${promoCode.code}`} />

            <div className="mb-6">
                <Link
                    href="/admin/promo-codes"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Promo Codes</span>
                </Link>
            </div>

            {/* Header Card */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <Tag className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold font-mono text-white tracking-wider">{promoCode.code}</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {promoCode.discount_type === 'percent' ? `${promoCode.discount_value}% OFF` : `$${promoCode.discount_value} OFF`}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 capitalize">
                            Duration: {promoCode.duration} {promoCode.duration_in_months ? `(${promoCode.duration_in_months} months)` : ''}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-950/80 px-4 py-2 rounded-lg border border-slate-800 font-mono text-xs">
                    <span className="text-slate-400">Total Redemptions: </span>
                    <span className="text-white font-bold">{promoCode.times_redeemed}</span>
                </div>
            </div>

            {/* Redemptions Table */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th className="py-3.5 px-6">Clinic</th>
                                <th className="py-3.5 px-4">Plan & Interval</th>
                                <th className="py-3.5 px-4">Subscription Status</th>
                                <th className="py-3.5 px-4">Joined Date</th>
                                <th className="py-3.5 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {redemptions.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white">{clinic.name}</div>
                                                <div className="text-xs text-slate-400">{clinic.subdomain}.umahz.com</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-xs">
                                        <div className="font-medium text-white">{clinic.plan_name}</div>
                                        <div className="text-slate-400 capitalize">{clinic.billing_interval}ly</div>
                                    </td>
                                    <td className="py-4 px-4 text-xs">
                                        <span className="capitalize text-slate-300 font-medium">
                                            {clinic.subscription_status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-xs text-slate-400">
                                        {clinic.joined_at}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <Link
                                            href={`/admin/clinics/${clinic.id}/billing`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-violet-300 hover:text-white transition-colors"
                                        >
                                            <CreditCard className="w-3.5 h-3.5" />
                                            <span>Billing Inspector</span>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {redemptions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                                        No clinics have redeemed this promotion code yet.
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
