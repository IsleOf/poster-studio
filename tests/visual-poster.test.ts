/**
 * visual-poster.test.ts — Comprehensive visual regression test suite.
 *
 * Covers ~50 distinct visual states across:
 *   - Poster designer modes (star map, street map, colored map)
 *   - Sidebar accordion sections (Templates, Moment, Typography, Color, Size, Style)
 *   - Template presets (Classic Dark, Love Dark, Modern White)
 *   - Mobile (390×844) and tablet (768px) responsive layouts
 *   - Admin pages (Dashboard, Orders, Order Detail, Analytics, Settings)
 *   - Public pages (Gallery, Verify Order — idle & with input)
 *   - Download modal
 *
 * Each test is fully independent: it calls setupMockApi() and navigates fresh.
 *
 * First run writes baseline snapshots to tests/snapshots/.
 * Subsequent runs compare against those baselines.
 * Plain screenshots are also saved to tests/screenshots/ for manual review.
 *
 * Do NOT use page.waitForLoadState('networkidle') for map-mode tests —
 * MapLibre tile requests never settle. Use waitForSelector + waitForTimeout instead.
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { setupMockApi } from './fixtures/mockApi';

// ── Ensure output dirs exist ──────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── Shared helper functions ───────────────────────────────────────────────────

/**
 * Wait for the poster SVG to be present in the DOM and give fonts / star data
 * time to load. Use this before any designer screenshot.
 */
async function waitForDesigner(page: Page): Promise<void> {
    await page.waitForSelector('#poster-preview svg', { timeout: 12000 });
    // Extra settle time for fonts, star data fetch, and first render pass
    await page.waitForTimeout(1000);
}

/**
 * Crop and screenshot just the #poster-preview element.
 * Saves a plain PNG to tests/screenshots/ and also runs a snapshot comparison.
 */
async function cropPoster(page: Page, name: string): Promise<void> {
    const el = page.locator('#poster-preview');
    await el.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
    await expect(el).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.08 });
}

/**
 * Full-viewport screenshot saved to tests/screenshots/ plus a snapshot comparison.
 */
async function fullShot(page: Page, name: string): Promise<void> {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
    await expect(page).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.08 });
}

/**
 * Scroll the sidebar scroll container to a given Y offset.
 * The sidebar uses a Chakra Box with overflowY="auto"; its data-testid is not
 * set, but it is the first element with overflow-y: auto inside the sidebar.
 */
async function scrollSidebar(page: Page, y: number): Promise<void> {
    await page.evaluate((scrollY) => {
        // The sidebar scroll area is the flex=1 Box inside the right panel
        const candidates = document.querySelectorAll('[style*="overflow"]');
        for (const el of candidates) {
            const style = window.getComputedStyle(el);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                el.scrollTop = scrollY;
                return;
            }
        }
        // Fallback: scroll the window
        window.scrollTo(0, scrollY);
    }, y);
    await page.waitForTimeout(300);
}

/**
 * Navigate to an admin page with the JWT already in localStorage.
 */
