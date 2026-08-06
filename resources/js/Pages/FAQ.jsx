import React from 'react';
import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import Accordion from '@/Components/UI/Accordion';
import CTABanner from '@/Components/Home/CTABanner';

const FAQS = [
    { question: 'What is UMAHZ?', answer: 'UMAHZ is an all-in-one practice management platform for multi-modality wellness studios — unifying online booking, client records, profession-specific charting, consent management, billing, and reporting in one system.' },
    { question: 'Which professions does UMAHZ support?', answer: 'UMAHZ ships with purpose-built modules for Massage Therapy, Acupuncture & TCM, Personal Training, Nutrition & Dietetics, and Colon Hydrotherapy — with more modalities added over time.' },
    { question: 'Is there a free trial?', answer: 'Yes — the Solo Practitioner and Growing Clinic plans include a 14-day free trial, no credit card required.' },
    { question: 'How long does onboarding take?', answer: 'Most solo practitioners are live within a day. Multi-practitioner clinics typically complete onboarding, including data migration, within one to two weeks with a dedicated specialist.' },
    { question: 'Can we migrate data from our existing software?', answer: 'Yes. Our onboarding team handles migration of client records, appointment history, and package balances from most common practice management tools at no extra cost on Growing Clinic and Multi-Location plans.' },
    { question: 'Is client data secure, and where is it hosted?', answer: 'Client data is encrypted in transit and at rest, hosted in Canadian data centres by default, with role-based access and full audit logging. See our Security & Privacy page for details.' },
    { question: 'Does UMAHZ support multiple locations?', answer: 'Yes. The Multi-Location plan supports unlimited locations with centralized reporting and per-location room and staff scheduling.' },
    { question: 'Can staff have different permission levels?', answer: 'Every user is assigned a role — such as Clinic Owner, Practitioner, or Front Desk — that scopes what they can see and edit across locations.' },
    { question: "What if my modality isn't listed?", answer: "We're always adding new profession-specific modules. Reach out through our Contact page and we'll work with you to scope a fit for your practice." },
];

export default function FAQ() {
    return (
        <PublicLayout>
            <Head title="FAQ" />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-pink-600">Frequently Asked Questions</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                        Questions,{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Answered</em>
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
                        Everything practitioners ask us before switching to UMAHZ. Can't find your answer? Reach out on our Contact page.
                    </p>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-3xl mx-auto">
                    <Accordion items={FAQS} />
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
