/**
 * Shared motion configuration and animation variants for UMAHZ.
 * Adheres to healthcare/wellness tone: calm, smooth, premium, non-bouncy.
 * Fully supports reduced-motion preferences.
 */

export const EASING = [0.25, 0.1, 0.25, 1]; // gentle cubic-bezier (smooth easeOut)
export const DURATION_FAST = 0.2;
export const DURATION_NORMAL = 0.35;
export const DURATION_SLOW = 0.45;

export const VIEWPORT_ONCE = { once: true, amount: 0.2 };

/**
 * Container variant that staggers children entrances.
 */
export const createStaggerContainer = (staggerDelay = 0.08, delayChildren = 0.05, reducedMotion = false) => ({
    hidden: { opacity: reducedMotion ? 1 : 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: reducedMotion ? 0 : staggerDelay,
            delayChildren: reducedMotion ? 0 : delayChildren,
        },
    },
});

/**
 * Standard fade in + slide up variant.
 */
export const createFadeInUp = (distance = 16, duration = DURATION_SLOW, reducedMotion = false) => ({
    hidden: {
        opacity: 0,
        y: reducedMotion ? 0 : distance,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: reducedMotion ? 0.01 : duration,
            ease: EASING,
        },
    },
});

/**
 * Fade in with a subtle scale entrance (for hero image & featured cards).
 */
export const createFadeInScale = (fromScale = 0.97, duration = 0.45, reducedMotion = false) => ({
    hidden: {
        opacity: 0,
        scale: reducedMotion ? 1 : fromScale,
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: reducedMotion ? 0.01 : duration,
            ease: EASING,
        },
    },
});

/**
 * Hover card lift variant.
 */
export const createCardHover = (reducedMotion = false) => ({
    rest: { y: 0 },
    hover: {
        y: reducedMotion ? 0 : -4,
        transition: { duration: DURATION_FAST, ease: EASING },
    },
});

/**
 * Button hover scale micro-interaction.
 */
export const createButtonHover = (scale = 1.02, reducedMotion = false) => ({
    hover: {
        scale: reducedMotion ? 1 : scale,
        transition: { duration: DURATION_FAST, ease: EASING },
    },
    tap: {
        scale: reducedMotion ? 1 : 0.98,
        transition: { duration: 0.1, ease: EASING },
    },
});
