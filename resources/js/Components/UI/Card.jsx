import React from 'react';
import { Link } from '@inertiajs/react';

export function Card({ className = '', children }) {
    return (
        <div className={`bg-white border border-purple-100 rounded-3xl p-6 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

export function IconCard({ icon: Icon, iconBg = '#ede9fe', iconColor = '#5B2EFF', title, description, href, linkLabel = 'Learn More' }) {
    return (
        <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0" style={{ background: iconBg }}>
                <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.8} />
            </div>
            <h3 className="text-[#1E0B3C] font-bold text-base mb-2">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed flex-1 mb-5">{description}</p>
            {href && (
                <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-[#5B2EFF] hover:text-purple-800 transition-colors">
                    {linkLabel}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </Link>
            )}
        </div>
    );
}
