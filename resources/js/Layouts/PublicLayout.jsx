import React from 'react';
import Navbar from '@/Components/Layout/Navbar';
import FooterSection from '@/Components/Home/FooterSection';

export default function PublicLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 selection:bg-[#2563EB] selection:text-white">
            <Navbar />
            <main>{children}</main>
            <FooterSection />
        </div>
    );
}
