import React, { useState, useRef } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Globe,
    Image as ImageIcon,
    Type,
    AlignLeft,
    Clock,
    MapPin,
    Link as LinkIcon,
    Plus,
    Trash2,
    Eye,
    ExternalLink,
    Check,
    Upload,
} from 'lucide-react';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';
const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-700 focus:border-violet-700';
const textareaClass =
    'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-700 focus:border-violet-700 resize-none';

function Card({ icon: Icon, title, subtitle, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-start gap-2 mb-5">
                <Icon className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" />
                <div>
                    <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function SaveButton({ processing, label = 'Save changes' }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors"
        >
            {processing ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
                <Check className="w-4 h-4" />
            )}
            {label}
        </button>
    );
}

function FieldError({ error }) {
    if (!error) return null;
    return <p className="mt-1 text-xs text-red-600">{error}</p>;
}

// ─── Sub-forms ─────────────────────────────────────────────────────────────────

function ContentSection({ tenant }) {
    const hp = tenant.homepage_settings ?? {};

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        tagline: hp.tagline ?? '',
        description: hp.description ?? '',
        show_hours: hp.show_hours ?? true,
        show_address: hp.show_address ?? true,
        cover_image: null,
    });

    const fileRef = useRef(null);
    const [coverPreview, setCoverPreview] = useState(hp.cover_image_url ?? null);

    function handleCoverChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setData('cover_image', file);
        setCoverPreview(URL.createObjectURL(file));
    }

    function submit(e) {
        e.preventDefault();
        post(route('app.settings.homepage'), {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    return (
        <form onSubmit={submit}>
            <Card
                icon={Type}
                title="Page Content"
                subtitle="Set the headline, description, and cover image visitors see first."
            >
                <div className="space-y-5">
                    {/* Tagline */}
                    <div>
                        <label className={labelClass}>
                            Tagline
                            <span className="ml-1 text-slate-400 normal-case font-normal">(max 120 chars)</span>
                        </label>
                        <input
                            id="hp-tagline"
                            type="text"
                            maxLength={120}
                            className={inputClass}
                            placeholder="Healing you, naturally."
                            value={data.tagline}
                            onChange={(e) => setData('tagline', e.target.value)}
                        />
                        <FieldError error={errors.tagline} />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelClass}>
                            Description
                            <span className="ml-1 text-slate-400 normal-case font-normal">(max 1000 chars)</span>
                        </label>
                        <textarea
                            id="hp-description"
                            rows={4}
                            maxLength={1000}
                            className={textareaClass}
                            placeholder="A short paragraph about your clinic — what you offer, who you serve, and why patients choose you."
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <FieldError error={errors.description} />
                    </div>

                    {/* Cover image */}
                    <div>
                        <label className={labelClass}>
                            <span className="flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Cover / Hero Image
                            </span>
                        </label>
                        {coverPreview && (
                            <div className="relative mb-3 rounded-xl overflow-hidden w-full aspect-[3/1] bg-slate-100">
                                <img
                                    src={coverPreview}
                                    alt="Cover preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            {coverPreview ? 'Change image' : 'Upload cover image'}
                        </button>
                        <input
                            ref={fileRef}
                            id="hp-cover-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Recommended: 1600×533 px (3:1 ratio). Max 4 MB.
                        </p>
                        <FieldError error={errors.cover_image} />
                    </div>

                    {/* Visibility toggles */}
                    <div className="flex flex-col gap-3 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                                onClick={() => setData('show_hours', !data.show_hours)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    data.show_hours ? 'bg-violet-600' : 'bg-slate-300'
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                        data.show_hours ? 'translate-x-5' : ''
                                    }`}
                                />
                            </div>
                            <span className="text-sm text-slate-700 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Show business hours
                            </span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                                onClick={() => setData('show_address', !data.show_address)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    data.show_address ? 'bg-violet-600' : 'bg-slate-300'
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                        data.show_address ? 'translate-x-5' : ''
                                    }`}
                                />
                            </div>
                            <span className="text-sm text-slate-700 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                Show address
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-6 pt-5 border-t border-slate-100">
                    <SaveButton processing={processing} />
                    {recentlySuccessful && (
                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-4 h-4" /> Saved!
                        </span>
                    )}
                </div>
            </Card>
        </form>
    );
}

// ─── Social links ──────────────────────────────────────────────────────────────

const SOCIAL_FIELDS = [
    { key: 'instagram', label: 'Instagram',   placeholder: 'https://instagram.com/yourclinic' },
    { key: 'facebook',  label: 'Facebook',    placeholder: 'https://facebook.com/yourclinic' },
    { key: 'twitter',   label: 'Twitter / X', placeholder: 'https://twitter.com/yourclinic' },
    { key: 'linkedin',  label: 'LinkedIn',    placeholder: 'https://linkedin.com/company/yourclinic' },
    { key: 'tiktok',    label: 'TikTok',      placeholder: 'https://tiktok.com/@yourclinic' },
    { key: 'youtube',   label: 'YouTube',     placeholder: 'https://youtube.com/@yourclinic' },
    { key: 'website',   label: 'Website',     placeholder: 'https://www.yourclinic.ca' },
];

function SocialSection({ tenant }) {
    const hp = tenant.homepage_settings ?? {};
    const social = hp.social ?? {};

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        social: {
            instagram: social.instagram ?? '',
            facebook:  social.facebook  ?? '',
            twitter:   social.twitter   ?? '',
            linkedin:  social.linkedin  ?? '',
            tiktok:    social.tiktok    ?? '',
            youtube:   social.youtube   ?? '',
            website:   social.website   ?? '',
        },
    });

    function submit(e) {
        e.preventDefault();
        post(route('app.settings.homepage'), { preserveScroll: true });
    }

    return (
        <form onSubmit={submit}>
            <Card
                icon={Globe}
                title="Social & Web Links"
                subtitle="Add your clinic's social media accounts and website. Leave blank to hide."
            >
                <div className="space-y-4">
                    {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label className={labelClass}>
                                <span className="flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5" />
                                    {label}
                                </span>
                            </label>
                            <input
                                id={`hp-social-${key}`}
                                type="url"
                                className={inputClass}
                                placeholder={placeholder}
                                value={data.social[key]}
                                onChange={(e) =>
                                    setData('social', { ...data.social, [key]: e.target.value })
                                }
                            />
                            <FieldError error={errors[`social.${key}`]} />
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4 mt-6 pt-5 border-t border-slate-100">
                    <SaveButton processing={processing} />
                    {recentlySuccessful && (
                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-4 h-4" /> Saved!
                        </span>
                    )}
                </div>
            </Card>
        </form>
    );
}

