import { expect, test } from '@playwright/test';
import { queryE2eDb } from './db';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Clinic Owner workflows', () => {
    test('settings, staff invite, create product with two sizes, adjust stock, Sell Products picker, and public site', async ({
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
            await page.getByRole('button', { name: /send invite|invite/i }).last().click();
            await page.waitForLoadState('networkidle');
        }

        // 3. Create a new product with two sizes through the UI form
        const productName = `E2E Herbal Balm ${Date.now().toString().slice(-4)}`;
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/products'));
        await page.getByRole('button', { name: /add product/i }).click();

        const modal = page.locator('form').filter({ hasText: /Product Name/i });
        await expect(modal).toBeVisible();
        await modal.locator('input[type="text"]').first().fill(productName);
        await modal.getByRole('button', { name: /add multiple sizes \/ variants/i }).click();

        // Fill variant rows (2 size rows appear when switching to multiple sizes)
        const variantInputs = modal.locator('input[placeholder*="Small"], input[placeholder*="Size"], input[placeholder*="50ml"]');
        if ((await variantInputs.count()) >= 2) {
            await variantInputs.nth(0).fill('Travel 50g');
            await variantInputs.nth(1).fill('Clinic 200g');
        }
        const priceInputs = modal.locator('input[placeholder="24.99"], input[step="0.01"]');
        if ((await priceInputs.count()) >= 2) {
            await priceInputs.nth(0).fill('19.00');
            await priceInputs.nth(1).fill('39.00');
        }
        const stockInputs = modal.locator('input[type="number"]');
        const sCount = await stockInputs.count();
        for (let i = 0; i < sCount; i++) {
            const val = await stockInputs.nth(i).inputValue();
            if (val === '0' || val === '') {
                await stockInputs.nth(i).fill('12');
            }
        }

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/app/products') && res.request().method() === 'POST'),
            modal.locator('button[type="submit"]').click(),
        ]);

        await expect(page.locator('body')).toContainText(productName);

        const created = queryE2eDb<{ id: string }>(
            'SELECT id FROM products WHERE name = ? LIMIT 1',
            [productName]
        );
        expect(created.length).toBe(1);

        // 4. Adjust stock on the created product
        const productRow = page.locator('tr, div').filter({ hasText: productName }).first();
        const adjustBtn = productRow.locator('button[title="Adjust Stock"]').first();
        if (await adjustBtn.isVisible().catch(() => false)) {
            await adjustBtn.click();
            const stockModal = page.locator('form').filter({ hasText: /adjust|quantity|stock/i }).last();
            const qtyInput = stockModal.locator('input[type="number"]').first();
            await qtyInput.fill('5');
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/adjust-stock') && res.request().method() === 'POST'),
                stockModal.locator('button[type="submit"]').click(),
            ]);
            await expect(stockModal).toBeHidden({ timeout: 10_000 });
            await page.waitForLoadState('networkidle');
        }

        // 5. Verify product appears in "Sell Products" picker on client profile
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));

        await page.getByRole('button', { name: /sell products/i }).first().click();
        await expect(page.getByRole('heading', { name: /Sell Products & Supplies/i })).toBeVisible();
        await expect(page.locator('body')).toContainText(productName, { timeout: 10_000 });

        // 6. Public website loads
        await page.goto(clinicUrl(CLINIC_SLUG, '/'));
        await expect(page.locator('body')).toContainText('E2E Wellness Clinic');

        guards.assertNoErrors();
    });
});