async function goAdmin(page: Page, route: string): Promise<void> {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — DEFAULT DESIGNER STATE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Designer: default star map', () => {

    test('vp-01 full page — default star map (circle, dark)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await fullShot(page, 'vp-01-designer-full');
    });

    test('vp-02 poster crop — default star map', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await cropPoster(page, 'vp-02-poster-crop-default');
    });

    test('vp-03 sidebar — Templates accordion open (default)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Templates accordion is open by default (defaultIndex=[0])
        // Screenshot the sidebar region by cropping to the right panel
        const sidebar = page.locator('[id="sidebar-controls"]').first();
        // Fallback: use the right-most column box
        const sidebarBox = page.locator('aside, [role="complementary"]').first();
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'vp-03-sidebar-templates.png'),
            fullPage: false,
        });
        await expect(page).toHaveScreenshot('vp-03-sidebar-templates.png', { maxDiffPixelRatio: 0.08 });
    });

    test('vp-04 mode buttons visible — poster type row', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Scroll sidebar down to reveal the mode buttons below the Templates accordion
        await scrollSidebar(page, 300);
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'vp-04-mode-buttons.png'),
            fullPage: false,
        });
        await expect(page).toHaveScreenshot('vp-04-mode-buttons.png', { maxDiffPixelRatio: 0.08 });
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — TEMPLATE URL PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Template URL presets', () => {

    test('vp-10 /t/classic-dark — poster crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await waitForDesigner(page);
        await cropPoster(page, 'vp-10-tmpl-classic-dark');
    });

    test('vp-11 /t/classic-dark — full page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await waitForDesigner(page);
        await fullShot(page, 'vp-11-tmpl-classic-dark-full');
    });

    test('vp-12 /t/modern-white — poster crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/modern-white');
        await waitForDesigner(page);
        await cropPoster(page, 'vp-12-tmpl-modern-white');
    });

    test('vp-13 /t/modern-white — full page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/modern-white');
        await waitForDesigner(page);
        await fullShot(page, 'vp-13-tmpl-modern-white-full');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — SIDEBAR TEMPLATE SWITCHER (in-app clicks)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Sidebar template presets', () => {

    test('vp-20 click "Love Dark" template — full page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // The Templates accordion is open by default — click the Love Dark button
        await page.click('button:has-text("Love Dark")');
        await page.waitForTimeout(800);
        await fullShot(page, 'vp-20-tmpl-love-dark');
    });

    test('vp-21 click "Love Dark" template — poster crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Love Dark")');
        await page.waitForTimeout(800);
        await cropPoster(page, 'vp-21-tmpl-love-dark-crop');
    });

    test('vp-22 click "Modern White" template — poster crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Modern White")');
        await page.waitForTimeout(800);
        await cropPoster(page, 'vp-22-tmpl-modern-white-crop');
    });

    test('vp-23 click "Classic Dark" template — poster crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Classic Dark")');
        await page.waitForTimeout(800);
        await cropPoster(page, 'vp-23-tmpl-classic-dark-crop');
    });

    test('vp-24 click "Rectangle" template — poster crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Rectangle")');
        await page.waitForTimeout(800);
        await cropPoster(page, 'vp-24-tmpl-rectangle-crop');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — POSTER MODE SWITCHING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Poster mode switching', () => {

    // Map tests need extra time for tile loading
    test.setTimeout(30000);

    test('vp-30 switch to STREET MAP mode — full page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Mode buttons are in the sidebar below the Templates section
        await page.click('button:has-text("STREET MAP")');
        // Wait for MapLibre to initialise (no networkidle — tiles never settle)
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(2000);
        await fullShot(page, 'vp-30-mode-streetmap');
    });

    test('vp-31 switch to STREET MAP — poster preview crop', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("STREET MAP")');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(2000);
        await cropPoster(page, 'vp-31-mode-streetmap-crop');
    });

    test('vp-32 switch to COLORED MAP mode — full page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("COLORED MAP")');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(2000);
        await fullShot(page, 'vp-32-mode-coloredmap');
    });

    test('vp-33 switch back to STAR MAP from STREET MAP — full page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("STREET MAP")');
        await page.waitForTimeout(1500);
        // Switch back to star map
        await page.click('button:has-text("STAR MAP")');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });
        await page.waitForTimeout(1000);
        await fullShot(page, 'vp-33-mode-back-to-starmap');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 5 — SIDEBAR ACCORDION SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Sidebar accordion sections', () => {

    test('vp-40 Moment section open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Scroll the sidebar down to show Moment accordion
        await scrollSidebar(page, 400);
        // Click Moment accordion to open it (it may be closed on first load)
        const momentBtn = page.locator('button:has-text("Moment")').first();
        const isExpanded = await momentBtn.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await momentBtn.click();
            await page.waitForTimeout(300);
        }
        await fullShot(page, 'vp-40-sidebar-moment');
    });

    test('vp-41 Typography accordion open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Typography accordion is lower in the sidebar — open it
        const typoBtn = page.locator('button:has-text("Typography")').first();
        const isExpanded = await typoBtn.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await typoBtn.click();
            await page.waitForTimeout(300);
        }
        // Scroll sidebar to show typography controls
        await scrollSidebar(page, 600);
        await fullShot(page, 'vp-41-sidebar-typography');
    });

    test('vp-42 Color accordion open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        const colorBtn = page.locator('button:has-text("Color")').first();
        const isExpanded = await colorBtn.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await colorBtn.click();
            await page.waitForTimeout(300);
        }
        await scrollSidebar(page, 800);
        await fullShot(page, 'vp-42-sidebar-color');
    });

    test('vp-43 Size accordion open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        const sizeBtn = page.locator('button:has-text("Size")').first();
        const isExpanded = await sizeBtn.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await sizeBtn.click();
            await page.waitForTimeout(300);
        }
        await scrollSidebar(page, 700);
        await fullShot(page, 'vp-43-sidebar-size');
    });

    test('vp-44 Style accordion open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        const styleBtn = page.locator('button:has-text("Style")').first();
        if (styleBtn) {
            const isExpanded = await styleBtn.getAttribute('aria-expanded');
            if (isExpanded === 'false') {
                await styleBtn.click();
                await page.waitForTimeout(300);
            }
        }
        await scrollSidebar(page, 900);
        await fullShot(page, 'vp-44-sidebar-style');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 6 — DOWNLOAD DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Download dialog', () => {

    test('vp-50 download dialog open — idle state', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // The download button is at the bottom of the sidebar
        await page.click('button:has-text("Download Preview (300 DPI)")');
        // Wait for modal to appear
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        await page.waitForTimeout(300);
        await fullShot(page, 'vp-50-download-dialog');
    });

    test('vp-51 download dialog — modal content visible', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Download Preview (300 DPI)")');
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        await page.waitForTimeout(300);
        // Crop just the modal
        const modal = page.locator('[role="dialog"]').first();
        await modal.screenshot({ path: path.join(SCREENSHOT_DIR, 'vp-51-download-dialog-crop.png') });
        await expect(modal).toHaveScreenshot('vp-51-download-dialog-crop.png', { maxDiffPixelRatio: 0.08 });
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 7 — MOBILE LAYOUT (390×844)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Mobile layout (390×844)', () => {

    test('vp-60 mobile designer — default star map', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await fullShot(page, 'vp-60-mobile-designer');
    });

    test('vp-61 mobile designer — sidebar scrolled to controls', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // On mobile the layout is stacked; scroll window down to see sidebar controls
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(300);
        await fullShot(page, 'vp-61-mobile-sidebar-scrolled');
    });

    test('vp-62 mobile gallery page', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(800);
        await fullShot(page, 'vp-62-mobile-gallery');
    });

    test('vp-63 mobile verify order page', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await fullShot(page, 'vp-63-mobile-verify');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 8 — TABLET LAYOUT (768px)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Tablet layout (768px)', () => {

    test('vp-70 tablet designer — default star map', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await fullShot(page, 'vp-70-tablet-designer');
    });

    test('vp-71 tablet designer — poster crop', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await cropPoster(page, 'vp-71-tablet-poster-crop');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 9 — ADMIN PAGES
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Admin: login page', () => {

    test('vp-80 admin login page — not authenticated', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(400);
        await fullShot(page, 'vp-80-admin-login');
    });

    test('vp-81 admin login page — /admin/login route', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(400);
        await fullShot(page, 'vp-81-admin-login-route');
    });

});

