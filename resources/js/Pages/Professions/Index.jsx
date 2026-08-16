import React from 'react';
import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { IconCard } from '@/Components/UI/Card';
import CTABanner from '@/Components/Home/CTABanner';
import { PROFESSIONS } from '@/Data/professions';

export default function ProfessionsIndex() {
    return (
        <PublicLayout>
            <Head title="Professions" />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-pink-600">Supported Modalities</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                        Built For Every{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF]">Wellness</em> Profession
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
                        Each profession gets its own charting templates, terminology, and workflows — not a generic form stretched to fit.
                    </p>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {PROFESSIONS.map((p) => (
                        <IconCard
                            key={p.slug}
                            icon={p.icon}
                            iconBg={p.bg}
                            iconColor={p.stroke}
                            title={p.name}
                            description={p.description}
                            href={`/professions/${p.slug}`}
                            linkLabel="View Modules"
                        />
                    ))}
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
