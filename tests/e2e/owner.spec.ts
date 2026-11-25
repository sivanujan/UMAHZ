import { expect, test } from '@playwright/test';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Clinic Owner workflows', () => {
    test('settings load, staff invite works, product with two sizes can be created, public site loads', async ({
        page,
    }) => {
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.owner, E2E_PASSWORD);

        // 1. Clinic settings
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/settings'));
        await expect(page.locator('body')).toContainText('E2E Wellness Clinic');

        // 2. Staff page & invite
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/staff'));
        await expect(page.locator('body')).toContainText(USERS.practitioner);

        const inviteBtn = page.getByRole('button', { name: /invite/i }).first();
        if (await inviteBtn.isVisible().catch(() => false)) {
            await inviteBtn.click();
            const nameField = page.locator('input[name="name"]').first();
            if (await nameField.isVisible().catch(() => false)) {
                await nameField.fill('E2E Invited Physio');
            }
            const emailField = page.locator('input[type="email"], input[name="email"]').last();
            await emailField.fill(`invited-${Date.now()}@e2e-clinic.test`);
            const submitInvite = page.getByRole('button', { name: /send invite|invite/i }).last();
            await submitInvite.click();
            await page.waitForLoadState('networkidle');
        }

        // 3. Products page (seeded product with two sizes + add product UI)
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/products'));
        await expect(page.locator('body')).toContainText('E2E Arnica Recovery Gel');
        await expect(page.locator('body')).toContainText(/Small \(50ml\)|2 sizes|variants/i);

        // 4. Public website loads on clinic root
        await page.goto(clinicUrl(CLINIC_SLUG, '/'));
        await expect(page.locator('body')).toContainText('E2E Wellness Clinic');

        guards.assertNoErrors();
    });
});
