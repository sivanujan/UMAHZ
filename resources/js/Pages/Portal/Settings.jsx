import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import PortalLayout from '@/Layouts/PortalLayout';
import {
    User, Mail, Phone, Lock, Bell, ShieldAlert, LogOut, Check, AlertCircle, Loader2,
    Sun, Moon, Monitor,
} from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

const ROYAL_BLUE = '#2563EB';

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--umahz-text-secondary)', marginBottom: 9 };

function inputBorderStyle(showError) {
    return showError ? { borderColor: '#FCA5A5' } : { borderColor: 'var(--umahz-border)' };
}

function iconColorStyle(showError) {
    return { color: showError ? '#FB7185' : 'var(--umahz-text-tertiary)' };
}

function SectionCard({ icon: Icon, title, description, children }) {
    return (
        <div
            className="umahz-settings-fade rounded-2xl border shadow-[0_1px_2px_rgba(13,27,42,0.04),0_12px_28px_-16px_rgba(13,27,42,0.1)] dark:shadow-none p-6 sm:p-7 transition-colors duration-300"
            style={{ background: 'var(--umahz-surface)', borderColor: 'var(--umahz-border)' }}
        >
            <div className="flex items-center gap-3 mb-1">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--umahz-hover)' }}>
                    <Icon className="w-[18px] h-[18px]" style={{ color: ROYAL_BLUE }} />
                </span>
                <h2 className="font-bold text-[15px]" style={{ color: 'var(--umahz-text-primary)' }}>{title}</h2>
            </div>
            {description && <p className="text-xs mt-1 ml-12" style={{ color: 'var(--umahz-text-tertiary)' }}>{description}</p>}
            <div className="mt-5">{children}</div>
        </div>
    );
}

function SavedBadge({ show }) {
    if (!show) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <Check className="w-3.5 h-3.5" /> Saved
        </span>
    );
}

function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
            style={{ background: checked ? ROYAL_BLUE : 'var(--umahz-track-off)' }}
        >
            <span
                className="inline-block w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-200"
                style={{ transform: checked ? 'translateX(22px)' : 'translateX(3px)' }}
            />
        </button>
    );
}

function textInputClass() {
    return 'w-full pl-11 pr-10 py-3 border rounded-xl text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-[#2563EB]/20 focus:border-[#2563EB]';
}

function passwordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#E2E8F0', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];

const APPEARANCE_OPTIONS = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
];

