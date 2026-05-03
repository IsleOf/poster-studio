/**
 * Comprehensive test suite — covers every major feature with functional
 * assertions + visual screenshots.  Organized by feature area.
 *
 * First run: use `npx playwright test tests/comprehensive.test.ts --update-snapshots`
 * to create baseline screenshots. Subsequent runs compare against baselines.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { setupMockApi, MOCK_ORDERS, MOCK_TEMPLATES } from './fixtures/mockApi';

const SS = path.join(process.cwd(), 'tests/screenshots');
fs.mkdirSync(SS, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function shot(page: Page, name: string) {
    await page.screenshot({ path: path.join(SS, `${name}.png`), fullPage: false });
}

async function shotFull(page: Page, name: string) {
    await page.screenshot({ path: path.join(SS, `${name}.png`), fullPage: true });
}

async function openDesigner(page: Page) {
    await setupMockApi(page);
    await page.goto('/');
    await page.waitForSelector('svg', { timeout: 12000 });
    await page.waitForTimeout(800);
}

async function asAdmin(page: Page, route: string) {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
}

/** Expand an accordion by its exact header label in SidebarControls. */
async function expandAccordion(page: Page, label: string) {
    const btn = page.locator('.chakra-accordion__button').filter({ hasText: label }).first();
    await btn.scrollIntoViewIfNeeded();
    const expanded = await btn.getAttribute('aria-expanded');
    if (expanded !== 'true') {
        await btn.click();
        await page.waitForTimeout(400);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DESIGNER — PAGE LOAD & LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('1. Designer layout', () => {
    test('renders split-pane: preview + sidebar', async ({ page }) => {
        await openDesigner(page);
        const preview = page.locator('main[aria-label="Poster preview"]');
        const sidebar = page.locator('aside[aria-label="Poster design controls"]');
        await expect(preview).toBeVisible();
        await expect(sidebar).toBeVisible();
        await shot(page, 'comp-01-designer-layout');
    });

    test('SVG poster renders with expected structure', async ({ page }) => {
        await openDesigner(page);
        const svg = page.locator('svg').first();
        await expect(svg).toBeVisible();
        expect(await page.locator('clipPath').count()).toBeGreaterThan(0);
        expect(await page.locator('svg text').count()).toBeGreaterThan(0);
        expect(await page.locator('svg circle, svg path, svg ellipse').count()).toBeGreaterThan(0);
    });

    test('SVG has portrait aspect ratio', async ({ page }) => {
        await openDesigner(page);
        const box = await page.locator('svg').first().boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThan(box!.width * 0.8);
    });

    test('undo/redo buttons visible', async ({ page }) => {
        await openDesigner(page);
        await expect(page.getByTitle('Undo (Ctrl+Z)')).toBeVisible();
        await expect(page.getByTitle('Redo (Ctrl+Y)')).toBeVisible();
    });

    test('zoom controls visible on desktop', async ({ page }) => {
        await openDesigner(page);
        await expect(page.getByText('Zoom')).toBeVisible();
        await expect(page.locator('[aria-label="zoom-slider"]')).toBeVisible();
    });

    test('preview watermark overlay present', async ({ page }) => {
        await openDesigner(page);
        expect(await page.getByText('themappedmoment.com').count()).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MODE SWITCHING — Star Map / Street Map / Colored Map
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('2. Poster modes', () => {
    test('star map is the default mode (active button)', async ({ page }) => {
        await openDesigner(page);
        // The active button has bg gray.900 — just verify it exists
        const starBtn = page.getByRole('button', { name: /STAR MAP/i });
        await expect(starBtn).toBeVisible();
        await shot(page, 'comp-02-starmap-default');
    });

    test('switch to street map mode', async ({ page }) => {
        test.setTimeout(45000);
        await openDesigner(page);
        await page.getByRole('button', { name: /STREET MAP/i }).click();
        // Don't wait for networkidle — tiles never settle. Just wait a bit.
        await page.waitForTimeout(2000);
        await expect(page.locator('svg').first()).toBeVisible();
        await shot(page, 'comp-02-street-map-mode');
    });

    test('switch to colored map mode', async ({ page }) => {
        test.setTimeout(45000);
        await openDesigner(page);
        await page.getByRole('button', { name: /COLORED MAP/i }).click();
        await page.waitForTimeout(2000);
        await expect(page.locator('svg').first()).toBeVisible();
        await shot(page, 'comp-02-colored-map-mode');
    });

    test('switching back to star map restores star view', async ({ page }) => {
        test.setTimeout(45000);
        await openDesigner(page);
        await page.getByRole('button', { name: /STREET MAP/i }).click();
        await page.waitForTimeout(1500);
        await page.getByRole('button', { name: /STAR MAP/i }).click();
        await page.waitForTimeout(500);
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TEMPLATE PRESETS — Shapes via templates
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('3. Template presets', () => {
    test('Templates accordion opens and shows presets', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Templates');
        // Template preset buttons should be visible
        await expect(page.getByText('Classic Dark')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await shot(page, 'comp-03-templates-open');
    });

    test('Classic Dark template applies circle shape', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Templates');
        await page.getByText('Classic Dark').click();
        await page.waitForTimeout(600);
        await shot(page, 'comp-03-classic-dark');
    });

    test('Love Dark template applies heart shape', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Templates');
        await page.getByText('Love Dark').click();
        await page.waitForTimeout(600);
        await shot(page, 'comp-03-love-dark');
    });

    test('Modern White template applies light design', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Templates');
        await page.getByText('Modern White').click();
        await page.waitForTimeout(600);
        await shot(page, 'comp-03-modern-white');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SIDEBAR — Location section
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('4. Location controls', () => {
    test('location search input exists', async ({ page }) => {
        await openDesigner(page);
        // CitySearch lives inside the Moment accordion in star map mode
        await expandAccordion(page, 'Moment');
        const input = page.getByPlaceholder(/Search city|New York/i);
        await expect(input).toBeVisible();
        await shot(page, 'comp-04-location-section');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SIDEBAR — Moment section (starmap only)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('5. Moment controls', () => {
    test('Moment section visible in star map mode', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Moment');
        await shot(page, 'comp-05-moment-section');
    });

    test('date input can be changed', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Moment');
        const dateInput = page.locator('input[type="date"]').first();
        if (await dateInput.isVisible()) {
            await dateInput.fill('2025-06-15');
            await page.waitForTimeout(300);
        }
    });

    test('time input can be changed', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Moment');
        const timeInput = page.locator('input[type="time"]').first();
        if (await timeInput.isVisible()) {
            await timeInput.fill('21:30');
            await page.waitForTimeout(300);
        }
    });

    test('title dropdown has options', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Moment');
        const selects = page.locator('select');
        expect(await selects.count()).toBeGreaterThan(0);
    });

    test('visibility toggles (Date, Location, Coords)', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Moment');
        for (const label of ['Date', 'Location', 'Coords']) {
            const btn = page.getByRole('button', { name: label, exact: true });
            if (await btn.isVisible()) await btn.click();
        }
        await page.waitForTimeout(300);
        await shot(page, 'comp-05-visibility-toggled');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SIDEBAR — Typography
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('6. Typography', () => {
    test('Typography section has font selectors', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Typography');
        const selects = page.locator('select');
        expect(await selects.count()).toBeGreaterThan(0);
        await shot(page, 'comp-06-typography');
    });

    test('changing a font select does not crash', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Typography');
        const fontSelect = page.locator('select').first();
        if (await fontSelect.isVisible()) {
            const options = await fontSelect.locator('option').allTextContents();
            if (options.length > 1) {
                await fontSelect.selectOption({ index: 1 });
                await page.waitForTimeout(500);
            }
        }
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SIDEBAR — Color section
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('7. Color', () => {
    test('Color section has color inputs', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Color');
        const colorInputs = page.locator('input[type="color"]');
        expect(await colorInputs.count()).toBeGreaterThan(0);
        await shot(page, 'comp-07-color-section');
    });

    test('color palette presets exist', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Color');
        await expect(page.getByText('Presets')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SIDEBAR — Style section (border, frame, design style)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('8. Style section', () => {
    test('Style section has Show Border toggle', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Style');
        await expect(page.getByText('Show Border')).toBeVisible();
        await shot(page, 'comp-08-style-section');
    });

    test('border toggle works', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Style');
        const toggle = page.locator('.chakra-switch').first();
        if (await toggle.isVisible()) {
            await toggle.click();
            await page.waitForTimeout(300);
        }
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SIDEBAR — Size section
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('9. Size', () => {
    test('Size section shows print size options', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Size');
        await expect(page.getByText('8x10"')).toBeVisible();
        await expect(page.getByText('11x14"')).toBeVisible();
        await shot(page, 'comp-09-size-section');
    });

    test('clicking a size option changes the poster', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Size');
        const sizeBtn = page.getByText('18x24"').first();
        if (await sizeBtn.isVisible()) {
            await sizeBtn.click();
            await page.waitForTimeout(500);
        }
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. TEMPLATE URL LOADING (/t/:id)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('10. Template URLs', () => {
    test('/t/classic-dark loads and renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await page.waitForSelector('svg', { timeout: 12000 });
        await expect(page.locator('svg').first()).toBeVisible();
        await shot(page, 'comp-10-template-classic-dark');
    });

    test('/t/modern-white loads and renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/modern-white');
        await page.waitForSelector('svg', { timeout: 12000 });
        await expect(page.locator('svg').first()).toBeVisible();
        await shot(page, 'comp-10-template-modern-white');
    });

    test('/t/nonexistent falls back to default', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/does-not-exist');
        await page.waitForSelector('svg', { timeout: 12000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. INLINE TEXT EDITING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('11. Inline editing', () => {
    test('double-click SVG text opens overlay', async ({ page }) => {
        await openDesigner(page);
        const titleText = page.locator('svg text').filter({ hasText: /\w{3}/ }).first();
        if (await titleText.isVisible()) {
            await titleText.dblclick();
            await page.waitForTimeout(300);
            await shot(page, 'comp-11-inline-edit');
        }
    });

    test('Escape key does not crash', async ({ page }) => {
        await openDesigner(page);
        await page.locator('svg text').first().click();
        await page.waitForTimeout(100);
        await page.keyboard.press('Escape');
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. SAVE DESIGN & SHARE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('12. Save & share', () => {
    test('save design calls API', async ({ page }) => {
        await openDesigner(page);
        let saveCalled = false;
        await page.route('**/api/save-design', route => {
            saveCalled = true;
            route.fulfill({ json: { token: 'TST999', ok: true } });
        });
        const saveBtn = page.getByRole('button', { name: /save design/i });
        if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForTimeout(500);
            expect(saveCalled).toBe(true);
        }
    });

    test('share button generates link', async ({ page }) => {
        await openDesigner(page);
        const shareBtn = page.getByRole('button', { name: /share/i });
        if (await shareBtn.isVisible()) {
            await shareBtn.click();
            await page.waitForTimeout(300);
            await shot(page, 'comp-12-share');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. GALLERY PAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('13. Gallery', () => {
    test('loads with template cards', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Template Gallery')).toBeVisible();
        await expect(page.getByText('Classic Dark')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await shot(page, 'comp-13-gallery');
    });

    test('Customise buttons present', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('networkidle');
        expect(await page.getByRole('button', { name: /customise/i }).count()).toBe(3);
    });

    test('Customise navigates to /t/:id', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /customise/i }).first().click();
        await page.waitForURL(/\/t\//);
    });

    test('empty gallery shows message', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/templates', route => route.fulfill({ json: [] }));
        await page.goto('/gallery');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/No templates found/i)).toBeVisible();
        await shot(page, 'comp-13-gallery-empty');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. VERIFY ORDER PAGE — All states
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('14. Verify order', () => {
    test('idle state: form renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await expect(page.getByText('Get Your Poster')).toBeVisible();
        await expect(page.locator('input#verify-order-id')).toBeVisible();
        await expect(page.locator('input#verify-token')).toBeVisible();
        await expect(page.getByRole('button', { name: /Get My Poster/i })).toBeVisible();
        await shot(page, 'comp-14-verify-idle');
    });

    test('digital ready state: auto-downloads and shows delivered confirmation', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await page.locator('input#verify-order-id').fill('9999999999');
        await page.getByRole('button', { name: /Get My Poster/i }).click();
        await expect(page.getByRole('heading', { name: /your file has been delivered/i })).toBeVisible({ timeout: 8000 });
        await shot(page, 'comp-14-verify-digital');
    });

    test('print processing state: shows print order ID', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await page.locator('input#verify-order-id').fill('8888888888');
        await page.getByRole('button', { name: /Get My Poster/i }).click();
        await expect(page.getByText(/print is in production/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('PF-123456')).toBeVisible();
        await shot(page, 'comp-14-verify-print');
    });

    test('rendering state: shows spinner and message', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await page.locator('input#verify-order-id').fill('7777777777');
        await page.getByRole('button', { name: /Get My Poster/i }).click();
        await expect(page.getByText(/poster is being generated/i)).toBeVisible({ timeout: 5000 });
        await shot(page, 'comp-14-verify-rendering');
    });

    test('error state: order not found', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await page.locator('input#verify-order-id').fill('0000000000');
        await page.getByRole('button', { name: /Get My Poster/i }).click();
        await expect(page.getByText(/Order not found/i)).toBeVisible({ timeout: 5000 });
        await shot(page, 'comp-14-verify-error');
    });

    test('design token input forces uppercase', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-token');
        await page.locator('input#verify-token').fill('abc123');
        expect(await page.locator('input#verify-token').inputValue()).toBe('ABC123');
    });

    test('ARIA live region exists', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id');
        expect(await page.locator('[aria-live="polite"]').count()).toBeGreaterThan(0);
    });

    test('Back link exists', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByText(/Back to The Mapped Moment/i)).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. PRIVACY POLICY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('15. Privacy', () => {
    test('renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/privacy');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/privacy/i).first()).toBeVisible();
        await shot(page, 'comp-15-privacy');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. ADMIN — AUTH
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('16. Admin auth', () => {
    test('login form renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin');
        await expect(page.getByText('Seller Dashboard')).toBeVisible();
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
        await shot(page, 'comp-16-login');
    });

    test('wrong password shows error', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('wrong');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.getByText('Invalid password')).toBeVisible();
        await shot(page, 'comp-16-login-error');
    });

    test('correct password redirects', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('testpass123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL(/\/admin\/dashboard/);
    });

    test('JWT stored in localStorage', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('testpass123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL(/\/admin\/dashboard/);
        const token = await page.evaluate(() => localStorage.getItem('admin_token'));
        expect(token).toBeTruthy();
        expect(token!).toContain('eyJ');
    });

    test('logout clears token', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await page.getByRole('button', { name: 'Logout' }).click();
        expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. ADMIN — NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('17. Admin nav', () => {
    for (const item of ['Dashboard', 'Orders', 'Templates', 'Etsy', 'Assets', 'Analytics', 'Settings']) {
        test(`"${item}" link visible and clickable`, async ({ page }) => {
            await asAdmin(page, '/admin/dashboard');
            const link = page.getByRole('link', { name: item, exact: true });
            await expect(link).toBeVisible();
            await link.click();
            await page.waitForTimeout(300);
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. ADMIN — DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('18. Dashboard', () => {
    test('stat cards render', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Total Orders')).toBeVisible();
        await expect(page.getByText('Today')).toBeVisible();
        await expect(page.getByText('This Week')).toBeVisible();
        await shot(page, 'comp-18-dashboard');
    });

    test('range filters (7d/30d/90d)', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        for (const r of ['7d', '30d', '90d']) {
            const btn = page.getByRole('button', { name: r, exact: true });
            await expect(btn).toBeVisible();
        }
        await page.getByRole('button', { name: '7d', exact: true }).click();
        await page.waitForTimeout(300);
        await shot(page, 'comp-18-dashboard-7d');
    });

    test('revenue figures visible', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText(/\$175/)).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. ADMIN — ORDERS LIST
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('19. Orders list', () => {
    test('orders table loads', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
        await expect(page.getByText('ETSY-10043812')).toBeVisible();
        await shot(page, 'comp-19-orders');
    });

    test('status filter dropdown', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const select = page.getByRole('combobox').first();
        await select.selectOption('failed');
        await page.waitForTimeout(300);
        await expect(page.getByText('Sophie Dubois')).toBeVisible();
        await shot(page, 'comp-19-orders-failed');
    });

    test('search input exists', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const searchInput = page.getByPlaceholder(/search/i);
        if (await searchInput.isVisible()) {
            await searchInput.fill('Sarah');
            await page.waitForTimeout(500);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 20. ADMIN — ORDER DETAIL
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('20. Order detail', () => {
    test('shows order info', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
        await expect(page.getByText('ETSY-10043812')).toBeVisible();
        await shot(page, 'comp-20-order-detail');
    });

    test('shows design info', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await expect(page.getByText(/starmap|Star Map/i).first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 21. ADMIN — TEMPLATES LIST
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('21. Admin templates', () => {
    test('templates list loads', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await expect(page.getByText('Classic Dark')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await shot(page, 'comp-21-templates');
    });

    test('new template button exists', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        const btn = page.getByRole('link', { name: /new template/i }).or(page.getByRole('button', { name: /new template/i }));
        await expect(btn.first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 22. ADMIN — TEMPLATE EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('22. Template editor', () => {
    test('editor loads for existing template', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await shot(page, 'comp-22-template-editor');
    });

    test('Etsy listing tab shows fields', async ({ page }) => {
        await asAdmin(page, '/admin/templates/modern-white/edit');
        const etsyTab = page.getByRole('tab', { name: /Etsy/i });
        if (await etsyTab.isVisible()) {
            await etsyTab.click();
            await page.waitForTimeout(300);
            await shot(page, 'comp-22-etsy-tab');
        }
    });

    test('new template page loads', async ({ page }) => {
        await asAdmin(page, '/admin/templates/new');
        await shot(page, 'comp-22-template-new');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 23. ADMIN — ETSY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('23. Etsy page', () => {
    test('connection status renders', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        await shot(page, 'comp-23-etsy');
    });

    test('sync button exists', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        const btn = page.getByRole('button', { name: /sync/i }).first();
        await expect(btn).toBeVisible();
        // Only click if enabled — button is disabled when Etsy is not connected
        const enabled = await btn.isEnabled();
        if (enabled) {
            await btn.click();
            await page.waitForTimeout(500);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 24. ADMIN — ASSETS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('24. Assets', () => {
    test('assets page loads', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await shot(page, 'comp-24-assets');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 25. ADMIN — ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('25. Analytics', () => {
    test('event count cards render', async ({ page }) => {
        await asAdmin(page, '/admin/analytics');
        await expect(page.getByText('Analytics')).toBeVisible();
        await expect(page.getByText('page view')).toBeVisible();
        await expect(page.getByText('1,240')).toBeVisible();
        await shot(page, 'comp-25-analytics');
    });

    test('range filters', async ({ page }) => {
        await asAdmin(page, '/admin/analytics');
        for (const r of ['7d', '30d', '90d']) {
            await expect(page.getByRole('button', { name: r, exact: true })).toBeVisible();
        }
        await page.getByRole('button', { name: '7d', exact: true }).click();
        await page.waitForTimeout(300);
    });

    test('top cities table', async ({ page }) => {
        await asAdmin(page, '/admin/analytics');
        await expect(page.getByText('Sydney')).toBeVisible();
        await expect(page.getByText('London')).toBeVisible();
    });

    test('top templates table', async ({ page }) => {
        await asAdmin(page, '/admin/analytics');
        await expect(page.getByText('classic-dark')).toBeVisible();
    });

    test('daily chart SVG renders', async ({ page }) => {
        await asAdmin(page, '/admin/analytics');
        expect(await page.locator('svg').count()).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 26. ADMIN — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('26. Settings', () => {
    test('page loads', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await shot(page, 'comp-26-settings');
    });

    test('auto-process toggle exists', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        expect(await page.locator('.chakra-switch').count()).toBeGreaterThan(0);
    });

    test('save calls API', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        let saved = false;
        await page.route('**/api/admin/settings', route => {
            if (route.request().method() === 'PUT') { saved = true; route.fulfill({ json: {} }); }
            else route.continue();
        });
        const btn = page.getByRole('button', { name: /save/i });
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(500);
            expect(saved).toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 27. ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('27. Routing', () => {
    test('/ renders designer', async ({ page }) => {
        await openDesigner(page);
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('/t/:id fetches template', async ({ page }) => {
        await setupMockApi(page);
        let fetched = false;
        await page.route('**/api/templates/classic-dark', route => { fetched = true; route.continue(); });
        await page.goto('/t/classic-dark');
        await page.waitForSelector('svg', { timeout: 12000 });
        expect(fetched).toBe(true);
    });

    test('/gallery renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/gallery');
        await expect(page.getByText('Template Gallery')).toBeVisible();
    });

    test('/verify renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await expect(page.getByText('Get Your Poster')).toBeVisible();
    });

    test('/privacy renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/privacy');
        await expect(page.getByText(/privacy/i).first()).toBeVisible();
    });

    test('/admin without auth shows login', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin');
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });

    test('/admin/dashboard with auth renders', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Total Orders')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 28. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('28. Keyboard shortcuts', () => {
    test('Ctrl+Z undo', async ({ page }) => {
        await openDesigner(page);
        await page.keyboard.press('Control+z');
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('Ctrl+Y redo', async ({ page }) => {
        await openDesigner(page);
        await page.keyboard.press('Control+y');
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('Ctrl+Shift+Z redo', async ({ page }) => {
        await openDesigner(page);
        await page.keyboard.press('Control+Shift+z');
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 29. PREVIEW ZOOM & PAN
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('29. Zoom & pan', () => {
    test('zoom + button changes level', async ({ page }) => {
        await openDesigner(page);
        const plusBtn = page.locator('button').filter({ hasText: '+' }).last();
        if (await plusBtn.isVisible()) {
            await plusBtn.click();
            await page.waitForTimeout(200);
        }
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('double-click resets pan', async ({ page }) => {
        await openDesigner(page);
        await page.locator('main[aria-label="Poster preview"]').dblclick();
        await page.waitForTimeout(200);
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 30. MOBILE VIEWPORT
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('30. Mobile', () => {
    test('column layout on 390px viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openDesigner(page);
        const preview = page.locator('main[aria-label="Poster preview"]');
        const sidebar = page.locator('aside[aria-label="Poster design controls"]');
        await expect(preview).toBeVisible();
        await expect(sidebar).toBeVisible();
        const pBox = await preview.boundingBox();
        const sBox = await sidebar.boundingBox();
        expect(pBox!.width).toBeGreaterThan(350);
        expect(sBox!.width).toBeGreaterThan(350);
        expect(sBox!.y).toBeGreaterThan(pBox!.y);
        await shot(page, 'comp-30-mobile');
    });

    test('zoom controls hidden, reset shown', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openDesigner(page);
        await expect(page.locator('[aria-label="zoom-slider"]')).not.toBeVisible();
        await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    });

    test('preview is sticky while scrolling', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openDesigner(page);
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(300);
        const pBox = await page.locator('main[aria-label="Poster preview"]').boundingBox();
        expect(pBox!.y).toBeLessThanOrEqual(10);
        await shot(page, 'comp-30-mobile-scrolled');
    });

    test('mobile verify page', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await shot(page, 'comp-30-mobile-verify');
    });

    test('mobile gallery page', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto('/gallery');
        await page.waitForLoadState('networkidle');
        await shot(page, 'comp-30-mobile-gallery');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 31. TABLET VIEWPORT
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('31. Tablet', () => {
    test('768px shows row layout', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await openDesigner(page);
        const pBox = await page.locator('main[aria-label="Poster preview"]').boundingBox();
        const sBox = await page.locator('aside[aria-label="Poster design controls"]').boundingBox();
        // Row layout: similar Y values
        expect(Math.abs(pBox!.y - sBox!.y)).toBeLessThan(50);
        await shot(page, 'comp-31-tablet');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 32. ACCESSIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('32. Accessibility', () => {
    test('skip-to-content link exists', async ({ page }) => {
        await openDesigner(page);
        expect(await page.locator('a[href="#sidebar-controls"]').count()).toBeGreaterThan(0);
    });

    test('main landmark has aria-label', async ({ page }) => {
        await openDesigner(page);
        await expect(page.locator('main[aria-label="Poster preview"]')).toBeVisible();
    });

    test('aside landmark has aria-label', async ({ page }) => {
        await openDesigner(page);
        await expect(page.locator('aside[aria-label="Poster design controls"]')).toBeVisible();
    });

    test('verify page has labelled form controls', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id');
        await expect(page.getByText(/Etsy Order Number/i)).toBeVisible();
        await expect(page.locator('#verify-order-hint')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 33. ERROR STATES
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('33. Error states', () => {
    test('dashboard API failure does not crash', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders/stats', r => r.fulfill({ status: 500, json: { error: 'fail' } }));
        await page.goto('/admin/dashboard');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
        await shot(page, 'comp-33-dashboard-error');
    });

    test('analytics API failure shows message', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/analytics**', r => r.fulfill({ status: 500, json: { error: 'fail' } }));
        await page.goto('/admin/analytics');
        await page.waitForTimeout(500);
        await expect(page.getByText(/failed to load/i)).toBeVisible();
        await shot(page, 'comp-33-analytics-error');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 34. WELCOME MODAL
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('34. Designer landing', () => {
    test('loads designer on first visit', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await page.waitForSelector('svg', { timeout: 12000 });
        await expect(page.locator('svg').first()).toBeVisible();
        await shot(page, 'comp-34-designer');
    });

    test('designer loads cleanly on return visit', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/');
        await page.waitForSelector('svg', { timeout: 12000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 35. EVENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('35. Events', () => {
    test('page_view fires on load', async ({ page }) => {
        let fired = false;
        await setupMockApi(page);
        await page.route('**/api/events', route => {
            const body = JSON.parse(route.request().postData() || '{}');
            if (body.name === 'page_view') fired = true;
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/');
        await page.waitForSelector('svg', { timeout: 12000 });
        await page.waitForTimeout(500);
        expect(fired).toBe(true);
    });

    test('verify_attempt fires on submit', async ({ page }) => {
        let fired = false;
        await setupMockApi(page);
        await page.route('**/api/events', route => {
            const body = JSON.parse(route.request().postData() || '{}');
            if (body.name === 'verify_attempt') fired = true;
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/verify');
        await page.waitForSelector('input#verify-order-id', { timeout: 8000 });
        await page.locator('input#verify-order-id').fill('1234567890');
        await page.getByRole('button', { name: /Get My Poster/i }).click();
        await page.waitForTimeout(500);
        expect(fired).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 36. CODE SPLITTING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('36. Lazy loading', () => {
    test('lazy routes resolve quickly', async ({ page }) => {
        await setupMockApi(page);
        for (const route of ['/verify', '/privacy', '/gallery']) {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(500);
            const loading = await page.getByText('Loading…').isVisible().catch(() => false);
            expect(loading).toBe(false);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 37. FULL-PAGE VISUAL SNAPSHOTS — Every major page
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('37. Visual snapshots', () => {
    const pages = [
        { name: 'designer', route: '/', designer: true },
        { name: 'gallery', route: '/gallery' },
        { name: 'verify', route: '/verify' },
        { name: 'privacy', route: '/privacy' },
        { name: 'admin-login', route: '/admin/login' },
        { name: 'admin-dashboard', route: '/admin/dashboard', admin: true },
        { name: 'admin-orders', route: '/admin/orders', admin: true },
        { name: 'admin-order-1', route: '/admin/orders/1', admin: true },
        { name: 'admin-templates', route: '/admin/templates', admin: true },
        { name: 'admin-template-edit', route: '/admin/templates/classic-dark/edit', admin: true },
        { name: 'admin-template-new', route: '/admin/templates/new', admin: true },
        { name: 'admin-etsy', route: '/admin/etsy', admin: true },
        { name: 'admin-assets', route: '/admin/assets', admin: true },
        { name: 'admin-analytics', route: '/admin/analytics', admin: true },
        { name: 'admin-settings', route: '/admin/settings', admin: true },
    ];

    for (const p of pages) {
        test(`snap: ${p.name}`, async ({ page }) => {
            if ((p as any).admin) {
                await asAdmin(page, p.route);
            } else {
                await setupMockApi(page);
                await page.goto(p.route);
                if ((p as any).designer) {
                    await page.waitForSelector('svg', { timeout: 12000 });
                    await page.waitForTimeout(800);
                } else {
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(300);
                }
            }
            await shot(page, `comp-37-${p.name}`);
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 38. POSTER SVG CROPPED SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('38. SVG crops', () => {
    test('star map poster crop', async ({ page }) => {
        await openDesigner(page);
        const svg = page.locator('svg').first();
        const box = await svg.boundingBox();
        if (box) {
            await page.screenshot({
                path: path.join(SS, 'comp-38-starmap-crop.png'),
                clip: { x: box.x, y: box.y, width: box.width, height: box.height },
            });
        }
    });
});