// ─── Custom buttons ────────────────────────────────────────────────────────────

function CustomButtonsSection({ tenant }) {
    const hp = tenant.homepage_settings ?? {};
    const initialButtons = (hp.custom_buttons ?? []).slice(0, 3);

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        custom_buttons: initialButtons.length
            ? initialButtons
            : [],
    });

    function addButton() {
        if (data.custom_buttons.length >= 3) return;
        setData('custom_buttons', [...data.custom_buttons, { label: '', url: '' }]);
    }

    function removeButton(idx) {
        setData(
            'custom_buttons',
            data.custom_buttons.filter((_, i) => i !== idx),
        );
    }

    function updateButton(idx, field, value) {
        const updated = data.custom_buttons.map((btn, i) =>
            i === idx ? { ...btn, [field]: value } : btn,
        );
        setData('custom_buttons', updated);
    }

    function submit(e) {
        e.preventDefault();
        post(route('app.settings.homepage'), { preserveScroll: true });
    }

    return (
        <form onSubmit={submit}>
            <Card
                icon={LinkIcon}
                title="Custom Buttons"
                subtitle="Add up to 3 extra call-to-action buttons on your home page (e.g. Book Appointment, Online Store)."
            >
                <div className="space-y-4">
                    {data.custom_buttons.map((btn, idx) => (
                        <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-1 space-y-2">
                                <div>
                                    <label className={labelClass}>Button Label</label>
                                    <input
                                        id={`hp-btn-label-${idx}`}
                                        type="text"
                                        maxLength={40}
                                        className={inputClass}
                                        placeholder="Book Appointment"
                                        value={btn.label}
                                        onChange={(e) => updateButton(idx, 'label', e.target.value)}
                                    />
                                    <FieldError error={errors[`custom_buttons.${idx}.label`]} />
                                </div>
                                <div>
                                    <label className={labelClass}>URL</label>
                                    <input
                                        id={`hp-btn-url-${idx}`}
                                        type="url"
                                        className={inputClass}
                                        placeholder="https://book.yourclinic.ca"
                                        value={btn.url}
                                        onChange={(e) => updateButton(idx, 'url', e.target.value)}
                                    />
                                    <FieldError error={errors[`custom_buttons.${idx}.url`]} />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeButton(idx)}
                                className="mt-5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {data.custom_buttons.length < 3 && (
                        <button
                            type="button"
                            onClick={addButton}
                            className="flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add button
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-6 pt-5 border-t border-slate-100">
                    <SaveButton processing={processing} />
                    {recentlySuccessful && (
                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-4 h-4" /> Saved!
                        </span>
                    )}
                </div>
            </Card>
        </form>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Homepage({ tenant }) {
    const { auth } = usePage().props;
    const subdomain = tenant.subdomain;

    const publicUrl = window.location.origin.replace(
        window.location.hostname,
        `${subdomain}.${window.location.hostname.split('.').slice(-2).join('.')}`,
    );

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Public Home Page</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Customize what patients see when they visit{' '}
                            <code className="text-violet-700 font-mono text-xs bg-violet-50 px-1 py-0.5 rounded">
                                {subdomain}.umahz.com
                            </code>
                        </p>
                    </div>
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-sm transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                </div>
            }
        >
            <Head title="Home Page Settings" />

            <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <Globe className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-violet-800">
                        <p className="font-semibold">Your clinic's public web presence</p>
                        <p className="mt-1 text-violet-700">
                            Patients who visit your clinic's subdomain URL will see this page. It
                            includes Pay Invoices and Staff Login buttons by default — you can add
                            extra links, your clinic description, and social profiles here.
                        </p>
                    </div>
                </div>

                <ContentSection tenant={tenant} />
                <SocialSection tenant={tenant} />
                <CustomButtonsSection tenant={tenant} />
            </div>
        </AuthenticatedLayout>
    );
}
