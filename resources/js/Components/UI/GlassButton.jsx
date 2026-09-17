import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * GlassButton
 * 
 * Buttons matching the dashboard design system:
 * - Primary: Brand gradient (indigo/violet) with soft glow shadow
 * - Secondary / Glass: Translucent frosted glass button
 * - Danger: Rose-tinted translucent button
 * - Ghost: Plain text with soft hover surface
 */
export function GlassButton({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon = null,
    iconPosition = 'left',
    className = '',
    style = {},
    type = 'button',
    ...props
}) {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
        md: 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl gap-2',
        lg: 'px-5 py-2.5 text-sm sm:text-base font-bold rounded-xl gap-2.5',
    }[size] || 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl gap-2';

    let variantStyles = {};
    let variantClasses = '';

    if (variant === 'primary') {
        variantStyles = {
            background: 'linear-gradient(135deg, #8200db 0%, #a855f7 100%)',
            boxShadow: '0 8px 20px -6px rgba(130, 0, 219, 0.45)',
        };
        variantClasses = 'text-white hover:opacity-95 hover:shadow-lg active:scale-[0.98] border border-white/20';
    } else if (variant === 'secondary' || variant === 'glass') {
        variantClasses = 'text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/15 shadow-xs hover:shadow active:scale-[0.98]';
    } else if (variant === 'danger') {
        variantClasses = 'text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 active:scale-[0.98]';
    } else if (variant === 'ghost') {
        variantClasses = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10';
    }

    const renderIcon = () => {
        if (loading) {
            return <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
        }
        if (!Icon) return null;
        if (React.isValidElement(Icon)) return Icon;
        const IconComponent = Icon;
        return <IconComponent className="w-4 h-4 shrink-0" />;
    };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center font-bold tracking-tight transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none ${sizeClasses} ${variantClasses} ${className}`}
            style={{ ...variantStyles, ...style }}
            {...props}
        >
            {iconPosition === 'left' && renderIcon()}
            <span>{children}</span>
            {iconPosition === 'right' && renderIcon()}
        </button>
    );
}

export default GlassButton;
