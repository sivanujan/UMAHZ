import React from 'react';

const SEGMENT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

function getPasswordStrength(password) {
    if (!password) return { score: 0, label: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Weak' };
    if (score === 2) return { score: 2, label: 'Fair' };
    if (score <= 3) return { score: 3, label: 'Good' };
    return { score: 4, label: 'Strong' };
}

export default function PasswordStrengthMeter({ password }) {
    const { score, label } = getPasswordStrength(password);
    const activeColor = SEGMENT_COLORS[Math.max(score - 1, 0)];

    return (
        <div className="mt-2.5">
            <div className="grid grid-cols-4 gap-1.5">
                {SEGMENT_COLORS.map((color, i) => {
                    const filled = i < score;
                    return (
                        <span
                            key={color}
                            className="h-1.5 rounded-full transition-all duration-300 ease-out"
                            style={{
                                background: filled ? color : '#e2e8f0',
                                boxShadow: filled ? `0 0 8px -1px ${color}99` : 'none',
                            }}
                        />
                    );
                })}
            </div>
            {label && (
                <p className="text-[11px] font-semibold mt-1.5 transition-colors duration-300" style={{ color: activeColor }}>
                    {label}
                </p>
            )}
        </div>
    );
}
