import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Gift, CheckCircle2, XCircle, AlertCircle, Loader2,
    Calendar, Users, Percent, DollarSign, Clock, ShieldAlert,
    ExternalLink, AlertTriangle, Info, Check, RefreshCw, X
} from 'lucide-react';

export default function ReferralsIndex({
    referrals = { data: [] },
    stats = {},
    settings = {},
    filters = { status: 'all' }
}) {
    const { flash, errors } = usePage().props;

    // Settings state
    const [settingsForm, setSettingsForm] = useState({
        enabled: settings.enabled ?? true,
        new_clinic_discount_percent: settings.new_clinic_discount_percent ?? 50,
        referrer_reward_mode: settings.referrer_reward_mode ?? 'fixed',
        referrer_fixed_amount: settings.referrer_fixed_amount ?? 35.00,
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Cancel modal state
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedReferral, setSelectedReferral] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Reward loading state
    const [rewardingId, setRewardingId] = useState(null);

    const handleFilterChange = (status) => {
        router.get('/admin/referrals', { status }, { preserveState: true, replace: true });
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        setSavingSettings(true);
        router.post('/admin/referrals/settings', {
            enabled: Boolean(settingsForm.enabled),
            new_clinic_discount_percent: Number(settingsForm.new_clinic_discount_percent),
            referrer_reward_mode: settingsForm.referrer_reward_mode,
            referrer_fixed_amount: Number(settingsForm.referrer_fixed_amount),
        }, {
            preserveScroll: true,
            onFinish: () => setSavingSettings(false),
        });
    };

    const handleManualReward = (referral) => {
        if (!confirm(`Are you sure you want to manually reward this referral? This will grant credit to ${referral.referrer?.name || 'the referring clinic'}.`)) {
            return;
        }
        setRewardingId(referral.id);
        router.post(`/admin/referrals/${referral.id}/reward`, {}, {
            preserveScroll: true,
            onFinish: () => setRewardingId(null),
        });
    };

    const openCancelModal = (referral) => {
        setSelectedReferral(referral);
        setCancelReason('');
        setCancelModalOpen(true);
    };

    const handleConfirmCancel = (e) => {
        e.preventDefault();
        if (!selectedReferral) return;
        setCancelling(true);
        router.post(`/admin/referrals/${selectedReferral.id}/cancel`, {
            reason: cancelReason || 'Cancelled by administrator',
        }, {
            preserveScroll: true,
            onSuccess: () => setCancelModalOpen(false),
            onFinish: () => setCancelling(false),
        });
    };

    const filterTabs = [
        { label: 'All Referrals', value: 'all', count: stats.total ?? 0 },
        { label: 'Pending', value: 'pending', count: stats.pending ?? 0 },
        { label: 'Qualified', value: 'qualified', count: stats.qualified ?? 0 },
        { label: 'Rewarded', value: 'rewarded', count: stats.rewarded ?? 0 },
        { label: 'Cancelled', value: 'cancelled', count: stats.cancelled ?? 0 },
    ];

    return (
        <AdminLayout title="Clinic Referrals">
            <Head title="Clinic Referrals — Platform Admin" />

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Gift className="w-7 h-7 text-purple-400" />
                            <span>Clinic Referral Program</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Monitor clinic-to-clinic invites, track qualification & payout credits, and configure rewards.
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Referrals</span>
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-white mt-3">{stats.total ?? 0}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Total clinics signed up via invite</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Invoices</span>
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-2xl font-bold text-white mt-3">{stats.pending ?? 0}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Awaiting first paid platform invoice</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rewarded</span>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold text-white mt-3">{stats.rewarded ?? 0}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Credits granted to referring clinics</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Credits Granted</span>
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-400 mt-3">{stats.total_rewarded_cad || '$0.00 CAD'}</div>
                        <p className="text-[11px] text-slate-500 mt-1">Stripe customer balance credits</p>
                    </div>
                </div>

                {/* Program Settings Card */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-purple-400" />
                                <span>Reward Rules & Configuration</span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Configure the welcome discount for new signups and the reward credit for referring clinics.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveSettings} className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Toggle Program Active */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Program Status
                                </label>
                                <div className="flex items-center gap-3 pt-1">
                                    <input
                                        type="checkbox"
                                        id="referrals_enabled"
                                        checked={settingsForm.enabled}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                                        className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                                    />
                                    <label htmlFor="referrals_enabled" className="text-sm font-medium text-slate-200">
                                        {settingsForm.enabled ? 'Active (Accepting Referrals)' : 'Paused (Codes Ignored)'}
                                    </label>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    When paused, /r/CODE redirects but no referral discount or tracking is applied.
                                </p>
                            </div>

                            {/* New Clinic Welcome Discount */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    New Clinic Discount (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={settingsForm.new_clinic_discount_percent}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, new_clinic_discount_percent: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none pr-8"
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-500 text-sm">%</span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Monthly: 50% off 1st invoice. Annual: 50% of 1 month's price.
                                </p>
                            </div>

                            {/* Referrer Reward Mode */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Referrer Reward Mode
                                </label>
                                <select
                                    value={settingsForm.referrer_reward_mode}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, referrer_reward_mode: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                                >
                                    <option value="fixed">Fixed Credit Amount ($ CAD)</option>
                                    <option value="plan_price">One Month of Referrer's Plan</option>
                                </select>
                                <p className="text-[11px] text-slate-500">
                                    Mode (a): fixed CAD credit. Mode (b): dynamic 1 month plan credit.
                                </p>
                            </div>

                            {/* Fixed Reward Amount (if fixed mode) */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Fixed Reward Amount ($ CAD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        disabled={settingsForm.referrer_reward_mode !== 'fixed'}
                                        value={settingsForm.referrer_fixed_amount}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, referrer_fixed_amount: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-white disabled:opacity-50 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Default $35.00 CAD credited to referrer's Stripe customer balance.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center gap-2 shadow-lg shadow-purple-600/20"
                            >
                                {savingSettings ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Saving Settings...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Save Program Rules</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Referrals Table Section */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                    {/* Status Tabs */}
                    <div className="border-b border-slate-800 p-4 flex flex-wrap items-center gap-2">
                        {filterTabs.map((tab) => {
                            const isActive = (filters.status || 'all') === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => handleFilterChange(tab.value)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                                        isActive
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                        isActive ? 'bg-purple-700 text-purple-100' : 'bg-slate-900 text-slate-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                                <tr>
                                    <th className="py-3 px-4">Code</th>
                                    <th className="py-3 px-4">Referring Clinic</th>
                                    <th className="py-3 px-4">Referred Clinic</th>
                                    <th className="py-3 px-4">Joined Date</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Credit / Reward</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {referrals.data && referrals.data.length > 0 ? (
                                    referrals.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-bold text-purple-400 text-xs">
                                                {item.referral_code}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-white">{item.referrer?.name || 'Unknown'}</div>
                                                <div className="text-[11px] text-slate-500 font-mono">{item.referrer?.subdomain ? `${item.referrer.subdomain}.umahz.com` : '—'}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-white">{item.referred?.name || 'Unknown'}</div>
                                                <div className="text-[11px] text-slate-500 font-mono">{item.referred?.subdomain ? `${item.referred.subdomain}.umahz.com` : '—'}</div>
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                                                {item.created_at}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    item.status === 'rewarded'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : item.status === 'qualified'
                                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                        : item.status === 'pending'
                                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                    {item.status_label}
                                                </span>
                                                {item.cancellation_reason && (
                                                    <div className="text-[10px] text-rose-400 mt-1 max-w-[180px] truncate" title={item.cancellation_reason}>
                                                        {item.cancellation_reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="font-medium text-white">
                                                    {item.reward_amount_formatted || '—'}
                                                </div>
                                                {item.stripe_balance_txn_id && (
                                                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={item.stripe_balance_txn_id}>
                                                        {item.stripe_balance_txn_id}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    {item.status !== 'rewarded' && item.status !== 'cancelled' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={rewardingId === item.id}
                                                                onClick={() => handleManualReward(item)}
                                                                className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-colors"
                                                            >
                                                                {rewardingId === item.id ? 'Rewarding...' : 'Reward'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openCancelModal(item)}
                                                                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-medium border border-rose-500/30 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'rewarded' && (
                                                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 justify-end">
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Paid</span>
                                                        </span>
                                                    )}
                                                    {item.status === 'cancelled' && (
                                                        <span className="text-xs text-slate-500">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-slate-500">
                                            <Gift className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                            <p className="text-sm">No referrals found matching the selected filter.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {referrals.links && referrals.links.length > 3 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                            <div className="text-xs text-slate-400">
                                Showing {referrals.data?.length ?? 0} of {referrals.total ?? 0} records
                            </div>
                            <div className="flex items-center gap-1">
                                {referrals.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-purple-600 text-white'
                                                : link.url
                                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel Referral Modal */}
            {cancelModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                <span>Cancel Referral</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCancelModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400">
                            Cancelling this referral will prevent any credit payout to {selectedReferral?.referrer?.name || 'the referring clinic'}.
                        </p>

                        <form onSubmit={handleConfirmCancel} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                    Reason for Cancellation
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Duplicate account / Fraudulent sign-up"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCancelModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
                                >
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={cancelling}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                                >
                                    {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

