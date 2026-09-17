import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ActionsMenu
 * 
 * Accessible, glass-styled Kebab (⋮) actions menu:
 * - Keyboard accessible (Esc closes)
 * - Click-outside dismissal
 * - Smooth fade-and-scale dropdown animation
 * - Item variants (default, danger)
 */
export function ActionsMenu({
    items = [], // Array of { label, icon: Icon, onClick, href, danger: bool, disabled: bool, title: string }
    align = 'right',
    triggerClassName = '',
    menuClassName = '',
    ariaLabel = 'Actions menu',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    // Handle outside click & Esc
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(e) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const alignClasses = align === 'left' ? 'left-0' : 'right-0';

    return (
        <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen((prev) => !prev);
                }}
                className={`p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    isOpen ? 'bg-black/[0.05] dark:bg-white/[0.08] text-slate-800 dark:text-white' : ''
                } ${triggerClassName}`}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute z-30 mt-1.5 w-48 origin-top-right rounded-2xl p-1.5 shadow-xl border
                            border-slate-200/80 dark:border-white/10
                            bg-white/95 dark:bg-[#1f1635]/95
                            backdrop-blur-xl
                            ${alignClasses} ${menuClassName}`}
                    >
                        <div className="space-y-0.5" role="menu">
                            {items.map((item, idx) => {
                                if (!item) return null;
                                const Icon = item.icon;
                                const isDanger = item.danger;

                                const itemClasses = `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left
                                    ${
                                        isDanger
                                            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 focus:bg-slate-100/80 dark:focus:bg-white/10'
                                    }
                                    ${item.disabled ? 'opacity-50 pointer-events-none' : ''}`;

                                const handleClick = (e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    if (item.onClick) item.onClick(e);
                                };

                                if (item.href) {
                                    return (
                                        <a
                                            key={idx}
                                            href={item.href}
                                            role="menuitem"
                                            title={item.title || item.label}
                                            onClick={handleClick}
                                            className={itemClasses}
                                        >
                                            {Icon && <Icon className="w-4 h-4 shrink-0" />}
                                            <span className="truncate">{item.label}</span>
                                        </a>
                                    );
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        role="menuitem"
                                        title={item.title || item.label}
                                        disabled={item.disabled}
                                        onClick={handleClick}
                                        className={itemClasses}
                                    >
                                        {Icon && <Icon className="w-4 h-4 shrink-0" />}
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ActionsMenu;
