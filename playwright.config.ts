import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 1,
    workers: 1,
    reporter: [['html', { outputFolder: 'tests/report', open: 'never' }], ['list']],
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
        screenshot: 'on',
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
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
        },
    ],
    // Start the preview server before tests
    webServer: {
        command: 'npm run preview -- --port 4173',
        port: 4173,
        reuseExistingServer: true,
        timeout: 30000,
    },
});
