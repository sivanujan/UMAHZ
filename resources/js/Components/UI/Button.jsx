import React from 'react';
import { Link } from '@inertiajs/react';

const VARIANTS = {
    solid: 'bg-[#5B2EFF] hover:bg-purple-700 dark:bg-[#6D3BFF] dark:hover:bg-[#5B2EFF] text-white shadow-lg shadow-purple-500/20',
    white: 'bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E0B3C] dark:text-white shadow-lg dark:border dark:border-slate-700',
    outline: 'bg-transparent text-[#1E0B3C] dark:text-slate-200 border border-purple-200 dark:border-slate-700 hover:border-[#5B2EFF] dark:hover:border-purple-400 hover:text-[#5B2EFF] dark:hover:text-purple-300',
    'outline-light': 'bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-sm',
    ghost: 'bg-transparent text-[#1E0B3C] dark:text-slate-200 hover:text-[#5B2EFF] dark:hover:text-purple-300',
};

const SIZES = {
    sm: 'px-5 py-2.5 text-xs',
    md: 'px-7 py-3.5 text-sm',
    lg: 'px-8 py-4 text-sm',
};

export default function Button({ href, variant = 'solid', size = 'md', className = '', children, ...props }) {
    const classes = `inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

    if (href) {
        if (href.startsWith('#') || href.startsWith('http')) {
            return <a href={href} className={classes} {...props}>{children}</a>;
        }
        return <Link href={href} className={classes} {...props}>{children}</Link>;
    }

    return <button className={classes} {...props}>{children}</button>;
}
