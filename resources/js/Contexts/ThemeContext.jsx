import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'umahz-theme';

function systemPrefersDark() {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
}

function resolve(preference) {
    return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

/**
 * Scoped to the client portal only (see .umahz-portal in app.css) — the
 * marketing site and staff dashboards aren't part of this redesign.
 */
export function ThemeProvider({ initialPreference = 'system', children }) {
    const [preference, setPreferenceState] = useState(() => {
        if (typeof window === 'undefined') return initialPreference;
        return window.localStorage.getItem(STORAGE_KEY) || initialPreference;
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
        window.localStorage.setItem(STORAGE_KEY, next);
        router.patch('/portal/settings/theme', { theme_preference: next }, {
            preserveScroll: true,
            preserveState: true,
        });
    }, []);

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
