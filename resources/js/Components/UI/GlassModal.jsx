import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

/**
 * GlassModal
 * 
 * Signature frosted glass modal dialog matching dashboard aesthetics:
 * - Frosted backdrop blur
 * - High-refraction glass panel
 * - Smooth entrance and exit animations
 * - Responsive sizing and ESC / outside click handling
 */
export function GlassModal({
    isOpen = false,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = 'max-w-xl',
    className = '',
}) {
    const { resolved } = useTheme();
    const isDark = resolved === 'dark';

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Frosted dark backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/55 backdrop-blur-md"
                        aria-hidden="true"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className={`relative w-full ${maxWidth} z-10 my-8 overflow-hidden rounded-3xl shadow-2xl ${className}`}
                        style={{
                            background: isDark ? 'rgba(25, 20, 38, 0.88)' : 'rgba(255, 255, 255, 0.88)',
                            backdropFilter: 'blur(36px) saturate(200%)',
                            WebkitBackdropFilter: 'blur(36px) saturate(200%)',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.80)',
                            boxShadow: isDark
                                ? '0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                                : '0 24px 64px rgba(130, 0, 219, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
                        }}
                    >
                        {/* Header */}
                        {(title || onClose) && (
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-white/10">
                                <div>
                                    {title && (
                                        <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                                            {title}
                                        </h3>
                                    )}
                                    {subtitle && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                {onClose && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default GlassModal;
