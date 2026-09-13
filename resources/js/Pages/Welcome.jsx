import React from 'react';
import { Head } from '@inertiajs/react';
import HeroSection from '@/Components/Home/HeroSection';
import AboutSection from '@/Components/Home/AboutSection';
import ServicesSection from '@/Components/Home/ServicesSection';
import ProcessSection from '@/Components/Home/ProcessSection';
import BookingSection from '@/Components/Home/BookingSection';
import TestimonialsSection from '@/Components/Home/TestimonialsSection';
import DoctorsSection from '@/Components/Home/DoctorsSection';
import CTABanner from '@/Components/Home/CTABanner';
import FooterSection from '@/Components/Home/FooterSection';
import { ThemeProvider } from '@/Contexts/ThemeContext';

export default function Welcome() {
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
                <TestimonialsSection />
                <DoctorsSection />
                <CTABanner />
                <FooterSection />
            </div>
        </ThemeProvider>
    );
}

