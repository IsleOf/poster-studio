/**
 * Visual screenshot tests — captures every major page/state.
 * First run writes baseline snapshots; subsequent runs compare.
 * Screenshots are saved to tests/screenshots/ for review.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { setupMockApi } from './fixtures/mockApi';

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function shot(page: Page, name: string) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    return filePath;
}

async function waitForSvg(page: Page) {
    await page.waitForSelector('svg', { timeout: 12000 });
    // Don't use networkidle — star data CDN keeps network active and times out.
    // Wait for star circles to render (>50 circles = stars loaded) or 5s fallback.
    await Promise.race([
        page.waitForFunction(() => document.querySelectorAll('svg circle').length > 50, { timeout: 15000 }),
        page.waitForTimeout(5000),
    ]).catch(() => {});
    await page.waitForTimeout(500);
}

async function asAdmin(page: Page, route: string) {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(route);
    await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════
// POSTER DESIGNER — VISUAL STATES
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Poster designer', () => {
    test('screenshot: default designer (star map, circle)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await shot(page, '01-designer-default');
        // Soft snapshot comparison (skips on first run, diffs on subsequent)
        await expect(page).toHaveScreenshot('01-designer-default.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: /t/classic-dark template URL', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await waitForSvg(page);
        await shot(page, '02-template-classic-dark');
        await expect(page).toHaveScreenshot('02-template-classic-dark.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: /t/modern-white template URL', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/modern-white');
        await waitForSvg(page);
        await shot(page, '03-template-modern-white');
        await expect(page).toHaveScreenshot('03-template-modern-white.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: /t/home-street template URL', async ({ page }) => {
        // Increase test timeout for MapLibre tile loading
        test.setTimeout(60000);
        await setupMockApi(page);
        await page.goto('/t/home-street');
        await page.waitForSelector('svg', { timeout: 15000 });
        // MapLibre tiles load asynchronously — wait for network to settle or 5s, whichever first
        await Promise.race([
            page.waitForLoadState('networkidle'),
            page.waitForTimeout(5000),
        ]).catch(() => {});
        await shot(page, '04-template-home-street');
        // Map tiles cause high variance — just verify screenshot was taken, skip pixel diff
        const file = path.join(SCREENSHOT_DIR, '04-template-home-street.png');
        expect(fs.existsSync(file)).toBe(true);
    });

    test('screenshot: verify order page', async ({ page }) => {
        test.setTimeout(20000);
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('input[placeholder="e.g. 1234567890"]', { timeout: 8000 });
        await page.bringToFront();
        await shot(page, '05-verify-page');
        await expect(page).toHaveScreenshot('05-verify-page.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: privacy policy page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/privacy');
        await page.waitForLoadState('networkidle');
        await shot(page, '06-privacy-page');
        await expect(page).toHaveScreenshot('06-privacy-page.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD — VISUAL STATES
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Admin dashboard', () => {
    test('screenshot: login page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.waitForLoadState('networkidle');
        await shot(page, '10-admin-login');
        await expect(page).toHaveScreenshot('10-admin-login.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: dashboard (stats)', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await shot(page, '11-admin-dashboard');
        await expect(page).toHaveScreenshot('11-admin-dashboard.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: orders list', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await shot(page, '12-admin-orders');
        await expect(page).toHaveScreenshot('12-admin-orders.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: order detail (order #1)', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await shot(page, '13-admin-order-detail');
        await expect(page).toHaveScreenshot('13-admin-order-detail.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: templates list', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await shot(page, '14-admin-templates');
        await expect(page).toHaveScreenshot('14-admin-templates.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: template editor — details tab (classic-dark)', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await shot(page, '15-admin-template-editor-details');
        await expect(page).toHaveScreenshot('15-admin-template-editor-details.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: template editor — Etsy listing tab (modern-white)', async ({ page }) => {
        await asAdmin(page, '/admin/templates/modern-white/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        await page.waitForTimeout(200);
        await shot(page, '16-admin-template-etsy-tab');
        await expect(page).toHaveScreenshot('16-admin-template-etsy-tab.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: new template form', async ({ page }) => {
        await asAdmin(page, '/admin/templates/new');
        await shot(page, '17-admin-template-new');
        await expect(page).toHaveScreenshot('17-admin-template-new.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: Etsy integration page', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        await shot(page, '18-admin-etsy');
        await expect(page).toHaveScreenshot('18-admin-etsy.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: assets page', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await shot(page, '19-admin-assets');
        await expect(page).toHaveScreenshot('19-admin-assets.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: settings page', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await shot(page, '20-admin-settings');
        await expect(page).toHaveScreenshot('20-admin-settings.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// INTERACTIVE STATES — screenshots of UI interactions
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Interactive states', () => {
    test('screenshot: login with wrong password (error state)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.getByText('Invalid password')).toBeVisible();
        await shot(page, '30-admin-login-error');
        await expect(page).toHaveScreenshot('30-admin-login-error.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: orders filtered by status=failed', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('failed');
        await page.waitForTimeout(300);
        await shot(page, '31-admin-orders-filtered-failed');
        await expect(page).toHaveScreenshot('31-admin-orders-filtered-failed.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: settings with auto-process toggled ON', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await page.locator('.chakra-switch').first().click();
        await page.waitForTimeout(200);
        await shot(page, '32-admin-settings-autoprocess-on');
        await expect(page).toHaveScreenshot('32-admin-settings-autoprocess-on.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: template editor Etsy tab with tags added', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        const addBtn = page.getByRole('button', { name: 'Add', exact: true });
        await page.getByPlaceholder('add tag...').fill('star map');
        await addBtn.click();
        await page.getByPlaceholder('add tag...').fill('custom poster');
        await addBtn.click();
        await page.waitForTimeout(200);
        await shot(page, '33-admin-template-etsy-tags');
        await expect(page).toHaveScreenshot('33-admin-template-etsy-tags.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: SVG poster element (cropped)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        const svg = page.locator('svg').first();
        const box = await svg.boundingBox();
        if (box) {
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, '40-poster-svg-crop.png'),
                clip: { x: box.x, y: box.y, width: box.width, height: box.height },
            });
        }
        await expect(page).toHaveScreenshot('40-poster-svg-crop.png', { maxDiffPixelRatio: 0.05 });
    });
});
