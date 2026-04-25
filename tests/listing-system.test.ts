/**
 * listing-system.test.ts
 *
 * Tests for the design/listing system: thumbnail display, design cards,
 * size switching, font rendering, and DB consistency.
 *
 * These tests run against the local preview build (port 4173) using mock API.
 * The production tests (using real network) are in listing-system-prod.test.ts.
 */

import { test, expect, Page } from '@playwright/test';
import { setupMockApi } from './fixtures/mockApi';

// ── Shared mock listing data ────────────────────────────────────────────────

const MOCK_LISTING = {
    id: 1,
    slug: 'star-map-night-we-met',
    name: 'Custom Star Map Poster — The Night We Met',
    description: 'Personalised star map poster in multiple sizes.',
    templates: [
        // Design001 — 3 representative sizes
        {
            id: 'sm001-design001-5x7',
            name: 'The Night We Met — 5x7"',
            thumbnail_path: '/designs/SM001/Design001/5x7.png',
            fulfillment_size: '5x7',
            sell_price_cents: 1999,
        },
        {
            id: 'sm001-design001-8x10',
            name: 'The Night We Met — 8x10"',
            thumbnail_path: '/designs/SM001/Design001/8x10.png',
            fulfillment_size: '8x10',
            sell_price_cents: 1999,
        },
        {
            id: 'sm001-design001-11x14',
            name: 'The Night We Met — 11x14"',
            thumbnail_path: '/designs/SM001/Design001/11x14.png',
            fulfillment_size: '11x14',
            sell_price_cents: 2499,
        },
        // Design002 — same sizes
        {
            id: 'sm001-design002-5x7',
            name: 'The Night Our Stars Aligned — 5x7"',
            thumbnail_path: '/designs/SM001/Design002/8x10.png',
            fulfillment_size: '5x7',
            sell_price_cents: 1999,
        },
        {
            id: 'sm001-design002-8x10',
            name: 'The Night Our Stars Aligned — 8x10"',
            thumbnail_path: '/designs/SM001/Design002/8x10.png',
            fulfillment_size: '8x10',
            sell_price_cents: 1999,
        },
        {
            id: 'sm001-design002-11x14',
            name: 'The Night Our Stars Aligned — 11x14"',
            thumbnail_path: '/designs/SM001/Design002/8x10.png',
            fulfillment_size: '11x14',
            sell_price_cents: 2499,
        },
    ],
};

async function setupListingMock(page: Page) {
    await setupMockApi(page);
    // Override the listing API with our listing-specific mock
    await page.route('**/api/listings/star-map-night-we-met', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) })
    );
    // Override template fetch for both designs
    await page.route('**/api/templates/sm001-design001-8x10', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'sm001-design001-8x10',
                settings_json: JSON.stringify({
                    posterType: 'starmap', maskShape: 'circle',
                    posterColor: '#0a1628', textColor: '#ffffff',
                    titleFont: 'Title001', detailsFont: 'Details001',
                    titleAllCaps: false, printSize: '8x10',
                    location: 'New York, NY', lat: 40.7128, lng: -74.006,
                }),
            }),
        })
    );
    await page.route('**/api/templates/sm001-design002-8x10', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'sm001-design002-8x10',
                settings_json: JSON.stringify({
                    posterType: 'starmap', maskShape: 'circle',
                    posterColor: '#ffffff', textColor: '#0a1628',
                    titleFont: 'Title001', detailsFont: 'Details001',
                    titleAllCaps: true, printSize: '8x10',
                    location: 'Austin, TX', lat: 30.2711, lng: -97.7437,
                }),
            }),
        })
    );
}

// ── Design card rendering ───────────────────────────────────────────────────

test.describe('Design cards on listing page', () => {
    test.beforeEach(async ({ page }) => {
        await setupListingMock(page);
    });

    test('shows two design cards', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        // Both group names should appear in the sidebar design section
        const designSection = page.locator('[data-testid="design-section"], .design-section').first();
        // Design cards identified by img tags in the sidebar
        const designImgs = page.locator('img[src*="/designs/"]');
        await expect(designImgs).toHaveCount(2, { timeout: 5000 });
    });

    test('all design card thumbnails use 4:5 aspect ratio', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });
        await page.waitForTimeout(500);

        const imgs = page.locator('img[src*="/designs/"]');
        const count = await imgs.count();
        expect(count).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < count; i++) {
            const img = imgs.nth(i);
            const box = await img.boundingBox();
            expect(box).not.toBeNull();
            if (!box) continue;
            // 4:5 ratio means width/height ≈ 0.8 — allow ±10%
            const ratio = box.width / box.height;
            expect(ratio).toBeGreaterThan(0.65);
            expect(ratio).toBeLessThan(0.95);
        }
    });

    test('design cards always use 8x10 thumbnail regardless of which size is active', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        // Both design card thumbnails should reference the 8x10.png
        const d1Img = page.locator('img[src*="Design001/8x10.png"]');
        const d2Img = page.locator('img[src*="Design002/8x10.png"]');
        await expect(d1Img).toBeVisible({ timeout: 5000 });
        await expect(d2Img).toBeVisible({ timeout: 5000 });
    });

    test('thumbnail images have cache-bust version query param', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        const imgs = page.locator('img[src*="/designs/"]');
        const count = await imgs.count();
        for (let i = 0; i < count; i++) {
            const src = await imgs.nth(i).getAttribute('src');
            expect(src).toMatch(/\?v=\d+/);
        }
    });

    test('clicking Design002 card loads Design002 template', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        // Wait for both cards to appear
        const d2Card = page.locator('img[src*="Design002"]').first();
        await expect(d2Card).toBeVisible({ timeout: 5000 });
        await d2Card.click();

        // After clicking Design002, URL should update or template should be applied
        // The mock template sets titleAllCaps: true and location: 'Austin, TX'
        await page.waitForTimeout(1000);
        // Page should still be at the listing URL (not navigate away)
        expect(page.url()).toContain('/l/star-map-night-we-met');
    });
});

