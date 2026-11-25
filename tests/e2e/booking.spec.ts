import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Patient booking, intake, and consent', () => {
    test('clinic public website loads and staff can open client profile for intake and consent', async ({
        page,
    }) => {
        const guards = attachErrorGuards(page);

        // 1. Public clinic website & booking section
        await page.goto(clinicUrl(CLINIC_SLUG, '/'));
        await expect(page.locator('body')).toContainText('E2E Wellness Clinic');

        // 2. Receptionist logs in, opens Jordan Taylor, and verifies intake & consent controls
        await loginAtClinic(page, CLINIC_SLUG, USERS.receptionist, E2E_PASSWORD);
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await expect(page.locator('body')).toContainText('Jordan Taylor');

        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));
        await expect(page.locator('body')).toContainText(/intake|consent/i);

        guards.assertNoErrors();
    });
});
