import { expect, type Page } from '@playwright/test';

export const MAIN_BASE_URL = 'http://lvh.me:8000';
export const CLINIC_SLUG = 'e2e-clinic';
export const OTHER_CLINIC_SLUG = 'other-e2e-clinic';
export const PENDING_CLINIC_SLUG = 'pending-e2e-clinic';

export const clinicUrl = (slug: string, path = '/'): string =>
    `http://${slug}.lvh.me:8000${path.startsWith('/') ? path : `/${path}`}`;

export const E2E_PASSWORD = 'Password123!';

export const USERS = {
    admin: 'admin@e2e.umahz.test',
    owner: 'owner@e2e-clinic.test',
    practitioner: 'practitioner@e2e-clinic.test',
    receptionist: 'receptionist@e2e-clinic.test',
    client: 'client@e2e-clinic.test',
    pendingOwner: 'pending-owner@e2e.test',
    otherOwner: 'other-owner@e2e.test',
} as const;

export interface ErrorGuards {
    consoleErrors: string[];
    pageErrors: string[];
    serverErrors: string[];
    assertNoErrors: () => void;
    clear: () => void;
}

/**
 * Attaches listeners to fail on any browser console error, uncaught pageerror,
 * or HTTP >= 500 response during an E2E test.
 */
export function attachErrorGuards(
    page: Page,
    options?: {
        ignoreConsolePatterns?: RegExp[];
        ignoreServerErrorUrls?: RegExp[];
    }
): ErrorGuards {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (options?.ignoreConsolePatterns?.some((re) => re.test(text))) {
                return;
            }
            consoleErrors.push(text);
        }
    });

    page.on('pageerror', (err) => {
        pageErrors.push(err.message || String(err));
    });

    page.on('response', (res) => {
        if (res.status() >= 500) {
            const url = res.url();
            if (options?.ignoreServerErrorUrls?.some((re) => re.test(url))) {
                return;
            }
            serverErrors.push(`${res.status()} ${res.request().method()} ${url}`);
        }
    });

    return {
        consoleErrors,
        pageErrors,
        serverErrors,
        clear() {
            consoleErrors.length = 0;
            pageErrors.length = 0;
            serverErrors.length = 0;
        },
        assertNoErrors() {
            const problems = [
                ...consoleErrors.map((e) => `Console error: ${e}`),
                ...pageErrors.map((e) => `Uncaught page error: ${e}`),
                ...serverErrors.map((e) => `HTTP 5xx: ${e}`),
            ];
            expect(problems, `Unexpected runtime errors:\n${problems.join('\n')}`).toEqual([]);
        },
    };
}

export async function loginAtClinic(
    page: Page,
    slug: string,
    email: string,
    password: string = E2E_PASSWORD
): Promise<void> {
    await page.goto(clinicUrl(slug, '/login'));
    await page.locator('input[type="email"], input[name="email"]').fill(email);
    await page.locator('input[type="password"], input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 });
}

export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto(`${MAIN_BASE_URL}/login`);
    await page.locator('input[type="email"], input[name="email"]').fill(USERS.admin);
    await page.locator('input[type="password"], input[name="password"]').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 15_000 });
}
