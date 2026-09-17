import React from 'react';
import TopNavLayout from '@/Layouts/TopNavLayout';

/**
 * AuthenticatedLayout
 * 
 * Unified canonical AppShell for all internal UMAHZ /app pages.
 * Re-exports and wraps TopNavLayout with full Aurora glassmorphism background,
 * reference top navigation bar, quick search, and light/dark theme context.
 */
export default function AuthenticatedLayout({ children, title, ...props }) {
    return (
        <TopNavLayout title={title} {...props}>
            {children}
        </TopNavLayout>
    );
}
