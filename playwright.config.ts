import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function readEnvTestStripeKeys(): { key: string; secret: string; hasTestKeys: boolean } {
    const envPath = path.resolve(process.cwd(), '.env');
    let key = 'e2e-placeholder';
    let secret = 'e2e-placeholder';
    let hasTestKeys = false;

    if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, 'utf8');
        const keyMatch = raw.match(/^STRIPE_KEY=(.+)$/m);
        const secretMatch = raw.match(/^STRIPE_SECRET=(.+)$/m);
        const envKey = keyMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
        const envSecret = secretMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
        if (envKey.startsWith('pk_test_') && envSecret.startsWith('sk_test_')) {
            key = envKey;
            secret = envSecret;
            hasTestKeys = true;
        }
    }

    return { key, secret, hasTestKeys };
}

const stripeEnv = readEnvTestStripeKeys();
if (stripeEnv.hasTestKeys) {
    process.env.E2E_HAS_STRIPE_TEST_KEYS = '1';
}

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
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chromium',
                permissions: ['microphone'],
                launchOptions: {
                    args: [
                        '--use-fake-ui-for-media-stream',
                        '--use-fake-device-for-media-stream',
                        '--unsafely-treat-insecure-origin-as-secure=http://e2e-clinic.lvh.me:8000',
                    ],
                },
            },
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
            QUEUE_CONNECTION: 'sync',
            MAIL_MAILER: 'log',
            SCRIBE_TRANSCRIPTION_DRIVER: 'fake',
            SCRIBE_DRAFTING_DRIVER: 'fake',
            SCRIBE_STREAMING: 'false',
            STRIPE_KEY: stripeEnv.key,
            STRIPE_SECRET: stripeEnv.secret,
        },
    },
});
