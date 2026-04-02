/**
 * Extended visual screenshot tests — poster modes, templates, sidebar sections,
 * admin pages, order detail, assets, verify page.
 * First run writes baselines; subsequent runs diff.
 * Screenshots saved to tests/screenshots/ for review.
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

async function waitForSvg(page: Page, extra = 800) {
    await page.waitForSelector('svg', { timeout: 12000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(extra);
}

async function asAdmin(page: Page, route: string) {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(route);
    await page.waitForLoadState('networkidle');
}

/** Expand an accordion section by its header text if it is not already open. */
async function expandAccordion(page: Page, label: string) {
    const btn = page.locator('.chakra-accordion__button').filter({ hasText: label }).first();
    await btn.scrollIntoViewIfNeeded();
    const isExpanded = await btn.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
        await btn.click();
        await page.waitForTimeout(400);
    }
}

// ═══════════════════════════════════════════════════════════
// DESIGNER — STARMAP MODE VISUALS
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Star map designer', () => {
    test('screenshot: starmap mode default (circle shape)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await shot(page, 'ext-01-starmap-circle');
        await expect(page).toHaveScreenshot('ext-01-starmap-circle.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: starmap with Classic Dark template applied', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await expandAccordion(page, 'Templates');
        await page.getByRole('button', { name: /Classic Dark/i }).click();
        await page.waitForTimeout(600);
        await shot(page, 'ext-02-starmap-classic-dark');
        await expect(page).toHaveScreenshot('ext-02-starmap-classic-dark.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: starmap with Modern White template applied', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await expandAccordion(page, 'Templates');
        await page.getByRole('button', { name: /Modern White/i }).click();
        await page.waitForTimeout(600);
        await shot(page, 'ext-03-starmap-modern-white');
        await expect(page).toHaveScreenshot('ext-03-starmap-modern-white.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: starmap with Rectangle template applied', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await expandAccordion(page, 'Templates');
        await page.getByRole('button', { name: /Rectangle/i }).click();
        await page.waitForTimeout(600);
        await shot(page, 'ext-04-starmap-rectangle');
        await expect(page).toHaveScreenshot('ext-04-starmap-rectangle.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: template URL /t/classic-dark', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await waitForSvg(page);
        await shot(page, 'ext-05-template-classic-dark');
        await expect(page).toHaveScreenshot('ext-05-template-classic-dark.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: template URL /t/modern-white', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/modern-white');
        await waitForSvg(page);
        await shot(page, 'ext-06-template-modern-white');
        await expect(page).toHaveScreenshot('ext-06-template-modern-white.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// DESIGNER — STREET/COLORED MAP VISUALS
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Map mode designer', () => {
    test('screenshot: street map mode (no tiles, SVG poster visible)', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page, 400);
        await page.getByRole('button', { name: /STREET MAP/i }).click();
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(1000);
        await shot(page, 'ext-07-street-map-mode');
        // Map tiles cause high variance — screenshot comparison at higher tolerance
        await expect(page).toHaveScreenshot('ext-07-street-map-mode.png', { maxDiffPixelRatio: 0.1 });
    });

    test('screenshot: colored map mode switched on', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page, 400);
        await page.getByRole('button', { name: /COLORED MAP/i }).click();
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(1000);
        const filePath = path.join(SCREENSHOT_DIR, 'ext-08-colored-map-mode.png');
        await page.screenshot({ path: filePath });
        expect(fs.existsSync(filePath)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════
// DESIGNER — SIDEBAR ACCORDION SECTIONS
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Sidebar accordion states', () => {
    test('screenshot: sidebar with Templates section visible', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        // Templates section should be visible/open by default
        await shot(page, 'ext-10-sidebar-templates');
        await expect(page).toHaveScreenshot('ext-10-sidebar-templates.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: sidebar with Color section open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await expandAccordion(page, 'Color');
        await page.waitForTimeout(300);
        await shot(page, 'ext-11-sidebar-colors');
        await expect(page).toHaveScreenshot('ext-11-sidebar-colors.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: sidebar with Typography section open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        const typoBtn = page.locator('.chakra-accordion__button, [aria-expanded]').filter({ hasText: /Typography/i }).first();
        if (await typoBtn.isVisible()) {
            const isExpanded = await typoBtn.getAttribute('aria-expanded');
            if (isExpanded === 'false') await typoBtn.click();
            await page.waitForTimeout(300);
        }
        await shot(page, 'ext-12-sidebar-typography');
        await expect(page).toHaveScreenshot('ext-12-sidebar-typography.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: sidebar with Style section open (shapes inside)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await expandAccordion(page, 'Style');
        await page.waitForTimeout(300);
        await shot(page, 'ext-13-sidebar-shape');
        await expect(page).toHaveScreenshot('ext-13-sidebar-shape.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD — REVENUE PANEL VISUAL
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Admin dashboard with revenue panel', () => {
    test('screenshot: dashboard with revenue panel visible', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        // Ensure revenue section is visible
        await expect(page.getByText('Revenue (fulfilled orders)')).toBeVisible();
        await shot(page, 'ext-20-admin-dashboard-revenue');
        await expect(page).toHaveScreenshot('ext-20-admin-dashboard-revenue.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: dashboard showing all stat cards', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await shot(page, 'ext-21-admin-dashboard-stats');
        await expect(page).toHaveScreenshot('ext-21-admin-dashboard-stats.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: orders list — all orders visible', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await shot(page, 'ext-22-admin-orders-all');
        await expect(page).toHaveScreenshot('ext-22-admin-orders-all.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: orders list filtered by failed status', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('failed');
        await page.waitForTimeout(400);
        await shot(page, 'ext-23-admin-orders-failed');
        await expect(page).toHaveScreenshot('ext-23-admin-orders-failed.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN ORDER DETAIL — NOTES FIELD
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Admin order detail', () => {
    test('screenshot: order detail for order #1 showing notes field', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        // Ensure notes field is visible
        await expect(page.getByPlaceholder(/internal notes/i)).toBeVisible();
        await shot(page, 'ext-24-admin-order-detail-notes');
        await expect(page).toHaveScreenshot('ext-24-admin-order-detail-notes.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: order detail with note entered', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await page.getByPlaceholder(/internal notes/i).fill('Follow up on tracking');
        await page.waitForTimeout(200);
        await shot(page, 'ext-25-admin-order-detail-with-note');
        await expect(page).toHaveScreenshot('ext-25-admin-order-detail-with-note.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: failed order detail showing Retry button', async ({ page }) => {
        await asAdmin(page, '/admin/orders/6');
        await expect(page.getByRole('button', { name: 'Retry Fulfillment' })).toBeVisible();
        await shot(page, 'ext-26-admin-order-failed-retry');
        await expect(page).toHaveScreenshot('ext-26-admin-order-failed-retry.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN ASSETS — FONT ROLE CHECKBOXES
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Admin assets page', () => {
    test('screenshot: assets page with font role checkboxes visible', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText('Show this font in which text slots?')).toBeVisible();
        await shot(page, 'ext-30-admin-assets-font-roles');
        await expect(page).toHaveScreenshot('ext-30-admin-assets-font-roles.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: assets page SVG Shapes tab', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await page.getByRole('tab', { name: 'SVG Shapes' }).click();
        await page.waitForTimeout(200);
        await shot(page, 'ext-31-admin-assets-svg-tab');
        await expect(page).toHaveScreenshot('ext-31-admin-assets-svg-tab.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: assets page Images tab', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await page.getByRole('tab', { name: 'Images' }).click();
        await page.waitForTimeout(200);
        await shot(page, 'ext-32-admin-assets-images-tab');
        await expect(page).toHaveScreenshot('ext-32-admin-assets-images-tab.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// VERIFY PAGE VISUAL STATES
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Verify page states', () => {
    test('screenshot: verify page — initial empty state', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('input[placeholder="e.g. 1234567890"]', { timeout: 8000 });
        await shot(page, 'ext-40-verify-empty');
        await expect(page).toHaveScreenshot('ext-40-verify-empty.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: verify page — token entered', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input[placeholder="e.g. 1234567890"]', { timeout: 8000 });
        await page.getByPlaceholder('e.g. 1234567890').fill('ABC123');
        await shot(page, 'ext-41-verify-token-entered');
        await expect(page).toHaveScreenshot('ext-41-verify-token-entered.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: verify page — rendering state', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/verify-order', route => {
            route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        });
        await page.route('**/api/order-status**', route => {
            route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        });
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('ABC123');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        await expect(page.getByText(/being generated/i)).toBeVisible({ timeout: 5000 });
        await shot(page, 'ext-42-verify-rendering');
        await expect(page).toHaveScreenshot('ext-42-verify-rendering.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// SHARE DESIGN URL VISUAL STATE
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Share design', () => {
    test('screenshot: designer after share button clicked', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
        await page.getByRole('button', { name: 'Share Design Link' }).click();
        await page.waitForTimeout(400);
        await shot(page, 'ext-50-share-clicked');
        await expect(page).toHaveScreenshot('ext-50-share-clicked.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: designer loaded from ?d= URL', async ({ page }) => {
        const state = JSON.stringify({
            posterType: 'starmap',
            maskShape: 'circle',
            posterColor: '#0a1628',
            textColor: '#c8b888',
            title: 'Our Night Sky',
        });
        const encoded = btoa(unescape(encodeURIComponent(state)));
        await setupMockApi(page);
        await page.goto(`/?d=${encoded}`);
        await waitForSvg(page);
        await shot(page, 'ext-51-loaded-from-share-url');
        await expect(page).toHaveScreenshot('ext-51-loaded-from-share-url.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN TEMPLATE EDITOR VISUALS
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Admin template editor', () => {
    test('screenshot: template editor for classic-dark', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await shot(page, 'ext-60-admin-template-editor');
        await expect(page).toHaveScreenshot('ext-60-admin-template-editor.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: template editor Etsy tab for modern-white', async ({ page }) => {
        await asAdmin(page, '/admin/templates/modern-white/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        await page.waitForTimeout(300);
        await shot(page, 'ext-61-admin-template-etsy-tab');
        await expect(page).toHaveScreenshot('ext-61-admin-template-etsy-tab.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: new template form', async ({ page }) => {
        await asAdmin(page, '/admin/templates/new');
        await shot(page, 'ext-62-admin-template-new');
        await expect(page).toHaveScreenshot('ext-62-admin-template-new.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: admin settings page', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await shot(page, 'ext-63-admin-settings');
        await expect(page).toHaveScreenshot('ext-63-admin-settings.png', { maxDiffPixelRatio: 0.05 });
    });
});

// ═══════════════════════════════════════════════════════════
// DESIGNER — POSTER CROPPED VIEWS
// ═══════════════════════════════════════════════════════════

test.describe('Visual — Poster cropped screenshots', () => {
    test('screenshot: SVG poster element cropped (starmap default)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForSvg(page);
        const svg = page.locator('#poster-preview, .poster-wrapper, svg').first();
        const box = await svg.boundingBox();
        if (box) {
            const filePath = path.join(SCREENSHOT_DIR, 'ext-70-poster-crop-starmap.png');
            await page.screenshot({
                path: filePath,
                clip: { x: box.x, y: box.y, width: Math.min(box.width, 600), height: Math.min(box.height, 750) },
            });
            expect(fs.existsSync(filePath)).toBe(true);
        }
        await expect(page).toHaveScreenshot('ext-70-poster-crop-starmap.png', { maxDiffPixelRatio: 0.05 });
    });

    test('screenshot: SVG poster with Home Street template', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.goto('/t/home-street');
        await page.waitForSelector('svg', { timeout: 15000 });
        await Promise.race([
            page.waitForLoadState('networkidle'),
            page.waitForTimeout(5000),
        ]).catch(() => {});
        const filePath = path.join(SCREENSHOT_DIR, 'ext-71-poster-home-street.png');
        await page.screenshot({ path: filePath });
        expect(fs.existsSync(filePath)).toBe(true);
    });
});
