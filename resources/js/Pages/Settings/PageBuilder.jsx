import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import {
    Save, Eye, ExternalLink, Undo, Redo, Smartphone,
    Tablet, Monitor, Check, AlertCircle, Sparkles, Layers, Sliders, LayoutGrid, Settings
} from 'lucide-react';

export default function PageBuilder({ tenant }) {
    const editorRef = useRef(null);
    const editorInstance = useRef(null);
    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState(null); // 'ok' | 'error' | null
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState('blocks'); // 'blocks' | 'styles' | 'traits' | 'layers'
    const [currentDevice, setCurrentDevice] = useState('Desktop');

    // Helper to apply chosen/uploaded image URL to currently selected element in canvas
    function applyAssetToSelected(editor, src) {
        if (!editor || !src) return;
        const selected = editor.getSelected();
        if (!selected) return;

        if (selected.is('image') || selected.get('type') === 'image' || selected.get('tagName') === 'img') {
            selected.set('src', src);
            selected.addAttributes({ src: src });
            if (selected.view && selected.view.el) {
                selected.view.el.setAttribute('src', src);
                selected.view.el.src = src;
            }
        } else {
            selected.addStyle({
                'background-image': `url("${src}")`,
                'background-size': 'cover',
                'background-position': 'center center',
                'background-repeat': 'no-repeat',
            });
            if (selected.view && selected.view.el) {
                selected.view.el.style.backgroundImage = `url("${src}")`;
                selected.view.el.style.backgroundSize = 'cover';
                selected.view.el.style.backgroundPosition = 'center center';
                selected.view.el.style.backgroundRepeat = 'no-repeat';
            }
        }

        try {
            editor.Modal.close();
        } catch (e) {}
    }

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
                uploadName: 'file',
                autoAdd: true,
                uploadFile: function(e) {
                    // Extract files safely from various event structures (drag-drop, change event, array, FileList)
                    let files = [];
                    if (e instanceof FileList || Array.isArray(e)) {
                        files = Array.from(e);
                    } else if (e?.dataTransfer?.files?.length) {
                        files = Array.from(e.dataTransfer.files);
                    } else if (e?.target?.files?.length) {
                        files = Array.from(e.target.files);
                    } else if (e?.files?.length) {
                        files = Array.from(e.files);
                    } else if (e instanceof File || e instanceof Blob) {
                        files = [e];
                    }

                    // Keep only genuine File / Blob instances
                    files = files.filter(f => f instanceof File || f instanceof Blob);

                    // If no valid file was supplied, check if a URL string was entered
                    if (!files.length) {
                        let potentialUrl = '';
                        if (typeof e === 'string' && (e.startsWith('http://') || e.startsWith('https://') || e.startsWith('data:') || e.startsWith('/'))) {
                            potentialUrl = e.trim();
                        } else if (e?.target?.value && typeof e.target.value === 'string' && (e.target.value.startsWith('http://') || e.target.value.startsWith('https://') || e.target.value.startsWith('data:') || e.target.value.startsWith('/'))) {
                            potentialUrl = e.target.value.trim();
                        }

                        if (potentialUrl) {
                            const am = editor.AssetManager || editor.Assets;
                            if (am) {
                                try { am.add(potentialUrl); } catch {}
                            }
                            applyAssetToSelected(editor, potentialUrl);
                            setIsDirty(true);
                        }
                        // Stop here without sending an empty request that produces 422 error
                        return;
                    }

                    const formData = new FormData();
                    formData.append('file', files[0]);
                    formData.append('uploadName', 'file');

                    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                        || document.querySelector('meta[name="csrf-token"]')?.content
                        || '';

                    fetch('/app/settings/page-builder/upload', {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': token,
                            'Accept': 'application/json',
                        },
                        body: formData,
                    })
                    .then(res => res.json())
                    .then(data => {
                        const imgUrl = data.url || (data.data && data.data[0]);
                        if (imgUrl) {
                            // Add to Asset Manager store
                            const am = editor.AssetManager || editor.Assets;
                            if (am) {
                                try {
                                    am.add({
                                        src: imgUrl,
                                        type: 'image',
                                        name: files[0]?.name || 'Uploaded Image',
                                    });
                                } catch {}
                            }

                            // Apply immediately to selected element & close modal
                            applyAssetToSelected(editor, imgUrl);
                            setIsDirty(true);
                        } else if (data.error) {
                            alert('Upload failed: ' + data.error);
                        }
                    })
                    .catch(err => {
                        console.error('Image upload failed:', err);
                        alert('Image upload failed. Please try again.');
                    });
                },
                assets: [
                    {
                        type: 'image',
                        src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
                        name: 'Clinic Interior Reception',
                    },
                    {
                        type: 'image',
                        src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
                        name: 'Modern Treatment Room',
                    },
                    {
                        type: 'image',
                        src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
                        name: 'Doctor Consultation',
                    },
                    {
                        type: 'image',
                        src: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&q=80',
                        name: 'Wellness Rehabilitation',
                    },
                    {
                        type: 'image',
                        src: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
                        name: 'Medical Stethoscope & Care',
                    },
                    {
                        type: 'image',
                        src: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
                        name: 'Healthcare Team Collaboration',
                    },
                ],
            },
            deviceManager: {
                devices: [
                    { name: 'Desktop', width: '' },
                    { name: 'Tablet', width: '768px', widthMedia: '992px' },
                    { name: 'Mobile', width: '375px', widthMedia: '480px' },
                ],
            },
            blockManager: {
                appendTo: '#gjs-blocks',
            },
            styleManager: {
                appendTo: '#gjs-styles',
                sectors: [
                    {
                        name: '🎨 Colors & Backgrounds',
                        open: true,
                        buildProps: [
                            'background-color', 'background-image', 'background-size',
                            'background-position', 'background-repeat', 'color', 'opacity'
                        ],
                        properties: [
                            {
                                name: 'Background Color',
                                property: 'background-color',
                                type: 'color',
                                defaults: 'transparent',
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
                            {
                                name: 'Text Color',
                                property: 'color',
                                type: 'color',
                                defaults: '#0f172a',
                            },
                        ],
                    },
                    {
                        name: '🔤 Typography',
                        open: false,
                        buildProps: [
                            'font-family', 'font-size', 'font-weight', 'letter-spacing',
                            'line-height', 'text-align', 'text-decoration', 'text-transform', 'text-shadow'
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
                        ],
                    },
                    {
                        name: '📐 Layout & Spacing',
                        open: false,
                        buildProps: [
                            'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
                            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                            'width', 'height', 'max-width', 'min-height'
                        ],
                    },
                    {
                        name: '✨ Borders & Shadows',
                        open: false,
                        buildProps: [
                            'border-radius', 'border', 'border-width', 'border-style',
                            'border-color', 'box-shadow', 'transition', 'cursor'
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

        // Inject smooth scrolling & section anchor offset into canvas iframe
        editor.on('load', () => {
            try {
                const doc = editor.Canvas.getDocument();
                if (doc) {
                    const style = doc.createElement('style');
                    style.innerHTML = `
                        html { scroll-behavior: smooth !important; }
                        [id] { scroll-margin-top: 80px !important; }
                        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
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
                el.style.margin = '4px 0 14px 0';
                el.innerHTML = `
                    <button type="button" style="width: 100%; padding: 10px 14px; background: #7c3aed; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.84rem; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35); transition: opacity 0.2s ease;">
                        <span>📁 Choose / Upload Image</span>
                    </button>
                    <p style="margin: 6px 0 0 0; font-size: 0.72rem; color: #94a3b8; text-align: center; line-height: 1.3;">Select from your clinic files, upload from PC, or paste a URL below.</p>
                `;
                el.querySelector('button').addEventListener('click', () => {
                    refreshTenantAssets();
                    editor.runCommand('open-assets');
                });
                return el;
            },
        });

        // Custom trait button to set / clear background image on any section or container
        editor.TraitManager.addType('button-bg-assets', {
            createInput() {
                const el = document.createElement('div');
                el.style.margin = '4px 0 14px 0';
                el.innerHTML = `
                    <div style="display: flex; gap: 8px; flex-direction: column;">
                        <button type="button" class="btn-choose-bg" style="width: 100%; padding: 10px 14px; background: #7c3aed; color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.84rem; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);">
                            <span>🌄 Set Background Image</span>
                        </button>
                        <button type="button" class="btn-clear-bg" style="width: 100%; padding: 6px 10px; background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.75rem;">
                            Clear Background Image
                        </button>
                    </div>
                    <p style="margin: 6px 0 0 0; font-size: 0.72rem; color: #94a3b8; text-align: center; line-height: 1.3;">Pick from clinic files or upload a new background photo.</p>
                `;
                el.querySelector('.btn-choose-bg').addEventListener('click', () => {
                    refreshTenantAssets();
                    editor.runCommand('open-assets');
                });
                el.querySelector('.btn-clear-bg').addEventListener('click', () => {
                    const selected = editor.getSelected();
                    if (selected) {
                        selected.addStyle({ 'background-image': 'none' });
                        if (selected.view && selected.view.el) {
                            selected.view.el.style.backgroundImage = 'none';
                        }
                        setIsDirty(true);
                    }
                });
                return el;
            },
        });

        // Customize link component traits
        const domc = editor.DomComponents;
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
                            label: 'Image Source',
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

        // AUTO-OPEN Style / Traits Manager on Element Selection
        editor.on('component:selected', (model) => {
            if (!model) return;
            const traits = model.get('traits');
            if (model.is('image') || model.get('type') === 'image' || model.get('tagName') === 'img') {
                setActiveTab('traits');
                if (traits && typeof traits.find === 'function' && !traits.find(t => t.get('name') === 'btn_open_assets')) {
                    traits.unshift({
                        type: 'button-open-assets',
                        name: 'btn_open_assets',
                        label: 'Image Source',
                    });
                }
            } else if (model.is('link')) {
                setActiveTab('traits');
            } else {
                // For any container / section / column, provide background image trait
                if (traits && typeof traits.find === 'function' && !traits.find(t => t.get('name') === 'btn_bg_assets')) {
                    traits.unshift({
                        type: 'button-bg-assets',
                        name: 'btn_bg_assets',
                        label: 'Background Image',
                    });
                }
            }
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

        // Double-click on images launches GrapesJS Asset Manager modal
        editor.on('component:doubleclick', (model) => {
            if (model && (model.is('image') || model.get('type') === 'image' || model.get('tagName') === 'img')) {
                refreshTenantAssets();
                editor.runCommand('open-assets');
            }
        });

        // Track changes
        editor.on('component:update style:update block:drag:stop', () => {
            setIsDirty(true);
        });

        return () => {
            editor.destroy();
        };
    }, []);

    // Save & Publish Handler
    async function handleSave() {
        if (!editorInstance.current) return;
        setSaving(true);
        setSaveState(null);

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
            } else {
                const errorMsg = data?.error || data?.message || `HTTP ${res.status}`;
                console.error('Save page layout failed:', res.status, errorMsg);
                setSaveState('error');
                if (res.status === 419) {
                    alert('Session expired. Please refresh the page and try again.');
                }
            }
        } catch (err) {
            console.error('Save page layout exception:', err);
            setSaveState('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveState(null), 3000);
        }
    }

    // Switch Viewport Device
    function setDevice(device) {
        if (!editorInstance.current) return;
        editorInstance.current.setDevice(device);
        setCurrentDevice(device);
    }

    return (
        <AuthenticatedLayout title="GrapesJS Page Builder">
            <Head title="Visual Page Builder" />

            <style>{`
                /* GrapesJS Custom High-Contrast Dark Theme */
                .gjs-one-bg { background-color: #0f1117 !important; }
                .gjs-two-color { color: #94a3b8 !important; }
                .gjs-three-bg { background-color: #1e293b !important; }
                .gjs-four-color, .gjs-four-color-h:hover { color: #8b5cf6 !important; }
                
                .gjs-block { background: #181b25 !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 8px !important; color: #f8fafc !important; }
                .gjs-block:hover { border-color: #8b5cf6 !important; background: #232736 !important; }
                
                .gjs-sm-sector { border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
                .gjs-sm-sector-title { background: #141721 !important; color: #f8fafc !important; font-weight: 700 !important; padding: 10px 12px !important; font-size: 0.82rem !important; }
                .gjs-sm-label, .gjs-trt-trait-label { color: #cbd5e1 !important; font-weight: 600 !important; font-size: 0.78rem !important; }
                
                .gjs-field, .gjs-field input, .gjs-field select { background-color: #1e293b !important; color: #f8fafc !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 6px !important; }
                .gjs-field-colorp-c { border-radius: 4px !important; }
                
                .gjs-badge { background: #7c3aed !important; color: white !important; }
                .gjs-toolbar { background: #1e293b !important; border-radius: 6px !important; }
                .gjs-cv-canvas { width: 100% !important; height: 100% !important; background-color: #0b0d12 !important; }

                /* Asset Manager Modal & File Uploader Dark Theme */
                .gjs-mdl-dialog { background-color: #0f1117 !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 12px !important; color: #f8fafc !important; max-width: 820px !important; width: 92% !important; }
                .gjs-mdl-header { border-bottom: 1px solid rgba(255,255,255,0.08) !important; font-weight: 700 !important; color: #f8fafc !important; }
                .gjs-mdl-btn-close { color: #94a3b8 !important; }
                .gjs-am-assets-cont { background-color: #141721 !important; border-radius: 8px !important; padding: 16px !important; min-height: 220px !important; max-height: 380px !important; overflow-y: auto !important; }
                .gjs-am-assets { display: flex !important; flex-wrap: wrap !important; gap: 14px !important; }
                .gjs-am-asset { background: #1e293b !important; border: 2px solid rgba(255,255,255,0.08) !important; border-radius: 10px !important; width: 140px !important; height: 110px !important; overflow: hidden !important; cursor: pointer !important; transition: all 0.2s ease !important; position: relative !important; }
                .gjs-am-asset:hover { border-color: #8b5cf6 !important; transform: scale(1.03) !important; box-shadow: 0 4px 14px rgba(139,92,246,0.3) !important; }
                .gjs-am-asset-image { border-radius: 6px !important; width: 100% !important; height: 100% !important; object-fit: cover !important; }
                .gjs-am-file-uploader { background: #161922 !important; border: 2px dashed rgba(255,255,255,0.18) !important; border-radius: 10px !important; color: #cbd5e1 !important; padding: 24px !important; margin-bottom: 16px !important; }
                .gjs-am-file-uploader:hover { border-color: #8b5cf6 !important; background: #1a1e2b !important; }
                .gjs-am-add-asset button { background: #7c3aed !important; border-radius: 6px !important; font-weight: 600 !important; }

                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', margin: '-32px' }}>
                
                {/* Top Action Bar */}
                <div style={{
                    background: '#0f1117',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 30,
                    flexShrink: 0,
                }}>
                    {/* Title & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles style={{ width: 18, height: 18, color: '#8b5cf6' }} />
                            <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                                GrapesJS Page Builder
                            </h1>
                        </div>
                        {isDirty ? (
                            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                ● Unsaved Changes
                            </span>
                        ) : (
                            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                ✓ Published
                            </span>
                        )}
                    </div>

                    {/* Device Viewport Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', background: '#161922', borderRadius: 8, padding: 3, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            type="button"
                            onClick={() => setDevice('Desktop')}
                            style={{ padding: '6px 12px', background: currentDevice === 'Desktop' ? '#7c3aed' : 'transparent', color: currentDevice === 'Desktop' ? 'white' : '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600 }}
                        >
                            <Monitor style={{ width: 14, height: 14 }} /> Desktop
                        </button>
                        <button
                            type="button"
                            onClick={() => setDevice('Tablet')}
                            style={{ padding: '6px 12px', background: currentDevice === 'Tablet' ? '#7c3aed' : 'transparent', color: currentDevice === 'Tablet' ? 'white' : '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600 }}
                        >
                            <Tablet style={{ width: 14, height: 14 }} /> Tablet
                        </button>
                        <button
                            type="button"
                            onClick={() => setDevice('Mobile')}
                            style={{ padding: '6px 12px', background: currentDevice === 'Mobile' ? '#7c3aed' : 'transparent', color: currentDevice === 'Mobile' ? 'white' : '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600 }}
                        >
                            <Smartphone style={{ width: 14, height: 14 }} /> Mobile
                        </button>
                    </div>

                    {/* Right Tools & Save */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            type="button"
                            onClick={() => editorInstance.current?.UndoManager?.undo()}
                            style={{ background: '#161922', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', color: '#e2e8f0', cursor: 'pointer' }}
                            title="Undo"
                        >
                            <Undo style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                            type="button"
                            onClick={() => editorInstance.current?.UndoManager?.redo()}
                            style={{ background: '#161922', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', color: '#e2e8f0', cursor: 'pointer' }}
                            title="Redo"
                        >
                            <Redo style={{ width: 14, height: 14 }} />
                        </button>

                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#161922', color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        >
                            <Eye style={{ width: 14, height: 14 }} />
                            Preview Page
                            <ExternalLink style={{ width: 12, height: 12, opacity: 0.6 }} />
                        </a>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 18px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700,
                                background: saveState === 'ok' ? '#16a34a' : saveState === 'error' ? '#dc2626' : '#7c3aed',
                                color: 'white', border: 'none', cursor: saving ? 'wait' : 'pointer',
                                opacity: saving ? 0.7 : 1, minWidth: 140, justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                            }}
                        >
                            {saving ? (
                                <>
                                    <span style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                    Saving…
                                </>
                            ) : saveState === 'ok' ? (
                                <><Check style={{ width: 14, height: 14 }} /> Saved &amp; Published!</>
                            ) : saveState === 'error' ? (
                                <><AlertCircle style={{ width: 14, height: 14 }} /> Error Saving</>
                            ) : (
                                <><Save style={{ width: 14, height: 14 }} /> Save &amp; Publish</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Editor Container */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Left Sidebar Panel (Blocks / Style / Settings / Layers) */}
                    <div style={{ width: 290, background: '#0f1117', borderRight: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        {/* Tab Switcher Header */}
                        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#141721' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('blocks')}
                                style={{ flex: 1, padding: '12px 4px', background: activeTab === 'blocks' ? '#0f1117' : 'transparent', color: activeTab === 'blocks' ? '#8b5cf6' : '#64748b', border: 'none', borderBottom: activeTab === 'blocks' ? '2px solid #8b5cf6' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.70rem', fontWeight: 700 }}
                            >
                                <LayoutGrid style={{ width: 15, height: 15 }} /> Blocks
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('styles')}
                                style={{ flex: 1, padding: '12px 4px', background: activeTab === 'styles' ? '#0f1117' : 'transparent', color: activeTab === 'styles' ? '#8b5cf6' : '#64748b', border: 'none', borderBottom: activeTab === 'styles' ? '2px solid #8b5cf6' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.70rem', fontWeight: 700 }}
                            >
                                <Sliders style={{ width: 15, height: 15 }} /> Style
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('traits')}
                                style={{ flex: 1, padding: '12px 4px', background: activeTab === 'traits' ? '#0f1117' : 'transparent', color: activeTab === 'traits' ? '#8b5cf6' : '#64748b', border: 'none', borderBottom: activeTab === 'traits' ? '2px solid #8b5cf6' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.70rem', fontWeight: 700 }}
                            >
                                <Settings style={{ width: 15, height: 15 }} /> Settings
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('layers')}
                                style={{ flex: 1, padding: '12px 4px', background: activeTab === 'layers' ? '#0f1117' : 'transparent', color: activeTab === 'layers' ? '#8b5cf6' : '#64748b', border: 'none', borderBottom: activeTab === 'layers' ? '2px solid #8b5cf6' : 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.70rem', fontWeight: 700 }}
                            >
                                <Layers style={{ width: 15, height: 15 }} /> Layers
                            </button>
                        </div>

                        {/* Panel Content Areas */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                            <div id="gjs-blocks" style={{ display: activeTab === 'blocks' ? 'block' : 'none' }} />
                            <div id="gjs-styles" style={{ display: activeTab === 'styles' ? 'block' : 'none' }} />
                            <div id="gjs-traits" style={{ display: activeTab === 'traits' ? 'block' : 'none' }} />
                            <div id="gjs-layers" style={{ display: activeTab === 'layers' ? 'block' : 'none' }} />
                        </div>
                    </div>

                    {/* Central Live GrapesJS Canvas */}
                    <div style={{ flex: 1, position: 'relative', background: '#0b0d12' }}>
                        <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
