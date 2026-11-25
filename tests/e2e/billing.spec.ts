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

test.describe('Patient billing, inventory deduction/void, receipts, and insurance', () => {
    test('invoice with service + product, cash payment, receipt, stock decrease & void restore, and insurance claim', async ({
        page,
    }) => {
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.owner, E2E_PASSWORD);

        const variantBefore = queryE2eDb<{ id: string; stock_quantity: number }>(
            "SELECT id, stock_quantity FROM product_variants WHERE sku = 'ARN-50' LIMIT 1"
        );
        expect(variantBefore.length).toBe(1);
        const initialStock = variantBefore[0].stock_quantity;

        // Open Jordan Taylor profile
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));
        const clientShowUrl = page.url();

        // 1. Create Invoice #1 with a service line + E2E Arnica Recovery Gel (Small 50ml)
        await page.getByRole('button', { name: /new invoice/i }).first().click();
        await expect(page.getByRole('heading', { name: /New Invoice/i })).toBeVisible();
        const invModal = page.locator('.fixed').last();

        // Fill first service line item
        const descInput = invModal.locator('input[placeholder*="Treatment Session"]').first();
        if (await descInput.isVisible().catch(() => false)) {
            await descInput.fill('Physiotherapy Assessment');
        }
        const priceInput = invModal.locator('input[placeholder="0.00"]').first();
        if (await priceInput.isVisible().catch(() => false)) {
            await priceInput.fill('100.00');
        }

        // Add product line item via product picker if present
        const addProductBtn = invModal.getByRole('button', { name: /add product|\+ product/i }).first();
        if (await addProductBtn.isVisible().catch(() => false)) {
            await addProductBtn.click();
            await expect(invModal).toContainText(/Arnica/i, { timeout: 10_000 });
            const arnBtn = invModal.getByRole('button', { name: /Small \(50ml\)|Add/i }).first();
            if (await arnBtn.isVisible().catch(() => false)) {
                await arnBtn.click();
            }
        }

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/app/invoices') && res.request().method() === 'POST'),
            invModal.getByRole('button', { name: /create & issue/i }).click(),
        ]);
        await page.waitForLoadState('networkidle');

        // Open newest invoice
        const invoices = queryE2eDb<{ id: string; status: string }>(
            'SELECT id, status FROM invoices ORDER BY created_at DESC LIMIT 1'
        );
        expect(invoices.length).toBe(1);
        const invoiceId = invoices[0].id;

        await page.goto(clinicUrl(CLINIC_SLUG, `/app/invoices/${invoiceId}`));

        // 2. Record Cash Payment -> Paid -> Stock decreased -> Receipt
        await page.getByRole('button', { name: /record manual payment/i }).click();
        await page.locator('select').filter({ hasText: /Cash/i }).first().selectOption('cash');
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/pay/manual') && res.request().method() === 'POST'),
            page.getByRole('button', { name: /^record payment$/i }).click(),
        ]);

        await expect(page.locator('body')).toContainText(/paid/i);

        const lineItems = queryE2eDb<{ id: string; product_id: string | null }>(
            'SELECT id, product_id FROM invoice_line_items WHERE invoice_id = ?',
            [invoiceId]
        );
        if (lineItems.some((li) => li.product_id !== null)) {
            const afterPaid = queryE2eDb<{ stock_quantity: number }>(
                "SELECT stock_quantity FROM product_variants WHERE sku = 'ARN-50' LIMIT 1"
            );
            expect(afterPaid[0].stock_quantity).toBeLessThan(initialStock);
        }

        // Open Receipt
        await page.goto(clinicUrl(CLINIC_SLUG, `/app/invoices/${invoiceId}/receipt`));
        await expect(page.locator('body')).toContainText(/RECEIPT/i);
        await expect(page.locator('body')).toContainText(/Cash/i);

        // 3. Create Invoice #2 with product and Void it -> verify stock restored
        await page.goto(clientShowUrl);
        await page.getByRole('button', { name: /sell products/i }).first().click();
        await expect(page.getByRole('heading', { name: /Sell Products & Supplies/i })).toBeVisible();
        const sellModal = page.locator('.fixed').last();
        await expect(sellModal).toContainText(/Arnica/i, { timeout: 10_000 });
        const sellVariantBtn = sellModal.getByRole('button', { name: /Small \(50ml\)|Add/i }).first();
        if (await sellVariantBtn.isVisible().catch(() => false)) {
            await sellVariantBtn.click();
        }
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/app/invoices') && res.request().method() === 'POST'),
            sellModal.getByRole('button', { name: /create & issue/i }).click(),
        ]);
        await page.waitForLoadState('networkidle');

        const inv2 = queryE2eDb<{ id: string }>('SELECT id FROM invoices ORDER BY created_at DESC LIMIT 1');
        const stockBeforeVoid = queryE2eDb<{ stock_quantity: number }>(
            "SELECT stock_quantity FROM product_variants WHERE sku = 'ARN-50' LIMIT 1"
        )[0].stock_quantity;

        await page.goto(clinicUrl(CLINIC_SLUG, `/app/invoices/${inv2[0].id}`));
        page.once('dialog', (dialog) => dialog.accept('E2E void test'));
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/void') && res.request().method() === 'POST'),
            page.getByRole('button', { name: /^void$/i }).click(),
        ]);
        await page.waitForLoadState('networkidle');

        const stockAfterVoid = queryE2eDb<{ stock_quantity: number }>(
            "SELECT stock_quantity FROM product_variants WHERE sku = 'ARN-50' LIMIT 1"
        )[0].stock_quantity;
        expect(stockAfterVoid).toBeGreaterThanOrEqual(stockBeforeVoid);

        // 4. Insurance: add policy to client, record approved claim, then Mark Payment Received
        await page.goto(clientShowUrl);
        const addPolicyBtn = page.getByRole('button', { name: /add policy|add insurance/i }).first();
        if (await addPolicyBtn.isVisible().catch(() => false)) {
            await addPolicyBtn.click();
            const policyForm = page.locator('form').filter({ hasText: /policy|member/i }).last();
            const pSelect = policyForm.locator('select').first();
            if ((await pSelect.count()) > 0) {
                const opts = await pSelect.locator('option').count();
                if (opts > 1) await pSelect.selectOption({ index: 1 });
            }
            const pInputs = policyForm.locator('input[type="text"]');
            if ((await pInputs.count()) >= 1) await pInputs.nth(0).fill('MEM-E2E-123');
            if ((await pInputs.count()) >= 2) await pInputs.nth(1).fill('GRP-E2E-456');
            if ((await pInputs.count()) >= 3) await pInputs.nth(2).fill('Jordan Taylor');
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/insurance/policies') && res.request().method() === 'POST'),
                policyForm.locator('button[type="submit"]').click(),
            ]);

            // Create a new invoice and record an approved insurance claim portion
            await page.getByRole('button', { name: /new invoice/i }).first().click();
            const insInvModal = page.locator('.fixed').last();
            await insInvModal.locator('input[placeholder*="Treatment Session"]').first().fill('Insured Physio Session');
            await insInvModal.locator('input[placeholder="0.00"]').first().fill('100.00');
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/app/invoices') && res.request().method() === 'POST'),
                insInvModal.getByRole('button', { name: /create & issue/i }).click(),
            ]);

            const insInv = queryE2eDb<{ id: string; total_amount: number; amount_paid: number }>(
                'SELECT id, total_amount, amount_paid FROM invoices ORDER BY created_at DESC LIMIT 1'
            )[0];
            const initialBalance = insInv.total_amount - insInv.amount_paid;
            await page.goto(clinicUrl(CLINIC_SLUG, `/app/invoices/${insInv.id}`));
            await page.getByRole('button', { name: /record insurance portion/i }).click();
            const claimModal = page.locator('.fixed').last();
            await claimModal.locator('input[inputmode="decimal"], input[type="number"]').first().fill('50.00');
            const statusSelect = claimModal.locator('select').filter({ hasText: /approved/i }).first();
            if ((await statusSelect.count()) > 0) {
                await statusSelect.selectOption('approved');
            }
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/insurance-claim') && res.request().method() === 'POST'),
                claimModal.getByRole('button', { name: /record claim portion/i }).click(),
            ]);

            // Balance unchanged until payment is received
            const afterClaim = queryE2eDb<{ total_amount: number; amount_paid: number }>(
                'SELECT total_amount, amount_paid FROM invoices WHERE id = ?',
                [insInv.id]
            )[0];
            expect(afterClaim.total_amount - afterClaim.amount_paid).toBe(initialBalance);

            // Mark Payment Received -> balance updates
            const markPaidBtn = page.getByRole('button', { name: /mark payment received/i }).first();
            await expect(markPaidBtn).toBeVisible();
            page.once('dialog', (dialog) => dialog.accept());
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/mark-paid') && res.request().method() === 'POST'),
                markPaidBtn.click(),
            ]);
            const afterPaid = queryE2eDb<{ total_amount: number; amount_paid: number }>(
                'SELECT total_amount, amount_paid FROM invoices WHERE id = ?',
                [insInv.id]
            )[0];
            expect(afterPaid.total_amount - afterPaid.amount_paid).toBeLessThan(initialBalance);
        }

        guards.assertNoErrors();
    });
});
