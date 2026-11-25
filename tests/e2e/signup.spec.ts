import { expect, test } from '@playwright/test';
import { attachErrorGuards, MAIN_BASE_URL } from './helpers';

test.describe('Clinic signup wizard', () => {
    test('registration page loads via referral link and validates subdomain', async ({ page }) => {
        // Ignore Stripe.js network/console errors when using placeholder pk_test_e2e_placeholder
        const guards = attachErrorGuards(page, {
            ignoreConsolePatterns: [/stripe/i, /Failed to load resource/i],
        });

        await page.goto(`${MAIN_BASE_URL}/r/E2E-REF10`);
        await page.waitForURL((url) => url.pathname.includes('/clinics/register'), { timeout: 15_000 });

        await expect(page.locator('body')).toContainText(/register|clinic|step|plan/i);

        // Verify live subdomain availability endpoint responds without 500
        const uniqueSlug = `e2e-new-${Date.now().toString().slice(-6)}`;
        const subCheck = await page.request.get(
            `${MAIN_BASE_URL}/clinics/register/subdomain?subdomain=${uniqueSlug}`
        );
        expect(subCheck.status()).toBe(200);

        guards.assertNoErrors();
    });
});
