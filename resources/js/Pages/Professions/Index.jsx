import React from 'react';
import { Head } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import PublicLayout from '@/Layouts/PublicLayout';
import { IconCard } from '@/Components/UI/Card';
import CTABanner from '@/Components/Home/CTABanner';
import PillBadge from '@/Components/Common/PillBadge';
import { PROFESSIONS } from '@/Data/professions';
import {
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
} from '@/Utils/motion';

export default function ProfessionsIndex() {
    const shouldReduceMotion = useReducedMotion();
    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title="Professions — Purpose-Built Practice Modules" />

            <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-3xl mx-auto text-center"
                >
                    <div className="mb-4">
                        <PillBadge text="Supported Modalities" />
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Built For Every{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Wellness</em> Profession
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        Each profession gets its own charting templates, terminology, and workflows — not a generic form stretched to fit.
                    </p>
                </motion.div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {PROFESSIONS.map((p, idx) => (
                        <motion.div key={p.slug} variants={cardEntrance}>
                            <IconCard
                                index={idx}
                                icon={p.icon}
                                iconBg={p.bg}
                                iconColor={p.stroke}
                                title={p.name}
                                description={p.description}
                                href={`/professions/${p.slug}`}
                                linkLabel="View Modules"
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