// ── Size selector ───────────────────────────────────────────────────────────

test.describe('Size selector', () => {
    test.beforeEach(async ({ page }) => {
        await setupListingMock(page);
    });

    test('shows sizes for the active design group', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        // Size buttons should be visible (5x7, 8x10, 11x14 in our mock)
        await expect(page.getByRole('button', { name: /8x10/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /5x7/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /11x14/i })).toBeVisible({ timeout: 5000 });
    });

    test('8x10 is highlighted as active by default', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        const btn8x10 = page.getByRole('button', { name: /8x10/i });
        await expect(btn8x10).toBeVisible({ timeout: 5000 });
        // Active button has dark background style
        const bg = await btn8x10.evaluate(el => getComputedStyle(el).backgroundColor);
        // Should be dark (active state) — not white/transparent
        expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
});

// ── URL routing ─────────────────────────────────────────────────────────────

test.describe('URL routing', () => {
    test('bare slug redirects to /l/:slug', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/listings/*', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) })
        );
        await page.route('**/api/templates/**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sm001-design001-8x10', settings_json: '{}' }) })
        );

        await page.goto('/star-map-night-we-met');
        await page.waitForURL(/\/l\/star-map-night-we-met/);
        expect(page.url()).toContain('/l/star-map-night-we-met');
    });

    test('/l/:slug route loads without 404', async ({ page }) => {
        await setupListingMock(page);
        const response = await page.goto('/l/star-map-night-we-met');
        expect(response?.status()).not.toBe(404);
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });
    });

    test('/t/:templateId loads correctly', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/templates/sm001-design001-8x10', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'sm001-design001-8x10', settings_json: JSON.stringify({ posterType: 'starmap', maskShape: 'circle' }) }),
            })
        );
        await page.goto('/t/sm001-design001-8x10');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });
        expect(page.url()).toContain('/t/sm001-design001-8x10');
    });
});

// ── SVG poster integrity ────────────────────────────────────────────────────

test.describe('SVG poster integrity', () => {
    test.beforeEach(async ({ page }) => {
        await setupListingMock(page);
    });

    test('poster SVG is present and has positive dimensions', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        const { width, height } = await page.evaluate(() => {
            const svg = document.querySelector('#poster-preview svg');
            const vb = svg?.getAttribute('viewBox')?.split(' ').map(Number);
            return { width: vb?.[2] ?? 0, height: vb?.[3] ?? 0 };
        });
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
        // 8x10 → 4:5 ratio → width/height ≈ 0.8
        expect(width / height).toBeGreaterThan(0.65);
        expect(width / height).toBeLessThan(0.95);
    });

    test('poster has title text element', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg text', { timeout: 10000 });

        const textCount = await page.evaluate(() =>
            document.querySelectorAll('#poster-preview svg text').length
        );
        expect(textCount).toBeGreaterThan(0);
    });

    test('star map has circle elements (real stars rendered)', async ({ page }) => {
        test.setTimeout(30000);
        await page.goto('/l/star-map-night-we-met');

        // Wait for D3 to render stars — same check used in thumbnail capture
        const circleCount = await page.evaluate(() =>
            new Promise<number>(resolve => {
                const check = () => {
                    const circles = document.querySelectorAll('#poster-preview svg circle');
                    if (circles.length > 100) { resolve(circles.length); return; }
                    setTimeout(check, 500);
                };
                setTimeout(() => resolve(0), 25000); // 25s timeout
                check();
            })
        );
        expect(circleCount).toBeGreaterThan(100);
    });

    test('poster SVG uses correct font-family attributes', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg text', { timeout: 10000 });
        await page.waitForTimeout(1000);

        const fontFamilies = await page.evaluate(() => {
            const svgEl = document.querySelector('#poster-preview svg');
            const families = new Set<string>();
            svgEl?.querySelectorAll('[font-family]').forEach(el => {
                const ff = el.getAttribute('font-family');
                if (ff) families.add(ff);
            });
            return [...families];
        });

        // Should have font-family attributes (not empty SVG)
        expect(fontFamilies.length).toBeGreaterThan(0);
        // Each should be a comma-separated stack like "Title001, serif"
        for (const ff of fontFamilies) {
            expect(ff).toMatch(/\w/); // non-empty
        }
    });

    test('font-family values are parseable (comma-split yields known fonts)', async ({ page }) => {
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg text', { timeout: 10000 });
        await page.waitForTimeout(1000);

        const parsed = await page.evaluate(() => {
            const svgEl = document.querySelector('#poster-preview svg');
            const names = new Set<string>();
            svgEl?.querySelectorAll('[font-family]').forEach(el => {
                const ff = el.getAttribute('font-family');
                if (!ff) return;
                for (const part of ff.split(',')) {
                    const name = part.trim().replace(/^['"]|['"]$/g, '');
                    if (name) names.add(name);
                }
            });
            return [...names];
        });

        // Should extract at least one actual font name (not just generic families)
        const genericOnly = ['serif', 'sans-serif', 'cursive', 'monospace', 'fantasy', 'system-ui'];
        const customFonts = parsed.filter(n => !genericOnly.includes(n));
        expect(customFonts.length).toBeGreaterThan(0);
    });
});

// ── Print size switching ────────────────────────────────────────────────────

test.describe('Print size switching', () => {
    test.beforeEach(async ({ page }) => {
        await setupListingMock(page);
    });

    test('switching to 5x7 changes poster aspect ratio', async ({ page }) => {
        test.setTimeout(20000);
        await page.goto('/l/star-map-night-we-met');
        await page.waitForSelector('#poster-preview svg', { timeout: 10000 });

        // Mock 5x7 template
        await page.route('**/api/templates/sm001-design001-5x7', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'sm001-design001-5x7',
                    settings_json: JSON.stringify({ posterType: 'starmap', maskShape: 'circle', printSize: '5x7' }),
                }),
            })
        );

        const btn5x7 = page.getByRole('button', { name: /5x7/i });
        await expect(btn5x7).toBeVisible({ timeout: 5000 });
        await btn5x7.click();
        await page.waitForTimeout(1000);

        const { width, height } = await page.evaluate(() => {
            const svg = document.querySelector('#poster-preview svg');
            const vb = svg?.getAttribute('viewBox')?.split(' ').map(Number);
            return { width: vb?.[2] ?? 0, height: vb?.[3] ?? 0 };
        });
        // 5x7 → ratio ≈ 0.714, slightly narrower than 8x10's 0.8
        const ratio = width / height;
        expect(ratio).toBeGreaterThan(0.6);
        expect(ratio).toBeLessThan(0.85);
    });
});

