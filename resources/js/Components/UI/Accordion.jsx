import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { EASING } from '@/Utils/motion';

export default function Accordion({ items }) {
    const [openIndex, setOpenIndex] = useState(0);
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="space-y-4">
            {items.map((item, i) => {
                const open = openIndex === i;
                const buttonId = `accordion-btn-${i}`;
                const regionId = `accordion-region-${i}`;

                return (
                    <div
                        key={item.question}
                        className="bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md dark:hover:border-purple-500/30 transition-all duration-200 overflow-hidden"
                    >
                        <button
                            id={buttonId}
                            type="button"
                            aria-expanded={open}
                            aria-controls={regionId}
                            onClick={() => setOpenIndex(open ? -1 : i)}
                            className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B2EFF]"
                        >
                            <span className="text-[#1E0B3C] dark:text-white font-bold text-sm sm:text-base leading-snug">
                                {item.question}
                            </span>
                            <span className="w-8 h-8 rounded-full bg-purple-50 dark:bg-slate-800 border border-purple-100/60 dark:border-slate-700 flex items-center justify-center flex-shrink-0 transition-colors">
                                <ChevronDown
                                    className={`w-4 h-4 text-[#5B2EFF] dark:text-purple-300 transition-transform duration-200 ${
                                        open ? 'rotate-180' : ''
                                    }`}
                                />
                            </span>
                        </button>

                        <AnimatePresence initial={false}>
                            {open && (
                                <motion.div
                                    id={regionId}
                                    role="region"
                                    aria-labelledby={buttonId}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{
                                        height: 'auto',
                                        opacity: 1,
                                        transition: {
                                            height: { duration: shouldReduceMotion ? 0.01 : 0.25, ease: EASING },
                                            opacity: { duration: shouldReduceMotion ? 0.01 : 0.2, delay: 0.05 },
                                        },
                                    }}
                                    exit={{
                                        height: 0,
                                        opacity: 0,
                                        transition: {
                                            height: { duration: shouldReduceMotion ? 0.01 : 0.2, ease: EASING },
                                            opacity: { duration: shouldReduceMotion ? 0.01 : 0.15 },
                                        },
                                    }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 pb-5 pt-1 border-t border-slate-100/80 dark:border-slate-800/80">
                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-normal">
                                            {item.answer}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
