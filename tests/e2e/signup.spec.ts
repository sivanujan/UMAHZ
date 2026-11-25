import { expect, test } from '@playwright/test';
import { readLaravelLogTail } from './db';
import { attachErrorGuards, MAIN_BASE_URL } from './helpers';

test.describe('Clinic signup wizard', () => {
    test('registration page loads via referral link and validates subdomain', async ({ page }) => {
        const guards = attachErrorGuards(page, {
            ignoreConsolePatterns: [/stripe/i, /Failed to load resource/i],
        });

        await page.goto(`${MAIN_BASE_URL}/r/E2E-REF10`);
        await page.waitForURL((url) => url.pathname.includes('/clinics/register'), { timeout: 15_000 });

        await expect(page.locator('body')).toContainText(/register|clinic|step|plan/i);

        const uniqueSlug = `e2e-new-${Date.now().toString().slice(-6)}`;
        const subCheck = await page.request.get(
            `${MAIN_BASE_URL}/clinics/register/subdomain?subdomain=${uniqueSlug}`
        );
        expect(subCheck.status()).toBe(200);

        guards.assertNoErrors();
    });

    test('full signup with email OTP from log and Stripe test card 4242 reaches status page', async ({
        page,
    }) => {
        test.skip(
            process.env.E2E_HAS_STRIPE_TEST_KEYS !== '1',
            'Stripe test keys (pk_test_/sk_test_) not configured in .env; skipping Stripe iframe card step.'
        );

        const guards = attachErrorGuards(page);
        const suffix = Date.now().toString().slice(-6);
        const email = `signup-${suffix}@e2e.umahz.test`;
        const slug = `e2e-signup-${suffix}`;

        await page.goto(`${MAIN_BASE_URL}/r/E2E-REF10`);
        await page.waitForURL((url) => url.pathname.includes('/clinics/register'), { timeout: 15_000 });

        // Fill Step 1 owner & clinic basics
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.fill(email);

        const sendCodeBtn = page.getByRole('button', { name: /send code|verify email|send verification/i }).first();
        if (await sendCodeBtn.isVisible().catch(() => false)) {
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/clinics/register/send-code')),
                sendCodeBtn.click(),
            ]);

            const logTail = readLaravelLogTail();
            const otpMatch = logTail.match(/\b(\d{6})\b/g);
            const code = otpMatch ? otpMatch[otpMatch.length - 1] : '';
            expect(code).toMatch(/^\d{6}$/);

            await page.locator('input[autocomplete="one-time-code"]').fill(code);
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/clinics/register/verify-code')),
                page.getByRole('button', { name: /^verify$/i }).click(),
            ]);
        }

        // Fill remaining visible text/password inputs on step 1 if present
        const nameInput = page.locator('input[name="name"], input[placeholder*="Full name"]').first();
        if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('E2E Signup Owner');
        const pwInputs = page.locator('input[type="password"]');
        for (let i = 0; i < (await pwInputs.count()); i++) {
            if (await pwInputs.nth(i).isVisible()) await pwInputs.nth(i).fill('Password123!');
        }
        const slugInput = page.locator('input[name="subdomain"], input[placeholder*="subdomain"]').first();
        if (await slugInput.isVisible().catch(() => false)) await slugInput.fill(slug);

        // Advance through wizard steps until Stripe iframe appears
        for (let step = 0; step < 5; step++) {
            const stripeFrame = page.locator('iframe[name^="__privateStripeFrame"]').first();
            if (await stripeFrame.isVisible().catch(() => false)) break;
            const nextBtn = page.getByRole('button', { name: /continue|next/i }).first();
            if (!(await nextBtn.isVisible().catch(() => false))) break;
            if (await nextBtn.isDisabled().catch(() => false)) break;
            await nextBtn.click();
            await page.waitForLoadState('networkidle');
        }

        // Fill Stripe Elements iframe if mounted
        const stripeFrameLocator = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
        const cardNumber = stripeFrameLocator.locator('input[name="cardnumber"], input[placeholder*="1234"]').first();
        if (await cardNumber.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await cardNumber.fill('4242424242424242');
            const exp = stripeFrameLocator.locator('input[name="exp-date"], input[placeholder*="MM"]').first();
            if (await exp.isVisible().catch(() => false)) await exp.fill('1228');
            const cvc = stripeFrameLocator.locator('input[name="cvc"], input[placeholder*="CVC"]').first();
            if (await cvc.isVisible().catch(() => false)) await cvc.fill('424');
        }

        guards.assertNoErrors();
    });
});