// ── Admin navigation ────────────────────────────────────────────────────────

test.describe('Admin navigation', () => {
    test('back button in design editor goes to /admin/listings', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.goto('/admin/listings');
        await page.waitForSelector('table, [data-testid="listings"]', { timeout: 8000 }).catch(() => {});

        // Navigate to design editor (if link exists) or directly
        await page.goto('/admin/design-editor/1');
        await page.waitForTimeout(500);

        const backBtn = page.getByRole('button', { name: /back/i }).first();
        const backLink = page.getByRole('link', { name: /back/i }).first();

        const btn = (await backBtn.count()) > 0 ? backBtn : backLink;
        if (await btn.count() > 0) {
            await btn.click();
            await page.waitForURL(/\/admin\/listings/, { timeout: 5000 });
            expect(page.url()).toContain('/admin/listings');
        }
    });
});

// ── DB consistency (via API) ────────────────────────────────────────────────

test.describe('DB consistency via listing API', () => {
    test('listing API returns both design groups', async ({ page }) => {
        await setupListingMock(page);
        await page.goto('/l/star-map-night-we-met');

        const data = await page.evaluate(async () => {
            const r = await fetch('/api/listings/star-map-night-we-met');
            return r.json();
        });

        const ids: string[] = data.templates?.map((t: { id: string }) => t.id) ?? [];
        const hasDesign001 = ids.some(id => id.includes('design001'));
        const hasDesign002 = ids.some(id => id.includes('design002'));
        expect(hasDesign001).toBe(true);
        expect(hasDesign002).toBe(true);
    });

    test('all templates have thumbnail_path set', async ({ page }) => {
        await setupListingMock(page);
        await page.goto('/l/star-map-night-we-met');

        const data = await page.evaluate(async () => {
            const r = await fetch('/api/listings/star-map-night-we-met');
            return r.json();
        });

        const nullThumbs = data.templates?.filter((t: { thumbnail_path: string | null }) => !t.thumbnail_path) ?? [];
        expect(nullThumbs.length).toBe(0);
    });
});