function AppearanceSection() {
    const { preference, setPreference } = useTheme();
    return (
        <div className="grid grid-cols-3 gap-3">
            {APPEARANCE_OPTIONS.map((opt) => {
                const active = preference === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPreference(opt.value)}
                        className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200"
                        style={active
                            ? { borderColor: ROYAL_BLUE, background: 'var(--umahz-nav-active-bg)', color: 'var(--umahz-accent-text)' }
                            : { borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}
                    >
                        <opt.icon className="w-5 h-5" />
                        <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function Settings({ profile, notificationPreferences, deletionRequested, themePreference }) {
    const profileForm = useForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [prefs, setPrefs] = useState(notificationPreferences);
    const [prefsSaving, setPrefsSaving] = useState(null);
    const [prefsSaved, setPrefsSaved] = useState(null);

    const [confirmingDeletion, setConfirmingDeletion] = useState(false);
    const [deletionSent, setDeletionSent] = useState(deletionRequested);

    const strength = passwordStrength(passwordForm.data.password);

    const submitProfile = (e) => {
        e.preventDefault();
        profileForm.patch('/portal/settings/profile', { preserveScroll: true });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        passwordForm.put('/portal/settings/password', {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset('current_password', 'password', 'password_confirmation'),
        });
    };

    const togglePref = (key, value) => {
        const next = { ...prefs, [key]: value };
        setPrefs(next);
        setPrefsSaving(key);
        setPrefsSaved(null);
        router.patch('/portal/settings/notifications', next, {
            preserveScroll: true,
            onFinish: () => {
                setPrefsSaving(null);
                setPrefsSaved(key);
                setTimeout(() => setPrefsSaved((k) => (k === key ? null : k)), 2000);
            },
        });
    };

    const requestDeletion = () => {
        router.post('/portal/settings/delete-account', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletionSent(true);
                setConfirmingDeletion(false);
            },
        });
    };

    return (
        <PortalLayout themePreference={themePreference}>
            <Head title="Settings" />
            <style>{`
                @keyframes umahzSettingsFadeInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
                .umahz-settings-fade { opacity: 0; animation: umahzSettingsFadeInUp 0.5s ease-out both; }
            `}</style>

            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--umahz-text-primary)' }}>Settings</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--umahz-text-tertiary)' }}>Manage your profile, security, and notification preferences.</p>
            </div>

            <div className="max-w-2xl space-y-6">
                {/* Profile */}
                <SectionCard icon={User} title="Profile" description="Your basic account information.">
                    <form onSubmit={submitProfile} className="space-y-4">
                        <div>
                            <label style={labelStyle}>Full Name</label>
                            <div className="relative group">
                                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={iconColorStyle(!!profileForm.errors.name)} />
                                <input
                                    type="text"
                                    value={profileForm.data.name}
                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                    className={textInputClass()}
                                    style={{ ...inputBorderStyle(!!profileForm.errors.name), background: 'var(--umahz-surface)', color: 'var(--umahz-text-primary)' }}
                                />
                            </div>
                            {profileForm.errors.name && <div className="text-xs text-rose-500 font-medium mt-1.5">{profileForm.errors.name}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>Email</label>
                            <div className="relative group">
                                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={iconColorStyle(!!profileForm.errors.email)} />
                                <input
                                    type="email"
                                    value={profileForm.data.email}
                                    onChange={(e) => profileForm.setData('email', e.target.value)}
                                    className={textInputClass()}
                                    style={{ ...inputBorderStyle(!!profileForm.errors.email), background: 'var(--umahz-surface)', color: 'var(--umahz-text-primary)' }}
                                />
                            </div>
                            {profileForm.errors.email && <div className="text-xs text-rose-500 font-medium mt-1.5">{profileForm.errors.email}</div>}
                            {!profileForm.errors.email && profileForm.data.email !== profile.email && (
                                <p className="text-[11px] text-amber-500 mt-1.5">You'll need to re-verify this email after saving.</p>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>Phone</label>
                            <div className="relative group">
                                <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={iconColorStyle(!!profileForm.errors.phone)} />
                                <input
                                    type="tel"
                                    value={profileForm.data.phone}
                                    onChange={(e) => profileForm.setData('phone', e.target.value)}
                                    className={textInputClass()}
                                    style={{ ...inputBorderStyle(!!profileForm.errors.phone), background: 'var(--umahz-surface)', color: 'var(--umahz-text-primary)' }}
                                />
                            </div>
                            {profileForm.errors.phone && <div className="text-xs text-rose-500 font-medium mt-1.5">{profileForm.errors.phone}</div>}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={profileForm.processing}
                                className="inline-flex items-center gap-2 py-2.5 px-5 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
                                style={{ background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #06B6D4 100%)`, boxShadow: '0 10px 24px -10px rgba(37,99,235,0.45)' }}
                            >
                                {profileForm.processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                            <SavedBadge show={profileForm.recentlySuccessful} />
                        </div>
                    </form>
                </SectionCard>

                {/* Appearance */}
                <SectionCard icon={Sun} title="Appearance" description="Choose how the client portal looks on this device.">
                    <AppearanceSection />
                </SectionCard>

                {/* Password */}
                <SectionCard icon={Lock} title="Change Password" description="Use a strong, unique password.">
                    <form onSubmit={submitPassword} className="space-y-4">
                        <div>
                            <label style={labelStyle}>Current Password</label>
                            <div className="relative group">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={iconColorStyle(!!passwordForm.errors.current_password)} />
                                <input
                                    type="password"
                                    value={passwordForm.data.current_password}
                                    onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                    autoComplete="current-password"
                                    className={textInputClass()}
                                    style={{ ...inputBorderStyle(!!passwordForm.errors.current_password), background: 'var(--umahz-surface)', color: 'var(--umahz-text-primary)' }}
                                />
                                {passwordForm.errors.current_password && <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" />}
                            </div>
                            {passwordForm.errors.current_password && <div className="text-xs text-rose-500 font-medium mt-1.5">{passwordForm.errors.current_password}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>New Password</label>
                            <div className="relative group">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={iconColorStyle(!!passwordForm.errors.password)} />
                                <input
                                    type="password"
                                    value={passwordForm.data.password}
                                    onChange={(e) => passwordForm.setData('password', e.target.value)}
                                    autoComplete="new-password"
                                    className={textInputClass()}
                                    style={{ ...inputBorderStyle(!!passwordForm.errors.password), background: 'var(--umahz-surface)', color: 'var(--umahz-text-primary)' }}
                                />
                            </div>
                            {passwordForm.data.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <span
                                                key={i}
                                                className="h-1 flex-1 rounded-full transition-colors duration-300"
                                                style={{ background: i < strength ? STRENGTH_COLORS[strength] : 'var(--umahz-track-off)' }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[11px] font-medium mt-1" style={{ color: STRENGTH_COLORS[strength] }}>{STRENGTH_LABELS[strength]}</p>
                                </div>
                            )}
                            {passwordForm.errors.password && <div className="text-xs text-rose-500 font-medium mt-1.5">{passwordForm.errors.password}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>Confirm New Password</label>
                            <div className="relative group">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={iconColorStyle(false)} />
                                <input
                                    type="password"
                                    value={passwordForm.data.password_confirmation}
                                    onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                    className={textInputClass()}
                                    style={{ ...inputBorderStyle(false), background: 'var(--umahz-surface)', color: 'var(--umahz-text-primary)' }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={passwordForm.processing}
                                className="inline-flex items-center gap-2 py-2.5 px-5 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
                                style={{ background: `linear-gradient(135deg, ${ROYAL_BLUE} 0%, #06B6D4 100%)`, boxShadow: '0 10px 24px -10px rgba(37,99,235,0.45)' }}
                            >
                                {passwordForm.processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Update Password
                            </button>
                            <SavedBadge show={passwordForm.recentlySuccessful} />
                        </div>
                    </form>
                </SectionCard>

                {/* Notifications */}
                <SectionCard icon={Bell} title="Notification Preferences" description="Choose how we remind you about appointments and updates.">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>Email reminders</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-tertiary)' }}>Appointment reminders and clinic updates by email.</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                {prefsSaving === 'email_reminders' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--umahz-text-tertiary)' }} />}
                                {prefsSaved === 'email_reminders' && <SavedBadge show />}
                                <Toggle checked={prefs.email_reminders} onChange={(v) => togglePref('email_reminders', v)} />
                            </div>
                        </div>
                        <div className="h-px" style={{ background: 'var(--umahz-border)' }} />
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>SMS reminders</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-tertiary)' }}>Text message reminders 24 hours before your visit.</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                {prefsSaving === 'sms_reminders' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--umahz-text-tertiary)' }} />}
                                {prefsSaved === 'sms_reminders' && <SavedBadge show />}
                                <Toggle checked={prefs.sms_reminders} onChange={(v) => togglePref('sms_reminders', v)} />
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* Account */}
                <SectionCard icon={ShieldAlert} title="Account" description="Session and account management.">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--umahz-text-primary)' }}>Sign out</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-tertiary)' }}>End your session on this device.</p>
                            </div>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-full border transition-colors duration-200 flex-shrink-0 hover:bg-[var(--umahz-hover)]"
                                style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}
                            >
                                <LogOut className="w-3.5 h-3.5" /> Sign out
                            </Link>
                        </div>

                        <div className="h-px" style={{ background: 'var(--umahz-border)' }} />

                        <div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-rose-500">Delete account</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--umahz-text-tertiary)' }}>Request permanent removal of your account and data.</p>
                                </div>
                                {!deletionSent && !confirmingDeletion && (
                                    <button
                                        onClick={() => setConfirmingDeletion(true)}
                                        className="inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-full border border-rose-300 dark:border-rose-500/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-200 flex-shrink-0"
                                    >
                                        Request deletion
                                    </button>
                                )}
                            </div>

                            {deletionSent && (
                                <p className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg py-2 px-3 mt-3">
                                    Deletion requested. Our team will follow up by email to confirm.
                                </p>
                            )}

                            {confirmingDeletion && !deletionSent && (
                                <div className="mt-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4">
                                    <p className="text-xs text-rose-600 dark:text-rose-400 mb-3">
                                        This notifies your clinic to permanently delete your account and records. This can't be undone once processed. Are you sure?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={requestDeletion}
                                            className="py-1.5 px-3.5 text-xs font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors duration-200"
                                        >
                                            Yes, request deletion
                                        </button>
                                        <button
                                            onClick={() => setConfirmingDeletion(false)}
                                            className="py-1.5 px-3.5 text-xs font-semibold rounded-full border transition-colors duration-200 hover:bg-[var(--umahz-hover)]"
                                            style={{ borderColor: 'var(--umahz-border)', color: 'var(--umahz-text-secondary)' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>
            </div>
        </PortalLayout>
    );
}
