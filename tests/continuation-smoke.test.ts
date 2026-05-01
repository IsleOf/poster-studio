import { test, expect } from '@playwright/test';
import { gotoAdmin, gotoDesigner, setupContinuationMocks, waitForDesignerReady } from './continuation.helpers';

test.describe('Continuation smoke', () => {
    test('designer default clears loading overlay and shows poster', async ({ page }) => {
        await gotoDesigner(page, '/');

        await expect(page.locator('#poster-preview svg')).toBeVisible();
        await expect(page.locator('#poster-preview')).toHaveCSS('opacity', '1');
        await expect(page.getByText('THE MAPPED MOMENT')).toBeVisible();
    });

    test('listing route loads design cards and design slug switching works', async ({ page }) => {
        await setupContinuationMocks(page);
        await page.goto('/l/star-map-night-we-met');
        await waitForDesignerReady(page);

        const designThumbs = page.locator('img[src*="/designs/"]');
        await expect(designThumbs).toHaveCount(2);

        await designThumbs.nth(1).click();
        await expect(page).toHaveURL(/\/l\/star-map-night-we-met\/design002|\/l\/star-map-night-we-met$/);
        await expect(page.locator('#poster-preview')).toHaveCSS('opacity', '1');
    });

    test('mode switching survives streetmap and coloredmap toggles', async ({ page }) => {
        await gotoDesigner(page, '/');

        await page.getByRole('button', { name: /street map/i }).click();
        await expect(page.locator('#poster-preview svg')).toBeVisible();

        await page.getByRole('button', { name: /colored map/i }).click();
        await expect(page.locator('#poster-preview svg')).toBeVisible();

        await page.getByRole('button', { name: /star map/i }).click();
        await waitForDesignerReady(page);
    });

    test('share link roundtrip restores custom title', async ({ page, context }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chrome', 'desktop-only clipboard flow');
        await gotoDesigner(page, '/');
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.getByPlaceholder(/our night sky/i).fill('Shared Continuation Title');
        await page.getByRole('button', { name: /share design link/i }).click();

        const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
        expect(copiedUrl).toContain('?d=');

        const other = await context.newPage();
        await setupContinuationMocks(other);
        await other.goto(copiedUrl);
        await waitForDesignerReady(other);
        await expect(other.locator('#poster-preview svg')).toContainText('Shared Continuation Title');
    });

    test('admin order detail renders seller notes and timeline', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chrome', 'desktop-only admin detail smoke');
        await gotoAdmin(page, '/admin/orders/1');

        await expect(page.getByPlaceholder(/internal notes/i)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save Note' })).toBeDisabled();
        await expect(page.getByText('Timeline')).toBeVisible();
    });

    test('verify order flow reaches delivered state', async ({ page }) => {
        await setupContinuationMocks(page);
        await page.goto('/verify');

        await page.getByPlaceholder('e.g. 1234567890').fill('9999999999');
        await page.getByRole('button', { name: /get my poster/i }).click();

        await expect(page.getByRole('heading', { name: /your file has been delivered/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/downloads folder/i)).toBeVisible();
    });
});