test.describe('Visual — Admin: dashboard', () => {

    test('vp-82 admin dashboard — stat cards and revenue panel', async ({ page }) => {
        await goAdmin(page, '/admin/dashboard');
        await fullShot(page, 'vp-82-admin-dashboard');
    });

    test('vp-83 admin dashboard — scrolled to show weekly trend', async ({ page }) => {
        await goAdmin(page, '/admin/dashboard');
        await page.evaluate(() => window.scrollTo(0, 400));
        await page.waitForTimeout(200);
        await fullShot(page, 'vp-83-admin-dashboard-scrolled');
    });

});

test.describe('Visual — Admin: orders', () => {

    test('vp-84 admin orders list — all orders', async ({ page }) => {
        await goAdmin(page, '/admin/orders');
        await fullShot(page, 'vp-84-admin-orders');
    });

    test('vp-85 admin orders — filtered by failed', async ({ page }) => {
        await goAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('failed');
        await page.waitForTimeout(400);
        await fullShot(page, 'vp-85-admin-orders-failed');
    });

    test('vp-86 admin orders — filtered by pending', async ({ page }) => {
        await goAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('pending');
        await page.waitForTimeout(400);
        await fullShot(page, 'vp-86-admin-orders-pending');
    });

    test('vp-87 admin order detail — order #1', async ({ page }) => {
        await goAdmin(page, '/admin/orders/1');
        await fullShot(page, 'vp-87-admin-order-detail');
    });

});

test.describe('Visual — Admin: analytics', () => {

    test('vp-88 admin analytics — 30d range (default)', async ({ page }) => {
        await goAdmin(page, '/admin/analytics');
        await fullShot(page, 'vp-88-admin-analytics');
    });

    test('vp-89 admin analytics — 7d range', async ({ page }) => {
        await goAdmin(page, '/admin/analytics');
        await page.getByRole('button', { name: '7d' }).click();
        await page.waitForTimeout(600);
        await fullShot(page, 'vp-89-admin-analytics-7d');
    });

    test('vp-90 admin analytics — 90d range', async ({ page }) => {
        await goAdmin(page, '/admin/analytics');
        await page.getByRole('button', { name: '90d' }).click();
        await page.waitForTimeout(600);
        await fullShot(page, 'vp-90-admin-analytics-90d');
    });

});

