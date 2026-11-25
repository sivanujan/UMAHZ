import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    MAIN_BASE_URL,
    USERS,
} from './helpers';

test.describe('Authentication & clinic subdomain login', () => {
    test('main domain login redirects clinic owner to clinic subdomain', async ({ page }) => {
        const guards = attachErrorGuards(page, {
            ignoreConsolePatterns: [/409 \(Conflict\)/],
        });

        await page.goto(`${MAIN_BASE_URL}/login`);
        await page.locator('input[type="email"], input[name="email"]').fill(USERS.owner);
        await page.locator('input[type="password"], input[name="password"]').fill(E2E_PASSWORD);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL((url) => url.hostname === `${CLINIC_SLUG}.lvh.me`, {
            timeout: 15_000,
        });

        guards.assertNoErrors();
    });

    test('invalid credentials on clinic subdomain show validation error without 500', async ({ page }) => {
        const guards = attachErrorGuards(page);
        const targetEmail = `wrong-creds-${Date.now()}@e2e-clinic.test`;

        await page.goto(clinicUrl(CLINIC_SLUG, '/login'));
        await page.locator('input[type="email"], input[name="email"]').fill(targetEmail);
        await page.locator('input[type="password"], input[name="password"]').fill('WrongPassword999!');

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/login') && res.request().method() === 'POST'),
            page.locator('button[type="submit"]').click(),
        ]);

        await expect(page.locator('body')).toContainText(/do not match our records/i);

        guards.assertNoErrors();
    });
});
