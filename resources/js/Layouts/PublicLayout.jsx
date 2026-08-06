import React from 'react';
import Navbar from '@/Components/Layout/Navbar';
import FooterSection from '@/Components/Home/FooterSection';

export default function PublicLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#F9F5FB] font-sans antialiased text-slate-800 selection:bg-[#5B2EFF] selection:text-white">
            <header className="bg-[#F9F5FB] relative overflow-hidden">
                <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
                <Navbar />
            </header>
            <main>{children}</main>
            <FooterSection />
        </div>
    );
}
