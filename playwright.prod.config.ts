import { defineConfig, devices } from '@playwright/test';

const PROD = 'https://themappedmoment.com';

export default defineConfig({
    testDir: './tests',
    testMatch: 'prod-ui.test.ts',
    fullyParallel: false,
    retries: 1,
    workers: 1,
    reporter: [['html', { outputFolder: 'tests/report-prod', open: 'never' }], ['list']],
    use: {
        baseURL: PROD,
        trace: 'on-first-retry',
        screenshot: 'on',
    },
    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
        },
        {
            // iPhone 14 screen size, Chromium (WebKit not installed in CI)
            name: 'Mobile Chrome (iPhone 14)',
            use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
        },
        {
            name: 'Mobile Chrome (Pixel 7)',
            use: { ...devices['Pixel 7'] },
        },
        {
            // iPad Pro screen size, Chromium
            name: 'Tablet Chrome (iPad Pro)',
            use: { browserName: 'chromium', viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
        },
    ],
});
