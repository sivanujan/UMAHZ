import { expect, test } from '@playwright/test';
import { getLaravelLogSize, queryE2eDb, readLaravelLogFrom } from './db';
import {
    attachErrorGuards,
    CLINIC_SLUG,
    clinicUrl,
    E2E_PASSWORD,
    loginAtClinic,
    USERS,
} from './helpers';

test.describe('Appointment booking, confirmation email, intake, and PDF consent', () => {
    test('staff books appointment, confirmation is logged, patient submits intake, and consent PDF is signed', async ({
        page,
    }, testInfo) => {
        const guards = attachErrorGuards(page);

        // 1. Public clinic website loads
        await page.goto(clinicUrl(CLINIC_SLUG, '/'));
        await expect(page.locator('body')).toContainText('E2E Wellness Clinic');

        // 2. Receptionist logs in and books a new appointment on /app/calendar
        await loginAtClinic(page, CLINIC_SLUG, USERS.receptionist, E2E_PASSWORD);
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/calendar'));

        const uniqueService = `E2E Follow-Up ${Date.now().toString().slice(-4)}`;
        const dayOffset = testInfo.project.name === 'chromium' ? 1 : testInfo.project.name === 'webkit' ? 2 : 3;
        const targetDate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const timeStr = '10:00';

        await page.getByRole('button', { name: /new appointment/i }).click();
        const modal = page.locator('form').filter({ hasText: /Service Name/i });
        await expect(modal).toBeVisible();

        const selects = modal.locator('select');
        // Select Jordan Taylor and Dr. E2E Physio by option label
        await selects.nth(0).selectOption({ label: 'Jordan Taylor' });
        await selects.nth(1).selectOption({ label: 'Dr. E2E Physio' });
        await modal.locator('input[placeholder*="Acupuncture"]').fill(uniqueService);
        await modal.locator('input[type="date"]').fill(dateStr);
        await modal.locator('input[type="time"]').fill(timeStr);

        const logBefore = getLaravelLogSize();
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/app/appointments') && res.request().method() === 'POST'),
            modal.locator('button[type="submit"]').click(),
        ]);
        await expect(modal).toBeHidden({ timeout: 10_000 });

        // Verify appointment in DB and confirmation email in laravel.log
        const appts = queryE2eDb<{ id: string; service_name: string }>(
            'SELECT id, service_name FROM appointments WHERE service_name = ? LIMIT 1',
            [uniqueService]
        );
        expect(appts.length).toBe(1);

        const newLog = readLaravelLogFrom(logBefore);
        expect(newLog).toMatch(/Appointment.*Confirmed|AppointmentConfirmation|E2E Follow-Up/i);

        // 3. Open Jordan Taylor profile, generate an intake link, and complete it at /intake/{token}
        await page.goto(clinicUrl(CLINIC_SLUG, '/app/clients'));
        await page.getByText('Jordan Taylor').first().click();
        await page.waitForURL((url) => /\/app\/clients\/.+/.test(url.pathname));
        const clientShowUrl = page.url();

        await page.getByRole('button', { name: /send patient link/i }).first().click();
        const intakeModal = page.locator('form').filter({ hasText: /discipline|send/i }).last();
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/intakes/link') && res.request().method() === 'POST'),
            intakeModal.locator('button[type="submit"]').click(),
        ]);
        await expect(intakeModal).toContainText(/http|copied|link/i, { timeout: 10_000 });

        const intakes = queryE2eDb<{ id: string; token: string; status: string }>(
            'SELECT id, token, status FROM client_intakes ORDER BY created_at DESC LIMIT 1'
        );
        expect(intakes.length).toBe(1);
        const intakeToken = intakes[0].token;

        // Open public intake URL
        await page.goto(clinicUrl(CLINIC_SLUG, `/intake/${intakeToken}`));
        await expect(page.locator('body')).toContainText(/Patient Health History Form|Health History/i);

        // Fill visible text/textarea inputs, select options, and screening radios/buttons
        const textInputs = page.locator('form input[type="text"], form input[type="tel"], form textarea');
        const count = await textInputs.count();
        for (let i = 0; i < count; i++) {
            const inp = textInputs.nth(i);
            if (await inp.isVisible()) {
                await inp.fill('E2E intake response');
            }
        }
        const intakeSelects = page.locator('form select');
        for (let i = 0; i < (await intakeSelects.count()); i++) {
            const sel = intakeSelects.nth(i);
            if (await sel.isVisible()) {
                const opts = await sel.locator('option').count();
                if (opts > 1) await sel.selectOption({ index: 1 });
            }
        }
        const noButtons = page.locator('form button, form label').filter({ hasText: /^no$/i });
        for (let i = 0; i < (await noButtons.count()); i++) {
            await noButtons.nth(i).click();
        }
        const checkboxes = page.locator('form input[type="checkbox"]');
        const cbCount = await checkboxes.count();
        if (cbCount > 0) {
            await checkboxes.last().check({ force: true });
        }

        await Promise.all([
            page.waitForResponse((res) => res.url().includes(`/intake/${intakeToken}`) && res.request().method() === 'POST'),
            page.locator('form button[type="submit"]').click(),
        ]);
        await expect(page.locator('body')).toContainText(/thank you|submitted|completed/i, { timeout: 10_000 });

        const updatedIntakes = queryE2eDb<{ status: string }>(
            'SELECT status FROM client_intakes WHERE id = ?',
            [intakes[0].id]
        );
        expect(updatedIntakes[0]?.status).toBe('completed');

        // 4. Return to client profile and sign the E2E PDF Consent
        await page.goto(clientShowUrl);
        await page.getByRole('button', { name: /record new consent|record client consent/i }).first().click();
        const consentModal = page.locator('form').filter({ hasText: /consent/i }).last();
        await expect(consentModal).toBeVisible();

        await consentModal.getByRole('button', { name: /E2E Treatment Consent PDF/i }).click();
        await consentModal.locator('input[placeholder="e.g. Jane Doe"]').fill('Jordan Taylor');
        // Draw signature on canvas
        const sigCanvas = consentModal.locator('canvas').first();
        await sigCanvas.scrollIntoViewIfNeeded();
        const box = await sigCanvas.boundingBox();
        if (box) {
            await page.mouse.move(box.x + 20, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + 120, box.y + box.height / 2 + 10);
            await page.mouse.up();
        }
        const consentCb = consentModal.locator('input[type="checkbox"]');
        if ((await consentCb.count()) > 0) {
            await consentCb.first().check({ force: true });
        }

        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/consents') && res.request().method() === 'POST'),
            consentModal.locator('button[type="submit"]').click(),
        ]);
        await expect(consentModal).toBeHidden({ timeout: 10_000 });

        const consents = queryE2eDb<{ id: string; signed_pdf_path: string | null }>(
            "SELECT id, signed_pdf_path FROM consents WHERE consent_type_name = 'E2E Treatment Consent PDF' ORDER BY created_at DESC LIMIT 1"
        );
        expect(consents.length).toBe(1);
        expect(consents[0].signed_pdf_path).toBeTruthy();

        const pdfRes = await page.request.get(clinicUrl(CLINIC_SLUG, `/app/consents/${consents[0].id}/document`));
        expect(pdfRes.status()).toBe(200);
        expect(pdfRes.headers()['content-type']).toContain('application/pdf');

        // 5. Sign a second consent using "Type Name" mode
        await page.getByRole('button', { name: /record new consent|record client consent/i }).first().click();
        const typedModal = page.locator('form').filter({ hasText: /consent/i }).last();
        await expect(typedModal).toBeVisible();
        await typedModal.getByRole('button', { name: /type name/i }).click();
        await typedModal.locator('input[placeholder="e.g. Jane Doe"]').fill('Jordan Taylor');
        const typedCb = typedModal.locator('input[type="checkbox"]');
        if ((await typedCb.count()) > 0) {
            await typedCb.first().check({ force: true });
        }
        await Promise.all([
            page.waitForResponse((res) => res.url().includes('/consents') && res.request().method() === 'POST'),
            typedModal.locator('button[type="submit"]').click(),
        ]);
        await expect(typedModal).toBeHidden({ timeout: 10_000 });

        const typedConsents = queryE2eDb<{ signature_type: string; signature_data: string }>(
            "SELECT signature_type, signature_data FROM consents WHERE signature_type = 'typed' ORDER BY created_at DESC LIMIT 1"
        );
        expect(typedConsents.length).toBe(1);
        expect(typedConsents[0].signature_data).toContain('TYPED_ACKNOWLEDGMENT: Jordan Taylor');

        guards.assertNoErrors();
    });
});
