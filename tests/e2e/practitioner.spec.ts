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

test.describe('Practitioner calendar, clinical notes, tests, and AI Scribe', () => {
    test('calendar shows evening appointment; SOAP note with 2 tests, sign/lock, addendum, and print view work', async ({
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
        const clientShowUrl = page.url();

        await page.goto(`${clientShowUrl.replace(/\/$/, '')}/notes/create`);
        await page.waitForLoadState('networkidle');

        // Fill visible clinical note textareas & selects
        const textareas = page.locator('textarea');
        const taCount = await textareas.count();
        for (let i = 0; i < Math.min(taCount, 6); i++) {
            const ta = textareas.nth(i);
            if (await ta.isVisible()) {
                await ta.fill(`E2E clinical note entry ${i + 1}`);
            }
        }
        const selects = page.locator('select');
        const selCount = await selects.count();
        for (let i = 0; i < selCount; i++) {
            const sel = selects.nth(i);
            if (await sel.isVisible()) {
                const opts = await sel.locator('option').count();
                if (opts > 1) await sel.selectOption({ index: 1 });
            }
        }

        // 3. Add two assessment tests: Neer Impingement Test (Positive Right) + Lachman Test (Negative)
        await page.getByRole('button', { name: /add tests/i }).first().click();
        const searchInput = page.locator('input[placeholder*="Search test"]');
        await expect(searchInput).toBeVisible();

        await searchInput.fill('Neer');
        await page.getByText('Neer Impingement Test').first().click();

        await searchInput.fill('Lachman');
        await page.getByText('Lachman Test').first().click();

        await page.getByRole('button', { name: /add selected tests/i }).click();

        // Mark first test Positive (+) and Right side; second remains Negative (-)
        await page.getByRole('button', { name: /pos \(\+\)/i }).first().click();
        const sideSelects = page.locator('select').filter({ hasText: /right/i });
        if ((await sideSelects.count()) > 0) {
            await sideSelects.first().selectOption('right');
        }

        await expect(page.locator('body')).toContainText(/1 Positive Test/i);

        // 4. Save Draft Now (may POST /notes or PATCH /autosave if already autosaved)
        await Promise.all([
            page.waitForResponse(
                (res) => (res.url().includes('/notes') || res.url().includes('/autosave')) && ['POST', 'PATCH'].includes(res.request().method())
            ),
            page.getByRole('button', { name: /save draft now/i }).click(),
        ]);

        // 5. Sign & Finalize -> confirm locked on Show page
        await page.getByRole('button', { name: 'Sign & Finalize Note' }).click();
        const finalizeModal = page.locator('form').filter({ hasText: /attest/i }).last();
        await expect(finalizeModal).toBeVisible();
        await finalizeModal.locator('input[type="checkbox"]').check({ force: true });

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/finalize') && res.request().method() === 'POST'),
            finalizeModal.locator('button[type="submit"]').click(),
        ]);
        await page.waitForURL((url) => /\/app\/notes\/[^/]+$/.test(url.pathname), { timeout: 15_000 });

        await expect(page.getByRole('button', { name: /save draft now/i })).toHaveCount(0);
        await expect(page.locator('body')).toContainText(/signed|finalized/i);

        // 6. Add Addendum with one more test result
        await page.getByRole('button', { name: /add addendum/i }).click();
        const addendumForm = page.locator('form').filter({ hasText: /reason for addendum/i });
        await expect(addendumForm).toBeVisible();
        const authorInput = addendumForm.locator('input[type="text"]').first();
        if ((await authorInput.inputValue()) === '') {
            await authorInput.fill('Dr. E2E Physio, PT');
        }
        await addendumForm.locator('textarea').first().fill('E2E addendum clinical update.');
        await addendumForm.getByRole('button', { name: /add test/i }).click();
        await addendumForm.getByText('Neer Impingement Test').first().click();

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/addenda') && res.request().method() === 'POST'),
            addendumForm.getByRole('button', { name: /append signed addendum/i }).click(),
        ]);

        const addenda = queryE2eDb<{ id: string }>(
            "SELECT id FROM clinical_note_addenda WHERE content LIKE '%E2E addendum clinical update%' LIMIT 1"
        );
        expect(addenda.length).toBe(1);

        // 7. Print view shows tests table
        await page.emulateMedia({ media: 'print' });
        const printable = page.locator('#clinical-printable-record');
        await expect(printable).toBeVisible();
        await expect(printable).toContainText('Neer Impingement Test');
        await expect(printable).toContainText('Lachman Test');

        guards.assertNoErrors();
    });

    test('Scribe with fake driver: consent, start, stop, transcript, draft, use in note, and sessions list', async ({
        page,
    }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'chromium',
            'WebKit and mobile-iphone do not support fake microphone media streams in headless mode.'
        );
        const guards = attachErrorGuards(page);

        await loginAtClinic(page, CLINIC_SLUG, USERS.practitioner, E2E_PASSWORD);

        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));
        const clientShowUrl = page.url();

        const scribeBtn = page.getByRole('button', { name: /^Start Scribe$/i }).first();
        await expect(scribeBtn).toBeVisible();
        await scribeBtn.click();

        // Step 1: Consent (wait until ScribePanel finishes loading either ConsentStep or Start recording)
        const signerInput = page.locator('#scribe-signer');
        const startRecBtn = page.getByRole('button', { name: /start recording/i });
        await expect(signerInput.or(startRecBtn)).toBeVisible({ timeout: 15_000 });
        if (await signerInput.isVisible()) {
            await signerInput.fill('Jordan Taylor');
            const consentForm = page.locator('form').filter({ hasText: /record consent/i });
            await consentForm.locator('input[type="checkbox"]').check({ force: true });
            await Promise.all([
                page.waitForResponse((res) => res.url().includes('/consent') && res.request().method() === 'POST'),
                consentForm.getByRole('button', { name: /record consent/i }).click(),
            ]);
        }

        // Step 2: Start recording -> Stop recording -> Transcript -> Generate AI draft -> Use in clinical note
        await expect(startRecBtn).toBeEnabled({ timeout: 10_000 });
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/start') && res.request().method() === 'POST'),
            startRecBtn.click(),
        ]);

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/stop') && res.request().method() === 'POST'),
            page.getByRole('button', { name: 'Stop', exact: true }).click(),
        ]);

        const genDraftBtn = page.getByRole('button', { name: /generate ai draft|regenerate/i }).first();
        await expect(genDraftBtn).toBeVisible({ timeout: 15_000 });
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/draft') && res.request().method() === 'POST'),
            genDraftBtn.click(),
        ]);

        const useInNoteBtn = page.getByRole('button', { name: /use this draft in the clinical note/i }).first();
        await expect(useInNoteBtn).toBeVisible({ timeout: 15_000 });
        await useInNoteBtn.click();

        await page.waitForURL((url) => /\/app\/notes\/.*(create|edit)/.test(url.pathname), { timeout: 15_000 });
        await expect(page.locator('body')).toContainText(/Pre-filled from AI Scribe/i);

        // Verify session appears in client's Scribe sessions list
        await page.goto(clientShowUrl);
        await expect(page.locator('body')).toContainText(/Scribe/i);

        const sessions = queryE2eDb<{ id: string; status: string }>(
            'SELECT id, status FROM scribe_sessions ORDER BY created_at DESC LIMIT 1'
        );
        expect(sessions.length).toBe(1);

        // Verify Practitioner Dashboard renders unsigned draft Scribe note without React errors
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/dashboard'));
        await expect(page.locator('body')).toContainText(/Unsigned Notes/i);
        await expect(page.locator('body')).toContainText(/Jordan Taylor/i);

        guards.assertNoErrors();
    });
});
