import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Settings, Shield, Sliders, Server, Bell, Save, RefreshCw, CheckCircle2,
    AlertCircle, Globe, Mail, Phone, Lock, Clock, FileCheck, Check,
    AlertTriangle, Sparkles, Terminal, Database, Cpu
} from 'lucide-react';

export default function PlatformSettingsIndex({ settings = {}, systemInfo = {} }) {
    const { flash, errors } = usePage().props;

    const [activeTab, setActiveTab] = useState('general');
    const [processing, setProcessing] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);

    // Form state
    const [form, setForm] = useState({
        // General
        platform_name: settings.platform_name || 'UMAHZ',
        support_email: settings.support_email || 'support@umahz.com',
        contact_phone: settings.contact_phone || '+1 (555) 234-5678',
        default_currency: settings.default_currency || 'USD',
        default_timezone: settings.default_timezone || 'America/New_York',

        // Onboarding
        require_admin_approval: Boolean(settings.require_admin_approval),
        allow_self_registration: Boolean(settings.allow_self_registration),
        require_license_document: Boolean(settings.require_license_document),
        trial_period_days: Number(settings.trial_period_days ?? 14),

        // Security
        enforce_2fa_staff: Boolean(settings.enforce_2fa_staff),
        session_timeout_minutes: Number(settings.session_timeout_minutes ?? 120),
        max_failed_login_attempts: Number(settings.max_failed_login_attempts ?? 5),

        // Announcements
        system_announcement: settings.system_announcement || '',
        show_announcement: Boolean(settings.show_announcement),
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/admin/settings', form, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const handleClearCache = () => {
        if (!confirm('Clear all application, route, view, and config caches now?')) return;
        setClearingCache(true);

        router.post(
            '/admin/settings/clear-cache',
            {},
            {
                preserveScroll: true,
                onFinish: () => setClearingCache(false),
            }
        );
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: Globe },
        { id: 'onboarding', label: 'Onboarding & Approvals', icon: Sliders },
        { id: 'security', label: 'Security & Access', icon: Shield },
        { id: 'announcements', label: 'Announcements', icon: Bell },
        { id: 'system', label: 'System & Maintenance', icon: Server },
    ];

    return (
        <AdminLayout title="Platform Settings & Configuration">
            <Head title="Platform Settings" />

            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center gap-3 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}

            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        {Object.values(errors).map((err, i) => (
                            <p key={i} className="font-medium">{err}</p>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                                        isActive
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Maintenance Card */}
                    <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold mb-2">
                            <Terminal className="w-3.5 h-3.5 text-violet-400" />
                            <span>Quick Actions</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">
                            Purge and recompile configuration, route, and application caches across the platform.
                        </p>
                        <button
                            type="button"
                            onClick={handleClearCache}
                            disabled={clearingCache}
                            className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${clearingCache ? 'animate-spin text-violet-400' : 'text-slate-400'}`} />
                            {clearingCache ? 'Clearing Cache...' : 'Flush App Cache'}
                        </button>
                    </div>
                </div>

                {/* Main Settings Form */}
                <div className="flex-1">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            {/* Tab 1: General Info */}
                            {activeTab === 'general' && (
                                <div className="p-6 space-y-6">
                                    <div className="border-b border-slate-800 pb-4">
                                        <h3 className="text-base font-semibold text-white">General Platform Identity</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Configure core system names, public contact details, and base currency formats.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                                Platform Brand Name
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={form.platform_name}
                                                onChange={(e) => handleChange('platform_name', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">Displayed across emails, receipts, and public portals.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                                Platform Support Email
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={form.support_email}
                                                onChange={(e) => handleChange('support_email', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">Recipient for clinic inquiries and system notifications.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                                Support Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                value={form.contact_phone}
                                                onChange={(e) => handleChange('contact_phone', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                                Default Platform Currency
                                            </label>
                                            <select
                                                value={form.default_currency}
                                                onChange={(e) => handleChange('default_currency', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                            >
                                                <option value="USD">USD ($ - US Dollar)</option>
                                                <option value="CAD">CAD ($ - Canadian Dollar)</option>
                                                <option value="GBP">GBP (£ - British Pound)</option>
                                                <option value="EUR">EUR (€ - Euro)</option>
                                                <option value="AUD">AUD ($ - Australian Dollar)</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                                Default Platform Timezone
                                            </label>
                                            <select
                                                value={form.default_timezone}
                                                onChange={(e) => handleChange('default_timezone', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                            >
                                                <option value="America/New_York">America/New_York (Eastern Time)</option>
                                                <option value="America/Chicago">America/Chicago (Central Time)</option>
                                                <option value="America/Denver">America/Denver (Mountain Time)</option>
                                                <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                                                <option value="America/Toronto">America/Toronto (Eastern Time - Canada)</option>
                                                <option value="America/Vancouver">America/Vancouver (Pacific Time - Canada)</option>
                                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                                <option value="Europe/London">Europe/London (GMT/BST)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Onboarding & Approvals */}
                            {activeTab === 'onboarding' && (
                                <div className="p-6 space-y-6">
                                    <div className="border-b border-slate-800 pb-4">
                                        <h3 className="text-base font-semibold text-white">Clinic Onboarding & Review Policies</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Control how new clinics register, submit credentials, and get activated.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Require Manual Admin Approval</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    When enabled, new clinics remain in "Pending Review" until a Platform Admin approves them.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={form.require_admin_approval}
                                                onChange={(e) => handleChange('require_admin_approval', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500/40 cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Allow Public Self-Registration</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Allow prospective clinic owners to register online via the homepage and onboarding wizard.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={form.allow_self_registration}
                                                onChange={(e) => handleChange('allow_self_registration', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500/40 cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Require Practitioner License Upload</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Mandate primary practitioners to upload medical license/certification documents during onboarding.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={form.require_license_document}
                                                onChange={(e) => handleChange('require_license_document', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500/40 cursor-pointer"
                                            />
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <label className="block text-sm font-semibold text-white mb-1">
                                                Default Free Trial Period (Days)
                                            </label>
                                            <p className="text-xs text-slate-400 mb-3">
                                                Number of days new clinics can use the platform before their subscription card is billed.
                                            </p>
                                            <input
                                                type="number"
                                                min="0"
                                                max="365"
                                                value={form.trial_period_days}
                                                onChange={(e) => handleChange('trial_period_days', parseInt(e.target.value, 10) || 0)}
                                                className="w-48 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Security & Access */}
                            {activeTab === 'security' && (
                                <div className="p-6 space-y-6">
                                    <div className="border-b border-slate-800 pb-4">
                                        <h3 className="text-base font-semibold text-white">Security & Authentication Policies</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Enforce session lifetimes, rate limiting, and two-factor authentication rules.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Enforce Two-Factor Authentication (2FA)</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Require all clinic owners and practitioners to configure 2FA before accessing medical records.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={form.enforce_2fa_staff}
                                                onChange={(e) => handleChange('enforce_2fa_staff', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500/40 cursor-pointer"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                                <label className="block text-sm font-semibold text-white mb-1">
                                                    Session Inactivity Timeout (Minutes)
                                                </label>
                                                <p className="text-xs text-slate-400 mb-3">
                                                    Automatically log out inactive sessions for HIPAA/health compliance.
                                                </p>
                                                <input
                                                    type="number"
                                                    min="15"
                                                    max="1440"
                                                    value={form.session_timeout_minutes}
                                                    onChange={(e) => handleChange('session_timeout_minutes', parseInt(e.target.value, 10) || 15)}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                                />
                                            </div>

                                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                                <label className="block text-sm font-semibold text-white mb-1">
                                                    Max Failed Login Attempts
                                                </label>
                                                <p className="text-xs text-slate-400 mb-3">
                                                    Temporarily lock accounts after consecutive invalid password entries.
                                                </p>
                                                <input
                                                    type="number"
                                                    min="3"
                                                    max="20"
                                                    value={form.max_failed_login_attempts}
                                                    onChange={(e) => handleChange('max_failed_login_attempts', parseInt(e.target.value, 10) || 3)}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Announcements */}
                            {activeTab === 'announcements' && (
                                <div className="p-6 space-y-6">
                                    <div className="border-b border-slate-800 pb-4">
                                        <h3 className="text-base font-semibold text-white">Global Broadcast & Announcements</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Display a prominent notification banner across all clinic dashboards and patient portals.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Enable Global Broadcast Banner</h4>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Toggle on to broadcast this message across all workspaces.
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={form.show_announcement}
                                                onChange={(e) => handleChange('show_announcement', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500/40 cursor-pointer"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                                Announcement Message
                                            </label>
                                            <textarea
                                                rows={4}
                                                value={form.system_announcement}
                                                onChange={(e) => handleChange('system_announcement', e.target.value)}
                                                placeholder="e.g. Scheduled system maintenance tonight at 2:00 AM EST (30 mins expected downtime)..."
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 5: System Diagnostics */}
                            {activeTab === 'system' && (
                                <div className="p-6 space-y-6">
                                    <div className="border-b border-slate-800 pb-4">
                                        <h3 className="text-base font-semibold text-white">System Diagnostics & Environment</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Live operational metrics and server stack information.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">PHP Version</p>
                                            <p className="text-sm font-bold text-white mt-1">{systemInfo.php_version}</p>
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Laravel Framework</p>
                                            <p className="text-sm font-bold text-violet-400 mt-1">v{systemInfo.laravel_version}</p>
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Environment</p>
                                            <p className="text-sm font-bold text-emerald-400 mt-1 uppercase">{systemInfo.environment}</p>
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Database Driver</p>
                                            <p className="text-sm font-bold text-sky-400 mt-1 uppercase">{systemInfo.database_driver}</p>
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cache Driver</p>
                                            <p className="text-sm font-bold text-slate-200 mt-1 uppercase">{systemInfo.cache_driver}</p>
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Server Time</p>
                                            <p className="text-xs font-mono text-slate-300 mt-1">{systemInfo.server_time}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Submit Button */}
                            <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    Changes take effect immediately across all clinic workspaces.
                                </span>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-900/20"
                                >
                                    {processing ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Saving Changes...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            Save Settings
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
