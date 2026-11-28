import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import HeroSection from '@/Components/Home/HeroSection';
import AboutSection from '@/Components/Home/AboutSection';
import ServicesSection from '@/Components/Home/ServicesSection';
import ProcessSection from '@/Components/Home/ProcessSection';
import BookingSection from '@/Components/Home/BookingSection';
import TestimonialsSection from '@/Components/Home/TestimonialsSection';
import DoctorsSection from '@/Components/Home/DoctorsSection';
import SetupTutorialSection from '@/Components/Home/SetupTutorialSection';
import CTABanner from '@/Components/Home/CTABanner';
import FooterSection from '@/Components/Home/FooterSection';
import { ThemeProvider } from '@/Contexts/ThemeContext';

export default function Welcome({ bookableClinics = [] }) {
    const [clinicQuery, setClinicQuery] = useState('');
    const filteredClinics = useMemo(() => {
        const q = clinicQuery.trim().toLowerCase();
        if (!q) return bookableClinics.slice(0, 6);
        return bookableClinics.filter(
            (c) => c.name.toLowerCase().includes(q) || (c.tagline || '').toLowerCase().includes(q)
        );
    }, [bookableClinics, clinicQuery]);

    return (
        <ThemeProvider>
            <Head>
                <title>UMAHZ – Integrated Practice Management for Wellness Studios</title>
                <meta name="description" content="UMAHZ is the all-in-one practice management platform for Massage Therapy, Acupuncture, Personal Training, Nutrition, and Colon Hydrotherapy studios. Scheduling, SOAP notes, billing, and more." />
            </Head>
            <div className="min-h-screen bg-[#F9F5FB] dark:bg-[#0B0F19] font-sans antialiased text-slate-800 dark:text-slate-100 selection:bg-[#5B2EFF] selection:text-white transition-colors duration-200">
                <HeroSection />
                <AboutSection />
                <ServicesSection />
                <ProcessSection />
                <BookingSection />
                {bookableClinics.length > 0 && (
                    <section id="find-a-clinic" className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Find a clinic</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Book an appointment online with a UMAHZ wellness clinic.
                                    </p>
                                </div>
                                <input
                                    type="search"
                                    value={clinicQuery}
                                    onChange={(e) => setClinicQuery(e.target.value)}
                                    placeholder="Search clinics by name…"
                                    className="w-full sm:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-2 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredClinics.map((c) => (
                                    <a
                                        key={c.subdomain}
                                        href={c.book_url}
                                        className="block p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition"
                                    >
                                        <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                                        {c.tagline && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.tagline}</p>}
                                        <span className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-3">
                                            Book online →
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
                <TestimonialsSection />
                <DoctorsSection />
                <SetupTutorialSection />
                <CTABanner />
                <FooterSection />
            </div>
        </ThemeProvider>
    );
}

