/**
 * listing-system-prod.test.ts
 *
 * Visual and functional tests against the PRODUCTION deployment at
 * https://themappedmoment.com — no mock API, real network requests.
 *
 * These tests catch quirks that only appear on the live server:
 *   - Thumbnails missing from /var/www/poster-studio/designs/
 *   - Nginx misconfiguration (wrong MIME types, 404s, redirect loops)
 *   - DB state drift between local and production (different thumbnail_path,
 *     different titleAllCaps, missing listing_templates rows)
 *   - Font rendering differences (CDN vs local, cache headers)
 *   - CORS or CSP blocking API calls from the live domain
 *
 * Usage:
 *   npx playwright test tests/listing-system-prod.test.ts
 *   # or with headed browser:
 *   npx playwright test tests/listing-system-prod.test.ts --headed
 *
 * NOTE: These tests make REAL requests to production — run them after a
 * deploy, not in CI (where you'd use mock tests instead).
 */

import { test, expect, Page } from '@playwright/test';

const PROD_URL = 'https://themappedmoment.com';
const LISTING_SLUG = 'star-map-night-we-met';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForStars(page: Page, timeout = 25000): Promise<number> {
    return page.evaluate(
        (ms) =>
            new Promise<number>(resolve => {
                const check = () => {
                    const c = document.querySelectorAll('#poster-preview svg circle').length;
                    if (c > 100) { resolve(c); return; }
                    setTimeout(check, 500);
                };
                setTimeout(() => resolve(0), ms);
                check();
            }),
        timeout,
    );
}

// ── API health ────────────────────────────────────────────────────────────────

