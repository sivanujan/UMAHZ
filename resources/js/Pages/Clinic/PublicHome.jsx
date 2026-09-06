import React from 'react';
import { Head } from '@inertiajs/react';

/**
 * Public clinic home page — rendered at {clinic}.umahz.com/
 *
 * Renders the saved, sanitized GrapesJS HTML & CSS output.
 * Falls back to a clean responsive layout if no custom page design exists yet.
 */
export default function PublicHome({ clinic }) {
    const brandColor = clinic.brand_color || '#6d28d9';
    const hasCustomLayout = Boolean(clinic.gjs_html && clinic.gjs_html.trim().length > 0);

    return (
        <>
            <Head>
                <title>{clinic.name}</title>
                <meta
                    name="description"
                    content={
                        clinic.homepage_settings?.description ||
                        `Welcome to ${clinic.name}. Book appointments and pay invoices online.`
                    }
                />
                <meta property="og:title" content={clinic.name} />
                {clinic.homepage_settings?.cover_image_url && (
                    <meta property="og:image" content={clinic.homepage_settings.cover_image_url} />
                )}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <style>{`
                    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                    html { scroll-behavior: smooth; }
                    [id] { scroll-margin-top: 80px; }
                    body { font-family: 'Inter', -apple-system, sans-serif; background: #ffffff; color: #0f172a; line-height: 1.5; }
                    img { max-width: 100%; height: auto; }
                    a { color: inherit; }
                    ${clinic.gjs_css || ''}
                `}</style>
            </Head>

            <div className="public-clinic-container">
                {hasCustomLayout ? (
                    <div dangerouslySetInnerHTML={{ __html: clinic.gjs_html }} />
                ) : (
                    /* Fallback default responsive home page layout */
                    <main>
                        {/* Hero */}
                        <section style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #1e1b4b 100%)`, color: 'white', padding: '80px 20px', textAction: 'center' }}>
                            <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                                {clinic.logo_url && (
                                    <img src={clinic.logo_url} alt={clinic.name} style={{ maxHeight: 80, marginBottom: 24, borderRadius: 8 }} />
                                )}
                                <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
                                    Welcome to {clinic.name}
                                </h1>
                                <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: 650, margin: '0 auto 32px', lineHeight: 1.6 }}>
                                    High-quality holistic wellness and clinical care tailored for your health.
                                </p>
                                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <a href="/pay" style={{ background: 'white', color: brandColor, padding: '14px 28px', borderRadius: 9999, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                        Pay Invoice Online
                                    </a>
                                    <a href="/login" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '14px 28px', borderRadius: 9999, fontWeight: 600, textDecoration: 'none' }}>
                                        Staff Login Portal
                                    </a>
                                </div>
                            </div>
                        </section>

                        {/* Services */}
                        <section style={{ padding: '70px 20px', background: '#f8fafc' }}>
                            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Our Services & Treatments</h2>
                                    <p style={{ color: '#64748b' }}>Comprehensive care for your health and vitality.</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                                    {(clinic.offeredDisciplineLabels || ['Acupuncture', 'Chiropractic', 'Physiotherapy']).map((d, i) => (
                                        <div key={i} style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: brandColor }}>{d}</h3>
                                            <p style={{ color: '#64748b', fontSize: '0.92rem' }}>Personalized treatment sessions focused on recovery and health goals.</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Contact */}
                        <section style={{ padding: '70px 20px', background: '#ffffff' }}>
                            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
                                <div style={{ background: '#f8fafc', padding: 28, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>📍 Clinic Location</h3>
                                    <p style={{ color: '#475569', margin: '0 0 6px' }}>{clinic.address || 'Address provided upon booking.'}</p>
                                    {clinic.phone && <p style={{ color: '#475569', margin: '0 0 6px' }}>📞 {clinic.phone}</p>}
                                    {clinic.email && <p style={{ color: '#475569', margin: 0 }}>✉️ {clinic.email}</p>}
                                </div>
                                <div style={{ background: '#f8fafc', padding: 28, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>💳 Online Invoice Payment</h3>
                                    <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: 16 }}>Pay your outstanding invoice securely with OTP authentication.</p>
                                    <a href="/pay" style={{ display: 'block', textAlign: 'center', background: brandColor, color: 'white', padding: '12px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
                                        Pay Invoice Now
                                    </a>
                                </div>
                            </div>
                        </section>
                    </main>
                )}

                {/* Footer */}
                <footer style={{ borderTop: '1px solid #e2e8f0', background: '#0f172a', padding: '24px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    © {new Date().getFullYear()} {clinic.name}. Powered by <a href="https://umahz.com" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>UMAHZ</a>.
                </footer>
            </div>
        </>
    );
}
