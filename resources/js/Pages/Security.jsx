import React from 'react';
import { Head } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Users, History, Flag, ShieldCheck } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import CTABanner from '@/Components/Home/CTABanner';
import PillBadge from '@/Components/Common/PillBadge';
import {
    VIEWPORT_ONCE,
    createStaggerContainer,
    createFadeInUp,
    createCardHover,
} from '@/Utils/motion';

const SECTIONS = [
    {
        icon: Lock,
        iconBg: 'bg-purple-100/90 dark:bg-purple-950/70 border border-purple-200/60 dark:border-purple-800/50 text-[#5B2EFF] dark:text-purple-300',
        title: 'Encryption',
        description: 'All client data is encrypted in transit with TLS 1.2+ and at rest with AES-256, from intake forms to SOAP notes and payment records.',
    },
    {
        icon: Users,
        iconBg: 'bg-pink-100/90 dark:bg-pink-950/70 border border-pink-200/60 dark:border-pink-800/50 text-pink-600 dark:text-pink-300',
        title: 'Role-Based Access',
        description: 'Every staff member sees only what their role requires — practitioners, front-desk, and clinic owners each have scoped permissions across locations.',
    },
    {
        icon: History,
        iconBg: 'bg-amber-100/90 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-300',
        title: 'Audit Logging',
        description: 'Every record view, edit, and export is logged with a timestamp and user ID, giving clinics a full audit trail for compliance reviews.',
    },
    {
        icon: Flag,
        iconBg: 'bg-indigo-100/90 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-300',
        title: 'Canadian Data Hosting',
        description: 'Client data is hosted in Canadian data centres by default, giving clinics a local data residency option for their practice.',
    },
    {
        icon: ShieldCheck,
        iconBg: 'bg-teal-100/90 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/50 text-teal-600 dark:text-teal-300',
        title: 'Privacy By Design',
        description: 'Signed consent tracking, configurable data retention policies, and scoped role-based access are built into the platform from the ground up — not bolted on after the fact.',
    },
];

export default function Security() {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = createStaggerContainer(0.08, 0.05, shouldReduceMotion);
    const cardEntrance = createFadeInUp(16, 0.45, shouldReduceMotion);
    const cardHover = createCardHover(shouldReduceMotion);

    return (
        <PublicLayout>
            <Head title="Security & Privacy — Clinical Compliance Built-In" />

            <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6 md:px-12 lg:px-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    variants={createFadeInUp(16, 0.45, shouldReduceMotion)}
                    className="max-w-3xl mx-auto text-center"
                >
                    <div className="mb-4">
                        <PillBadge text="Trust & Security" />
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E0B3C] dark:text-white leading-tight tracking-tight">
                        Security Built For{' '}
                        <em className="not-italic font-light font-serif text-[#5B2EFF] dark:text-[#8B6BFF]">Clinical</em> Data
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-2xl mx-auto font-normal">
                        Client records deserve more than a generic SaaS checklist. Here's how UMAHZ protects the data your practice depends on.
                    </p>
                </motion.div>
            </section>

            <section className="pb-16 md:pb-24 px-6 md:px-12 lg:px-24">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_ONCE}
                    className="max-w-4xl mx-auto space-y-6"
                >
                    {SECTIONS.map((s) => {
                        const IconComponent = s.icon;
                        return (
                            <motion.div
                                key={s.title}
                                variants={cardEntrance}
                                initial="rest"
                                whileHover="hover"
                                {...cardHover}
                                className="group flex items-start gap-5 bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300"
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${s.iconBg}`}>
                                    <IconComponent className="w-6 h-6" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <h3 className="text-[#1E0B3C] dark:text-white font-bold text-lg mb-1.5 tracking-tight">{s.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-normal">{s.description}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            <CTABanner />
        </PublicLayout>
    );
}
