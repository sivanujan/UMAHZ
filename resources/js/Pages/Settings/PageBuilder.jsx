import React, { useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { ThemeProvider, useTheme } from '@/Contexts/ThemeContext';
import {
    Save, Eye, ExternalLink, Undo, Redo, Smartphone,
    Tablet, Monitor, Check, AlertCircle, Sparkles, Layers, Sliders, LayoutGrid, Settings,
    ArrowLeft, Search, X, Sun, Moon, CheckCircle2, ShieldAlert
} from 'lucide-react';
import MediaLibraryModal from '@/Components/PageBuilder/MediaLibraryModal';

// Curated clinic icon set for the Visual Page Builder Icon blocks & widgets
const UMAHZ_ICONS = {
    heart: {
        name: 'Heart / Care',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
    },
    stethoscope: {
        name: 'Stethoscope / Medical',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>'
    },
    activity: {
        name: 'Activity / Pulse',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
    },
    calendar: {
        name: 'Calendar / Bookings',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>'
    },
    clock: {
        name: 'Clock / Hours',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    },
    phone: {
        name: 'Phone / Contact',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
    },
    mail: {
        name: 'Mail / Inquiries',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
    },
    'map-pin': {
        name: 'Location / Pin',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
    },
    'shield-check': {
        name: 'Shield / Certified',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>'
    },
    'user-check': {
        name: 'Practitioner / Doctor',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>'
    },
    star: {
        name: 'Star / Rating',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    },
    award: {
        name: 'Award / Accreditation',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
    },
    'check-circle': {
        name: 'Checkmark / Verified',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    },
    sparkles: {
        name: 'Sparkles / Wellness',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>'
    },
    smile: {
        name: 'Smile / Compassion',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>'
    },
    'arrow-right': {
        name: 'Arrow / Next',
        svg: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toEmbedVideoUrl(url) {
    if (!url) return '';
    const trimmed = url.trim();
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
        return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
    if (vimeoMatch && vimeoMatch[3]) {
        return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
    }
    return trimmed;
}

export default function PageBuilder({ tenant }) {
    return (
        <ThemeProvider storageKey="umahz-app-theme" initialPreference="light">
            <PageBuilderContent tenant={tenant} />
        </ThemeProvider>
    );
}

function PageBuilderContent({ tenant }) {
    const { resolved, toggle: toggleTheme } = useTheme();
    const isDark = resolved === 'dark';
    const editorRef = useRef(null);
    const editorInstance = useRef(null);
    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState(null); // 'ok' | 'error' | null
    const [isDirty, setIsDirty] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState('blocks'); // 'blocks' | 'edit' | 'layers'
    const [elementSubTab, setElementSubTab] = useState('content'); // 'content' | 'style' | 'advanced'
    const [currentDevice, setCurrentDevice] = useState('Desktop');
    const [searchQuery, setSearchQuery] = useState('');
    const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [selectedTagName, setSelectedTagName] = useState(null);

    // Media Library Modal state
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [mediaModalTitle, setMediaModalTitle] = useState('Media Library');
    const [mediaCurrentValue, setMediaCurrentValue] = useState('');
    const openMediaPickerRef = useRef(null);
    const lastSelectedComponentRef = useRef(null);
    const activePickerRef = useRef({
        target: 'element',
        component: null,
        onSelect: null,
        editor: null,
    });

    // Helper to apply chosen/uploaded image URL to currently selected element in canvas
    function applyAssetToSelected(editor, src, targetType = 'element', assetMeta = null, targetComponent = null) {
        if (!editor || !src) return;
        const selected = targetComponent || activePickerRef.current.component || lastSelectedComponentRef.current || editor.getSelected();
        if (!selected) {
            console.warn('PageBuilder: No component available to apply asset to.', src);
            return;
        }

        const isImg = (selected.is && selected.is('image'))
            || selected.get?.('type') === 'image'
            || selected.get?.('tagName') === 'img';

        if (targetType === 'bg' || (!isImg && targetType !== 'img')) {
            // Background photo mode
            const safeUrl = src.replace(/"/g, '\\"');
            const bgCss = `url("${safeUrl}")`;

            selected.addStyle({
                'background-image': bgCss,
                'background-size': 'cover',
                'background-position': 'center center',
                'background-repeat': 'no-repeat',
            });

            if (selected.view && selected.view.el) {
                selected.view.el.style.backgroundImage = bgCss;
                selected.view.el.style.backgroundSize = 'cover';
                selected.view.el.style.backgroundPosition = 'center center';
                selected.view.el.style.backgroundRepeat = 'no-repeat';
            }
        } else {
            // Image element mode
            selected.set('src', src);
            const attrs = { src: src };
            if (assetMeta?.alt) attrs.alt = assetMeta.alt;
            selected.addAttributes(attrs);

            const srcTrait = selected.getTrait && selected.getTrait('src');
            if (srcTrait) {
                try { srcTrait.set('value', src); } catch (e) {}
            }

            if (selected.view && selected.view.el) {
                selected.view.el.setAttribute('src', src);
                try { selected.view.el.src = src; } catch (e) {}
                if (assetMeta?.alt) {
                    selected.view.el.setAttribute('alt', assetMeta.alt);
                }
            }
        }

        // Re-select component in canvas so traits and highlights update
        try {
            editor.select(selected);
        } catch (e) {}

        try {
            editor.Modal.close();
        } catch (e) {}
    }

    // Launch custom branded Media Library modal
    function openImagePicker(editor, options = {}) {
        const ed = editor || editorInstance.current;
        if (!ed) return;
        const targetComponent = options.component || ed.getSelected?.() || lastSelectedComponentRef.current;
        const isImg = targetComponent && ((targetComponent.is && targetComponent.is('image')) || targetComponent.get?.('type') === 'image' || targetComponent.get?.('tagName') === 'img');
        const target = options.target || (isImg ? 'element' : 'bg');
        const title = options.title || (target === 'bg' ? 'Set Background Photo' : 'Media Library');

        let curVal = '';
        if (targetComponent) {
            if (target === 'bg') {
                const style = (targetComponent.getStyle && targetComponent.getStyle()) || {};
                const bgImg = style['background-image'] || '';
                const match = bgImg.match(/url\(["']?([^"']*)["']?\)/);
                if (match && match[1]) curVal = match[1];
            } else {
                curVal = targetComponent.get?.('src') || (targetComponent.getAttributes && targetComponent.getAttributes()?.src) || '';
            }
        }

        activePickerRef.current = {
            target,
            component: targetComponent,
            onSelect: options.onSelect || null,
            editor: ed,
        };

        setMediaCurrentValue(curVal);
        setMediaModalTitle(title);
        setMediaModalOpen(true);
    }

    openMediaPickerRef.current = openImagePicker;

    useEffect(() => {
        if (!editorRef.current) return;

        // Base clinic data for blocks
        const clinicName = tenant.name || 'Wellness Clinic';
        const brandColor = tenant.brand_color || '#6d28d9';
        const logoUrl = tenant.logo_url || '';
        const phone = tenant.phone || '(555) 123-4567';
        const email = tenant.email || 'info@clinic.com';
        const address = tenant.address || '123 Health Ave, Suite 100';
        const disciplines = (tenant.offeredDisciplineLabels && tenant.offeredDisciplineLabels.length > 0)
            ? tenant.offeredDisciplineLabels
            : ['Acupuncture', 'Chiropractic', 'Physiotherapy', 'Massage Therapy'];

        // Default initial HTML if no project exists yet
        const defaultHtml = `
            <!-- Main Sticky Navigation Header -->
            <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${clinicName}" style="height: 38px; border-radius: 6px;" />` : `<div style="width: 38px; height: 38px; background: ${brandColor}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">✦</div>`}
                        <span style="font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">${clinicName}</span>
                    </div>
                    <nav style="display: flex; align-items: center; gap: 28px; flex-wrap: wrap;">
                        <a href="#home" style="color: #0f172a; font-weight: 600; text-decoration: none; font-size: 0.95rem;">Home</a>
                        <a href="#services" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">Services</a>
                        <a href="#about" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">About Us</a>
                        <a href="#hours" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">Hours</a>
                        <a href="#contact" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">Contact</a>
                    </nav>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <a href="/login" style="color: #475569; font-weight: 600; text-decoration: none; font-size: 0.9rem; padding: 8px 16px;">Staff Portal</a>
                        <a href="/pay" style="background: ${brandColor}; color: #ffffff; padding: 10px 22px; border-radius: 9999px; font-weight: 700; text-decoration: none; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">Pay Invoice</a>
                    </div>
                </div>
            </header>

            <!-- 1. Hero Section (#home) -->
            <section id="home" class="clinic-hero" style="background: linear-gradient(135deg, ${brandColor} 0%, #1e1b4b 100%); color: white; padding: 90px 20px; text-align: center;">
                <div style="max-width: 900px; margin: 0 auto;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${clinicName}" style="max-height: 80px; margin-bottom: 24px; border-radius: 8px;" />` : ''}
                    <h1 style="font-size: 2.8rem; font-weight: 800; margin-bottom: 16px; line-height: 1.2;">Welcome to ${clinicName}</h1>
                    <p style="font-size: 1.25rem; opacity: 0.9; max-width: 650px; margin: 0 auto 32px; line-height: 1.6;">
                        Providing high-quality personalized wellness and clinical care for your health and vitality.
                    </p>
                    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                        <a href="/pay" class="btn-pay" style="background: white; color: ${brandColor}; padding: 14px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Pay Invoice Online</a>
                        <a href="/login" class="btn-login" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 14px 28px; border-radius: 9999px; font-weight: 600; text-decoration: none; display: inline-block;">Staff Portal</a>
                    </div>
                </div>
            </section>

            <!-- 2. Services Section (#services) -->
            <section id="services" class="clinic-services" style="padding: 80px 20px; background: #f8fafc; color: #0f172a;">
                <div style="max-width: 1100px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 50px;">
                        <h2 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Our Services & Treatments</h2>
                        <p style="color: #64748b; font-size: 1.05rem;">Comprehensive holistic care tailored to your body's wellness.</p>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
                        ${disciplines.map(d => `
                            <div style="background: white; border-radius: 12px; padding: 28px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: left;">
                                <div style="width: 44px; height: 44px; background: ${brandColor}15; color: ${brandColor}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; margin-bottom: 16px;">✦</div>
                                <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #1e293b;">${d}</h3>
                                <p style="color: #64748b; font-size: 0.92rem; line-height: 1.5;">Personalized treatment sessions designed to help you recover, strengthen, and thrive.</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>

            <!-- 3. About Us Section (#about) -->
            <section id="about" class="clinic-about" style="padding: 80px 20px; background: #ffffff; color: #0f172a;">
                <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 48px; align-items: center;">
                    <div>
                        <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">About Our Clinic</span>
                        <h2 style="font-size: 2.2rem; font-weight: 800; margin: 8px 0 16px; color: #0f172a;">Dedicated to Your Recovery &amp; Long-Term Well-Being</h2>
                        <p style="color: #475569; font-size: 1rem; line-height: 1.7; margin-bottom: 20px;">
                            At ${clinicName}, our licensed practitioners blend evidence-based therapies with compassionate, patient-first care. Whether you are recovering from injury or optimizing your physical wellness, we build a care plan designed for you.
                        </p>
                        <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 10px; color: #334155; font-size: 0.95rem;">
                            <li>✓ <strong>Certified Specialists:</strong> Fully licensed and experienced healthcare team.</li>
                            <li>✓ <strong>Modern Facilities:</strong> State-of-the-art treatment and rehabilitation equipment.</li>
                            <li>✓ <strong>Direct Billing:</strong> Fast, hassle-free online invoice processing.</li>
                        </ul>
                        <a href="/pay" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none;">Pay Online</a>
                    </div>
                    <div>
                        <img src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80" alt="Clinic Interior" style="width: 100%; border-radius: 16px; box-shadow: 0 12px 30px rgba(0,0,0,0.1); object-fit: cover;" />
                    </div>
                </div>
            </section>

            <!-- 4. Hours & Schedule Section (#hours) -->
            <section id="hours" class="clinic-hours" style="padding: 70px 20px; background: #f8fafc; color: #0f172a;">
                <div style="max-width: 900px; margin: 0 auto; text-align: center;">
                    <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Clinic Schedule</span>
                    <h2 style="font-size: 2rem; font-weight: 700; margin: 8px 0 32px; color: #0f172a;">Operating Hours &amp; Availability</h2>
                    <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04); max-width: 600px; margin: 0 auto; text-align: left;">
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                            <span style="font-weight: 600; color: #1e293b;">Monday – Friday</span>
                            <span style="color: #64748b;">9:00 AM – 6:00 PM</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                            <span style="font-weight: 600; color: #1e293b;">Saturday</span>
                            <span style="color: #64748b;">10:00 AM – 3:00 PM</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                            <span style="font-weight: 600; color: #1e293b;">Sunday &amp; Holidays</span>
                            <span style="color: #ef4444; font-weight: 600;">Closed</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 5. Contact & Location Section (#contact) -->
            <section id="contact" class="clinic-contact" style="padding: 80px 20px; background: #ffffff; color: #0f172a;">
                <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; align-items: center;">
                    <div>
                        <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Get in Touch</span>
                        <h2 style="font-size: 2.2rem; font-weight: 700; margin: 8px 0 16px;">Visit Our Clinic</h2>
                        <p style="color: #64748b; font-size: 1rem; line-height: 1.6; margin-bottom: 28px;">
                            We are located in a convenient location with full parking access. Contact us to book an appointment or ask any questions.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.98rem; color: #334155;">
                            <div><strong>📍 Address:</strong> ${address}</div>
                            <div><strong>📞 Phone:</strong> ${phone}</div>
                            <div><strong>✉️ Email:</strong> ${email}</div>
                        </div>
                    </div>
                    <div style="background: #f1f5f9; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; color: #0f172a;">Quick Access</h3>
                        <p style="color: #64748b; font-size: 0.92rem; margin-bottom: 20px;">Pay your existing invoices securely online via direct clinic billing.</p>
                        <a href="/pay" style="display: block; text-align: center; background: ${brandColor}; color: white; padding: 14px; border-radius: 8px; font-weight: 700; text-decoration: none;">Pay Invoice Online</a>
                    </div>
                </div>
            </section>

            <!-- 6. Footer Navigation -->
            <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px; border-top: 1px solid #1e293b;">
                <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 40px; margin-bottom: 40px;">
                    <div>
                        <h3 style="color: white; font-size: 1.2rem; font-weight: 700; margin-bottom: 12px;">${clinicName}</h3>
                        <p style="font-size: 0.9rem; line-height: 1.6; color: #64748b;">Providing holistic clinical excellence and dedicated care for optimal health and vitality.</p>
                    </div>
                    <div>
                        <h4 style="color: white; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Quick Links</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                            <li><a href="#home" style="color: #94a3b8; text-decoration: none;">Home</a></li>
                            <li><a href="#services" style="color: #94a3b8; text-decoration: none;">Our Treatments</a></li>
                            <li><a href="#about" style="color: #94a3b8; text-decoration: none;">About the Clinic</a></li>
                            <li><a href="#hours" style="color: #94a3b8; text-decoration: none;">Hours &amp; Location</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: white; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Patient Services</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                            <li><a href="/pay" style="color: #94a3b8; text-decoration: none;">💳 Pay Invoice Online</a></li>
                            <li><a href="/login" style="color: #94a3b8; text-decoration: none;">🔒 Staff Portal Login</a></li>
                            <li><a href="#contact" style="color: #94a3b8; text-decoration: none;">📞 Contact Clinic</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: white; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Contact Info</h4>
                        <p style="font-size: 0.9rem; line-height: 1.6; margin-bottom: 6px;">📍 ${address}</p>
                        <p style="font-size: 0.9rem; margin-bottom: 6px;">📞 ${phone}</p>
                        <p style="font-size: 0.9rem;">✉️ ${email}</p>
                    </div>
                </div>
                <div style="max-width: 1100px; margin: 0 auto; padding-top: 24px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.82rem;">
                    <span>&copy; ${new Date().getFullYear()} ${clinicName}. All rights reserved.</span>
                    <div style="display: flex; gap: 16px;">
                        <a href="#" style="color: #64748b; text-decoration: none;">Privacy Policy</a>
                        <a href="#" style="color: #64748b; text-decoration: none;">Terms of Service</a>
                    </div>
                </div>
            </footer>
        `;

        const editor = grapesjs.init({
            container: editorRef.current,
            height: '100%',
            width: 'auto',
            fromElement: false,
            storageManager: false, // Handle saving manually via Inertia POST
            canvas: {
                styles: [
                    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
                ],
            },
            assetManager: {
                custom: {
                    open(props) {
                        if (openMediaPickerRef.current) {
                            const comp = props?.component || editor.getSelected() || lastSelectedComponentRef.current;
                            openMediaPickerRef.current(editor, {
                                component: comp,
                                onSelect: (url, asset) => {
                                    try {
                                        if (props && typeof props.select === 'function') {
                                            props.select(url, true);
                                        }
                                    } catch (e) {}
                                },
                                title: 'Media Library',
                            });
                        }
                    },
                    close() {
                        setMediaModalOpen(false);
                    },
                },
            },
            deviceManager: {
                devices: [
                    { name: 'Desktop', width: '' },
                    { name: 'Tablet', width: '768px', widthMedia: '992px' },
                    { name: 'Mobile', width: '375px', widthMedia: '480px' },
                ],
            },
            colorPicker: {
                showPalette: true,
                showPaletteOnly: false,
                togglePaletteOnly: false,
                showButtons: false,
                showAlpha: true,
                palette: [
                    [brandColor, '#7c3aed', '#8b5cf6', '#a855f7', '#6366f1'],
                    ['#0f172a', '#1e293b', '#334155', '#64748b', '#94a3b8'],
                    ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'],
                    ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ef4444'],
                ],
            },
            blockManager: {
                appendTo: '#gjs-blocks',
            },
            styleManager: {
                appendTo: '#gjs-styles',
                sectors: [
                    {
                        id: 'sec-style-colors',
                        name: '🎨 Colors & Background',
                        open: true,
                        buildProps: [
                            'background-color', 'color', 'opacity', 'background-image',
                            'background-size', 'background-position', 'background-repeat'
                        ],
                        properties: [
                            {
                                name: 'Background Color',
                                property: 'background-color',
                                type: 'color',
                                defaults: 'transparent',
                            },
                            {
                                name: 'Text Color',
                                property: 'color',
                                type: 'color',
                                defaults: '#0f172a',
                            },
                            {
                                name: 'Opacity',
                                property: 'opacity',
                                type: 'slider',
                                defaults: 1,
                                step: 0.05,
                                max: 1,
                                min: 0,
                            },
                            {
                                name: 'Background Image',
                                property: 'background-image',
                                type: 'file',
                                functionName: 'url',
                            },
                            {
                                name: 'Background Size',
                                property: 'background-size',
                                type: 'select',
                                defaults: 'cover',
                                options: [
                                    { value: 'cover', name: 'Cover (Fill)' },
                                    { value: 'contain', name: 'Contain (Fit)' },
                                    { value: 'auto', name: 'Auto' },
                                    { value: '100% 100%', name: 'Stretch 100%' },
                                ],
                            },
                            {
                                name: 'Background Position',
                                property: 'background-position',
                                type: 'select',
                                defaults: 'center center',
                                options: [
                                    { value: 'center center', name: 'Center' },
                                    { value: 'top center', name: 'Top' },
                                    { value: 'bottom center', name: 'Bottom' },
                                    { value: 'left center', name: 'Left' },
                                    { value: 'right center', name: 'Right' },
                                ],
                            },
                            {
                                name: 'Background Repeat',
                                property: 'background-repeat',
                                type: 'select',
                                defaults: 'no-repeat',
                                options: [
                                    { value: 'no-repeat', name: 'No Repeat' },
                                    { value: 'repeat', name: 'Tile Repeat' },
                                    { value: 'repeat-x', name: 'Repeat X' },
                                    { value: 'repeat-y', name: 'Repeat Y' },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'sec-style-typography',
                        name: '🔤 Typography',
                        open: true,
                        buildProps: [
                            'font-family', 'font-size', 'font-weight', 'line-height',
                            'letter-spacing', 'text-align', 'text-decoration', 'text-transform'
                        ],
                        properties: [
                            {
                                name: 'Font Family',
                                property: 'font-family',
                                type: 'select',
                                defaults: 'Inter, sans-serif',
                                options: [
                                    { value: 'Inter, system-ui, -apple-system, sans-serif', name: 'Inter / Modern Sans' },
                                    { value: 'ui-serif, Georgia, Cambria, serif', name: 'Elegant Serif' },
                                    { value: 'system-ui, -apple-system, sans-serif', name: 'System Default' },
                                    { value: '"Courier New", monospace', name: 'Monospace' },
                                ],
                            },
                            {
                                name: 'Font Size',
                                property: 'font-size',
                                type: 'slider',
                                defaults: '16px',
                                units: ['px', 'rem', 'em'],
                                min: 8,
                                max: 84,
                                step: 1,
                            },
                            {
                                name: 'Font Weight',
                                property: 'font-weight',
                                type: 'select',
                                defaults: '400',
                                options: [
                                    { value: '300', name: '300 Light' },
                                    { value: '400', name: '400 Regular' },
                                    { value: '500', name: '500 Medium' },
                                    { value: '600', name: '600 Semi-Bold' },
                                    { value: '700', name: '700 Bold' },
                                    { value: '800', name: '800 Extra Bold' },
                                ],
                            },
                            {
                                name: 'Line Height',
                                property: 'line-height',
                                type: 'select',
                                defaults: '1.5',
                                options: [
                                    { value: '1', name: '1.0 (Tight)' },
                                    { value: '1.25', name: '1.25 (Snug)' },
                                    { value: '1.5', name: '1.5 (Normal)' },
                                    { value: '1.75', name: '1.75 (Relaxed)' },
                                    { value: '2', name: '2.0 (Loose)' },
                                ],
                            },
                            {
                                name: 'Letter Spacing',
                                property: 'letter-spacing',
                                type: 'slider',
                                defaults: '0px',
                                units: ['px', 'em'],
                                min: -2,
                                max: 8,
                                step: 0.5,
                            },
                            {
                                name: 'Text Align',
                                property: 'text-align',
                                type: 'select',
                                defaults: 'left',
                                options: [
                                    { value: 'left', name: 'Left' },
                                    { value: 'center', name: 'Center' },
                                    { value: 'right', name: 'Right' },
                                    { value: 'justify', name: 'Justify' },
                                ],
                            },
                            {
                                name: 'Transform',
                                property: 'text-transform',
                                type: 'select',
                                defaults: 'none',
                                options: [
                                    { value: 'none', name: 'Default' },
                                    { value: 'uppercase', name: 'Uppercase' },
                                    { value: 'lowercase', name: 'Lowercase' },
                                    { value: 'capitalize', name: 'Capitalize' },
                                ],
                            },
                            {
                                name: 'Decoration',
                                property: 'text-decoration',
                                type: 'select',
                                defaults: 'none',
                                options: [
                                    { value: 'none', name: 'None' },
                                    { value: 'underline', name: 'Underline' },
                                    { value: 'line-through', name: 'Line-Through' },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'sec-style-borders',
                        name: '✨ Borders & Shadows',
                        open: false,
                        buildProps: [
                            'border-radius', 'border-style', 'border-width', 'border-color', 'box-shadow'
                        ],
                        properties: [
                            {
                                name: 'Border Radius',
                                property: 'border-radius',
                                type: 'slider',
                                defaults: '0px',
                                units: ['px', '%', 'rem'],
                                min: 0,
                                max: 60,
                                step: 1,
                            },
                            {
                                name: 'Border Style',
                                property: 'border-style',
                                type: 'select',
                                defaults: 'none',
                                options: [
                                    { value: 'none', name: 'None' },
                                    { value: 'solid', name: 'Solid' },
                                    { value: 'dashed', name: 'Dashed' },
                                    { value: 'dotted', name: 'Dotted' },
                                ],
                            },
                            {
                                name: 'Border Width',
                                property: 'border-width',
                                type: 'slider',
                                defaults: '1px',
                                units: ['px'],
                                min: 0,
                                max: 12,
                                step: 1,
                            },
                            {
                                name: 'Border Color',
                                property: 'border-color',
                                type: 'color',
                                defaults: '#e2e8f0',
                            },
                            {
                                name: 'Box Shadow',
                                property: 'box-shadow',
                                type: 'select',
                                defaults: 'none',
                                options: [
                                    { value: 'none', name: 'None' },
                                    { value: '0 1px 3px rgba(0,0,0,0.08)', name: 'Subtle Card' },
                                    { value: '0 4px 12px rgba(0,0,0,0.08)', name: 'Medium Elevation' },
                                    { value: '0 10px 25px -5px rgba(0,0,0,0.12)', name: 'High Floating' },
                                    { value: '0 4px 20px rgba(124, 58, 237, 0.25)', name: 'Brand Violet Glow' },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'sec-adv-spacing',
                        name: '📐 Dimensions & Spacing',
                        open: true,
                        buildProps: ['margin', 'padding', 'width', 'max-width', 'min-height'],
                        properties: [
                            {
                                name: 'Margin',
                                property: 'margin',
                                type: 'composite',
                                properties: [
                                    { name: 'Top', property: 'margin-top', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                    { name: 'Right', property: 'margin-right', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                    { name: 'Bottom', property: 'margin-bottom', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                    { name: 'Left', property: 'margin-left', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                ],
                            },
                            {
                                name: 'Padding',
                                property: 'padding',
                                type: 'composite',
                                properties: [
                                    { name: 'Top', property: 'padding-top', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                    { name: 'Right', property: 'padding-right', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                    { name: 'Bottom', property: 'padding-bottom', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                    { name: 'Left', property: 'padding-left', type: 'integer', units: ['px', '%', 'rem'], defaults: '0px' },
                                ],
                            },
                            {
                                name: 'Width',
                                property: 'width',
                                type: 'slider',
                                units: ['px', '%', 'auto'],
                                defaults: 'auto',
                                min: 0,
                                max: 1200,
                            },
                            {
                                name: 'Max Width',
                                property: 'max-width',
                                type: 'slider',
                                units: ['px', '%', 'none'],
                                defaults: 'none',
                                min: 0,
                                max: 1400,
                            },
                            {
                                name: 'Min Height',
                                property: 'min-height',
                                type: 'slider',
                                units: ['px', 'vh'],
                                defaults: 'auto',
                                min: 0,
                                max: 800,
                            },
                        ],
                    },
                    {
                        id: 'sec-adv-layout',
                        name: '⚡ Layout & Positioning',
                        open: false,
                        buildProps: ['display', 'flex-direction', 'justify-content', 'align-items', 'z-index', 'cursor'],
                        properties: [
                            {
                                name: 'Display',
                                property: 'display',
                                type: 'select',
                                defaults: 'block',
                                options: [
                                    { value: 'block', name: 'Block' },
                                    { value: 'flex', name: 'Flexbox' },
                                    { value: 'inline-block', name: 'Inline-Block' },
                                    { value: 'inline', name: 'Inline' },
                                    { value: 'none', name: 'Hidden (None)' },
                                ],
                            },
                            {
                                name: 'Flex Direction',
                                property: 'flex-direction',
                                type: 'select',
                                defaults: 'row',
                                options: [
                                    { value: 'row', name: 'Row' },
                                    { value: 'column', name: 'Column' },
                                ],
                            },
                            {
                                name: 'Justify Content',
                                property: 'justify-content',
                                type: 'select',
                                defaults: 'flex-start',
                                options: [
                                    { value: 'flex-start', name: 'Start' },
                                    { value: 'center', name: 'Center' },
                                    { value: 'flex-end', name: 'End' },
                                    { value: 'space-between', name: 'Space Between' },
                                    { value: 'space-around', name: 'Space Around' },
                                ],
                            },
                            {
                                name: 'Align Items',
                                property: 'align-items',
                                type: 'select',
                                defaults: 'stretch',
                                options: [
                                    { value: 'stretch', name: 'Stretch' },
                                    { value: 'flex-start', name: 'Start' },
                                    { value: 'center', name: 'Center' },
                                    { value: 'flex-end', name: 'End' },
                                ],
                            },
                            {
                                name: 'Z-Index',
                                property: 'z-index',
                                type: 'integer',
                                defaults: '0',
                                min: 0,
                                max: 9999,
                            },
                            {
                                name: 'Cursor',
                                property: 'cursor',
                                type: 'select',
                                defaults: 'default',
                                options: [
                                    { value: 'default', name: 'Default' },
                                    { value: 'pointer', name: 'Pointer (Hand)' },
                                ],
                            },
                        ],
                    },
                ],
            },
            layerManager: {
                appendTo: '#gjs-layers',
            },
            traitManager: {
                appendTo: '#gjs-traits',
            },
            panels: { defaults: [] }, // Disable default floating toolbar panels
        });

        editorInstance.current = editor;

        // Inject smooth scrolling, section anchor offset & column layout styles into canvas iframe
        editor.on('load', () => {
            try {
                const doc = editor.Canvas.getDocument();
                if (doc) {
                    const style = doc.createElement('style');
                    style.innerHTML = `
                        html { scroll-behavior: smooth !important; }
                        [id] { scroll-margin-top: 80px !important; }
                        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }

                        /* Elementor-style Section & Column Layouts */
                        .umahz-section {
                            padding: 60px 20px;
                            background-color: #ffffff;
                            box-sizing: border-box;
                            width: 100%;
                            position: relative;
                            transition: background 0.2s ease;
                        }
                        .umahz-row {
                            display: flex;
                            flex-wrap: wrap;
                            width: 100%;
                            max-width: 1200px;
                            margin: 0 auto;
                            gap: 20px;
                            box-sizing: border-box;
                            align-items: stretch;
                            position: relative;
                        }
                        .umahz-column {
                            box-sizing: border-box;
                            min-height: 90px;
                            padding: 24px;
                            display: flex;
                            flex-direction: column;
                            position: relative;
                            border: 1.5px dashed rgba(139, 92, 246, 0.3);
                            border-radius: 12px;
                            background-color: rgba(248, 250, 252, 0.7);
                            transition: all 0.2s ease;
                        }
                        .umahz-column:hover {
                            border-color: rgba(139, 92, 246, 0.7);
                            background-color: rgba(248, 250, 252, 0.95);
                        }
                        .umahz-column:empty::after {
                            content: '+ Drag a block here';
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 56px;
                            width: 100%;
                            font-size: 0.78rem;
                            font-weight: 600;
                            color: #94a3b8;
                            background: rgba(241, 245, 249, 0.7);
                            border: 1px dashed #cbd5e1;
                            border-radius: 8px;
                            margin: auto 0;
                            pointer-events: none;
                            letter-spacing: 0.02em;
                        }

                        /* Structure Picker Interactive Card */
                        .umahz-struct-btn:hover {
                            border-color: #8b5cf6 !important;
                            background: #f5f3ff !important;
                            transform: translateY(-2px);
                            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25) !important;
                        }
                        .umahz-struct-btn:hover span {
                            color: #7c3aed !important;
                        }
                        .umahz-struct-btn:hover > div > div,
                        .umahz-struct-btn:hover > div {
                            background: #c4b5fd !important;
                        }

                        /* Responsive Stacking: On mobile and tablet <= 768px, columns stack vertically */
                        @media (max-width: 768px) {
                            .umahz-row {
                                flex-direction: column !important;
                                gap: 16px !important;
                            }
                            .umahz-column {
                                flex: 1 1 100% !important;
                                width: 100% !important;
                                max-width: 100% !important;
                            }
                        }
                    `;
                    doc.head.appendChild(style);
                }
            } catch (e) {
                console.warn('Canvas style injection notice:', e);
            }
        });

        // Fetch & populate tenant-isolated clinic assets from backend
        function refreshTenantAssets() {
            fetch('/app/settings/page-builder/assets')
                .then(res => res.json())
                .then(data => {
                    const am = editor.AssetManager || editor.Assets;
                    if (am && data.assets && Array.isArray(data.assets)) {
                        data.assets.forEach(asset => {
                            try { am.add(asset); } catch {}
                        });
                    }
                })
                .catch(err => console.error('Failed to load clinic assets:', err));
        }
        refreshTenantAssets();

        // Custom trait button to launch Asset Manager for <img> tags
        editor.TraitManager.addType('button-open-assets', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-action-block';
                el.style.width = '100%';
                el.innerHTML = `
                    <div style="padding: 2px 0 4px 0; width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Image Media
                        </label>
                        <button type="button" class="btn-open-asset-modal" style="width: 100%; padding: 10px 14px; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.8rem; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); transition: all 0.15s ease;">
                            <span>📁 Choose / Upload Image</span>
                        </button>
                        <p style="margin: 8px 0 0 0; font-size: 0.72rem; color: var(--gjs-panel-text-muted); text-align: left; line-height: 1.45; white-space: normal;">
                            Select from clinic files, upload from computer, or paste a URL below.
                        </p>
                    </div>
                `;
                el.querySelector('button').addEventListener('click', () => {
                    const comp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (openMediaPickerRef.current) {
                        openMediaPickerRef.current(editor, { target: 'element', title: 'Choose / Upload Image', component: comp });
                    }
                });
                return el;
            },
        });

        // Custom trait button to set / clear background image on any section or container
        editor.TraitManager.addType('button-bg-assets', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-action-block';
                el.style.width = '100%';
                el.innerHTML = `
                    <div style="padding: 2px 0 4px 0; width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Background Photo
                        </label>
                        <div style="display: flex; gap: 8px; flex-direction: column; width: 100%;">
                            <button type="button" class="btn-choose-bg" style="width: 100%; padding: 10px 14px; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.8rem; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); transition: all 0.15s ease;">
                                <span>🌄 Set Background Photo</span>
                            </button>
                            <button type="button" class="btn-clear-bg" style="width: 100%; padding: 8px 12px; background: transparent; color: #ef4444; border: 1.5px solid rgba(239, 68, 68, 0.45); border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.74rem; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span>✕ Clear Background Photo</span>
                            </button>
                        </div>
                        <p style="margin: 8px 0 0 0; font-size: 0.72rem; color: var(--gjs-panel-text-muted); text-align: left; line-height: 1.45; white-space: normal;">
                            Pick from clinic files or upload a high-resolution photo.
                        </p>
                    </div>
                `;
                el.querySelector('.btn-choose-bg').addEventListener('click', () => {
                    const comp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (openMediaPickerRef.current) {
                        openMediaPickerRef.current(editor, { target: 'bg', title: 'Set Background Photo', component: comp });
                    }
                });
                el.querySelector('.btn-clear-bg').addEventListener('click', () => {
                    const selected = editor.getSelected() || lastSelectedComponentRef.current;
                    if (selected) {
                        setIsDirty(true);
                    }
                });
                return el;
            },
        });

        // ---------------------------------------------------------
        // CUSTOM CONTENT TRAIT TYPES (CONTEXT-AWARE ELEMENT SETTINGS)
        // ---------------------------------------------------------

        // 1. Heading Tag Selector (H1 – H6)
        editor.TraitManager.addType('umahz-heading-tag', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const currentTag = (comp?.get('tagName') || 'h2').toLowerCase();
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Heading Level (Tag)
                        </label>
                        <select class="umahz-trait-input" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            <option value="h1" ${currentTag === 'h1' ? 'selected' : ''}>H1 - Main Page Title</option>
                            <option value="h2" ${currentTag === 'h2' ? 'selected' : ''}>H2 - Section Heading</option>
                            <option value="h3" ${currentTag === 'h3' ? 'selected' : ''}>H3 - Subsection Title</option>
                            <option value="h4" ${currentTag === 'h4' ? 'selected' : ''}>H4 - Card Title</option>
                            <option value="h5" ${currentTag === 'h5' ? 'selected' : ''}>H5 - Small Header</option>
                            <option value="h6" ${currentTag === 'h6' ? 'selected' : ''}>H6 - Subheading / Eyebrow</option>
                        </select>
                        <p style="margin: 6px 0 0 0; font-size: 0.7rem; color: var(--gjs-panel-text-muted); line-height: 1.3;">
                            Switches the semantic HTML tag for SEO and accessibility hierarchy.
                        </p>
                    </div>
                `;
                const sel = el.querySelector('select');
                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const newTag = e.target.value;
                        currentComp.set('tagName', newTag);
                        if (currentComp.view && currentComp.view.render) {
                            currentComp.view.render();
                        }
                        setSelectedTagName(`Heading (${newTag.toUpperCase()})`);
                        try { editor.select(currentComp); } catch {}
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 2. Rich Text / Heading Content Editor Area
        editor.TraitManager.addType('umahz-text-content', {
            createInput({ trait }) {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                let initialText = '';
                if (comp) {
                    initialText = comp.view?.el?.innerText || comp.get('content') || '';
                }
                const labelText = (trait && trait.get && trait.get('label')) || 'Text Content';
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            ${escapeHtml(labelText)}
                        </label>
                        <textarea class="umahz-trait-input" rows="3" style="width: 100%; min-height: 76px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; line-height: 1.45; resize: vertical; box-sizing: border-box; font-family: inherit;">${escapeHtml(initialText)}</textarea>
                        <p style="margin: 6px 0 0 0; font-size: 0.7rem; color: var(--gjs-panel-text-muted); line-height: 1.3;">
                            Edit text here or double-click to format directly on canvas.
                        </p>
                    </div>
                `;
                const textarea = el.querySelector('textarea');
                textarea.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const val = e.target.value;
                        currentComp.components(val);
                        currentComp.set('content', val);
                        if (currentComp.view?.el) {
                            currentComp.view.el.innerText = val;
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 3. Button Label Text
        editor.TraitManager.addType('umahz-button-label', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                let initialText = '';
                if (comp) {
                    initialText = comp.view?.el?.innerText || comp.get('content') || '';
                }
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Button Text / Label
                        </label>
                        <input type="text" class="umahz-trait-input" value="${escapeHtml(initialText)}" placeholder="e.g. Book Consultation" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; box-sizing: border-box;" />
                    </div>
                `;
                const input = el.querySelector('input');
                input.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const val = e.target.value;
                        currentComp.components(val);
                        currentComp.set('content', val);
                        if (currentComp.view?.el) {
                            currentComp.view.el.innerText = val;
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 4. Button Preset Style Variant
        editor.TraitManager.addType('umahz-button-style', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Button Style Variant
                        </label>
                        <select class="umahz-trait-input" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            <option value="primary">Primary Filled (Brand Accent)</option>
                            <option value="outline">Secondary Outline</option>
                            <option value="soft">Soft Tinted</option>
                            <option value="dark">Dark Modern</option>
                        </select>
                    </div>
                `;
                const sel = el.querySelector('select');
                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const variant = e.target.value;
                        let newStyle = {};
                        if (variant === 'primary') {
                            newStyle = {
                                background: brandColor,
                                color: '#ffffff',
                                border: 'none',
                                'box-shadow': '0 4px 14px rgba(124, 58, 237, 0.3)',
                            };
                        } else if (variant === 'outline') {
                            newStyle = {
                                background: 'transparent',
                                color: '#0f172a',
                                border: '2px solid #cbd5e1',
                                'box-shadow': 'none',
                            };
                        } else if (variant === 'soft') {
                            newStyle = {
                                background: 'rgba(124, 58, 237, 0.1)',
                                color: brandColor,
                                border: '1px solid rgba(124, 58, 237, 0.2)',
                                'box-shadow': 'none',
                            };
                        } else if (variant === 'dark') {
                            newStyle = {
                                background: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                'box-shadow': '0 4px 12px rgba(15, 23, 42, 0.25)',
                            };
                        }
                        currentComp.addStyle(newStyle);
                        if (currentComp.view?.el) {
                            Object.assign(currentComp.view.el.style, newStyle);
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 5. Icon Picker Trait
        editor.TraitManager.addType('umahz-icon-select', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const currentIcon = comp?.getAttributes?.()?.['data-icon-name'] || 'heart';
                const optionsHtml = Object.keys(UMAHZ_ICONS).map(k => `
                    <option value="${k}" ${k === currentIcon ? 'selected' : ''}>
                        ${UMAHZ_ICONS[k].name}
                    </option>
                `).join('');

                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Icon Graphic
                        </label>
                        <select class="umahz-trait-input" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            ${optionsHtml}
                        </select>
                    </div>
                `;
                const sel = el.querySelector('select');
                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const iconKey = e.target.value;
                        currentComp.addAttributes({ 'data-icon-name': iconKey });
                        const sz = currentComp.getAttributes?.()?.['data-icon-size'] || '40';
                        const iconData = UMAHZ_ICONS[iconKey] || UMAHZ_ICONS.heart;
                        const styledSvg = iconData.svg.replace('width="100%"', `width="${sz}"`).replace('height="100%"', `height="${sz}"`);
                        currentComp.components(styledSvg);
                        if (currentComp.view?.el) {
                            currentComp.view.el.innerHTML = styledSvg;
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 6. Icon Size Trait
        editor.TraitManager.addType('umahz-icon-size', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const currentSize = comp?.getAttributes?.()?.['data-icon-size'] || '40';
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Icon Size
                        </label>
                        <select class="umahz-trait-input" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            <option value="24" ${currentSize === '24' ? 'selected' : ''}>Small (24px)</option>
                            <option value="32" ${currentSize === '32' ? 'selected' : ''}>Medium (32px)</option>
                            <option value="40" ${currentSize === '40' ? 'selected' : ''}>Standard (40px)</option>
                            <option value="48" ${currentSize === '48' ? 'selected' : ''}>Large (48px)</option>
                            <option value="64" ${currentSize === '64' ? 'selected' : ''}>Extra Large (64px)</option>
                            <option value="80" ${currentSize === '80' ? 'selected' : ''}>Huge (80px)</option>
                        </select>
                    </div>
                `;
                const sel = el.querySelector('select');
                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const sz = e.target.value;
                        currentComp.addAttributes({ 'data-icon-size': sz });
                        const svgEl = currentComp.view?.el?.querySelector('svg');
                        if (svgEl) {
                            svgEl.setAttribute('width', sz);
                            svgEl.setAttribute('height', sz);
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 7. Icon Color Trait
        editor.TraitManager.addType('umahz-icon-color', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Icon Color
                        </label>
                        <select class="umahz-trait-input" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            <option value="${brandColor}">Clinic Brand Accent</option>
                            <option value="#10b981">Emerald Green (Health & Wellness)</option>
                            <option value="#0284c7">Sky Blue (Medical & Clinical)</option>
                            <option value="#e11d48">Rose / Crimson (Care & Alert)</option>
                            <option value="#0f172a">Dark Slate (Modern Neutral)</option>
                            <option value="#64748b">Muted Slate (Subtle)</option>
                        </select>
                    </div>
                `;
                const sel = el.querySelector('select');
                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const color = e.target.value;
                        currentComp.addStyle({ color: color });
                        if (currentComp.view?.el) {
                            currentComp.view.el.style.color = color;
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 8. Icon Box / Feature Settings
        editor.TraitManager.addType('umahz-icon-box-settings', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const titleEl = comp?.view?.el?.querySelector('.umahz-icon-box-title');
                const descEl = comp?.view?.el?.querySelector('.umahz-icon-box-desc');
                const linkEl = comp?.view?.el?.querySelector('.umahz-icon-box-link');
                const curTitle = titleEl?.innerText || 'Personalized Patient Care';
                const curDesc = descEl?.innerText || 'Comprehensive consultations, diagnostic evaluations, and wellness treatments.';
                const curLink = linkEl?.getAttribute('href') || '#services';

                const optionsHtml = Object.keys(UMAHZ_ICONS).map(k => `
                    <option value="${k}">${UMAHZ_ICONS[k].name}</option>
                `).join('');

                el.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Icon Graphic
                            </label>
                            <select class="icon-picker-select" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                                ${optionsHtml}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Box Title
                            </label>
                            <input type="text" class="box-title-input" value="${escapeHtml(curTitle)}" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Description
                            </label>
                            <textarea class="box-desc-input" rows="3" style="width: 100%; min-height: 70px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; line-height: 1.45; resize: vertical; box-sizing: border-box; font-family: inherit;">${escapeHtml(curDesc)}</textarea>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Link URL (href)
                            </label>
                            <input type="text" class="box-link-input" value="${escapeHtml(curLink)}" placeholder="#services or /pay" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; box-sizing: border-box;" />
                        </div>
                    </div>
                `;

                const iconSel = el.querySelector('.icon-picker-select');
                const titleInput = el.querySelector('.box-title-input');
                const descInput = el.querySelector('.box-desc-input');
                const linkInput = el.querySelector('.box-link-input');

                iconSel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp && currentComp.view?.el) {
                        const iconContainer = currentComp.view.el.querySelector('.umahz-icon-box-icon');
                        const iconData = UMAHZ_ICONS[e.target.value] || UMAHZ_ICONS.stethoscope;
                        const styledSvg = iconData.svg.replace('width="100%"', 'width="28"').replace('height="100%"', 'height="28"');
                        if (iconContainer) iconContainer.innerHTML = styledSvg;
                        setIsDirty(true);
                    }
                });

                titleInput.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp && currentComp.view?.el) {
                        const t = currentComp.view.el.querySelector('.umahz-icon-box-title');
                        if (t) t.innerText = e.target.value;
                        setIsDirty(true);
                    }
                });

                descInput.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp && currentComp.view?.el) {
                        const d = currentComp.view.el.querySelector('.umahz-icon-box-desc');
                        if (d) d.innerText = e.target.value;
                        setIsDirty(true);
                    }
                });

                linkInput.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp && currentComp.view?.el) {
                        const a = currentComp.view.el.querySelector('.umahz-icon-box-link');
                        if (a) a.setAttribute('href', e.target.value);
                        setIsDirty(true);
                    }
                });

                return el;
            }
        });

        // 9. Divider Controls
        editor.TraitManager.addType('umahz-divider-settings', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                el.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Line Style
                            </label>
                            <select class="divider-style-select" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                                <option value="solid">Solid Line</option>
                                <option value="dashed">Dashed Line</option>
                                <option value="dotted">Dotted Line</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Thickness
                            </label>
                            <select class="divider-thick-select" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                                <option value="1px">1px Subtle</option>
                                <option value="2px">2px Standard</option>
                                <option value="3px">3px Bold</option>
                                <option value="4px">4px Thick</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                Width
                            </label>
                            <select class="divider-width-select" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                                <option value="100%">100% Full Width</option>
                                <option value="75%">75% Wide</option>
                                <option value="50%">50% Half</option>
                                <option value="25%">25% Quarter</option>
                            </select>
                        </div>
                    </div>
                `;

                function updateDivider() {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (!currentComp) return;
                    const styleVal = el.querySelector('.divider-style-select').value;
                    const thickVal = el.querySelector('.divider-thick-select').value;
                    const widthVal = el.querySelector('.divider-width-select').value;
                    const hrEl = currentComp.view?.el?.querySelector('hr') || currentComp.view?.el;
                    if (hrEl) {
                        hrEl.style.borderTopStyle = styleVal;
                        hrEl.style.borderTopWidth = thickVal;
                        hrEl.style.width = widthVal;
                    }
                    setIsDirty(true);
                }

                el.querySelectorAll('select').forEach(s => s.addEventListener('change', updateDivider));
                return el;
            }
        });

        // 10. Spacer Height Control
        editor.TraitManager.addType('umahz-spacer-settings', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const curH = comp?.getStyle?.()?.height || '40px';
                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Spacer Height
                        </label>
                        <select class="umahz-trait-input" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            <option value="16px" ${curH === '16px' ? 'selected' : ''}>16px - Extra Small</option>
                            <option value="24px" ${curH === '24px' ? 'selected' : ''}>24px - Small</option>
                            <option value="40px" ${curH === '40px' ? 'selected' : ''}>40px - Medium (Default)</option>
                            <option value="60px" ${curH === '60px' ? 'selected' : ''}>60px - Large</option>
                            <option value="80px" ${curH === '80px' ? 'selected' : ''}>80px - Extra Large</option>
                            <option value="120px" ${curH === '120px' ? 'selected' : ''}>120px - Section Break</option>
                        </select>
                    </div>
                `;
                const sel = el.querySelector('select');
                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        currentComp.addStyle({ height: e.target.value });
                        if (currentComp.view?.el) {
                            currentComp.view.el.style.height = e.target.value;
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // 11. List Settings (Type & Line-by-Line Items)
        editor.TraitManager.addType('umahz-list-settings', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const items = [];
                if (comp?.view?.el) {
                    comp.view.el.querySelectorAll('li').forEach(li => items.push(li.innerText));
                }
                const initialText = items.length > 0 ? items.join('\n') : "Licensed healthcare specialists\nState-of-the-art clinical equipment\nFlexible scheduling";

                el.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                List Style
                            </label>
                            <select class="list-style-select" style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                                <option value="disc">Bulleted Dots (Disc)</option>
                                <option value="decimal">Numbered (1, 2, 3...)</option>
                                <option value="square">Square Bullets</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                                List Items (1 per line)
                            </label>
                            <textarea class="list-items-textarea" rows="4" style="width: 100%; min-height: 85px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; line-height: 1.45; resize: vertical; box-sizing: border-box; font-family: inherit;">${escapeHtml(initialText)}</textarea>
                        </div>
                    </div>
                `;

                const sel = el.querySelector('.list-style-select');
                const ta = el.querySelector('.list-items-textarea');

                sel.addEventListener('change', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const styleVal = e.target.value;
                        currentComp.addStyle({ 'list-style-type': styleVal });
                        if (currentComp.view?.el) {
                            currentComp.view.el.style.listStyleType = styleVal;
                        }
                        setIsDirty(true);
                    }
                });

                ta.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const lines = e.target.value.split('\n').filter(l => l.trim().length > 0);
                        const lisHtml = lines.map(l => `<li>${escapeHtml(l.trim())}</li>`).join('');
                        currentComp.components(lisHtml);
                        if (currentComp.view?.el) {
                            currentComp.view.el.innerHTML = lisHtml;
                        }
                        setIsDirty(true);
                    }
                });

                return el;
            }
        });

        // 12. Video Embed Settings
        editor.TraitManager.addType('umahz-video-settings', {
            createInput() {
                const el = document.createElement('div');
                el.className = 'umahz-trait-full-block';
                el.style.width = '100%';
                const comp = editor.getSelected() || lastSelectedComponentRef.current;
                const iframe = comp?.view?.el?.querySelector('iframe');
                const curSrc = iframe?.getAttribute('src') || 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

                el.innerHTML = `
                    <div style="width: 100%;">
                        <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--gjs-panel-text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
                            Video URL (YouTube or Vimeo)
                        </label>
                        <input type="text" class="umahz-trait-input" value="${escapeHtml(curSrc)}" placeholder="https://youtube.com/watch?v=..." style="width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--gjs-panel-input-border); background: var(--gjs-panel-input); color: var(--gjs-panel-text); font-size: 0.8rem; box-sizing: border-box;" />
                        <p style="margin: 6px 0 0 0; font-size: 0.7rem; color: var(--gjs-panel-text-muted); line-height: 1.3;">
                            Paste any YouTube or Vimeo link; it will be converted automatically into a responsive embed iframe.
                        </p>
                    </div>
                `;
                const input = el.querySelector('input');
                input.addEventListener('input', (e) => {
                    const currentComp = editor.getSelected() || lastSelectedComponentRef.current;
                    if (currentComp) {
                        const embedUrl = toEmbedVideoUrl(e.target.value);
                        const ifr = currentComp.view?.el?.querySelector('iframe');
                        if (ifr) ifr.setAttribute('src', embedUrl);
                        setIsDirty(true);
                    }
                });
                return el;
            }
        });

        // Command override for open-assets to launch branded Media Library
        editor.Commands.add('open-assets', {
            run(ed, sender, opts = {}) {
                const comp = opts.component || ed.getSelected() || lastSelectedComponentRef.current;
                if (openMediaPickerRef.current) {
                    openMediaPickerRef.current(ed, {
                        onSelect: opts.onSelect,
                        target: opts.target || 'element',
                        title: opts.title || (opts.target === 'bg' ? 'Set Background Photo' : 'Media Library'),
                        component: comp,
                    });
                }
            }
        });

        // Helper to generate section + columns layout definition
        function getSectionConfig(structure) {
            let columns = [];
            if (structure === '1-col') {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '1 1 100%' } }
                ];
            } else if (structure === '2-col-equal') {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(50% - 10px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(50% - 10px)' } }
                ];
            } else if (structure === '2-col-66-33') {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '2 1 calc(66.66% - 14px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(33.33% - 14px)' } }
                ];
            } else if (structure === '2-col-33-66') {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(33.33% - 14px)' } },
                    { type: 'umahz-column', style: { 'flex': '2 1 calc(66.66% - 14px)' } }
                ];
            } else if (structure === '3-col') {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(33.33% - 14px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(33.33% - 14px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(33.33% - 14px)' } }
                ];
            } else if (structure === '4-col') {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(25% - 15px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(25% - 15px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(25% - 15px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(25% - 15px)' } }
                ];
            } else {
                columns = [
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(50% - 10px)' } },
                    { type: 'umahz-column', style: { 'flex': '1 1 calc(50% - 10px)' } }
                ];
            }

            return {
                type: 'umahz-section',
                components: [
                    {
                        type: 'umahz-row',
                        components: columns
                    }
                ]
            };
        }

        // Register Elementor-style Section, Row, Column and Structure Picker component types
        const domc = editor.DomComponents;

        domc.addType('umahz-section', {
            model: {
                defaults: {
                    tagName: 'section',
                    name: 'Section',
                    droppable: true,
                    classes: ['umahz-section'],
                    traits: [
                        {
                            type: 'button-bg-assets',
                            name: 'btn_bg_assets',
                            label: '',
                        },
                        { type: 'text', name: 'id', label: 'Section ID', placeholder: 'e.g. services or about' },
                        { type: 'text', name: 'title', label: 'Section Title' },
                    ],
                }
            }
        });

        domc.addType('umahz-row', {
            model: {
                defaults: {
                    tagName: 'div',
                    name: 'Columns Row',
                    droppable: '.umahz-column',
                    draggable: '.umahz-section',
                    classes: ['umahz-row'],
                    traits: [
                        { type: 'text', name: 'id', label: 'Row ID' },
                    ],
                }
            }
        });

        domc.addType('umahz-column', {
            model: {
                defaults: {
                    tagName: 'div',
                    name: 'Column',
                    droppable: true,
                    draggable: '.umahz-row',
                    classes: ['umahz-column'],
                    resizable: {
                        tl: 0, tc: 0, tr: 0,
                        cl: 0, cr: 1,
                        bl: 0, bc: 0, br: 0,
                        keyWidth: 'flex-basis',
                        currentUnit: 1,
                        minDim: 50,
                        step: 1,
                    },
                    traits: [
                        {
                            type: 'select',
                            name: 'align-items',
                            label: 'Align Content',
                            options: [
                                { value: 'stretch', name: 'Stretch (Default)' },
                                { value: 'flex-start', name: 'Top / Start' },
                                { value: 'center', name: 'Center' },
                                { value: 'flex-end', name: 'Bottom / End' },
                            ]
                        },
                        {
                            type: 'button-bg-assets',
                            name: 'btn_bg_assets',
                            label: '',
                        },
                        { type: 'text', name: 'id', label: 'Column ID', placeholder: 'e.g. col-1' },
                        { type: 'text', name: 'title', label: 'Column Title' },
                    ],
                }
            }
        });

        domc.addType('umahz-structure-picker', {
            model: {
                defaults: {
                    tagName: 'div',
                    name: 'Structure Picker',
                    droppable: false,
                    badgable: false,
                    copyable: false,
                    highlightable: false,
                    classes: ['umahz-structure-picker-wrapper'],
                    traits: [],
                }
            },
            view: {
                events: {
                    'click [data-structure]': 'selectStructure',
                },
                selectStructure(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    const structure = btn.getAttribute('data-structure');
                    const model = this.model;
                    const parent = model.parent();
                    const targetConfig = getSectionConfig(structure);

                    if (parent) {
                        const index = model.index();
                        parent.append(targetConfig, { at: index });
                        model.remove();
                        try {
                            const newSection = parent.components().at(index);
                            if (newSection) editor.select(newSection);
                        } catch {}
                        setIsDirty(true);
                    }
                },
                render() {
                    this.el.innerHTML = `
                        <div class="umahz-picker-card" style="padding: 28px 24px; max-width: 820px; margin: 30px auto; background: #ffffff; border: 2px dashed #8b5cf6; border-radius: 16px; box-shadow: 0 12px 30px rgba(139, 92, 246, 0.12); text-align: center; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                            <div style="width: 44px; height: 44px; background: rgba(139, 92, 246, 0.12); color: #7c3aed; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 12px auto;">
                                ⊞
                            </div>
                            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">Select your Structure</h3>
                            <p style="font-size: 0.82rem; color: #64748b; margin: 0 0 20px 0;">Select a column layout to divide this section. You can drop any content into each column.</p>
                            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                <button type="button" data-structure="1-col" class="umahz-struct-btn" style="flex: 1 1 95px; max-width: 110px; height: 62px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px; transition: all 0.15s ease;">
                                    <div style="width: 100%; height: 26px; background: #e2e8f0; border-radius: 4px;"></div>
                                    <span style="font-size: 10px; font-weight: 600; color: #475569;">1 Col</span>
                                </button>
                                <button type="button" data-structure="2-col-equal" class="umahz-struct-btn" style="flex: 1 1 95px; max-width: 110px; height: 62px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px; transition: all 0.15s ease;">
                                    <div style="width: 100%; height: 26px; display: flex; gap: 4px;">
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 4px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 4px;"></div>
                                    </div>
                                    <span style="font-size: 10px; font-weight: 600; color: #475569;">50 / 50</span>
                                </button>
                                <button type="button" data-structure="2-col-66-33" class="umahz-struct-btn" style="flex: 1 1 95px; max-width: 110px; height: 62px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px; transition: all 0.15s ease;">
                                    <div style="width: 100%; height: 26px; display: flex; gap: 4px;">
                                        <div style="flex: 2; background: #e2e8f0; border-radius: 4px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 4px;"></div>
                                    </div>
                                    <span style="font-size: 10px; font-weight: 600; color: #475569;">66 / 33</span>
                                </button>
                                <button type="button" data-structure="2-col-33-66" class="umahz-struct-btn" style="flex: 1 1 95px; max-width: 110px; height: 62px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px; transition: all 0.15s ease;">
                                    <div style="width: 100%; height: 26px; display: flex; gap: 4px;">
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 4px;"></div>
                                        <div style="flex: 2; background: #e2e8f0; border-radius: 4px;"></div>
                                    </div>
                                    <span style="font-size: 10px; font-weight: 600; color: #475569;">33 / 66</span>
                                </button>
                                <button type="button" data-structure="3-col" class="umahz-struct-btn" style="flex: 1 1 95px; max-width: 110px; height: 62px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px; transition: all 0.15s ease;">
                                    <div style="width: 100%; height: 26px; display: flex; gap: 3px;">
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 3px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 3px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 3px;"></div>
                                    </div>
                                    <span style="font-size: 10px; font-weight: 600; color: #475569;">33 / 33 / 33</span>
                                </button>
                                <button type="button" data-structure="4-col" class="umahz-struct-btn" style="flex: 1 1 95px; max-width: 110px; height: 62px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 6px; transition: all 0.15s ease;">
                                    <div style="width: 100%; height: 26px; display: flex; gap: 3px;">
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 2px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 2px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 2px;"></div>
                                        <div style="flex: 1; background: #e2e8f0; border-radius: 2px;"></div>
                                    </div>
                                    <span style="font-size: 10px; font-weight: 600; color: #475569;">4 Cols</span>
                                </button>
                            </div>
                        </div>
                    `;
                    return this;
                }
            }
        });

        // Customize link component traits
        domc.addType('link', {
            model: {
                defaults: {
                    traits: [
                        { type: 'text', label: 'Link URL (href / #anchor)', name: 'href', placeholder: 'e.g. #services or /pay' },
                        { type: 'select', label: 'Open in', name: 'target', options: [
                            { value: '_self', name: 'Same Tab' },
                            { value: '_blank', name: 'New Tab' },
                        ]},
                        { type: 'text', label: 'Link Title', name: 'title' },
                        { type: 'text', label: 'Element ID', name: 'id' },
                    ],
                },
            },
        });

        // Customize image component traits
        domc.addType('image', {
            model: {
                defaults: {
                    traits: [
                        {
                            type: 'button-open-assets',
                            name: 'btn_open_assets',
                            label: '',
                        },
                        {
                            type: 'text',
                            name: 'src',
                            label: 'Image URL (src)',
                            placeholder: 'https://...',
                        },
                        {
                            type: 'text',
                            name: 'alt',
                            label: 'Alt Text',
                            placeholder: 'Clinic image description',
                        },
                        {
                            type: 'text',
                            name: 'title',
                            label: 'Title Tooltip',
                        },
                    ],
                },
            },
        });

        // Custom component types for new widgets
        domc.addType('umahz-heading', {
            model: {
                defaults: {
                    tagName: 'h2',
                    name: 'Heading',
                    traits: [
                        { type: 'umahz-heading-tag', name: 'heading_tag', label: '' },
                        { type: 'umahz-text-content', name: 'heading_text', label: 'Heading Text' },
                        { type: 'text', name: 'id', label: 'Element ID' },
                        { type: 'text', name: 'title', label: 'Title Tooltip' },
                    ],
                },
            },
        });

        domc.addType('umahz-text', {
            model: {
                defaults: {
                    tagName: 'p',
                    name: 'Text',
                    traits: [
                        { type: 'umahz-text-content', name: 'para_text', label: 'Paragraph Text' },
                        { type: 'text', name: 'id', label: 'Element ID' },
                        { type: 'text', name: 'title', label: 'Title Tooltip' },
                    ],
                },
            },
        });

        domc.addType('umahz-button', {
            model: {
                defaults: {
                    tagName: 'a',
                    name: 'Button',
                    traits: [
                        { type: 'umahz-button-label', name: 'btn_label', label: '' },
                        { type: 'text', name: 'href', label: 'Link URL', placeholder: '#services or /pay' },
                        { type: 'select', name: 'target', label: 'Open in', options: [
                            { value: '_self', name: 'Same Tab' },
                            { value: '_blank', name: 'New Tab' },
                        ]},
                        { type: 'umahz-button-style', name: 'btn_style', label: '' },
                        { type: 'text', name: 'id', label: 'Element ID' },
                    ],
                },
            },
        });

        // Restore saved project data or set initial template HTML
        if (tenant.gjs_project && Object.keys(tenant.gjs_project).length > 0) {
            try {
                editor.loadProjectData(tenant.gjs_project);
            } catch {
                editor.setComponents(tenant.gjs_html || defaultHtml);
                if (tenant.gjs_css) editor.setStyle(tenant.gjs_css);
            }
        } else {
            editor.setComponents(tenant.gjs_html || defaultHtml);
            if (tenant.gjs_css) editor.setStyle(tenant.gjs_css);
        }

        // Add Custom Clinic Blocks
        const bm = editor.BlockManager;

        // ==========================================
        // SECTIONS & COLUMNS (ELEMENTOR-STYLE LAYOUT)
        // ==========================================
        bm.add('section-picker', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">⊞</div><b>Select Structure</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Interactive Layouts</div>',
            category: { id: 'sections-columns', label: 'Sections & Columns', open: true },
            content: { type: 'umahz-structure-picker' },
        });

        bm.add('section-1-col', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">⏹️</div><b>1 Column</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">100% Full Width</div>',
            category: 'Sections & Columns',
            content: getSectionConfig('1-col'),
        });

        bm.add('section-2-col-equal', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">◫</div><b>2 Cols (50 / 50)</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Equal Halves</div>',
            category: 'Sections & Columns',
            content: getSectionConfig('2-col-equal'),
        });

        bm.add('section-2-col-66-33', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">◧</div><b>2 Cols (66 / 33)</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">2/3 + 1/3 Split</div>',
            category: 'Sections & Columns',
            content: getSectionConfig('2-col-66-33'),
        });

        bm.add('section-2-col-33-66', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">◨</div><b>2 Cols (33 / 66)</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">1/3 + 2/3 Split</div>',
            category: 'Sections & Columns',
            content: getSectionConfig('2-col-33-66'),
        });

        bm.add('section-3-col', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">☷</div><b>3 Columns</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">33 / 33 / 33</div>',
            category: 'Sections & Columns',
            content: getSectionConfig('3-col'),
        });

        bm.add('section-4-col', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">▦</div><b>4 Columns</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">25% Each</div>',
            category: 'Sections & Columns',
            content: getSectionConfig('4-col'),
        });

        // ==========================================
        // BASIC / CONTENT (ELEMENTOR-STYLE WIDGETS)
        // ==========================================
        const basicContentCat = { id: 'basic-content', label: 'Basic / Content', open: true };

        // 1. HEADING Block
        bm.add('basic-heading', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🔤</div><b>Heading</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">H1 – H6 Title</div>',
            category: basicContentCat,
            content: `
                <h2 class="umahz-heading" style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; line-height: 1.25;">
                    Empowering Your Health &amp; Wellness
                </h2>
            `,
        });

        // 2. PARAGRAPH / TEXT Block
        bm.add('basic-paragraph', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">📝</div><b>Paragraph / Text</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Rich Body Text</div>',
            category: basicContentCat,
            content: `
                <p class="umahz-text" style="font-size: 1rem; color: #475569; line-height: 1.65; margin: 0 0 16px 0;">
                    We offer compassionate, evidence-based clinical care tailored to your recovery goals. Schedule a consultation to explore comprehensive treatments designed for you.
                </p>
            `,
        });

        // 3. BUTTON Block
        bm.add('basic-button', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🔘</div><b>Button</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Link &amp; Action</div>',
            category: basicContentCat,
            content: `
                <div style="padding: 8px 0; display: inline-block;">
                    <a href="#services" class="umahz-btn" style="display: inline-block; background: ${brandColor}; color: #ffffff; padding: 12px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none; font-size: 0.95rem; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3); transition: all 0.2s ease;">
                        Book Appointment
                    </a>
                </div>
            `,
        });

        // 4. ICON Block
        bm.add('basic-icon', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">✨</div><b>Icon</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Lucide SVG Icon</div>',
            category: basicContentCat,
            content: `
                <div class="umahz-icon-wrapper" data-icon-name="heart" data-icon-size="40" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: rgba(124, 58, 237, 0.1); color: ${brandColor}; margin: 8px 0;">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                </div>
            `,
        });

        // 5. ICON BOX / FEATURE Block
        bm.add('basic-icon-box', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">📦</div><b>Icon Box</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Icon + Title + Text</div>',
            category: basicContentCat,
            content: `
                <div class="umahz-icon-box" style="padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); text-align: left; margin: 12px 0;">
                    <div class="umahz-icon-box-icon" style="width: 52px; height: 52px; border-radius: 12px; background: rgba(124, 58, 237, 0.1); color: ${brandColor}; display: flex; align-items: center; justify-content: center; margin-bottom: 18px;">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
                        </svg>
                    </div>
                    <h3 class="umahz-icon-box-title" style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 10px;">Personalized Patient Care</h3>
                    <p class="umahz-icon-box-desc" style="color: #64748b; font-size: 0.92rem; line-height: 1.6; margin-bottom: 16px;">Comprehensive consultations, diagnostic evaluations, and specialized wellness treatments designed for your recovery.</p>
                    <a href="#services" class="umahz-icon-box-link" style="color: ${brandColor}; font-size: 0.88rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">Learn More &rarr;</a>
                </div>
            `,
        });

        // 6. IMAGE Block
        bm.add('basic-image-widget', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🖼️</div><b>Image</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Clinic Photo</div>',
            category: basicContentCat,
            content: {
                type: 'image',
                attributes: {
                    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
                    alt: 'Clinic Consultation Room',
                },
                style: {
                    width: '100%',
                    'max-width': '600px',
                    height: 'auto',
                    'border-radius': '12px',
                    display: 'block',
                    margin: '16px auto',
                    'box-shadow': '0 8px 24px rgba(0,0,0,0.08)',
                },
            },
        });

        // 7. DIVIDER Block
        bm.add('basic-divider', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">➖</div><b>Divider</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Horizontal Rule</div>',
            category: basicContentCat,
            content: `
                <div class="umahz-divider-wrap" style="padding: 20px 0; width: 100%;">
                    <hr class="umahz-divider" style="border: none; border-top: 1px solid #e2e8f0; width: 100%; margin: 0 auto;" />
                </div>
            `,
        });

        // 8. SPACER Block
        bm.add('basic-spacer', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">↕️</div><b>Spacer</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Adjustable Gap</div>',
            category: basicContentCat,
            content: `
                <div class="umahz-spacer" style="height: 40px; width: 100%; min-height: 10px;"></div>
            `,
        });

        // 9. LIST Block
        bm.add('basic-list', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">📋</div><b>List</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">Bullets &amp; Numbers</div>',
            category: basicContentCat,
            content: `
                <ul class="umahz-list" style="list-style-type: disc; padding-left: 24px; color: #475569; font-size: 0.95rem; line-height: 1.8; margin: 12px 0;">
                    <li>Licensed and accredited healthcare specialists</li>
                    <li>State-of-the-art clinical technology and rehabilitation equipment</li>
                    <li>Direct billing with all major insurance providers</li>
                </ul>
            `,
        });

        // 10. VIDEO EMBED Block
        bm.add('basic-video-widget', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🎬</div><b>Video / Embed</b><div style="font-size: 10px; color: var(--gjs-panel-text-muted);">YouTube / Vimeo</div>',
            category: basicContentCat,
            content: `
                <div class="umahz-video-wrap" style="padding: 16px 0; width: 100%; max-width: 800px; margin: 0 auto;">
                    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
                        <iframe style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border:0;" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Clinic Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            `,
        });

        // ==========================================
        // 0. NAVIGATION & MENUS
        // ==========================================

        // 1. Classic Main Navigation Bar
        bm.add('main-navbar-classic', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🧭</div><b>Main Header Menu</b>',
            category: 'Navigation & Menus',
            content: `
                <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                    <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                        
                        <!-- Logo & Brand -->
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${clinicName}" style="height: 38px; border-radius: 6px;" />` : `<div style="width: 38px; height: 38px; background: ${brandColor}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">✦</div>`}
                            <span style="font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">${clinicName}</span>
                        </div>

                        <!-- Main Navigation Links -->
                        <nav style="display: flex; align-items: center; gap: 28px; flex-wrap: wrap;">
                            <a href="#home" style="color: #0f172a; font-weight: 600; text-decoration: none; font-size: 0.95rem;">Home</a>
                            <a href="#services" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">Services</a>
                            <a href="#about" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">About Us</a>
                            <a href="#hours" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">Hours</a>
                            <a href="#contact" style="color: #475569; font-weight: 500; text-decoration: none; font-size: 0.95rem;">Contact</a>
                        </nav>

                        <!-- Action / CTA Buttons -->
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <a href="/login" style="color: #475569; font-weight: 600; text-decoration: none; font-size: 0.9rem; padding: 8px 16px;">Staff Portal</a>
                            <a href="/pay" style="background: ${brandColor}; color: #ffffff; padding: 10px 22px; border-radius: 9999px; font-weight: 700; text-decoration: none; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">Pay Invoice</a>
                        </div>

                    </div>
                </header>
            `,
        });

        // 2. Modern Dark Glassmorphism Menu
        bm.add('main-navbar-dark', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🌙</div><b>Dark Modern Navbar</b>',
            category: 'Navigation & Menus',
            content: `
                <header style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
                    <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                        
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; background: ${brandColor}; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800;">✦</div>
                            <span style="font-size: 1.2rem; font-weight: 800; color: #ffffff;">${clinicName}</span>
                        </div>

                        <nav style="display: flex; align-items: center; gap: 24px;">
                            <a href="#home" style="color: #ffffff; font-weight: 600; text-decoration: none; font-size: 0.92rem;">Home</a>
                            <a href="#services" style="color: #94a3b8; font-weight: 500; text-decoration: none; font-size: 0.92rem;">Services</a>
                            <a href="#about" style="color: #94a3b8; font-weight: 500; text-decoration: none; font-size: 0.92rem;">About</a>
                            <a href="#contact" style="color: #94a3b8; font-weight: 500; text-decoration: none; font-size: 0.92rem;">Location</a>
                        </nav>

                        <div style="display: flex; align-items: center; gap: 12px;">
                            <a href="/login" style="color: #cbd5e1; font-weight: 500; text-decoration: none; font-size: 0.88rem;">Login</a>
                            <a href="/pay" style="background: ${brandColor}; color: #ffffff; padding: 8px 18px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 0.88rem;">💳 Pay Online</a>
                        </div>

                    </div>
                </header>
            `,
        });

        // 3. Top Announcement Bar + Main Nav
        bm.add('header-topbar-nav', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🔝</div><b>Top Bar &amp; Nav</b>',
            category: 'Navigation & Menus',
            content: `
                <div>
                    <!-- Mini Announcement / Contact Topbar -->
                    <div style="background: ${brandColor}; color: white; padding: 8px 20px; font-size: 0.82rem; font-weight: 500;">
                        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="display: flex; gap: 18px;">
                                <span>📍 ${address}</span>
                                <span>📞 ${phone}</span>
                            </div>
                            <div>
                                <span>Mon - Fri: 9:00 AM - 6:00 PM</span>
                            </div>
                        </div>
                    </div>

                    <!-- Main Navigation -->
                    <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 14px 24px;">
                        <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">${clinicName}</span>
                            </div>
                            <nav style="display: flex; gap: 24px;">
                                <a href="#home" style="color: #0f172a; font-weight: 600; text-decoration: none;">Home</a>
                                <a href="#services" style="color: #64748b; font-weight: 500; text-decoration: none;">Services</a>
                                <a href="#about" style="color: #64748b; font-weight: 500; text-decoration: none;">About</a>
                                <a href="#contact" style="color: #64748b; font-weight: 500; text-decoration: none;">Contact</a>
                            </nav>
                            <a href="/pay" style="background: #0f172a; color: white; padding: 9px 20px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 0.88rem;">Pay Invoice</a>
                        </div>
                    </header>
                </div>
            `,
        });

        // 4. Complete Footer Menu
        bm.add('footer-navigation-menu', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">📑</div><b>Footer Navigation</b>',
            category: 'Navigation & Menus',
            content: `
                <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px; border-top: 1px solid #1e293b;">
                    <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 40px; margin-bottom: 40px;">
                        
                        <div>
                            <h3 style="color: white; font-size: 1.2rem; font-weight: 700; margin-bottom: 12px;">${clinicName}</h3>
                            <p style="font-size: 0.9rem; line-height: 1.6; color: #64748b;">Providing holistic clinical excellence and dedicated care for optimal health and vitality.</p>
                        </div>

                        <div>
                            <h4 style="color: white; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Quick Links</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                                <li><a href="#home" style="color: #94a3b8; text-decoration: none;">Home</a></li>
                                <li><a href="#services" style="color: #94a3b8; text-decoration: none;">Our Treatments</a></li>
                                <li><a href="#about" style="color: #94a3b8; text-decoration: none;">About the Clinic</a></li>
                                <li><a href="#hours" style="color: #94a3b8; text-decoration: none;">Hours &amp; Location</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 style="color: white; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Patient Services</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                                <li><a href="/pay" style="color: #94a3b8; text-decoration: none;">💳 Pay Invoice Online</a></li>
                                <li><a href="/login" style="color: #94a3b8; text-decoration: none;">🔒 Staff Portal Login</a></li>
                                <li><a href="#contact" style="color: #94a3b8; text-decoration: none;">📞 Contact Clinic</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 style="color: white; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Contact Info</h4>
                            <p style="font-size: 0.9rem; line-height: 1.6; margin-bottom: 6px;">📍 ${address}</p>
                            <p style="font-size: 0.9rem; margin-bottom: 6px;">📞 ${phone}</p>
                            <p style="font-size: 0.9rem;">✉️ ${email}</p>
                        </div>

                    </div>

                    <div style="max-width: 1100px; margin: 0 auto; padding-top: 24px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.82rem;">
                        <span>&copy; ${new Date().getFullYear()} ${clinicName}. All rights reserved.</span>
                        <div style="display: flex; gap: 16px;">
                            <a href="#" style="color: #64748b; text-decoration: none;">Privacy Policy</a>
                            <a href="#" style="color: #64748b; text-decoration: none;">Terms of Service</a>
                        </div>
                    </div>
                </footer>
            `,
        });

        // ==========================================
        // 1. CLINIC SECTIONS (With Anchor IDs)
        // ==========================================

        // Hero Section (#home)
        bm.add('clinic-hero', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🏥</div><b>Hero Section (#home)</b>',
            category: 'Clinic Sections',
            content: `
                <section id="home" class="clinic-hero" style="background: linear-gradient(135deg, ${brandColor} 0%, #1e1b4b 100%); color: white; padding: 80px 20px; text-align: center;">
                    <div style="max-width: 900px; margin: 0 auto;">
                        <h1 style="font-size: 2.8rem; font-weight: 800; margin-bottom: 16px; line-height: 1.2;">Welcome to ${clinicName}</h1>
                        <p style="font-size: 1.25rem; opacity: 0.9; max-width: 650px; margin: 0 auto 32px; line-height: 1.6;">
                            Providing high-quality personalized wellness and clinical care for your health and vitality.
                        </p>
                        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                            <a href="/pay" style="background: white; color: ${brandColor}; padding: 14px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none; display: inline-block;">Pay Invoice Online</a>
                            <a href="/login" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 14px 28px; border-radius: 9999px; font-weight: 600; text-decoration: none; display: inline-block;">Staff Portal</a>
                        </div>
                    </div>
                </section>
            `,
        });

        // Services & Treatments (#services)
        bm.add('clinic-services', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🩺</div><b>Services (#services)</b>',
            category: 'Clinic Sections',
            content: `
                <section id="services" class="clinic-services" style="padding: 70px 20px; background: #f8fafc; color: #0f172a;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <div style="text-align: center; margin-bottom: 50px;">
                            <h2 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Our Services &amp; Treatments</h2>
                            <p style="color: #64748b; font-size: 1.05rem;">Comprehensive holistic care tailored to your body's wellness.</p>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
                            ${disciplines.map(d => `
                                <div style="background: white; border-radius: 12px; padding: 28px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: left;">
                                    <div style="width: 44px; height: 44px; background: ${brandColor}15; color: ${brandColor}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; margin-bottom: 16px;">✦</div>
                                    <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #1e293b;">${d}</h3>
                                    <p style="color: #64748b; font-size: 0.92rem; line-height: 1.5;">Personalized treatment sessions designed to help you recover, strengthen, and thrive.</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
            `,
        });

        // About Us (#about)
        bm.add('clinic-about', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">👥</div><b>About Us (#about)</b>',
            category: 'Clinic Sections',
            content: `
                <section id="about" class="clinic-about" style="padding: 80px 20px; background: #ffffff; color: #0f172a;">
                    <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 48px; align-items: center;">
                        <div>
                            <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">About Our Clinic</span>
                            <h2 style="font-size: 2.2rem; font-weight: 800; margin: 8px 0 16px; color: #0f172a;">Dedicated to Your Recovery &amp; Long-Term Well-Being</h2>
                            <p style="color: #475569; font-size: 1rem; line-height: 1.7; margin-bottom: 20px;">
                                At ${clinicName}, our licensed practitioners blend evidence-based therapies with compassionate, patient-first care.
                            </p>
                            <a href="/pay" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none;">Pay Online</a>
                        </div>
                        <div>
                            <img src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80" alt="Clinic Interior" style="width: 100%; border-radius: 16px; box-shadow: 0 12px 30px rgba(0,0,0,0.1); object-fit: cover;" />
                        </div>
                    </div>
                </section>
            `,
        });

        // Hours & Schedule (#hours)
        bm.add('clinic-hours', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">⏰</div><b>Hours (#hours)</b>',
            category: 'Clinic Sections',
            content: `
                <section id="hours" class="clinic-hours" style="padding: 70px 20px; background: #f8fafc; color: #0f172a;">
                    <div style="max-width: 900px; margin: 0 auto; text-align: center;">
                        <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Clinic Schedule</span>
                        <h2 style="font-size: 2rem; font-weight: 700; margin: 8px 0 32px; color: #0f172a;">Operating Hours &amp; Availability</h2>
                        <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04); max-width: 600px; margin: 0 auto; text-align: left;">
                            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                                <span style="font-weight: 600; color: #1e293b;">Monday – Friday</span>
                                <span style="color: #64748b;">9:00 AM – 6:00 PM</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                                <span style="font-weight: 600; color: #1e293b;">Saturday</span>
                                <span style="color: #64748b;">10:00 AM – 3:00 PM</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                                <span style="font-weight: 600; color: #1e293b;">Sunday &amp; Holidays</span>
                                <span style="color: #ef4444; font-weight: 600;">Closed</span>
                            </div>
                        </div>
                    </div>
                </section>
            `,
        });

        // Contact & Location (#contact)
        bm.add('clinic-contact', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">📍</div><b>Contact (#contact)</b>',
            category: 'Clinic Sections',
            content: `
                <section id="contact" class="clinic-contact" style="padding: 70px 20px; background: #ffffff; color: #0f172a;">
                    <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; align-items: center;">
                        <div>
                            <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Get in Touch</span>
                            <h2 style="font-size: 2.2rem; font-weight: 700; margin: 8px 0 16px;">Visit Our Clinic</h2>
                            <p style="color: #64748b; font-size: 1rem; line-height: 1.6; margin-bottom: 28px;">
                                We are located in a convenient location with full parking access.
                            </p>
                            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.98rem; color: #334155;">
                                <div><strong>📍 Address:</strong> ${address}</div>
                                <div><strong>📞 Phone:</strong> ${phone}</div>
                                <div><strong>✉️ Email:</strong> ${email}</div>
                            </div>
                        </div>
                        <div style="background: #f1f5f9; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0;">
                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; color: #0f172a;">Quick Access</h3>
                            <p style="color: #64748b; font-size: 0.92rem; margin-bottom: 20px;">Pay your existing invoices securely online via direct clinic billing.</p>
                            <a href="/pay" style="display: block; text-align: center; background: ${brandColor}; color: white; padding: 14px; border-radius: 8px; font-weight: 700; text-decoration: none;">Pay Invoice Online</a>
                        </div>
                    </div>
                </section>
            `,
        });

        // Testimonials Section (#testimonials)
        bm.add('clinic-testimonials', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">⭐</div><b>Patient Reviews</b>',
            category: 'Clinic Sections',
            content: `
                <section id="testimonials" style="padding: 70px 20px; background: #f8fafc; color: #0f172a;">
                    <div style="max-width: 1100px; margin: 0 auto; text-align: center;">
                        <span style="color: ${brandColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Patient Stories</span>
                        <h2 style="font-size: 2rem; font-weight: 700; margin: 8px 0 40px; color: #0f172a;">What Our Patients Say</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; text-align: left;">
                            <div style="background: white; padding: 28px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                                <div style="color: #f59e0b; font-size: 18px; margin-bottom: 12px;">★★★★★</div>
                                <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px;">"The therapy team here has helped me regain mobility in just a few weeks. Incredibly caring and professional!"</p>
                                <strong style="color: #0f172a; font-size: 0.9rem;">— Sarah M., Patient</strong>
                            </div>
                            <div style="background: white; padding: 28px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                                <div style="color: #f59e0b; font-size: 18px; margin-bottom: 12px;">★★★★★</div>
                                <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px;">"Clean facility, friendly front desk, and effortless online invoice payments. 10/10 recommendation!"</p>
                                <strong style="color: #0f172a; font-size: 0.9rem;">— James L., Patient</strong>
                            </div>
                            <div style="background: white; padding: 28px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                                <div style="color: #f59e0b; font-size: 18px; margin-bottom: 12px;">★★★★★</div>
                                <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px;">"Personalized treatment that actually works. The practitioners listen attentively and explain everything."</p>
                                <strong style="color: #0f172a; font-size: 0.9rem;">— Elena R., Patient</strong>
                            </div>
                        </div>
                    </div>
                </section>
            `,
        });

        // ==========================================
        // 2. BUTTONS & ACTIONS
        // ==========================================

        // Primary Pay Button
        bm.add('btn-primary-pay', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🔘</div><b>Pay Online Button</b>',
            category: 'Buttons & Actions',
            content: `
                <div style="padding: 12px 0; display: inline-block;">
                    <a href="/pay" style="display: inline-block; background: ${brandColor}; color: #ffffff; padding: 12px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none; font-size: 0.95rem; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); transition: opacity 0.2s ease;">
                        💳 Pay Invoice Online
                    </a>
                </div>
            `,
        });

        // Secondary / Outline Button
        bm.add('btn-secondary-link', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🔲</div><b>Outline Button</b>',
            category: 'Buttons & Actions',
            content: `
                <div style="padding: 12px 0; display: inline-block;">
                    <a href="#services" style="display: inline-block; background: transparent; color: #0f172a; border: 2px solid #cbd5e1; padding: 11px 26px; border-radius: 9999px; font-weight: 600; text-decoration: none; font-size: 0.95rem;">
                        View Services &rarr;
                    </a>
                </div>
            `,
        });

        // Dual Button Group
        bm.add('btn-group-dual', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">👥</div><b>Action Button Group</b>',
            category: 'Buttons & Actions',
            content: `
                <div style="display: flex; gap: 16px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 16px 0;">
                    <a href="/pay" style="background: ${brandColor}; color: white; padding: 13px 28px; border-radius: 9999px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">Pay Invoice</a>
                    <a href="/login" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 13px 26px; border-radius: 9999px; font-weight: 600; text-decoration: none;">Staff Portal</a>
                </div>
            `,
        });

        // ==========================================
        // 3. MEDIA & IMAGES
        // ==========================================

        // Image Block
        bm.add('basic-image', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🖼️</div><b>Image</b>',
            category: 'Media & Images',
            content: {
                type: 'image',
                attributes: {
                    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
                    alt: 'Clinic Photo',
                },
                style: {
                    width: '100%',
                    'max-width': '600px',
                    height: 'auto',
                    'border-radius': '12px',
                    display: 'block',
                    margin: '16px auto',
                    'box-shadow': '0 8px 24px rgba(0,0,0,0.08)',
                },
            },
        });

        // Hero with Image Background Block
        bm.add('hero-image-bg', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🌄</div><b>Image Hero Banner</b>',
            category: 'Media & Images',
            content: `
                <section id="home" style="position: relative; background: linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=80') center/cover no-repeat; color: white; padding: 100px 20px; text-align: center;">
                    <div style="max-width: 850px; margin: 0 auto;">
                        <span style="display: inline-block; background: ${brandColor}; color: white; font-size: 0.8rem; font-weight: 700; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;">Compassionate Care</span>
                        <h1 style="font-size: 3rem; font-weight: 800; margin-bottom: 18px; line-height: 1.2;">Your Health &amp; Wellness in Expert Hands</h1>
                        <p style="font-size: 1.2rem; opacity: 0.9; max-width: 620px; margin: 0 auto 36px; line-height: 1.6;">Book appointments, pay securely online, and access world-class clinical care tailored to your recovery.</p>
                        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                            <a href="/pay" style="background: ${brandColor}; color: white; padding: 14px 32px; border-radius: 9999px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);">Pay Online</a>
                            <a href="/login" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 14px 28px; border-radius: 9999px; font-weight: 600; text-decoration: none; display: inline-block;">Staff Portal</a>
                        </div>
                    </div>
                </section>
            `,
        });

        // Photo Gallery Block
        bm.add('clinic-gallery', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">📸</div><b>Photo Gallery</b>',
            category: 'Media & Images',
            content: `
                <section id="gallery" style="padding: 70px 20px; background: #ffffff;">
                    <div style="max-width: 1100px; margin: 0 auto; text-align: center;">
                        <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Our Facility &amp; Care Environment</h2>
                        <p style="color: #64748b; font-size: 1rem; margin-bottom: 36px;">Clean, modern facilities built for patient comfort and optimal recovery.</p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
                            <div style="overflow: hidden; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                                <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80" alt="Treatment Room" style="width:100%; height:240px; object-fit:cover; display:block;" />
                            </div>
                            <div style="overflow: hidden; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                                <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80" alt="Consultation" style="width:100%; height:240px; object-fit:cover; display:block;" />
                            </div>
                            <div style="overflow: hidden; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                                <img src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&q=80" alt="Wellness Area" style="width:100%; height:240px; object-fit:cover; display:block;" />
                            </div>
                        </div>
                    </div>
                </section>
            `,
        });

        // Video / YouTube Embed Block
        bm.add('video-embed', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🎬</div><b>Video Embed</b>',
            category: 'Media & Images',
            content: `
                <div style="padding: 40px 20px; max-width: 800px; margin: 0 auto;">
                    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                        <iframe style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border:0;" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Clinic Video Overview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            `,
        });

        // Google Maps Embed Block
        bm.add('map-embed', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🗺️</div><b>Location Map</b>',
            category: 'Media & Images',
            content: `
                <div style="padding: 30px 20px; max-width: 1000px; margin: 0 auto;">
                    <div style="border-radius: 14px; overflow: hidden; height: 350px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                        <iframe src="https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                    </div>
                </div>
            `,
        });

        // ==========================================
        // 4. LAYOUT & COLUMNS
        // ==========================================

        // 1 Column Box
        bm.add('layout-1-col', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">⏹️</div><b>1 Column Section</b>',
            category: 'Layout & Grid',
            content: `
                <section style="padding: 50px 20px; background: #ffffff;">
                    <div style="max-width: 900px; margin: 0 auto; padding: 24px; border: 1px dashed #cbd5e1; border-radius: 12px; min-height: 120px;">
                        <h3 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Single Column Container</h3>
                        <p style="color: #64748b; font-size: 0.95rem;">Drag elements inside this container or use the Style tab to adjust padding, background color, and borders.</p>
                    </div>
                </section>
            `,
        });

        // 2 Columns (50 / 50)
        bm.add('layout-2-col', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">◫</div><b>2 Columns (50 / 50)</b>',
            category: 'Layout & Grid',
            content: `
                <section style="padding: 50px 20px; background: #ffffff;">
                    <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                        <div style="padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; min-height: 120px;">
                            <h4 style="font-weight: 700; margin-bottom: 8px; color: #1e293b;">Left Column</h4>
                            <p style="color: #64748b; font-size: 0.95rem;">Insert text, buttons, or images into this side.</p>
                        </div>
                        <div style="padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; min-height: 120px;">
                            <h4 style="font-weight: 700; margin-bottom: 8px; color: #1e293b;">Right Column</h4>
                            <p style="color: #64748b; font-size: 0.95rem;">Insert text, buttons, or images into this side.</p>
                        </div>
                    </div>
                </section>
            `,
        });

        // 3 Columns (33 / 33 / 33)
        bm.add('layout-3-col', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">☷</div><b>3 Columns Grid</b>',
            category: 'Layout & Grid',
            content: `
                <section style="padding: 50px 20px; background: #f8fafc;">
                    <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
                        <div style="padding: 24px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            <h4 style="font-weight: 700; margin-bottom: 8px; color: ${brandColor};">Card 1</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">Highlight a key service, feature, or announcement here.</p>
                        </div>
                        <div style="padding: 24px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            <h4 style="font-weight: 700; margin-bottom: 8px; color: ${brandColor};">Card 2</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">Highlight a key service, feature, or announcement here.</p>
                        </div>
                        <div style="padding: 24px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            <h4 style="font-weight: 700; margin-bottom: 8px; color: ${brandColor};">Card 3</h4>
                            <p style="color: #64748b; font-size: 0.9rem;">Highlight a key service, feature, or announcement here.</p>
                        </div>
                    </div>
                </section>
            `,
        });

        // Feature Card Block
        bm.add('feature-card', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">🃏</div><b>Feature Card</b>',
            category: 'Layout & Grid',
            content: `
                <div style="max-width: 380px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
                    <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80" alt="Card Header" style="width: 100%; height: 190px; object-fit: cover;" />
                    <div style="padding: 24px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${brandColor}; text-transform: uppercase; letter-spacing: 0.05em;">Specialty Care</span>
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 8px 0 10px; color: #0f172a;">Personalized Treatment</h3>
                        <p style="color: #64748b; font-size: 0.92rem; line-height: 1.6; margin-bottom: 20px;">Custom-designed rehabilitation and holistic therapies tailored directly to your health journey.</p>
                        <a href="/pay" style="display: inline-block; background: ${brandColor}; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 0.9rem;">Learn More &rarr;</a>
                    </div>
                </div>
            `,
        });

        // Divider & Spacer
        bm.add('divider-spacer', {
            label: '<div style="font-size: 20px; margin-bottom: 4px;">➖</div><b>Divider &amp; Spacer</b>',
            category: 'Layout & Grid',
            content: `
                <div style="padding: 30px 20px; max-width: 1000px; margin: 0 auto;">
                    <hr style="border: 0; height: 1px; background: #e2e8f0; margin: 0;" />
                </div>
            `,
        });

        // Unified handler for element selection (Elementor Edit mode & Context-Aware Content traits)
        editor.on('component:selected', (model) => {
            if (!model) {
                setSelectedTagName(null);
                return;
            }
            lastSelectedComponentRef.current = model;
            const tag = (model.get('tagName') || '').toLowerCase();
            const type = model.get('type') || '';
            const classes = (model.getClasses && model.getClasses()) || [];
            setActiveMainTab('edit');
            setElementSubTab('content');

            // Detect element kind
            const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) || type === 'umahz-heading' || classes.includes('umahz-heading');
            const isText = (tag === 'p' || tag === 'span' || type === 'umahz-text' || classes.includes('umahz-text')) && !isHeading;
            const isButton = tag === 'a' || tag === 'button' || type === 'umahz-button' || classes.includes('umahz-btn');
            const isIcon = type === 'umahz-icon' || classes.includes('umahz-icon-wrapper') || model.getAttributes()?.['data-icon-name'];
            const isIconBox = type === 'umahz-icon-box' || classes.includes('umahz-icon-box');
            const isImage = model.is('image') || type === 'image' || tag === 'img';
            const isDivider = tag === 'hr' || classes.includes('umahz-divider-wrap') || classes.includes('umahz-divider');
            const isSpacer = classes.includes('umahz-spacer') || type === 'umahz-spacer';
            const isList = tag === 'ul' || tag === 'ol' || type === 'umahz-list' || classes.includes('umahz-list');
            const isVideo = classes.includes('umahz-video-wrap') || type === 'umahz-video' || tag === 'iframe';
            const isContainer = ['section', 'header', 'footer'].includes(tag) || classes.includes('umahz-section') || classes.includes('umahz-column') || classes.includes('umahz-row');

            // Dynamically assign context-aware traits for the Content tab
            if (isHeading) {
                setSelectedTagName(`Heading (${tag.toUpperCase()})`);
                model.set('traits', [
                    { type: 'umahz-heading-tag', name: 'heading_tag', label: '' },
                    { type: 'umahz-text-content', name: 'heading_text', label: 'Heading Text' },
                    { type: 'text', name: 'id', label: 'Element ID', placeholder: 'e.g. hero-title' },
                    { type: 'text', name: 'title', label: 'Title Tooltip' },
                ]);
            } else if (isText) {
                setSelectedTagName('Paragraph / Text');
                model.set('traits', [
                    { type: 'umahz-text-content', name: 'para_text', label: 'Paragraph Content' },
                    { type: 'text', name: 'id', label: 'Element ID' },
                    { type: 'text', name: 'title', label: 'Title Tooltip' },
                ]);
            } else if (isButton) {
                setSelectedTagName('Action Button');
                model.set('traits', [
                    { type: 'umahz-button-label', name: 'btn_label', label: '' },
                    { type: 'text', name: 'href', label: 'Link URL (href)', placeholder: '#services or /pay' },
                    { type: 'select', name: 'target', label: 'Open in', options: [
                        { value: '_self', name: 'Same Tab' },
                        { value: '_blank', name: 'New Tab' },
                    ]},
                    { type: 'umahz-button-style', name: 'btn_style', label: '' },
                    { type: 'text', name: 'id', label: 'Element ID' },
                    { type: 'text', name: 'title', label: 'Tooltip' },
                ]);
            } else if (isIcon) {
                setSelectedTagName('Icon Widget');
                model.set('traits', [
                    { type: 'umahz-icon-select', name: 'icon_graphic', label: '' },
                    { type: 'umahz-icon-size', name: 'icon_size', label: '' },
                    { type: 'umahz-icon-color', name: 'icon_color', label: '' },
                ]);
            } else if (isIconBox) {
                setSelectedTagName('Icon Box / Feature');
                model.set('traits', [
                    { type: 'umahz-icon-box-settings', name: 'icon_box_settings', label: '' },
                    { type: 'text', name: 'id', label: 'Element ID' },
                ]);
            } else if (isImage) {
                setSelectedTagName('Image');
                model.set('traits', [
                    { type: 'button-open-assets', name: 'btn_open_assets', label: '' },
                    { type: 'text', name: 'src', label: 'Image URL (src)' },
                    { type: 'text', name: 'alt', label: 'Alt Text' },
                    { type: 'text', name: 'title', label: 'Title Tooltip' },
                ]);
            } else if (isDivider) {
                setSelectedTagName('Divider');
                model.set('traits', [
                    { type: 'umahz-divider-settings', name: 'divider_settings', label: '' },
                ]);
            } else if (isSpacer) {
                setSelectedTagName('Spacer');
                model.set('traits', [
                    { type: 'umahz-spacer-settings', name: 'spacer_settings', label: '' },
                ]);
            } else if (isList) {
                setSelectedTagName('List');
                model.set('traits', [
                    { type: 'umahz-list-settings', name: 'list_settings', label: '' },
                ]);
            } else if (isVideo) {
                setSelectedTagName('Video Embed');
                model.set('traits', [
                    { type: 'umahz-video-settings', name: 'video_settings', label: '' },
                ]);
            } else if (isContainer) {
                const name = (model.getName && model.getName()) || (tag === 'section' ? 'Section' : tag === 'header' ? 'Header' : tag === 'footer' ? 'Footer' : 'Container');
                setSelectedTagName(name);
                model.set('traits', [
                    { type: 'button-bg-assets', name: 'btn_bg_assets', label: '' },
                    { type: 'text', name: 'id', label: 'Section ID', placeholder: 'e.g. about or contact' },
                    { type: 'text', name: 'title', label: 'Section Title' },
                ]);
            } else {
                const name = (model.getName && model.getName()) || tag || 'Element';
                setSelectedTagName(name);
                model.set('traits', [
                    { type: 'text', name: 'id', label: 'Element ID' },
                    { type: 'text', name: 'title', label: 'Title' },
                ]);
            }

            try {
                editor.TraitManager?.render?.();
            } catch (e) {}
        });

        editor.on('component:deselected', () => {
            setSelectedTagName(null);
        });

        // Preload default clinic asset images into store
        const presetAssets = [
            'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
            'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
            'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&q=80',
            'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
            'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
        ];
        const amInstance = editor.AssetManager || editor.Assets;
        if (amInstance) {
            presetAssets.forEach(url => {
                try { amInstance.add(url); } catch {}
            });
        }

        // When an asset is selected from the Asset Manager modal
        editor.on('asset:select', (asset) => {
            if (!asset) return;
            const src = typeof asset === 'string' ? asset : (asset.get ? asset.get('src') : asset.src);
            if (!src) return;

            applyAssetToSelected(editor, src);
            setIsDirty(true);
        });

        // Live update image in canvas when src attribute or trait is updated
        editor.on('component:update:src', (model) => {
            if (model && (model.is('image') || model.get('type') === 'image' || model.get('tagName') === 'img')) {
                const src = model.get('src');
                if (src && model.view && model.view.el) {
                    model.view.el.setAttribute('src', src);
                    model.view.el.src = src;
                }
            }
        });

        // Double-click on images launches custom Media Library modal
        editor.on('component:doubleclick', (model) => {
            if (model && (model.is('image') || model.get('type') === 'image' || model.get('tagName') === 'img')) {
                if (openMediaPickerRef.current) {
                    openMediaPickerRef.current(editor, { target: 'element', title: 'Choose / Upload Image', component: model });
                }
            }
        });

        // Track changes
        editor.on('component:update style:update block:drag:stop', () => {
            setIsDirty(true);
        });

        // Delegated click listener for Block Categories accordion toggle
        const blocksContainer = document.getElementById('gjs-blocks');
        let handleCategoryClick = null;
        if (blocksContainer) {
            handleCategoryClick = (e) => {
                const titleEl = e.target.closest('.gjs-title');
                if (titleEl) {
                    const categoryEl = titleEl.closest('.gjs-block-category');
                    if (categoryEl) {
                        setTimeout(() => {
                            const blocksList = categoryEl.querySelector('.gjs-blocks-c');
                            if (blocksList) {
                                const isOpen = categoryEl.classList.contains('gjs-open');
                                blocksList.style.setProperty('display', isOpen ? 'grid' : 'none', 'important');
                            }
                        }, 20);
                    }
                }
            };
            blocksContainer.addEventListener('click', handleCategoryClick);
        }

        return () => {
            if (blocksContainer && handleCategoryClick) {
                blocksContainer.removeEventListener('click', handleCategoryClick);
            }
            editor.destroy();
        };
    }, []);

    // Search filtering for GrapesJS blocks
    useEffect(() => {
        if (activeMainTab !== 'blocks') return;
        const blocksContainer = document.getElementById('gjs-blocks');
        if (!blocksContainer) return;

        const q = searchQuery.trim().toLowerCase();
        const categories = blocksContainer.querySelectorAll('.gjs-block-category');

        categories.forEach(cat => {
            const blocks = cat.querySelectorAll('.gjs-block');
            let visibleInCat = 0;

            blocks.forEach(block => {
                const text = (block.textContent || '').toLowerCase();
                const title = (block.getAttribute('title') || '').toLowerCase();
                const matches = !q || text.includes(q) || title.includes(q);

                block.style.display = matches ? 'flex' : 'none';
                if (matches) {
                    visibleInCat++;
                }
            });

            if (q) {
                cat.style.display = visibleInCat > 0 ? 'block' : 'none';
                if (visibleInCat > 0) {
                    cat.classList.add('gjs-open');
                    const blocksWrapper = cat.querySelector('.gjs-blocks-c');
                    if (blocksWrapper) blocksWrapper.style.display = 'grid';
                }
            } else {
                cat.style.display = 'block';
            }
        });
    }, [searchQuery, activeMainTab]);

    // Warn on exit if there are unsaved changes
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    // Periodic Autosave every 2 minutes if changes exist
    useEffect(() => {
        const interval = setInterval(() => {
            if (isDirty && !saving && editorInstance.current) {
                handleSave(true);
            }
        }, 120000);
        return () => clearInterval(interval);
    }, [isDirty, saving]);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Handle Exit to Settings
    function handleExit(e) {
        if (e) e.preventDefault();
        if (isDirty) {
            setExitConfirmOpen(true);
        } else {
            router.visit('/app/settings');
        }
    }

    // Save & Publish Handler
    async function handleSave(silent = false) {
        if (!editorInstance.current) return;
        if (!silent) {
            setSaving(true);
            setSaveState(null);
        }

        const projectData = editorInstance.current.getProjectData();
        const html = editorInstance.current.getHtml();
        const css = editorInstance.current.getCss();

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                || document.querySelector('meta[name="csrf-token"]')?.content
                || '';

            const saveUrl = '/app/settings/page-layout';

            const res = await fetch(saveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    gjs_project: projectData,
                    gjs_html: html,
                    gjs_css: css,
                }),
            });

            const data = await res.json().catch(() => null);

            if (res.ok && data?.ok !== false) {
                setSaveState('ok');
                setIsDirty(false);
                const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setLastSavedTime(nowStr);
                setToast({
                    type: 'success',
                    title: 'Homepage Published!',
                    message: `Your changes are live on your public website. (${nowStr})`,
                    link: '/',
                });
            } else {
                const errorMsg = data?.error || data?.message || `HTTP ${res.status}`;
                console.error('Save page layout failed:', res.status, errorMsg);
                setSaveState('error');
                setToast({
                    type: 'error',
                    title: 'Failed to Save',
                    message: errorMsg,
                });
                if (res.status === 419) {
                    alert('Session expired. Please refresh the page and try again.');
                }
            }
        } catch (err) {
            console.error('Save page layout exception:', err);
            setSaveState('error');
            setToast({
                type: 'error',
                title: 'Save Error',
                message: 'A network error occurred while saving your page.',
            });
        } finally {
            if (!silent) {
                setSaving(false);
                setTimeout(() => setSaveState(null), 3000);
            }
        }
    }

    // Switch Viewport Device
    function setDevice(device) {
        if (!editorInstance.current) return;
        editorInstance.current.setDevice(device);
        setCurrentDevice(device);
    }

    // Brand swatches for quick color application
    const brandSwatches = [
        tenant.brand_color || '#7c3aed',
        '#7c3aed',
        '#6366f1',
        '#0f172a',
        '#64748b',
        '#ffffff',
        '#10b981',
        '#f59e0b',
        '#ef4444',
    ];

    function applyQuickColor(hex) {
        if (!editorInstance.current) return;
        const selected = editorInstance.current.getSelected();
        if (!selected) {
            navigator.clipboard?.writeText?.(hex);
            setToast({
                type: 'success',
                title: 'Color Copied!',
                message: `${hex} copied to clipboard. Select an element on the canvas to apply.`,
            });
            return;
        }

        const tag = (selected.get('tagName') || '').toLowerCase();
        const isText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'b', 'strong', 'i', 'em', 'li'].includes(tag);
        if (isText) {
            selected.addStyle({ color: hex });
            if (selected.view && selected.view.el) selected.view.el.style.color = hex;
        } else {
            selected.addStyle({ 'background-color': hex });
            if (selected.view && selected.view.el) selected.view.el.style.backgroundColor = hex;
        }
        setIsDirty(true);
        setToast({
            type: 'success',
            title: 'Color Applied',
            message: `Applied ${hex} to <${tag || 'element'}>`,
        });
    }

    return (
        <div className={`fixed inset-0 z-50 flex flex-col h-screen w-screen overflow-hidden select-none font-sans ${isDark ? 'dark bg-[#0a0c10] text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
            <Head title={`Page Builder — ${tenant.name || 'UMAHZ'}`} />

            <style>{`
                /* =========================================================
                   GrapesJS Theme Overrides (Light + Dark Mode Matching UMAHZ)
                   ========================================================= */
                :root {
                    --gjs-panel-bg: #ffffff;
                    --gjs-panel-border: #e2e8f0;
                    --gjs-panel-header: #f8fafc;
                    --gjs-panel-text: #0f172a;
                    --gjs-panel-text-muted: #64748b;
                    --gjs-panel-card: #ffffff;
                    --gjs-panel-card-hover: #f5f3ff;
                    --gjs-panel-input: #f8fafc;
                    --gjs-panel-input-border: #cbd5e1;
                    --gjs-canvas-bg: #f1f5f9;
                    --gjs-accent: #7c3aed;
                    --gjs-accent-hover: #6d28d9;
                    --gjs-accent-light: rgba(124, 58, 237, 0.08);
                    --gjs-accent-glow: rgba(124, 58, 237, 0.3);
                }

                .dark {
                    --gjs-panel-bg: #0f1117;
                    --gjs-panel-border: rgba(255, 255, 255, 0.08);
                    --gjs-panel-header: #141721;
                    --gjs-panel-text: #f8fafc;
                    --gjs-panel-text-muted: #94a3b8;
                    --gjs-panel-card: #181b25;
                    --gjs-panel-card-hover: #232736;
                    --gjs-panel-input: #181b26;
                    --gjs-panel-input-border: rgba(255, 255, 255, 0.12);
                    --gjs-canvas-bg: #07090e;
                    --gjs-accent: #8b5cf6;
                    --gjs-accent-hover: #7c3aed;
                    --gjs-accent-light: rgba(139, 92, 246, 0.15);
                    --gjs-accent-glow: rgba(139, 92, 246, 0.35);
                }

                /* Core Panel Colors */
                .gjs-one-bg { background-color: var(--gjs-panel-bg) !important; }
                .gjs-two-color { color: var(--gjs-panel-text-muted) !important; }
                .gjs-three-bg { background-color: var(--gjs-panel-input) !important; }
                .gjs-four-color, .gjs-four-color-h:hover { color: var(--gjs-accent) !important; }

                /* ---------------------------------------------------------
                   1. BLOCKS PANEL & CATEGORIES
                   --------------------------------------------------------- */
                .gjs-block-categories {
                    padding: 0 !important;
                }
                .gjs-block-category {
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                }
                .gjs-block-category .gjs-title {
                    background: var(--gjs-panel-header) !important;
                    color: var(--gjs-panel-text) !important;
                    font-weight: 700 !important;
                    font-size: 0.78rem !important;
                    padding: 11px 14px !important;
                    letter-spacing: 0.02em !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                    user-select: none !important;
                }
                .gjs-block-category .gjs-title:hover {
                    color: var(--gjs-accent) !important;
                    background: var(--gjs-accent-light) !important;
                }
                .gjs-block-category.gjs-open .gjs-title {
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                }
                .gjs-block-category:not(.gjs-open) .gjs-blocks-c {
                    display: none !important;
                }
                .gjs-block-category.gjs-open .gjs-blocks-c {
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 8px !important;
                    padding: 10px !important;
                    background: var(--gjs-panel-bg) !important;
                }
                .gjs-block {
                    width: auto !important;
                    min-height: 84px !important;
                    margin: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    text-align: center !important;
                    padding: 12px 8px !important;
                    background: var(--gjs-panel-card) !important;
                    border: 1px solid var(--gjs-panel-border) !important;
                    border-radius: 10px !important;
                    color: var(--gjs-panel-text) !important;
                    cursor: grab !important;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    font-size: 0.72rem !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
                }
                .gjs-block:hover {
                    border-color: var(--gjs-accent) !important;
                    background: var(--gjs-panel-card-hover) !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 16px var(--gjs-accent-glow) !important;
                    color: var(--gjs-accent) !important;
                }
                .gjs-block:active {
                    cursor: grabbing !important;
                    transform: scale(0.97) !important;
                }
                .gjs-block-label {
                    line-height: 1.25 !important;
                }

                /* ---------------------------------------------------------
                   2. ELEMENTOR SUBTAB SECTOR FILTERING
                   --------------------------------------------------------- */
                .panel-subtab-style #gjs-sm-sec-adv-spacing,
                .panel-subtab-style .gjs-sm-sec-adv-spacing,
                .panel-subtab-style #gjs-sm-sec-adv-layout,
                .panel-subtab-style .gjs-sm-sec-adv-layout {
                    display: none !important;
                }

                .panel-subtab-advanced #gjs-sm-sec-style-colors,
                .panel-subtab-advanced .gjs-sm-sec-style-colors,
                .panel-subtab-advanced #gjs-sm-sec-style-typography,
                .panel-subtab-advanced .gjs-sm-sec-style-typography,
                .panel-subtab-advanced #gjs-sm-sec-style-borders,
                .panel-subtab-advanced .gjs-sm-sec-style-borders {
                    display: none !important;
                }

                /* ---------------------------------------------------------
                   3. ELEMENTOR SECTORS & ACCORDIONS
                   --------------------------------------------------------- */
                .gjs-sm-sectors {
                    background: var(--gjs-panel-bg) !important;
                    padding: 0 !important;
                }
                .gjs-sm-sector {
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                    transition: background-color 0.15s ease !important;
                }
                .gjs-sm-sector-title {
                    background: var(--gjs-panel-header) !important;
                    color: var(--gjs-panel-text) !important;
                    font-weight: 700 !important;
                    padding: 10px 14px !important;
                    font-size: 0.76rem !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    letter-spacing: 0.01em !important;
                    user-select: none !important;
                    transition: all 0.15s ease !important;
                    border-left: 3px solid transparent !important;
                }
                .gjs-sm-sector-title:hover {
                    color: var(--gjs-accent) !important;
                    background: var(--gjs-accent-light) !important;
                }
                .gjs-sm-sector.gjs-sm-open .gjs-sm-sector-title {
                    border-left-color: var(--gjs-accent) !important;
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                    color: var(--gjs-accent) !important;
                }
                .gjs-sm-sector-caret {
                    color: var(--gjs-panel-text-muted) !important;
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 11px !important;
                }
                .gjs-sm-sector.gjs-sm-open .gjs-sm-sector-caret {
                    transform: rotate(90deg) !important;
                    color: var(--gjs-accent) !important;
                }
                .gjs-sm-properties {
                    padding: 0 !important;
                    background: var(--gjs-panel-bg) !important;
                }

                /* ---------------------------------------------------------
                   4. ELEMENTOR COMPACT FIELD ROWS (Label Left, Control Right)
                   --------------------------------------------------------- */
                .gjs-sm-property:not(.gjs-sm-composite) {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 7px 14px !important;
                    margin: 0 !important;
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                    min-height: 38px !important;
                    box-sizing: border-box !important;
                }
                .gjs-sm-property:not(.gjs-sm-composite):last-child {
                    border-bottom: none !important;
                }
                .gjs-sm-property:not(.gjs-sm-composite) > .gjs-sm-label {
                    flex: 0 0 40% !important;
                    max-width: 40% !important;
                    font-size: 0.72rem !important;
                    font-weight: 500 !important;
                    color: var(--gjs-panel-text-muted) !important;
                    text-transform: none !important;
                    letter-spacing: normal !important;
                    margin: 0 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .gjs-sm-property:not(.gjs-sm-composite) > .gjs-fields {
                    flex: 0 0 58% !important;
                    max-width: 58% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    gap: 6px !important;
                    margin: 0 !important;
                }
                .gjs-sm-clear {
                    color: var(--gjs-panel-text-muted) !important;
                    cursor: pointer !important;
                    font-size: 11px !important;
                    opacity: 0.5 !important;
                    transition: opacity 0.15s !important;
                    margin-left: 4px !important;
                }
                .gjs-sm-clear:hover {
                    opacity: 1 !important;
                    color: #ef4444 !important;
                }

                /* Form Controls (Inputs, Selects, Fields) */
                .gjs-field {
                    background-color: var(--gjs-panel-input) !important;
                    color: var(--gjs-panel-text) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    border-radius: 7px !important;
                    font-size: 0.76rem !important;
                    padding: 5px 8px !important;
                    transition: all 0.15s ease !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    display: flex !important;
                    align-items: center !important;
                    min-height: 30px !important;
                    height: 30px !important;
                }
                .gjs-field:focus-within {
                    border-color: var(--gjs-accent) !important;
                    box-shadow: 0 0 0 2px var(--gjs-accent-light) !important;
                    outline: none !important;
                }
                .gjs-field input {
                    background: transparent !important;
                    border: none !important;
                    outline: none !important;
                    color: var(--gjs-panel-text) !important;
                    font-size: 0.76rem !important;
                    font-family: inherit !important;
                    width: 100% !important;
                    padding: 0 !important;
                }
                .gjs-field select {
                    background-color: transparent !important;
                    border: none !important;
                    outline: none !important;
                    color: var(--gjs-panel-text) !important;
                    font-size: 0.76rem !important;
                    font-family: inherit !important;
                    width: 100% !important;
                    padding: 2px 20px 2px 0 !important;
                    cursor: pointer !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b5cf6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") !important;
                    background-repeat: no-repeat !important;
                    background-position: right 2px center !important;
                    background-size: 13px 13px !important;
                }
                .gjs-field select option {
                    background-color: var(--gjs-panel-card) !important;
                    color: var(--gjs-panel-text) !important;
                }

                /* ---------------------------------------------------------
                   5. ELEMENTOR 4-SIDE BOX MODEL (Dimensions: Margin & Padding)
                   --------------------------------------------------------- */
                .gjs-sm-composite {
                    display: flex !important;
                    flex-direction: column !important;
                    padding: 10px 14px !important;
                    margin: 0 !important;
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                    background: transparent !important;
                }
                .gjs-sm-composite > .gjs-sm-label {
                    font-size: 0.72rem !important;
                    font-weight: 600 !important;
                    color: var(--gjs-panel-text) !important;
                    margin-bottom: 8px !important;
                    text-transform: none !important;
                }
                .gjs-sm-composite .gjs-sm-properties {
                    display: grid !important;
                    grid-template-columns: repeat(4, 1fr) !important;
                    gap: 6px !important;
                    padding: 0 !important;
                    background: transparent !important;
                }
                .gjs-sm-composite .gjs-sm-properties .gjs-sm-property {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border-bottom: none !important;
                    gap: 4px !important;
                    width: 100% !important;
                }
                .gjs-sm-composite .gjs-sm-properties .gjs-sm-property .gjs-fields {
                    order: 1 !important;
                    width: 100% !important;
                }
                .gjs-sm-composite .gjs-sm-properties .gjs-sm-property .gjs-sm-label {
                    order: 2 !important;
                    font-size: 9px !important;
                    font-weight: 600 !important;
                    color: var(--gjs-panel-text-muted) !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    text-align: center !important;
                }
                .gjs-sm-composite .gjs-sm-properties .gjs-sm-property .gjs-field {
                    min-height: 28px !important;
                    height: 28px !important;
                    padding: 2px 4px !important;
                    text-align: center !important;
                    border-radius: 6px !important;
                    background-color: var(--gjs-panel-input) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    justify-content: center !important;
                }
                .gjs-sm-composite .gjs-sm-properties .gjs-sm-property input {
                    text-align: center !important;
                    font-size: 0.74rem !important;
                    font-weight: 600 !important;
                }

                /* ---------------------------------------------------------
                   6. SLIDERS & RANGE INPUTS (Elementor-Style Number + Unit)
                   --------------------------------------------------------- */
                .gjs-field-range {
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    width: 100% !important;
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .gjs-field-range input[type="range"] {
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    flex: 1 !important;
                    min-width: 0 !important;
                    height: 4px !important;
                    background: var(--gjs-panel-input-border) !important;
                    border-radius: 9999px !important;
                    outline: none !important;
                    cursor: pointer !important;
                    transition: background 0.15s !important;
                }
                .gjs-field-range input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    width: 14px !important;
                    height: 14px !important;
                    border-radius: 50% !important;
                    background: var(--gjs-accent) !important;
                    box-shadow: 0 1px 4px var(--gjs-accent-glow) !important;
                    border: 2px solid #ffffff !important;
                    cursor: pointer !important;
                    transition: transform 0.15s ease !important;
                }
                .gjs-field-range input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.2) !important;
                }
                .gjs-field-range input[type="range"]::-moz-range-thumb {
                    width: 14px !important;
                    height: 14px !important;
                    border-radius: 50% !important;
                    background: var(--gjs-accent) !important;
                    box-shadow: 0 1px 4px var(--gjs-accent-glow) !important;
                    border: 2px solid #ffffff !important;
                    cursor: pointer !important;
                }
                .gjs-field-range .gjs-field-integer {
                    width: 44px !important;
                    min-width: 44px !important;
                    max-width: 48px !important;
                    height: 28px !important;
                    min-height: 28px !important;
                    padding: 2px 4px !important;
                    text-align: center !important;
                    border-radius: 6px !important;
                    background-color: var(--gjs-panel-input) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                }
                .gjs-field-unit {
                    font-size: 10px !important;
                    color: var(--gjs-panel-text-muted) !important;
                    min-width: 24px !important;
                    text-align: center !important;
                }

                /* ---------------------------------------------------------
                   7. COLOR PICKER & SPECTRUM POPUP
                   --------------------------------------------------------- */
                .gjs-field-color {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    gap: 6px !important;
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .gjs-field-colorp-c {
                    width: 26px !important;
                    height: 24px !important;
                    border-radius: 6px !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
                    cursor: pointer !important;
                    transition: transform 0.15s ease, border-color 0.15s ease !important;
                    flex-shrink: 0 !important;
                    overflow: hidden !important;
                }
                .gjs-field-colorp-c:hover {
                    transform: scale(1.06) !important;
                    border-color: var(--gjs-accent) !important;
                }
                .gjs-field-colorp {
                    width: 100% !important;
                    height: 100% !important;
                }
                .gjs-field-color input {
                    max-width: 76px !important;
                    height: 28px !important;
                    padding: 2px 6px !important;
                    font-family: monospace !important;
                    font-size: 11px !important;
                    border-radius: 6px !important;
                    background: var(--gjs-panel-input) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    color: var(--gjs-panel-text) !important;
                    text-align: center !important;
                }

                /* Spectrum Color Picker Modal Theming */
                .sp-container {
                    background-color: var(--gjs-panel-bg) !important;
                    border: 1px solid var(--gjs-panel-border) !important;
                    border-radius: 14px !important;
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.35) !important;
                    color: var(--gjs-panel-text) !important;
                    padding: 10px !important;
                    z-index: 99999 !important;
                }
                .sp-picker-container {
                    border-left: none !important;
                    padding: 8px !important;
                }
                .sp-palette-container {
                    border-right: 1px solid var(--gjs-panel-border) !important;
                    padding: 8px !important;
                }
                .sp-thumb-el {
                    border-radius: 6px !important;
                    border: 1px solid var(--gjs-panel-border) !important;
                    transition: transform 0.15s ease !important;
                }
                .sp-thumb-el:hover, .sp-thumb-el.sp-thumb-active {
                    transform: scale(1.15) !important;
                    border-color: var(--gjs-accent) !important;
                }
                .sp-input {
                    background: var(--gjs-panel-input) !important;
                    color: var(--gjs-panel-text) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    border-radius: 6px !important;
                    font-family: monospace !important;
                    font-size: 0.78rem !important;
                    padding: 4px 8px !important;
                }
                .sp-input:focus {
                    border-color: var(--gjs-accent) !important;
                    outline: none !important;
                }
                .sp-choose {
                    background: var(--gjs-accent) !important;
                    border: none !important;
                    border-radius: 6px !important;
                    color: #ffffff !important;
                    font-weight: 700 !important;
                    font-size: 0.75rem !important;
                    padding: 5px 12px !important;
                    transition: opacity 0.15s !important;
                }
                .sp-choose:hover {
                    opacity: 0.9 !important;
                }
                .sp-cancel {
                    color: var(--gjs-panel-text-muted) !important;
                    font-size: 0.75rem !important;
                    padding: 5px 8px !important;
                }

                /* ---------------------------------------------------------
                   8. ELEMENTOR NAVIGATOR / LAYERS PANEL
                   --------------------------------------------------------- */
                .gjs-layers {
                    padding: 8px !important;
                    background: var(--gjs-panel-bg) !important;
                }
                .gjs-layer {
                    background: transparent !important;
                    color: var(--gjs-panel-text) !important;
                    border-radius: 6px !important;
                    margin: 2px 0 !important;
                    padding: 6px 10px !important;
                    font-size: 0.76rem !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    transition: all 0.15s ease !important;
                    border-left: 2px solid transparent !important;
                }
                .gjs-layer:hover {
                    background: var(--gjs-panel-header) !important;
                    color: var(--gjs-accent) !important;
                }
                .gjs-layer.gjs-selected {
                    background: var(--gjs-accent-light) !important;
                    color: var(--gjs-accent) !important;
                    font-weight: 700 !important;
                    border-left-color: var(--gjs-accent) !important;
                }
                .gjs-layer-title {
                    color: inherit !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    flex: 1 !important;
                    overflow: hidden !important;
                }
                .gjs-layer-name {
                    font-weight: 500 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    max-width: 180px !important;
                }
                .gjs-layer-caret {
                    color: var(--gjs-panel-text-muted) !important;
                    margin-right: 4px !important;
                    font-size: 10px !important;
                    transition: transform 0.15s ease !important;
                }
                .gjs-layer-vis {
                    color: var(--gjs-panel-text-muted) !important;
                    opacity: 0.5 !important;
                    cursor: pointer !important;
                    padding: 3px 5px !important;
                    border-radius: 4px !important;
                    transition: all 0.15s ease !important;
                }
                .gjs-layer-vis:hover {
                    opacity: 1 !important;
                    color: var(--gjs-accent) !important;
                    background: var(--gjs-accent-light) !important;
                }
                .gjs-layer-children {
                    margin-left: 12px !important;
                    padding-left: 6px !important;
                    border-left: 1px dashed var(--gjs-panel-border) !important;
                }

                /* ---------------------------------------------------------
                   9. SETTINGS / TRAITS (CONTENT TAB)
                   --------------------------------------------------------- */
                .gjs-trt-traits {
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    background: var(--gjs-panel-bg) !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .gjs-trt-trait {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 10px 14px !important;
                    margin: 0 !important;
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                    min-height: 42px !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    gap: 12px !important;
                    position: static !important;
                }
                .gjs-trt-trait .gjs-label-wrp {
                    flex: 0 0 32% !important;
                    width: 32% !important;
                    min-width: 32% !important;
                    max-width: 32% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                }
                .gjs-trt-trait .gjs-label {
                    font-size: 0.74rem !important;
                    font-weight: 600 !important;
                    color: var(--gjs-panel-text-muted) !important;
                    text-transform: capitalize !important;
                    letter-spacing: normal !important;
                    margin: 0 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    display: block !important;
                }
                .gjs-trt-trait .gjs-field-wrp {
                    flex: 1 1 68% !important;
                    width: 68% !important;
                    max-width: 68% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .gjs-trt-trait .gjs-field {
                    width: 100% !important;
                    background-color: var(--gjs-panel-input) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    border-radius: 7px !important;
                    min-height: 32px !important;
                    height: 32px !important;
                    padding: 0 8px !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    align-items: center !important;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                }
                .gjs-trt-trait .gjs-field:focus-within {
                    border-color: var(--gjs-accent) !important;
                    box-shadow: 0 0 0 2px var(--gjs-accent-light) !important;
                }
                .gjs-trt-trait input,
                .gjs-trt-trait select,
                .gjs-trt-trait textarea {
                    width: 100% !important;
                    flex: 1 1 100% !important;
                    background: transparent !important;
                    color: var(--gjs-panel-text) !important;
                    border: none !important;
                    font-size: 0.76rem !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    outline: none !important;
                    box-shadow: none !important;
                }
                .gjs-trt-trait input::placeholder {
                    color: var(--gjs-panel-text-muted) !important;
                    opacity: 0.6 !important;
                }
                .gjs-trt-trait select option {
                    background: var(--gjs-panel-bg) !important;
                    color: var(--gjs-panel-text) !important;
                }

                /* Custom Action Button Traits & Full Width Blocks */
                .gjs-trt-trait:has(.umahz-trait-action-block),
                .gjs-trt-trait:has(.umahz-trait-full-block),
                .gjs-trt-trait:has(.btn-choose-bg),
                .gjs-trt-trait:has(.btn-open-asset-modal) {
                    display: block !important;
                    padding: 12px 14px !important;
                    width: 100% !important;
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                }
                .gjs-trt-trait:has(.umahz-trait-action-block) .gjs-label-wrp,
                .gjs-trt-trait:has(.umahz-trait-full-block) .gjs-label-wrp,
                .gjs-trt-trait:has(.btn-choose-bg) .gjs-label-wrp,
                .gjs-trt-trait:has(.btn-open-asset-modal) .gjs-label-wrp {
                    display: none !important;
                }
                .gjs-trt-trait:has(.umahz-trait-action-block) .gjs-field-wrp,
                .gjs-trt-trait:has(.umahz-trait-full-block) .gjs-field-wrp,
                .gjs-trt-trait:has(.btn-choose-bg) .gjs-field-wrp,
                .gjs-trt-trait:has(.btn-open-asset-modal) .gjs-field-wrp {
                    width: 100% !important;
                    max-width: 100% !important;
                    flex: none !important;
                    display: block !important;
                }
                .gjs-trt-trait:has(.umahz-trait-action-block) .gjs-field,
                .gjs-trt-trait:has(.umahz-trait-full-block) .gjs-field,
                .gjs-trt-trait:has(.btn-choose-bg) .gjs-field,
                .gjs-trt-trait:has(.btn-open-asset-modal) .gjs-field {
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                    height: auto !important;
                    min-height: auto !important;
                    box-shadow: none !important;
                }
                .umahz-trait-full-block input,
                .umahz-trait-full-block select,
                .umahz-trait-full-block textarea {
                    background: var(--gjs-panel-input) !important;
                    border: 1px solid var(--gjs-panel-input-border) !important;
                    color: var(--gjs-panel-text) !important;
                    border-radius: 8px !important;
                    box-sizing: border-box !important;
                    outline: none !important;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                }
                .umahz-trait-full-block input:focus,
                .umahz-trait-full-block select:focus,
                .umahz-trait-full-block textarea:focus {
                    border-color: var(--gjs-accent) !important;
                    box-shadow: 0 0 0 2px var(--gjs-accent-light) !important;
                }
                .btn-open-asset-modal:hover, .btn-choose-bg:hover {
                    filter: brightness(1.08) !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 6px 18px rgba(124, 58, 237, 0.4) !important;
                }
                .btn-open-asset-modal:active, .btn-choose-bg:active {
                    transform: scale(0.98) !important;
                }
                .btn-clear-bg:hover {
                    background: rgba(239, 68, 68, 0.1) !important;
                    border-color: #ef4444 !important;
                }

                /* Resizer Handles for Resizable Columns */
                .gjs-resizer-c {
                    border-color: #8b5cf6 !important;
                }
                .gjs-resizer-h {
                    background-color: #7c3aed !important;
                    border: 2px solid #ffffff !important;
                    border-radius: 50% !important;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35) !important;
                    width: 10px !important;
                    height: 10px !important;
                }
                .gjs-resizer-h-cr {
                    width: 6px !important;
                    height: 28px !important;
                    border-radius: 3px !important;
                    background: #7c3aed !important;
                    border: 1px solid #ffffff !important;
                    box-shadow: 0 0 10px rgba(124, 58, 237, 0.6) !important;
                    cursor: col-resize !important;
                }

                /* ---------------------------------------------------------
                   7. CANVAS, BADGES & OVERLAYS
                   --------------------------------------------------------- */
                .gjs-badge {
                    background: linear-gradient(135deg, #7c3aed, #6366f1) !important;
                    color: #ffffff !important;
                    border-radius: 5px !important;
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    padding: 3px 8px !important;
                    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4) !important;
                }
                .gjs-toolbar {
                    background: #181b26 !important;
                    border: 1px solid rgba(139, 92, 246, 0.3) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4) !important;
                    padding: 2px !important;
                }
                .gjs-toolbar-item {
                    color: #f8fafc !important;
                    padding: 5px 8px !important;
                    border-radius: 4px !important;
                    transition: background 0.15s ease !important;
                }
                .gjs-toolbar-item:hover {
                    background: #7c3aed !important;
                    color: white !important;
                }
                .gjs-highlighter {
                    border: 2px solid #8b5cf6 !important;
                }
                .gjs-selected {
                    outline: 2px solid #7c3aed !important;
                    outline-offset: -1px !important;
                }

                /* Canvas & Viewport Frame */
                .gjs-cv-canvas {
                    width: 100% !important;
                    height: 100% !important;
                    background-color: var(--gjs-canvas-bg) !important;
                    transition: background-color 0.2s ease !important;
                }
                .canvas-device-Tablet .gjs-frame-wrapper {
                    margin: 24px auto !important;
                    border-radius: 16px !important;
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3), 0 0 0 8px rgba(0, 0, 0, 0.12) !important;
                    overflow: hidden !important;
                    border: 1px solid var(--gjs-panel-border) !important;
                }
                .canvas-device-Mobile .gjs-frame-wrapper {
                    margin: 24px auto !important;
                    border-radius: 28px !important;
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.35), 0 0 0 10px rgba(0, 0, 0, 0.18) !important;
                    overflow: hidden !important;
                    border: 2px solid var(--gjs-panel-border) !important;
                }
                .canvas-device-Desktop .gjs-frame-wrapper {
                    margin: 0 !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                }

                /* Asset Manager Modal */
                .gjs-mdl-dialog {
                    background-color: var(--gjs-panel-bg) !important;
                    border: 1px solid var(--gjs-panel-border) !important;
                    border-radius: 16px !important;
                    color: var(--gjs-panel-text) !important;
                    max-width: 840px !important;
                    width: 92% !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                }
                .gjs-mdl-header {
                    border-bottom: 1px solid var(--gjs-panel-border) !important;
                    font-weight: 700 !important;
                    color: var(--gjs-panel-text) !important;
                    padding: 14px 20px !important;
                }
                .gjs-mdl-btn-close {
                    color: var(--gjs-panel-text-muted) !important;
                    font-size: 22px !important;
                }
                .gjs-am-assets-cont {
                    background-color: var(--gjs-panel-header) !important;
                    border-radius: 10px !important;
                    padding: 16px !important;
                    min-height: 220px !important;
                    max-height: 380px !important;
                    overflow-y: auto !important;
                    border: 1px solid var(--gjs-panel-border) !important;
                }
                .gjs-am-assets {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 14px !important;
                }
                .gjs-am-asset {
                    background: var(--gjs-panel-card) !important;
                    border: 2px solid var(--gjs-panel-border) !important;
                    border-radius: 10px !important;
                    width: 140px !important;
                    height: 110px !important;
                    overflow: hidden !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    position: relative !important;
                }
                .gjs-am-asset:hover {
                    border-color: var(--gjs-accent) !important;
                    transform: scale(1.03) !important;
                    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25) !important;
                }
                .gjs-am-asset-image {
                    border-radius: 6px !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                .gjs-am-file-uploader {
                    background: var(--gjs-panel-header) !important;
                    border: 2px dashed var(--gjs-panel-input-border) !important;
                    border-radius: 12px !important;
                    color: var(--gjs-panel-text-muted) !important;
                    padding: 8px !important;
                    margin-bottom: 16px !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                }
                .gjs-am-file-uploader:hover {
                    border-color: var(--gjs-accent) !important;
                    background: var(--gjs-accent-light) !important;
                }
                /* Make the whole drop zone an obvious clickable upload button */
                .gjs-am-file-uploader form {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    min-height: 150px !important;
                    cursor: pointer !important;
                    text-align: center !important;
                    position: relative !important;
                }
                /* GrapesJS overlays this transparent file input to capture clicks/drops */
                #gjs-am-uploadFile {
                    cursor: pointer !important;
                }
                /* Upload icon badge shown above the label */
                .gjs-am-file-uploader form::before {
                    content: '⬆' !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 52px !important;
                    height: 52px !important;
                    margin-bottom: 12px !important;
                    border-radius: 50% !important;
                    background: var(--gjs-accent) !important;
                    color: #ffffff !important;
                    font-size: 24px !important;
                    box-shadow: 0 6px 16px rgba(124, 58, 237, 0.35) !important;
                }
                /* GrapesJS default label text ("Drop files here or click to upload") */
                #gjs-am-title {
                    font-weight: 600 !important;
                    font-size: 0.9rem !important;
                    color: var(--gjs-panel-text) !important;
                    letter-spacing: 0.01em !important;
                }
                .gjs-am-add-asset button {
                    background: var(--gjs-accent) !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                    color: white !important;
                    padding: 8px 16px !important;
                }
            `}</style>

            {/* Top Toolbar (Full Width, Focused Editor Header) */}
            <header className="h-14 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-md px-4 flex items-center justify-between z-30 flex-shrink-0">
                {/* Left: Exit button, Divider, Clinic name, Dirty badge */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExit}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10"
                        title="Return to clinic settings"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Exit Builder</span>
                    </button>

                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

                    <div className="flex items-center gap-2">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.name} className="w-6 h-6 rounded-md object-cover border border-slate-200 dark:border-white/10" />
                        ) : (
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                {tenant.name?.charAt(0) || '✦'}
                            </div>
                        )}
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 max-w-[150px] truncate" title={tenant.name}>
                            {tenant.name || 'UMAHZ Clinic'}
                        </span>
                    </div>

                    {isDirty ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Unsaved Changes
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <Check className="w-3 h-3" />
                            Published {lastSavedTime ? `(${lastSavedTime})` : ''}
                        </span>
                    )}
                </div>

                {/* Center: Segmented Device Viewport Switcher */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#161922] border border-slate-200 dark:border-white/10 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setDevice('Desktop')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 ${
                            currentDevice === 'Desktop'
                                ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Desktop view (Full Width)"
                    >
                        <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button
                        type="button"
                        onClick={() => setDevice('Tablet')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 ${
                            currentDevice === 'Tablet'
                                ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Tablet view (768px)"
                    >
                        <Tablet className="w-3.5 h-3.5" /> Tablet
                    </button>
                    <button
                        type="button"
                        onClick={() => setDevice('Mobile')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 ${
                            currentDevice === 'Mobile'
                                ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Mobile view (375px)"
                    >
                        <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                </div>

                {/* Right: Undo/Redo, Theme Toggle, Preview Page, Save & Publish */}
                <div className="flex items-center gap-2">
                    {/* Undo / Redo */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#161922] p-0.5 rounded-lg border border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => editorInstance.current?.UndoManager?.undo()}
                            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editorInstance.current?.UndoManager?.redo()}
                            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Light / Dark Mode Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#161922] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-colors"
                        title={isDark ? 'Switch editor to Light mode' : 'Switch editor to Dark mode'}
                    >
                        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                    </button>

                    {/* Preview Page (Opens public clinic site) */}
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#161922] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-colors"
                        title="View live homepage in new tab"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Page</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>

                    {/* Save & Publish Primary Button */}
                    <button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-[0.98] ${
                            saving
                                ? 'bg-violet-700 opacity-80 cursor-wait'
                                : saveState === 'ok'
                                ? 'bg-emerald-600 shadow-emerald-500/25'
                                : saveState === 'error'
                                ? 'bg-rose-600 shadow-rose-500/25'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/30'
                        }`}
                    >
                        {saving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Publishing…</span>
                            </>
                        ) : saveState === 'ok' ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Published!</span>
                            </>
                        ) : saveState === 'error' ? (
                            <>
                                <AlertCircle className="w-4 h-4" />
                                <span>Error Saving</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save &amp; Publish</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Editor Workspace: Left Sidebar + Center Canvas */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* Left Sidebar Panel (Blocks / Style / Settings / Layers) */}
                {/* Left Sidebar Panel (Elementor-Style Controls) */}
                <aside className="w-80 bg-white dark:bg-[#0f1117] border-r border-slate-200 dark:border-white/10 flex flex-col flex-shrink-0 z-20 shadow-sm">
                    
                    {/* Panel Navigation Bar (Elementor Signature Header) */}
                    <div className="h-11 border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#141721]/90 px-3 flex items-center justify-between flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveMainTab('blocks')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                                activeMainTab === 'blocks'
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }`}
                            title="Elements / Blocks"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5 min-w-0 max-w-[180px]">
                            {activeMainTab === 'blocks' && (
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Elements</span>
                            )}
                            {activeMainTab === 'layers' && (
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Navigator</span>
                            )}
                            {activeMainTab === 'edit' && (
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Edit</span>
                                    <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-500/20 px-1.5 py-0.5 rounded truncate border border-violet-500/30">
                                        &lt;{selectedTagName || 'Element'}&gt;
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveMainTab(activeMainTab === 'layers' ? (selectedTagName ? 'edit' : 'blocks') : 'layers')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                                activeMainTab === 'layers'
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }`}
                            title="Navigator (Document Hierarchy)"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Elementor Subtabs (Content | Style | Advanced) - Active in Edit Mode */}
                    {activeMainTab === 'edit' && (
                        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#12141c] flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setElementSubTab('content')}
                                className={`py-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
                                    elementSubTab === 'content'
                                        ? 'text-violet-600 dark:text-violet-400'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>Content</span>
                                {elementSubTab === 'content' && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600 dark:bg-violet-400 rounded-full" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setElementSubTab('style')}
                                className={`py-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
                                    elementSubTab === 'style'
                                        ? 'text-violet-600 dark:text-violet-400'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>Style</span>
                                {elementSubTab === 'style' && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600 dark:bg-violet-400 rounded-full" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setElementSubTab('advanced')}
                                className={`py-2 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
                                    elementSubTab === 'advanced'
                                        ? 'text-violet-600 dark:text-violet-400'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>Advanced</span>
                                {elementSubTab === 'advanced' && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600 dark:bg-violet-400 rounded-full" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Search Box when on Blocks Panel */}
                    {activeMainTab === 'blocks' && (
                        <div className="p-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#12141c] flex-shrink-0">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search blocks (nav, hero, services)..."
                                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-white dark:bg-[#181b26] text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        title="Clear search"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Scrollable Container for Panel Contents */}
                    <div className="flex-1 overflow-y-auto">
                        {/* 1. Blocks Panel */}
                        <div id="gjs-blocks" style={{ display: activeMainTab === 'blocks' ? 'block' : 'none' }} />

                        {/* 2. Content / Traits Subtab */}
                        <div style={{ display: activeMainTab === 'edit' && elementSubTab === 'content' ? 'block' : 'none' }}>
                            {!selectedTagName ? (
                                <div className="p-5 text-center border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#12141c]/50">
                                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-2.5">
                                        <Settings className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">No Element Selected</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Click on an image, button, link, or section in the canvas to edit its properties, URLs, and photos.
                                    </p>
                                </div>
                            ) : null}
                            <div id="gjs-traits" />
                        </div>

                        {/* 3. Style & Advanced Subtabs (Both share #gjs-styles with CSS sector filter classes) */}
                        <div
                            className={elementSubTab === 'style' ? 'panel-subtab-style' : 'panel-subtab-advanced'}
                            style={{ display: activeMainTab === 'edit' && (elementSubTab === 'style' || elementSubTab === 'advanced') ? 'block' : 'none' }}
                        >
                            {/* Quick Brand Palette (Style Subtab) */}
                            {elementSubTab === 'style' && (
                                <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Brand Palette</span>
                                        <span className="text-[10px] font-mono text-slate-400">{tenant.brand_color || '#7c3aed'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {brandSwatches.map((color, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => applyQuickColor(color)}
                                                style={{ backgroundColor: color }}
                                                className="w-5 h-5 rounded-md border border-slate-200 dark:border-white/20 shadow-xs hover:scale-125 active:scale-95 transition-transform"
                                                title={`Quick Apply ${color}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Responsive Breakpoint Switcher (Advanced Subtab) */}
                            {elementSubTab === 'advanced' && (
                                <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#141721] flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Breakpoint:</span>
                                    <div className="flex items-center gap-1 bg-white dark:bg-[#181b26] p-0.5 rounded-lg border border-slate-200 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setDevice('Desktop')}
                                            className={`p-1 rounded ${currentDevice === 'Desktop' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                            title="Desktop View"
                                        >
                                            <Monitor className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDevice('Tablet')}
                                            className={`p-1 rounded ${currentDevice === 'Tablet' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                            title="Tablet View"
                                        >
                                            <Tablet className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDevice('Mobile')}
                                            className={`p-1 rounded ${currentDevice === 'Mobile' ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                            title="Mobile View"
                                        >
                                            <Smartphone className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div id="gjs-styles" />
                        </div>

                        {/* 4. Navigator / Layers Panel */}
                        <div style={{ display: activeMainTab === 'layers' ? 'block' : 'none' }}>
                            <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141721] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                                    <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                    <span>Page Hierarchy</span>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    Navigator
                                </span>
                            </div>
                            <div id="gjs-layers" />
                        </div>
                    </div>

                    {/* Footer helper notice */}
                    <div className="p-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#12141c] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-shrink-0">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Canvas Live</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">UMAHZ Studio</span>
                    </div>
                </aside>

                {/* Center Canvas Area with Device Viewport Chrome */}
                <main className={`flex-1 relative overflow-hidden flex flex-col bg-slate-200/50 dark:bg-[#07090e] canvas-device-${currentDevice}`}>
                    {/* Viewport Dimension Indicator for Tablet & Mobile */}
                    {currentDevice !== 'Desktop' && (
                        <div className="w-full py-1 text-center bg-slate-300/40 dark:bg-white/5 border-b border-slate-300/50 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {currentDevice === 'Tablet' ? 'Tablet Canvas (768px)' : 'Mobile Canvas (375px)'}
                        </div>
                    )}

                    <div className="flex-1 w-full h-full relative overflow-auto">
                        <div ref={editorRef} className="w-full h-full" />
                    </div>
                </main>

            </div>

            {/* Unsaved Changes Confirmation Modal */}
            {exitConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-[#141721] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Unsaved Changes Detected
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                                    You have made modifications to your clinic homepage that are not published yet. If you exit now, any unsaved work will be lost.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setExitConfirmOpen(false)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Keep Editing
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDirty(false);
                                    setExitConfirmOpen(false);
                                    router.visit('/app/settings');
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 transition-colors"
                            >
                                Discard &amp; Exit
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await handleSave(false);
                                    setExitConfirmOpen(false);
                                    router.visit('/app/settings');
                                }}
                                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/25 transition-all"
                            >
                                Save &amp; Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Branded Media Library Modal */}
            <MediaLibraryModal
                isOpen={mediaModalOpen}
                onClose={() => setMediaModalOpen(false)}
                onSelect={(url, asset) => {
                    const pickerInfo = activePickerRef.current || {};
                    const ed = pickerInfo.editor || editorInstance.current;
                    const comp = pickerInfo.component || ed?.getSelected?.() || lastSelectedComponentRef.current;
                    const targetType = pickerInfo.target || 'element';

                    if (typeof pickerInfo.onSelect === 'function') {
                        try {
                            pickerInfo.onSelect(url, asset);
                        } catch (e) {
                            console.error('Error in picker onSelect callback:', e);
                        }
                    } else if (ed) {
                        applyAssetToSelected(ed, url, targetType, asset, comp);
                    }
                    setIsDirty(true);
                    setMediaModalOpen(false);
                }}
                currentValue={mediaCurrentValue}
                title={mediaModalTitle}
                tenant={tenant}
            />

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-[#181b26] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-slideUp">
                    <div className="flex-shrink-0 mt-0.5">
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {toast.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {toast.message}
                        </div>
                        {toast.link && (
                            <a
                                href={toast.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 mt-2 hover:underline"
                            >
                                <span>View Live Site</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Desktop Screen Recommendation Warning on < 1024px */}
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-md text-center text-white">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mb-4">
                    <Monitor className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold mb-2">Desktop Display Recommended</h2>
                <p className="text-xs text-slate-300 max-w-sm mb-6 leading-relaxed">
                    The UMAHZ Visual Page Builder requires a larger display for drag-and-drop website composition. Please open this page on a desktop computer or maximize your browser window.
                </p>
                <button
                    type="button"
                    onClick={handleExit}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Settings</span>
                </button>
            </div>
        </div>
    );
}
