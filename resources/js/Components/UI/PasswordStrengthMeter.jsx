import React from 'react';

const STRENGTH_CONFIG = [
    { label: 'Weak', barColor: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400' },
    { label: 'Fair', barColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Good', barColor: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Strong', barColor: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
];

function getPasswordStrength(password) {
    if (!password) return { score: 0, label: '', config: null };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const clampedScore = Math.min(Math.max(score, 1), 4);
    const config = STRENGTH_CONFIG[clampedScore - 1];

    return {
        score: clampedScore,
        label: config.label,
        config,
    };
}

export default function PasswordStrengthMeter({ password }) {
    if (!password) return null;

    const { score, label, config } = getPasswordStrength(password);

    return (
        <div className="mt-2.5 space-y-1.5" aria-live="polite">
            <div className="grid grid-cols-4 gap-1.5 h-1.5">
                {[0, 1, 2, 3].map((index) => {
                    const isFilled = index < score;
                    return (
                        <span
                            key={index}
                            className={`h-full rounded-full transition-all duration-300 ease-out ${
                                isFilled
                                    ? config.barColor
                                    : 'bg-slate-200 dark:bg-slate-700/60'
                            }`}
                        />
                    );
                })}
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium">
                <span className={config.textColor}>
                    Strength: <strong className="font-semibold">{label}</strong>
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                    Use 8+ chars, numbers & symbols
                </span>
            </div>
        </div>
    );
}
