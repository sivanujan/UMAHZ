import React from 'react';

/**
 * AuroraBackground
 * 
 * Clean, single fixed full-viewport background layer (-z-10):
 * - Position: fixed, inset: 0, top/left/right/bottom: 0 — pins to viewport with zero seams or gaps
 * - Base layer: Full-cover gradient (light: #FBF7FD -> #FDF1F7; dark: #0E0B14 -> #16101F)
 * - Restored colorful Aurora Blobs with strong glassmorphism diffusion:
 *   1. Soft PINK/magenta blob (#F0A5D0 / #F5A8D0) — larger, center / upper-mid behind the cards
 *   2. VIOLET blob (#C4A5F5 / #8200db) — top-left corner
 *   3. INDIGO/blue blob (#A5B4FF) — mid-right / lower-right
 * - Heavily blurred (120px blur), 45-65% opacity, fully rounded (50%)
 */
export default function AuroraBackground({ isDark }) {
    return (
        <div
            aria-hidden="true"
            className="transition-colors duration-500"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                inset: 0,
                zIndex: -10,
                overflow: 'hidden',
                pointerEvents: 'none',
                background: isDark
                    ? 'linear-gradient(145deg, #0E0B14 0%, #16101F 100%)'
                    : 'linear-gradient(135deg, #FBF7FD 0%, #FAF0F7 50%, #FDF1F7 100%)',
            }}
        >
            {/* Blob 1: VIOLET Glow (#C4A5F5) — Top-Left Corner */}
            <div
                className="pointer-events-none transition-all duration-700"
                style={{
                    position: 'absolute',
                    top: '-10%',
                    left: '-8%',
                    width: '800px',
                    height: '800px',
                    borderRadius: '50%',
                    background: isDark
                        ? 'radial-gradient(circle, rgba(130, 0, 219, 0.28) 0%, rgba(130, 0, 219, 0.08) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(196, 165, 245, 0.60) 0%, rgba(216, 190, 252, 0.30) 45%, transparent 70%)',
                    filter: 'blur(120px)',
                    transform: 'translate3d(0, 0, 0)',
                }}
            />

            {/* Blob 2: Soft PINK/Magenta Glow (#F0A5D0 / #F5A8D0) — Large, Center / Upper-Mid behind Cards */}
            <div
                className="pointer-events-none transition-all duration-700"
                style={{
                    position: 'absolute',
                    top: '12%',
                    left: '28%',
                    width: '900px',
                    height: '900px',
                    borderRadius: '50%',
                    background: isDark
                        ? 'radial-gradient(circle, rgba(168, 45, 130, 0.26) 0%, rgba(91, 30, 82, 0.08) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(240, 165, 208, 0.62) 0%, rgba(245, 168, 208, 0.32) 45%, transparent 70%)',
                    filter: 'blur(120px)',
                    transform: 'translate3d(0, 0, 0)',
                }}
            />

            {/* Blob 3: INDIGO/Blue Glow (#A5B4FF) — Mid-Right / Lower-Right */}
            <div
                className="pointer-events-none transition-all duration-700"
                style={{
                    position: 'absolute',
                    top: '36%',
                    right: '-8%',
                    width: '800px',
                    height: '800px',
                    borderRadius: '50%',
                    background: isDark
                        ? 'radial-gradient(circle, rgba(59, 42, 107, 0.30) 0%, rgba(59, 42, 107, 0.08) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(165, 180, 255, 0.55) 0%, rgba(195, 205, 255, 0.28) 45%, transparent 70%)',
                    filter: 'blur(120px)',
                    transform: 'translate3d(0, 0, 0)',
                }}
            />
        </div>
    );
}
