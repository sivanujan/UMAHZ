import { expect, test } from '@playwright/test';
import { attachErrorGuards, MAIN_BASE_URL } from './helpers';

test.describe('Public marketing & error pages', () => {
    test('home page loads and videos are playable', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await page.goto(`${MAIN_BASE_URL}/`);
        await expect(page).toHaveTitle(/UMAHZ/i);

        const playBtn = page.getByRole('button', { name: /play product walkthrough video/i });
        await playBtn.scrollIntoViewIfNeeded();
        await playBtn.click({ force: true });

        const firstVideo = page.locator('video').first();
        await expect(firstVideo).toBeVisible({ timeout: 10_000 });

        const mediaState = await firstVideo.evaluate(async (el: HTMLVideoElement) => {
            if (el.readyState < 1) {
                el.load();
            }
            return {
                error: el.error ? el.error.code : null,
                hasSource: Boolean(el.currentSrc || el.getAttribute('src') || el.querySelector('source')),
            };
        });
        expect(mediaState.hasSource).toBe(true);
        expect(mediaState.error).toBeNull();

        guards.assertNoErrors();
    });

    test('pricing page displays plans and launch pricing', async ({ page }) => {
        const guards = attachErrorGuards(page);

        await page.goto(`${MAIN_BASE_URL}/pricing`);
        await expect(page.locator('body')).toContainText(/pricing|plan|practice|solo/i);
        await expect(page.locator('body')).toContainText(/\$/);

        guards.assertNoErrors();
    });

    test('unknown URL renders branded 404 page with 404 status', async ({ page }) => {
        const guards = attachErrorGuards(page, {
            ignoreConsolePatterns: [/404 \(Not Found\)/],
        });

        const response = await page.goto(`${MAIN_BASE_URL}/this-route-definitely-does-not-exist-e2e`);
        expect(response?.status()).toBe(404);
        await expect(page.locator('body')).toContainText('404');

        guards.assertNoErrors();
    });
});
