import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '@/Contexts/ThemeContext';

/**
 * GlassCard
 * 
 * Signature UMAHZ glassmorphism card matching the dashboard aesthetic:
 * - Frosted glass surface: rgba(255,255,255,0.45) in light / rgba(30,24,45,0.50) in dark
 * - Backdrop filter: blur(28px) saturate(180%)
 * - Crisp outer border + top hairline specular highlight
 * - Rounded-2xl (24px)
 * - Motion fade/stagger entry (respects prefers-reduced-motion)
 */
export function GlassCard({
    children,
    className = '',
    style = {},
    animate = true,
    delay = 0,
    hover = false,
    onClick,
    ...props
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';
    const shouldReduceMotion = useReducedMotion();

    const glassStyle = {
        borderRadius: '24px',
        background: isDark ? 'rgba(30, 24, 45, 0.50)' : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(255, 255, 255, 0.65)',
        boxShadow: isDark
            ? '0 12px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
            : '0 12px 36px rgba(130, 0, 219, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
        ...style,
    };

    const combinedClassName = `relative p-5 sm:p-6 transition-all duration-300 ${hover ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''} ${className}`;

    if (!animate) {
        return (
            <div className={combinedClassName} style={glassStyle} onClick={onClick} {...props}>
                {children}
            </div>
        );
    }

    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay * 0.05, ease: 'easeOut' }}
            className={combinedClassName}
            style={glassStyle}
            onClick={onClick}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export default GlassCard;