test.describe('Visual — Admin: settings', () => {

    test('vp-91 admin settings page', async ({ page }) => {
        await goAdmin(page, '/admin/settings');
        await fullShot(page, 'vp-91-admin-settings');
    });

    test('vp-92 admin settings — auto-process toggled on', async ({ page }) => {
        await goAdmin(page, '/admin/settings');
        // Toggle the first chakra-switch (auto-process orders)
        await page.locator('.chakra-switch').first().click();
        await page.waitForTimeout(200);
        await fullShot(page, 'vp-92-admin-settings-autoprocess');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 10 — PUBLIC PAGES
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Gallery page', () => {

    test('vp-100 gallery — template grid (loaded)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('domcontentloaded');
        // Wait for template cards to appear (API is mocked, should be fast)
        await page.waitForTimeout(600);
        await fullShot(page, 'vp-100-gallery');
    });

    test('vp-101 gallery — scrolled down', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(600);
        await page.evaluate(() => window.scrollTo(0, 400));
        await page.waitForTimeout(200);
        await fullShot(page, 'vp-101-gallery-scrolled');
    });

});

test.describe('Visual — Verify order page', () => {

    test('vp-102 verify order — idle (empty form)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('input', { timeout: 8000 });
        await page.waitForTimeout(300);
        await fullShot(page, 'vp-102-verify-idle');
    });

    test('vp-103 verify order — order number pre-filled (9999999999)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('input', { timeout: 8000 });
        // Fill in the mock digital order ID
        const input = page.locator('input[placeholder*="1234567890"]').first();
        await input.fill('9999999999');
        await page.waitForTimeout(200);
        await fullShot(page, 'vp-103-verify-filled');
    });

    test('vp-104 verify order — after successful verification (digital)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('input', { timeout: 8000 });
        await page.locator('#verify-order-id').fill('9999999999');
        // Submit the form
        await page.getByRole('button', { name: /Get My Poster/i }).first().click();
        // Wait for the result to render
        await page.waitForTimeout(1500);
        await fullShot(page, 'vp-104-verify-success');
    });

    test('vp-105 verify order — 404 error state', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('input', { timeout: 8000 });
        // Use an unknown order ID to trigger the mock 404 response
        await page.locator('#verify-order-id').fill('0000000000');
        await page.getByRole('button', { name: /Get My Poster/i }).first().click();
        await page.waitForTimeout(1500);
        await fullShot(page, 'vp-105-verify-error');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 11 — POSTER SHAPES & STAR MAP VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Poster shape variants', () => {

    test('vp-110 star map — circle shape (default)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await cropPoster(page, 'vp-110-shape-circle');
    });

    test('vp-111 star map — heart shape (Love Dark)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Love Dark")');
        await page.waitForTimeout(800);
        await cropPoster(page, 'vp-111-shape-heart');
    });

    test('vp-112 star map — rectangle shape', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("Rectangle")');
        await page.waitForTimeout(800);
        await cropPoster(page, 'vp-112-shape-rect');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 12 — ZOOM / PAN CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Zoom and pan controls', () => {

    test('vp-120 zoom control widget visible (desktop)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // The zoom control panel is top-right of the preview area
        const zoomPanel = page.locator('text=Zoom').first();
        await expect(zoomPanel).toBeVisible();
        await fullShot(page, 'vp-120-zoom-controls');
    });

    test('vp-121 poster after zoom to 150%', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Click the "+" button 5 times to zoom from 100% to ~150%
        const plusBtn = page.locator('button:has-text("+")').first();
        for (let i = 0; i < 5; i++) {
            await plusBtn.click();
            await page.waitForTimeout(100);
        }
        await page.waitForTimeout(300);
        await fullShot(page, 'vp-121-zoom-150pct');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 13 — UNDO / REDO BUTTONS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Undo/Redo state', () => {

    test('vp-130 undo/redo buttons — initial state (both disabled)', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // The undo/redo buttons are top-left of the preview area
        const undoBtn = page.locator('button[title*="Undo"]').first();
        await expect(undoBtn).toBeVisible();
        await fullShot(page, 'vp-130-undo-redo-initial');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 14 — PRIVACY POLICY PAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Privacy policy', () => {

    test('vp-140 privacy policy page', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/privacy');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(400);
        await fullShot(page, 'vp-140-privacy-policy');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 15 — ADMIN TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Admin: templates', () => {

    test('vp-150 admin templates list', async ({ page }) => {
        await goAdmin(page, '/admin/templates');
        await fullShot(page, 'vp-150-admin-templates');
    });

    test('vp-151 admin template editor — classic-dark (Details tab)', async ({ page }) => {
        await goAdmin(page, '/admin/templates/classic-dark/edit');
        await fullShot(page, 'vp-151-admin-tmpl-editor-details');
    });

    test('vp-152 admin template editor — modern-white (Etsy Listing tab)', async ({ page }) => {
        await goAdmin(page, '/admin/templates/modern-white/edit');
        // Switch to the Etsy Listing tab
        const etsyTab = page.getByRole('tab', { name: 'Etsy Listing' });
        if (await etsyTab.isVisible()) {
            await etsyTab.click();
            await page.waitForTimeout(300);
        }
        await fullShot(page, 'vp-152-admin-tmpl-editor-etsy');
    });

    test('vp-153 admin new template form', async ({ page }) => {
        await goAdmin(page, '/admin/templates/new');
        await fullShot(page, 'vp-153-admin-tmpl-new');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 16 — ADMIN ASSETS & ETSY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Admin: assets and Etsy', () => {

    test('vp-160 admin assets page', async ({ page }) => {
        await goAdmin(page, '/admin/assets');
        await fullShot(page, 'vp-160-admin-assets');
    });

    test('vp-161 admin Etsy integration page', async ({ page }) => {
        await goAdmin(page, '/admin/etsy');
        await fullShot(page, 'vp-161-admin-etsy');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 17 — STREET MAP MODE: SIDEBAR CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Street map mode: sidebar', () => {

    // Map tests need extra time for MapLibre initialisation
    test.setTimeout(30000);

    test('vp-170 street map mode — Location accordion open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("STREET MAP")');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(1500);
        // Location accordion appears when not in starmap mode
        const locationBtn = page.locator('button:has-text("Location")').first();
        if (await locationBtn.isVisible()) {
            const expanded = await locationBtn.getAttribute('aria-expanded');
            if (expanded === 'false') {
                await locationBtn.click();
                await page.waitForTimeout(300);
            }
        }
        await fullShot(page, 'vp-170-streetmap-location-accordion');
    });

    test('vp-171 street map mode — Map Colors accordion open', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        await page.click('button:has-text("STREET MAP")');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(1500);
        // Map Colors section only appears in streetmap mode
        const mapColorsBtn = page.locator('button:has-text("Map Colors")').first();
        if (await mapColorsBtn.isVisible()) {
            const expanded = await mapColorsBtn.getAttribute('aria-expanded');
            if (expanded === 'false') {
                await mapColorsBtn.click();
                await page.waitForTimeout(300);
            }
        }
        await scrollSidebar(page, 400);
        await fullShot(page, 'vp-171-streetmap-map-colors');
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 18 — NEW CONTROLS: ROTATION & MAP INTENSITY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Visual — Map rotation and intensity controls', () => {

    test.setTimeout(30000);

    test('vp-180 street map — Location accordion with rotation + intensity sliders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Switch to street map mode
        await page.click('button:has-text("STREET MAP")');
        await page.waitForSelector('svg', { timeout: 10000 });
        // Click the Location accordion to expand it (may already be open)
        const locationBtns = page.locator('button').filter({ hasText: /^Location$/ });
        const count = await locationBtns.count();
        if (count > 0) {
            await locationBtns.first().click().catch(() => {});
            await page.waitForTimeout(500);
        }
        await scrollSidebar(page, 350);
        await page.waitForTimeout(300);
        await fullShot(page, 'vp-180-rotation-intensity-sliders');
    });

    test('vp-181 star map — download modal open state', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await waitForDesigner(page);
        // Click the download button (bottom of sidebar)
        const downloadBtn = page.locator('button', { hasText: /download preview/i }).first();
        await downloadBtn.click({ timeout: 10000 });
        await page.waitForSelector('.chakra-modal__content', { timeout: 5000 });
        await page.waitForTimeout(500);
        await fullShot(page, 'vp-181-download-modal');
    });

    test('vp-182 designer clean state — no modal', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await page.waitForSelector('#poster-preview svg', { timeout: 12000 });
        await page.waitForTimeout(500);
        await fullShot(page, 'vp-182-designer-clean');
    });

});
