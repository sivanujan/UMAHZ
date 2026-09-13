import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Navbar from '@/Components/Layout/Navbar';
import FooterSection from '@/Components/Home/FooterSection';
import { ThemeProvider } from '@/Contexts/ThemeContext';
import { EASING } from '@/Utils/motion';

export default function PublicLayout({ children }) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-[#F9F5FB] dark:bg-[#0B0F19] font-sans antialiased text-slate-800 dark:text-slate-100 selection:bg-[#5B2EFF] selection:text-white transition-colors duration-200 flex flex-col">
                <Navbar />
                <motion.main
                    initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0.01 : 0.3, ease: EASING }}
                    className="flex-1"
                >
                    {children}
                </motion.main>
                <FooterSection />
            </div>
        </ThemeProvider>
    );
}
