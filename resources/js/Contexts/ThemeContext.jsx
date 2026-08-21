import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

const ThemeContext = createContext(null);

const DEFAULT_STORAGE_KEY = 'umahz-theme';

function systemPrefersDark() {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
}

function resolve(preference) {
    return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

/**
 * Reusable theme provider for both themed shells:
 *   - Client portal (.umahz-portal): persistUrl="/portal/settings/theme" so the
 *     choice is saved to the Client model as well as localStorage.
 *   - Staff/owner dashboard (.umahz-app): no persistUrl — staff Users have no
 *     theme column, so persistence is localStorage-only (per-device).
 *
 * A distinct storageKey per shell keeps the two preferences independent.
 */
export function ThemeProvider({
    initialPreference = 'system',
    storageKey = DEFAULT_STORAGE_KEY,
    persistUrl = null,
    children,
}) {
    const [preference, setPreferenceState] = useState(() => {
        if (typeof window === 'undefined') return initialPreference;
        return window.localStorage.getItem(storageKey) || initialPreference;
    });
    const [resolved, setResolved] = useState(() => resolve(preference));

    useEffect(() => {
        setResolved(resolve(preference));
        if (preference !== 'system') return undefined;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => setResolved(resolve('system'));
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [preference]);

    const setPreference = useCallback((next) => {
        setPreferenceState(next);
        window.localStorage.setItem(storageKey, next);
        if (persistUrl) {
            router.patch(persistUrl, { theme_preference: next }, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    }, [storageKey, persistUrl]);

    const toggle = useCallback(() => {
        setPreference(resolve(preference) === 'dark' ? 'light' : 'dark');
    }, [preference, setPreference]);

    return (
        <ThemeContext.Provider value={{ preference, resolved, setPreference, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
