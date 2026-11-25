import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    MAIN_BASE_URL,
    OTHER_CLINIC_SLUG,
    USERS,
} from './helpers';

test.describe('Security & multi-tenant isolation', () => {
    test('unauthenticated requests to protected routes redirect to login', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await page.goto(`${MAIN_BASE_URL}/admin/dashboard`);
        await page.waitForURL((url) => url.pathname.includes('login'), { timeout: 10_000 });

        await page.goto(clinicUrl(CLINIC_SLUG, '/app/dashboard'));
        await page.waitForURL((url) => url.pathname.includes('login'), { timeout: 10_000 });

        guards.assertNoErrors();
    });

    test('clinic owner cannot access another clinic subdomain or admin panel', async ({ page }) => {
        const guards = attachErrorGuards(page, {
            ignoreConsolePatterns: [/403 \(Forbidden\)/],
        });

        await loginAtClinic(page, CLINIC_SLUG, USERS.owner, E2E_PASSWORD);

        // Try accessing platform admin
        const adminRes = await page.goto(`${MAIN_BASE_URL}/admin/dashboard`);
        expect([302, 401, 403]).toContain(adminRes?.status() ?? 0);

        // Try accessing another clinic's staff dashboard
        const otherRes = await page.goto(clinicUrl(OTHER_CLINIC_SLUG, '/app/dashboard'));
        const status = otherRes?.status() ?? 0;
        const landedOnLoginOrDenied = status === 403 || page.url().includes('/login');
        expect(landedOnLoginOrDenied).toBe(true);

        guards.assertNoErrors();
    });

    test('practitioner cannot access owner-only clinic settings or staff management', async ({ page }) => {
        const guards = attachErrorGuards(page, {
            ignoreConsolePatterns: [/403 \(Forbidden\)/],
        });

        await loginAtClinic(page, CLINIC_SLUG, USERS.practitioner, E2E_PASSWORD);

        const staffRes = await page.goto(clinicUrl(CLINIC_SLUG, '/app/staff'));
        expect(staffRes?.status()).toBe(403);

        const settingsRes = await page.goto(clinicUrl(CLINIC_SLUG, '/app/settings'));
        expect(settingsRes?.status()).toBe(403);

        guards.assertNoErrors();
    });
});
