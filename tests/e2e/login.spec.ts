import { expect, test } from '@playwright/test';
import { getLaravelLogSize, readLaravelLogFrom } from './db';
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
        // Step 1 on central domain: email-only lookup (no password input yet)
        await expect(page.locator('input[type="password"]')).toHaveCount(0);
        await page.locator('input[type="email"], input[name="email"]').fill(USERS.owner);
        await page.locator('button[type="submit"]').click();

        // Step 2: redirected to clinic subdomain with email pre-filled from signed token
        await page.waitForURL((url) => url.hostname === `${CLINIC_SLUG}.lvh.me`, {
            timeout: 15_000,
        });
        await expect(page.locator('input[type="email"], input[name="email"]')).toHaveValue(USERS.owner);

        await page.locator('input[type="password"], input[name="password"]').fill(E2E_PASSWORD);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL((url) => url.hostname === `${CLINIC_SLUG}.lvh.me` && !url.pathname.endsWith('/login'), {
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

    test('5 failed login attempts trigger lockout message', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await page.goto(clinicUrl(CLINIC_SLUG, '/login'));
        await page.locator('input[type="email"], input[name="email"]').fill(USERS.client);

        for (let attempt = 1; attempt <= 5; attempt++) {
            await page.locator('input[type="password"], input[name="password"]').fill(`WrongPass${attempt}!`);
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/login') && res.request().method() === 'POST'),
                page.locator('button[type="submit"]').click(),
            ]);
        }

        await expect(page.locator('body')).toContainText(/too many attempts.*15 minutes/i);

        guards.assertNoErrors();
    });

    test('forgot password sends reset link in mail log and resets password on clinic subdomain', async ({
        page,
    }) => {
        const guards = attachErrorGuards(page);
        const logBefore = getLaravelLogSize();

        await page.goto(clinicUrl(CLINIC_SLUG, `/forgot-password?email=${encodeURIComponent(USERS.receptionist)}`));
        await expect(page.locator('#forgot-email')).toHaveValue(USERS.receptionist);
        await expect(page.locator('body')).toContainText(/Reset your password for E2E Wellness Clinic/i);

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/forgot-password') && res.request().method() === 'POST'),
            page.getByRole('button', { name: /send reset link/i }).click(),
        ]);

        await expect(page.locator('body')).toContainText(
            "If an account exists for this email, we've sent a password reset link."
        );
        await expect(page.getByRole('button', { name: /resend link/i })).toBeVisible();

        const rawMailLog = readLaravelLogFrom(logBefore);
        const mailLog = rawMailLog.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
        const linkMatch = mailLog.match(/https?:\/\/[^\s"']*\/reset-password\/[^\s"']+/);
        expect(linkMatch).not.toBeNull();
        const resetUrl = linkMatch![0].replace(/&amp;/g, '&');

        await page.goto(resetUrl);
        await expect(page.locator('#reset-email')).toHaveValue(USERS.receptionist);
        await page.locator('#reset-password').fill(E2E_PASSWORD);
        await page.locator('#reset-password-confirmation').fill(E2E_PASSWORD);

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/reset-password') && res.request().method() === 'POST'),
            page.getByRole('button', { name: /update password/i }).click(),
        ]);

        await page.waitForURL((url) => url.pathname.endsWith('/login'), { timeout: 15_000 });
        await expect(page.locator('body')).toContainText(/your password has been reset/i);

        guards.assertNoErrors();
    });
});
