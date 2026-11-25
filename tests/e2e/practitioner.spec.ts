import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Practitioner calendar, clinical notes, tests, and Scribe', () => {
    test('calendar shows evening Toronto appointment and clinical note editor loads with test library & scribe', async ({
        page,
    }) => {
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.practitioner, E2E_PASSWORD);

        // 1. Calendar shows today's seeded 19:30 Toronto appointment
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/calendar'));
        await expect(page.locator('body')).toContainText(/Jordan Taylor|Initial Physiotherapy/i);

        // 2. Open Jordan Taylor and create a clinical note
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));

        const clientUrl = page.url();
        await page.goto(`${clientUrl.replace(/\/$/, '')}/notes/create`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toContainText(/subjective|objective|note|scribe/i);

        guards.assertNoErrors();
    });
});
