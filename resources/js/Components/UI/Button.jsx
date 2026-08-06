import React from 'react';
import { Link } from '@inertiajs/react';

const VARIANTS = {
    solid: 'bg-[#5B2EFF] hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20',
    white: 'bg-white hover:bg-purple-50 text-[#1E0B3C] shadow-lg',
    outline: 'bg-transparent text-[#1E0B3C] border border-purple-200 hover:border-[#5B2EFF] hover:text-[#5B2EFF]',
    'outline-light': 'bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-sm',
    ghost: 'bg-transparent text-[#1E0B3C] hover:text-[#5B2EFF]',
};

const SIZES = {
    sm: 'px-5 py-2.5 text-xs',
    md: 'px-7 py-3.5 text-sm',
    lg: 'px-8 py-4 text-sm',
};

export default function Button({ href, variant = 'solid', size = 'md', className = '', children, ...props }) {
    const classes = `inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-colors whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

    if (href) {
        if (href.startsWith('#') || href.startsWith('http')) {
            return <a href={href} className={classes} {...props}>{children}</a>;
        }
        return <Link href={href} className={classes} {...props}>{children}</Link>;
    }

    return <button className={classes} {...props}>{children}</button>;
}
