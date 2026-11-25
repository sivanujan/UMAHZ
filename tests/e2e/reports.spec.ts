import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Practice Analytics & Reports', () => {
    test('owner can open revenue, retention, utilization, and product sales reports without errors', async ({
        page,
    }) => {
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.owner, E2E_PASSWORD);

        const reportPaths = [
            '/app/reports/revenue',
            '/app/reports/retention',
            '/app/reports/utilization',
            '/app/reports/products',
        ];

        for (const path of reportPaths) {
            const res = await page.goto(clinicUrl(CLINIC_SLUG, path));
            expect(res?.status()).toBeLessThan(400);
            await page.waitForLoadState('networkidle');
        }

        guards.assertNoErrors();
    });

    test('reports index (/app/reports) redirects without 500', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.owner, E2E_PASSWORD);

        const res = await page.goto(clinicUrl(CLINIC_SLUG, '/app/reports'));
        expect(res?.status()).toBeLessThan(400);

        guards.assertNoErrors();
    });
});