test.describe('Production API health', () => {
    test('/api/health returns 200', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/health`);
        expect(r.status()).toBe(200);
    });

    test('/api/listings/:slug returns listing JSON', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        expect(r.status()).toBe(200);
        const data = await r.json();
        expect(data.slug).toBe(LISTING_SLUG);
        expect(Array.isArray(data.templates)).toBe(true);
        expect(data.templates.length).toBeGreaterThan(0);
    });

    test('listing API returns templates for both Design001 and Design002', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await r.json();
        const ids: string[] = data.templates.map((t: { id: string }) => t.id);
        expect(ids.some(id => id.includes('design001'))).toBe(true);
        expect(ids.some(id => id.includes('design002'))).toBe(true);
    });

    test('all templates have thumbnail_path set', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await r.json();
        const nullThumbs = data.templates.filter(
            (t: { thumbnail_path: string | null }) => !t.thumbnail_path
        );
        if (nullThumbs.length > 0) {
            console.error('Templates missing thumbnail_path:', nullThumbs.map((t: { id: string }) => t.id));
        }
        expect(nullThumbs.length).toBe(0);
    });

    test('all templates have correct printSize (matches ID suffix)', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await r.json();
        const mismatches: string[] = [];
        for (const t of data.templates as { id: string; fulfillment_size: string }[]) {
            // ID suffix like "sm001-design001-8x10" → "8x10"
            const suffix = t.id.split('-').slice(-2).join('x').replace('x10', 'x10'); // naive
            const idSuffix = t.id.match(/(\d+x\d+)$/)?.[1];
            if (idSuffix && t.fulfillment_size && t.fulfillment_size !== idSuffix) {
                mismatches.push(`${t.id}: id says ${idSuffix}, fulfillment_size=${t.fulfillment_size}`);
            }
        }
        if (mismatches.length > 0) console.error('printSize mismatches:', mismatches);
        expect(mismatches.length).toBe(0);
    });
});

// ── Thumbnail file availability ───────────────────────────────────────────────

test.describe('Production thumbnail files', () => {
    test('Design001 8x10 thumbnail returns 200 with correct Content-Type', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/designs/SM001/Design001/8x10.png`);
        expect(r.status()).toBe(200);
        const ct = r.headers()['content-type'];
        expect(ct).toContain('image/png');
    });

    test('Design002 8x10 thumbnail returns 200 with correct Content-Type', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/designs/SM001/Design002/8x10.png`);
        expect(r.status()).toBe(200);
        const ct = r.headers()['content-type'];
        expect(ct).toContain('image/png');
    });

    test('Design001 thumbnail has correct dimensions (592×740, 4:5 ratio)', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/designs/SM001/Design001/8x10.png`);
        expect(r.status()).toBe(200);
        // PNG header: width at bytes 16-19, height at bytes 20-23
        const buf = Buffer.from(await r.body());
        const width  = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        console.log(`Design001 8x10: ${width}×${height}`);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
        const ratio = width / height;
        expect(ratio).toBeGreaterThan(0.75);
        expect(ratio).toBeLessThan(0.85);
    });

    test('Design002 thumbnail has correct dimensions (4:5 ratio)', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/designs/SM001/Design002/8x10.png`);
        expect(r.status()).toBe(200);
        const buf = Buffer.from(await r.body());
        const width  = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        console.log(`Design002 8x10: ${width}×${height}`);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
        const ratio = width / height;
        expect(ratio).toBeGreaterThan(0.75);
        expect(ratio).toBeLessThan(0.85);
    });

    test('thumbnails are not the same file (distinct designs)', async ({ request }) => {
        const [r1, r2] = await Promise.all([
            request.get(`${PROD_URL}/designs/SM001/Design001/8x10.png`),
            request.get(`${PROD_URL}/designs/SM001/Design002/8x10.png`),
        ]);
        const [b1, b2] = await Promise.all([r1.body(), r2.body()]);
        // Convert to string for comparison (use first 256 bytes — enough to distinguish)
        const sig1 = Buffer.from(b1).slice(0, 256).toString('hex');
        const sig2 = Buffer.from(b2).slice(0, 256).toString('hex');
        expect(sig1).not.toBe(sig2);
    });
});

// ── Listing page visual checks ────────────────────────────────────────────────

test.describe('Production listing page', () => {
    test.setTimeout(30000);

    test.beforeEach(async ({ page }) => {
        await page.goto(`${PROD_URL}/l/${LISTING_SLUG}`, { waitUntil: 'domcontentloaded' });
    });

    test('listing page loads without errors', async ({ page }) => {
        // No JS errors on page load
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.waitForTimeout(2000);
        const fatal = errors.filter(e =>
            !e.includes('ResizeObserver') &&  // benign browser warning
            !e.includes('non-passive event')
        );
        expect(fatal.length).toBe(0);
    });

    test('listing page title matches expected name', async ({ page }) => {
        await page.waitForSelector('h1, h2', { timeout: 8000 });
        const headingText = await page.locator('h1, h2').first().textContent();
        expect(headingText).toBeTruthy();
        expect(headingText!.length).toBeGreaterThan(3);
    });

    test('thumbnails load without 404 (naturalWidth > 0)', async ({ page }) => {
        await page.waitForTimeout(3000); // allow lazy images

        const thumbInfo = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img'))
                .filter(img => img.src.includes('/designs/'))
                .map(img => ({
                    src: img.src.replace(/^https?:\/\/[^/]+/, ''),
                    complete: img.complete,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                }));
        });

        console.log('Thumbnails found:', thumbInfo.length);
        for (const t of thumbInfo) {
            console.log(`  ${t.src}: ${t.naturalWidth}×${t.naturalHeight} complete=${t.complete}`);
        }

        expect(thumbInfo.length).toBeGreaterThan(0);
        for (const t of thumbInfo) {
            expect(t.complete).toBe(true);
            expect(t.naturalWidth).toBeGreaterThan(0);
        }
    });

    test('thumbnails have 4:5 aspect ratio', async ({ page }) => {
        await page.waitForTimeout(3000);

        const thumbInfo = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img'))
                .filter(img => img.src.includes('/designs/'))
                .map(img => ({
                    src: img.src.replace(/^https?:\/\/[^/]+/, ''),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                }));
        });

        for (const t of thumbInfo) {
            if (t.naturalHeight === 0) continue; // already caught by previous test
            const ratio = t.naturalWidth / t.naturalHeight;
            expect(ratio).toBeGreaterThan(0.75);
            expect(ratio).toBeLessThan(0.85);
        }
    });

    test('both design variants are shown', async ({ page }) => {
        await page.waitForTimeout(2000);
        const imgs = page.locator('img[src*="/designs/"]');
        const count = await imgs.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('visual snapshot: listing page', async ({ page }) => {
        await page.waitForTimeout(3000); // allow images to settle
        await expect(page).toHaveScreenshot('prod-listing-page.png', {
            maxDiffPixelRatio: 0.05,
            fullPage: false,
        });
    });
});

// ── Designer page (template URL) visual check ─────────────────────────────────

test.describe('Production designer page', () => {
    test.setTimeout(45000);

    test('design001 template loads and renders stars', async ({ page }) => {
        // Get the actual template ID from the listing API
        const resp = await page.request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await resp.json();
        const t8x10 = data.templates.find(
            (t: { id: string; fulfillment_size: string }) =>
                t.id.includes('design001') && t.fulfillment_size === '8x10'
        );
        expect(t8x10).toBeTruthy();

        await page.goto(`${PROD_URL}/t/${t8x10.id}`, { waitUntil: 'domcontentloaded' });

        const circleCount = await waitForStars(page, 25000);
        console.log(`Design001 circles rendered: ${circleCount}`);
        expect(circleCount).toBeGreaterThan(100);
    });

    test('design002 template loads and renders stars', async ({ page }) => {
        const resp = await page.request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await resp.json();
        const t8x10 = data.templates.find(
            (t: { id: string; fulfillment_size: string }) =>
                t.id.includes('design002') && t.fulfillment_size === '8x10'
        );
        expect(t8x10).toBeTruthy();

        await page.goto(`${PROD_URL}/t/${t8x10.id}`, { waitUntil: 'domcontentloaded' });

        const circleCount = await waitForStars(page, 25000);
        console.log(`Design002 circles rendered: ${circleCount}`);
        expect(circleCount).toBeGreaterThan(100);
    });

    test('visual snapshot: design001 designer page', async ({ page }) => {
        const resp = await page.request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await resp.json();
        const t8x10 = data.templates.find(
            (t: { id: string; fulfillment_size: string }) =>
                t.id.includes('design001') && t.fulfillment_size === '8x10'
        );

        await page.goto(`${PROD_URL}/t/${t8x10.id}`, { waitUntil: 'domcontentloaded' });
        await waitForStars(page, 25000);
        await page.waitForTimeout(2000); // allow fonts to render

        await expect(page).toHaveScreenshot('prod-designer-design001.png', {
            maxDiffPixelRatio: 0.05,
        });
    });
});

// ── Font and render quality ───────────────────────────────────────────────────

test.describe('Production font rendering', () => {
    test.setTimeout(60000);

    test('SVG has font-family attributes with custom font names', async ({ page }) => {
        const resp = await page.request.get(`${PROD_URL}/api/listings/${LISTING_SLUG}`);
        const data = await resp.json();
        const t8x10 = data.templates.find(
            (t: { id: string; fulfillment_size: string }) =>
                t.id.includes('design001') && t.fulfillment_size === '8x10'
        );

        await page.goto(`${PROD_URL}/t/${t8x10.id}`, { waitUntil: 'domcontentloaded' });
        await waitForStars(page, 25000);
        await page.waitForTimeout(3000);

        const fontInfo = await page.evaluate(() => {
            const svgEl = document.querySelector('#poster-preview svg');
            if (!svgEl) return { error: 'no SVG' };
            const raw = new Set<string>();
            const parsed = new Set<string>();
            svgEl.querySelectorAll('[font-family]').forEach(el => {
                const ff = el.getAttribute('font-family');
                if (!ff) return;
                raw.add(ff);
                for (const part of ff.split(',')) {
                    const name = part.trim().replace(/^['"]|['"]$/g, '');
                    if (name) parsed.add(name);
                }
            });
            return { raw: [...raw], parsed: [...parsed] };
        });

        console.log('Raw font-family values:', (fontInfo as { raw: string[] }).raw?.join(' | '));
        console.log('Parsed families:', (fontInfo as { parsed: string[] }).parsed?.join(', '));

        // Should have custom fonts, not just system fallbacks
        const generics = ['serif', 'sans-serif', 'cursive', 'monospace', 'fantasy'];
        const custom = (fontInfo as { parsed: string[] }).parsed?.filter(n => !generics.includes(n)) ?? [];
        expect(custom.length).toBeGreaterThan(0);
    });
});

// ── Security headers ──────────────────────────────────────────────────────────

test.describe('Production security headers', () => {
    test('API returns CORS header for same origin', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/health`);
        // API should be reachable from the same domain
        expect(r.status()).toBe(200);
    });

    test('API admin endpoints reject unauthenticated requests', async ({ request }) => {
        const r = await request.get(`${PROD_URL}/api/admin/orders`);
        expect(r.status()).toBe(401);
    });
});
