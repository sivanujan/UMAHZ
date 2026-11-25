import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 45_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        baseURL: 'http://lvh.me:8000',
        reducedMotion: 'reduce',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'mobile-iphone',
            use: { ...devices['iPhone 14'] },
        },
    ],
    webServer: {
        command: 'php -d extension=fileinfo -S 0.0.0.0:8000 dev-server-router.php',
        url: 'http://lvh.me:8000/up',
        reuseExistingServer: false,
        timeout: 60_000,
        env: {
            ...process.env,
            PHP_CLI_SERVER_WORKERS: '4',
            APP_ENV: 'local',
            DB_DATABASE: 'umahz_e2e',
            MAIL_MAILER: 'log',
            SCRIBE_TRANSCRIPTION_DRIVER: 'fake',
            SCRIBE_DRAFTING_DRIVER: 'fake',
            STRIPE_KEY: 'pk_test_e2e_placeholder',
            STRIPE_SECRET: 'sk_test_e2e_placeholder',
        },
    },
});
