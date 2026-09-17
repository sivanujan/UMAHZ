import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import Button from '@/Components/UI/Button';
import CTABanner from '@/Components/Home/CTABanner';
import PillBadge from '@/Components/Common/PillBadge';
import { PROFESSIONS, getProfessionBySlug } from '@/Data/professions';
import {
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createCardHover,
} from '@/Utils/motion';

export default function ProfessionShow({ slug }) {
    const profession = getProfessionBySlug(slug);
    const shouldReduceMotion = useReducedMotion();

    if (!profession) {
        return (
            <PublicLayout>
                <Head title="Profession Not Found" />
                <section className="py-24 px-6 text-center">
                    <p className="text-slate-600 dark:text-slate-300">That profession page could not be found.</p>
                    <Link href="/professions" className="text-[#5B2EFF] dark:text-[#8B6BFF] font-semibold mt-2 inline-block">Back to Professions</Link>
                </section>
            </PublicLayout>
        );
    }

    const Icon = profession.icon;
    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title={`${profession.name} — Practice Management Module`} />

            {/* Hero Section */}
            <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-7xl mx-auto"
                >
                    <div className="text-center max-w-3xl mx-auto">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs border border-white/40 dark:border-slate-700/60"
                            style={{ background: profession.bg }}
                        >
                            <Icon className="w-8 h-8" style={{ color: profession.stroke }} strokeWidth={1.8} />
                        </div>
                        <div className="mb-4">
                            <PillBadge text={profession.tagline} />
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            {profession.name}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 font-normal">
                            {profession.heroDescription}
                        </p>
                        <div className="mt-8">
                            <Button href="/contact" size="lg">Book a Demo</Button>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Included Modules Section */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                        className="text-center max-w-2xl mx-auto mb-12"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                            What's <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Included</em>
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-4 font-normal">
                            Documentation modules built specifically for {profession.name.toLowerCase()} practitioners.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={VIEWPORT_ONCE}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {profession.modules.map((m) => (
                            <motion.div
                                key={m.title}
                                variants={cardEntrance}
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className="group flex gap-4 bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300"
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/40 dark:border-slate-700/60 shadow-2xs transition-transform duration-200 group-hover:scale-105"
                                    style={{ background: profession.bg }}
                                >
                                    <CheckCircle2 className="w-5 h-5" style={{ color: profession.stroke }} />
                                </div>
                                <div>
                                    <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-1 tracking-tight">{m.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-normal">{m.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Other Modalities Navigation */}
            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3">
                    {PROFESSIONS.filter((p) => p.slug !== profession.slug).map((p) => (
                        <Link
                            key={p.slug}
                            href={`/professions/${p.slug}`}
                            className="inline-flex items-center bg-white dark:bg-[#131B2B] hover:bg-purple-50 dark:hover:bg-slate-800 text-[#5B2EFF] dark:text-purple-300 border border-purple-200 dark:border-slate-700 font-medium px-5 py-2.5 rounded-full transition-all text-sm hover:scale-[1.02] shadow-xs"
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
