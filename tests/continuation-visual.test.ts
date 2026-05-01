import { test, expect } from '@playwright/test';
import { fullShot, gotoAdmin, gotoDesigner, posterShot, setupContinuationMocks } from './continuation.helpers';

test.describe('Continuation visual', () => {
    test('designer baseline', async ({ page }) => {
        await gotoDesigner(page, '/');
        await fullShot(page, 'continuation-designer');
        await expect(page).toHaveScreenshot('continuation-designer.png', { maxDiffPixelRatio: 0.05 });
    });

    test('poster crop baseline', async ({ page }) => {
        await gotoDesigner(page, '/');
        await posterShot(page, 'continuation-poster');
        await expect(page.locator('#poster-preview')).toHaveScreenshot('continuation-poster.png', { maxDiffPixelRatio: 0.05 });
    });

    test('verify page baseline', async ({ page }) => {
        await setupContinuationMocks(page);
        await page.goto('/verify');
        await page.waitForSelector('input[placeholder="e.g. 1234567890"]', { timeout: 8000 });
        await fullShot(page, 'continuation-verify');
        await expect(page).toHaveScreenshot('continuation-verify.png', { maxDiffPixelRatio: 0.05 });
    });

    test('admin dashboard baseline', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chrome', 'desktop-only admin visual');
        await gotoAdmin(page, '/admin/dashboard');
        await fullShot(page, 'continuation-admin-dashboard');
        await expect(page).toHaveScreenshot('continuation-admin-dashboard.png', { maxDiffPixelRatio: 0.05 });
    });
});
