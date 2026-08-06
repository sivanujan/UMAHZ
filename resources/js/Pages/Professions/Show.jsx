import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import Button from '@/Components/UI/Button';
import CTABanner from '@/Components/Home/CTABanner';
import { PROFESSIONS, getProfessionBySlug } from '@/Data/professions';

export default function ProfessionShow({ slug }) {
    const profession = getProfessionBySlug(slug);

    if (!profession) {
        return (
            <PublicLayout>
                <Head title="Profession Not Found" />
                <section className="py-24 px-6 text-center">
                    <p className="text-slate-500">That profession page could not be found.</p>
                    <Link href="/professions" className="text-[#5B2EFF] font-semibold">Back to Professions</Link>
                </section>
            </PublicLayout>
        );
    }

    const Icon = profession.icon;

    return (
        <PublicLayout>
            <Head title={profession.name} />

            <section className="py-16 md:py-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: profession.bg }}>
                            <Icon className="w-8 h-8" style={{ color: profession.stroke }} strokeWidth={1.8} />
                        </div>
                        <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 px-4 py-1.5 rounded-full mb-4">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-600">{profession.tagline}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] leading-tight">
                            {profession.name}
                        </h1>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-6">
                            {profession.heroDescription}
                        </p>
                        <div className="mt-8">
                            <Button href="/contact" size="lg">Book a Demo</Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] leading-tight">
                            What's <em className="not-italic font-light font-serif text-[#5B2EFF]">Included</em>
                        </h2>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed mt-4">
                            Documentation modules built specifically for {profession.name.toLowerCase()} practitioners.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profession.modules.map((m) => (
                            <div key={m.title} className="flex gap-4 bg-[#F9F5FB] border border-purple-100 rounded-3xl p-6 shadow-sm">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: profession.bg }}>
                                    <CheckCircle2 className="w-5 h-5" style={{ color: profession.stroke }} />
                                </div>
                                <div>
                                    <h3 className="text-[#1E0B3C] font-bold text-base mb-1">{m.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{m.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3">
                    {PROFESSIONS.filter((p) => p.slug !== profession.slug).map((p) => (
                        <Link
                            key={p.slug}
                            href={`/professions/${p.slug}`}
                            className="inline-flex items-center bg-white hover:bg-purple-50 text-[#5B2EFF] border border-purple-200 font-semibold px-5 py-2.5 rounded-full transition-colors text-sm"
                        >
                            {p.name}
                        </Link>
                    ))}
                </div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
