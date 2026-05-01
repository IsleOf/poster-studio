import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    testMatch: ['continuation-*.test.ts'],
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 1,
    workers: 1,
    reporter: [['html', { outputFolder: 'tests/report-continuation', open: 'never' }], ['list']],
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    snapshotDir: './tests/snapshots',
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.03,
            threshold: 0.2,
        },
    },
    projects: [
        {
            name: 'desktop-chrome',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, headless: true },
        },
        {
            name: 'mobile-iphone',
            use: { ...devices['iPhone 14 Pro'], browserName: 'chromium', headless: true },
        },
    ],
    webServer: {
        command: 'npm run preview -- --port 4173',
        port: 4173,
        reuseExistingServer: true,
        timeout: 30000,
    },
});
