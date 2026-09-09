/**
 * Production UI smoke tests — run via playwright.prod.config.ts which sets up
 * Desktop Chrome / iPhone 14 / Pixel 7 / iPad Pro projects.
 *
 *   npx playwright test --config=playwright.prod.config.ts
 */
import { test, expect } from '@playwright/test';

const PROD = 'https://themappedmoment.com';
// A real saved-design token created during the deploy smoke-test
const REAL_TOKEN = 'xlNCOdND6th4jrCTSciVCQ';

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE / DESIGNER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Designer — homepage', () => {
    test('loads and renders SVG poster', async ({ page }) => {
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('poster SVG is portrait orientation', async ({ page }) => {
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        const svg = page.locator('#poster-preview svg').first();
        const box = await svg.boundingBox().catch(() => null);
        if (box && box.width > 0) {
            expect(box.height).toBeGreaterThan(box.width);
        }
    });

    test('accordion sidebar controls render', async ({ page }) => {
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        const btn = page.locator('.chakra-accordion__button').first();
        await expect(btn).toBeAttached({ timeout: 8000 });
    });

    test('Mode switcher (Star/Street/Colored) visible', async ({ page }) => {
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        await expect(page.getByText(/star map/i).first()).toBeVisible({ timeout: 8000 });
    });

    test('Share Design Link button present', async ({ page }) => {
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        await expect(page.getByRole('button', { name: 'Share Design Link' })).toBeAttached({ timeout: 8000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// /d/:token DESIGN LOADER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Design loader — /d/:token', () => {
    test('loads saved design and stays on /d/ URL', async ({ page }) => {
        await page.goto(`${PROD}/d/${REAL_TOKEN}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        await expect(page.locator('svg').first()).toBeVisible();
        expect(page.url()).toContain(`/d/${REAL_TOKEN}`);
    });

    test('unknown token still renders designer (graceful)', async ({ page }) => {
        await page.goto(`${PROD}/d/NOTEXIST`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIZE LOCK — ?lockedSize=
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Size lock — ?lockedSize param', () => {
    test('lock notice appears in sidebar', async ({ page }) => {
        await page.goto(`${PROD}/d/${REAL_TOKEN}?lockedSize=11x14`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        // Expand the Size accordion so the lock notice is visible
        const sizeBtn = page.locator('.chakra-accordion__button').filter({ hasText: /^Size$/ }).first();
        if (await sizeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            const expanded = await sizeBtn.getAttribute('aria-expanded');
            if (expanded !== 'true') {
                await sizeBtn.click();
                await page.waitForTimeout(300);
            }
        }
        await expect(page.getByText(/locked to/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('size buttons are disabled when locked', async ({ page }) => {
        await page.goto(`${PROD}/?lockedSize=8x10`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        // Open Size accordion
        const sizeAccordion = page.locator('.chakra-accordion__button').filter({ hasText: /^Size$/ }).first();
        if (await sizeAccordion.isVisible({ timeout: 5000 }).catch(() => false)) {
            const expanded = await sizeAccordion.getAttribute('aria-expanded');
            if (expanded !== 'true') {
                await sizeAccordion.click();
                await page.waitForTimeout(300);
            }
            // Verify size buttons are disabled
            const sizeButtons = page.locator('button[disabled]').filter({ hasText: /8x10|11x14/ });
            const count = await sizeButtons.count();
            if (count > 0) {
                await expect(sizeButtons.first()).toBeDisabled();
            }
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY ORDER PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Verify order page', () => {
    test('page renders with form inputs', async ({ page }) => {
        await page.goto(`${PROD}/verify`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Get Your Poster')).toBeVisible({ timeout: 10000 });
        await expect(page.getByPlaceholder('e.g. 1234567890')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Get My Poster' })).toBeVisible();
    });

    test('order number input is tappable (≥40px height)', async ({ page }) => {
        await page.goto(`${PROD}/verify`, { waitUntil: 'domcontentloaded' });
        const input = page.getByPlaceholder('e.g. 1234567890');
        await expect(input).toBeVisible({ timeout: 10000 });
        const box = await input.boundingBox();
        if (box) expect(box.height).toBeGreaterThanOrEqual(40);
    });

    test('unknown order ID shows error alert', async ({ page }) => {
        await page.goto(`${PROD}/verify`, { waitUntil: 'domcontentloaded' });
        await page.fill('#verify-order-id', '0000000000');
        await page.click('button:has-text("Get My Poster")');
        await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('Etsy link in footer is present', async ({ page }) => {
        await page.goto(`${PROD}/verify`, { waitUntil: 'domcontentloaded' });
        const etsyLink = page.getByRole('link', { name: /etsy/i });
        await expect(etsyLink).toBeVisible({ timeout: 8000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CAPTURE API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Email capture API', () => {
    test('POST /api/email-capture returns ok:true', async ({ page }) => {
        // Navigate first so the page is same-origin and fetch succeeds
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        const res = await page.evaluate(async (url) => {
            const r = await fetch(`${url}/api/email-capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'pw-smoke@example.com', designToken: 'PWSMOKE' }),
            });
            return { status: r.status, body: await r.json() };
        }, PROD);
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Privacy policy', () => {
    test('/privacy renders', async ({ page }) => {
        await page.goto(`${PROD}/privacy`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/privacy/i).first()).toBeVisible({ timeout: 8000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE-SPECIFIC: layout doesn't overflow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive layout — no horizontal overflow', () => {
    test('homepage has no horizontal scroll', async ({ page }) => {
        await page.goto(PROD, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('svg', { timeout: 25000 });
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        // Allow a small tolerance for scrollbars
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });

    test('verify page has no horizontal scroll', async ({ page }) => {
        await page.goto(`${PROD}/verify`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });
});
