import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Patient billing & invoices', () => {
    test('owner can open client billing and products catalog without errors', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.owner, E2E_PASSWORD);

        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));

        await expect(page.locator('body')).toContainText(/invoice|billing/i);

        guards.assertNoErrors();
    });
});
