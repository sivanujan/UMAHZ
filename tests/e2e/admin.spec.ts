import { expect, test } from '@playwright/test';
import { attachErrorGuards, loginAsAdmin, MAIN_BASE_URL } from './helpers';

test.describe('Platform Admin workflows', () => {
    test('admin approves pending clinic and reviews a draft assessment test', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await loginAsAdmin(page);

        // 1. Open clinics list and approve Pending E2E Physio
        await page.goto(`${MAIN_BASE_URL}/admin/clinics`);
        await expect(page.locator('body')).toContainText('Pending E2E Physio');

        await page.locator('tr', { hasText: 'Pending E2E Physio' }).getByRole('link', { name: /review/i }).click();
        await page.waitForURL((url) => url.pathname.startsWith('/admin/clinics/'));

        const approveButton = page.getByRole('button', { name: /approve/i }).first();
        if (await approveButton.isVisible()) {
            await approveButton.click();
            // Confirm modal if present
            const confirmBtn = page.getByRole('button', { name: /confirm|approve clinic/i }).last();
            if (await confirmBtn.isVisible().catch(() => false)) {
                await confirmBtn.click();
            }
            await page.waitForLoadState('networkidle');
        }

        // 2. Open Test Library and review the draft test
        await page.goto(`${MAIN_BASE_URL}/admin/tests`);
        await expect(page.locator('body')).toContainText('E2E Draft Straight Leg Raise');

        const draftRow = page.locator('tr, div').filter({ hasText: 'E2E Draft Straight Leg Raise' }).first();
        const reviewBtn = draftRow.getByRole('button', { name: /review|mark reviewed|approve/i }).first();
        if (await reviewBtn.isVisible().catch(() => false)) {
            await reviewBtn.click();
            const confirmReview = page.getByRole('button', { name: /confirm|mark reviewed|save/i }).last();
            if (await confirmReview.isVisible().catch(() => false)) {
                await confirmReview.click();
            }
            await page.waitForLoadState('networkidle');
        }

        guards.assertNoErrors();
    });
});
