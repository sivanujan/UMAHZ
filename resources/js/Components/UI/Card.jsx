import React from 'react';
import { Link } from '@inertiajs/react';

export function Card({ className = '', children }) {
    return (
        <div className={`bg-white border border-purple-100 rounded-3xl p-6 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

export function IconCard({ icon: Icon, iconBg = '#ede9fe', iconColor = '#5B2EFF', title, description, href, linkLabel = 'Learn More', index }) {
    return (
        <div className="relative bg-white border border-purple-100/60 rounded-[20px] p-6 shadow-sm hover:shadow-xl hover:shadow-purple-100/60 hover:-translate-y-1 hover:border-purple-300 transition-all duration-300 group flex flex-col">
            {typeof index === 'number' && (
                <span className="absolute top-5 right-5 text-[11px] font-bold text-purple-200 group-hover:text-purple-300 transition-colors duration-300 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                </span>
            )}
            <div className="relative w-12 h-12 mb-4 flex-shrink-0">
                <span className="absolute inset-0 rounded-2xl blur-md opacity-70 scale-110" style={{ background: iconBg }} />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: iconBg }}>
                    <Icon className="w-6 h-6" style={{ color: iconColor }} strokeWidth={1.8} />
                </div>
            </div>
            <h3 className="text-[#1E0B3C] font-bold text-base mb-2 pr-8">{title}</h3>
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
