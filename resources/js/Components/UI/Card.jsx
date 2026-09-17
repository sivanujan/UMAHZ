import React from 'react';
import { Link } from '@inertiajs/react';

export function Card({ className = '', children }) {
    return (
        <div className={`bg-white dark:bg-[#131B2B] border border-purple-100/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 transition-all duration-300 ${className}`}>
            {children}
        </div>
    );
}

export function IconCard({ icon: Icon, iconBg = '#ede9fe', iconColor = '#5B2EFF', title, description, href, linkLabel = 'Learn More', index }) {
    return (
        <div className="relative bg-white dark:bg-[#131B2B] border border-purple-100/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl dark:hover:border-purple-500/40 hover:-translate-y-1.5 transition-all duration-300 group flex flex-col justify-between">
            <div>
                {typeof index === 'number' && (
                    <span className="absolute top-5 right-5 text-[11px] font-bold text-purple-300 dark:text-slate-500 group-hover:text-purple-400 transition-colors duration-300 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                )}
                <div className="relative w-12 h-12 mb-4 flex-shrink-0">
                    <span className="absolute inset-0 rounded-2xl blur-md opacity-40 dark:opacity-20 scale-110" style={{ background: iconBg }} />
                    <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center border border-white/40 dark:border-slate-700/50" style={{ background: iconBg }}>
                        <Icon className="w-6 h-6" style={{ color: iconColor }} strokeWidth={1.8} />
                    </div>
                </div>
                <h3 className="text-[#1E0B3C] dark:text-white font-bold text-base mb-2 pr-8 tracking-tight">{title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5 font-normal">{description}</p>
            </div>
            {href && (
                <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B2EFF] dark:text-[#8B6BFF] hover:text-purple-800 dark:hover:text-purple-300 transition-colors pt-3 border-t border-purple-50 dark:border-slate-800/80">
                    <span>{linkLabel}</span>
                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                        →
                    </span>
                </Link>
            )}
        </div>
    );
}
