import React from 'react';
import Navbar from '@/Components/Layout/Navbar';
import FooterSection from '@/Components/Home/FooterSection';
import { ThemeProvider } from '@/Contexts/ThemeContext';

export default function PublicLayout({ children }) {
    return (
        <ThemeProvider>
            <div className="min-h-screen bg-[#F9F5FB] dark:bg-[#0B0F19] font-sans antialiased text-slate-800 dark:text-slate-100 selection:bg-[#2563EB] selection:text-white transition-colors duration-200">
                <Navbar />
                <main>{children}</main>
                <FooterSection />
            </div>
        </ThemeProvider>
    );
}

