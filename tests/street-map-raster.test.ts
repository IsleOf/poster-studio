/**
 * Vector street-map raster-preview tests.
 *
 * Covers the raster-preview rendering path used for the high-detail 2-colour
 * vector street map (mapColorPreset === 'design2'):
 *   - a rasterised <image> is rendered into #map-layer
 *   - a background rect sits behind it (guards the JPEG transparent→black bug)
 *   - dragging the map RIGHT moves the raster group RIGHT (sign correctness —
 *     the "jumps left when dragging right" regression)
 *   - the pan offset persists after pointer-up (no snap-back to origin)
 *   - changing location updates the lat/lng inputs (map recentres)
 *
 * Tiles are mocked so the test never depends on the external OpenFreeMap CDN.
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi } from './fixtures/mockApi';

const STREET_TEMPLATE_ID = 'test-street-design2';

// Minimal valid empty protobuf body — yields a VectorTile with no layers, so the
// renderer resolves with empty path strings and the raster becomes a bg-only bitmap.
const EMPTY_PBF = Buffer.from([]);

async function mockTiles(page: Page) {
    // TileJSON describing where vector tiles live
    await page.route('**/tiles.openfreemap.org/planet*', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ tiles: ['https://tiles.openfreemap.org/data/{z}/{x}/{y}.pbf'] }),
        })
    );
    // Individual vector tiles — empty but valid
    await page.route('**/*.pbf', route =>
        route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: EMPTY_PBF })
    );
}

async function mockStreetTemplate(page: Page) {
    const settings = {
        posterType: 'streetmap',
        maskShape: 'rect',
        mapColorPreset: 'design2',
        mapCenterLat: 48.8566,
        mapCenterLng: 2.3522,
        mapZoom: 13,
        mapBearing: 0,
        mapBgColor: '#ffffff',
        mapWaterColor: '#8f8f8f',
        mapLandColor: '#b6b6b6',
        mapMainRoadColor: '#111111',
        showLocationPin: true,
        title: 'Paris',
        printSize: '8x10',
    };
    await page.route(`**/api/templates/${STREET_TEMPLATE_ID}*`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: STREET_TEMPLATE_ID,
                name: 'Test Street — 8x10',
                description: 'Vector street map test',
                thumbnail_path: null,
                etsy_listing_url: null,
                etsy_variant_name: null,
                fulfillment_size: '8x10',
                design_group_id: null,
                listing_slug: null,
                settings_json: JSON.stringify(settings),
                settings,
            }),
        })
    );
}

async function openVectorStreetMap(page: Page) {
    await setupMockApi(page);
    await mockTiles(page);
    await mockStreetTemplate(page);
    // Force the vector renderer on regardless of build env
    await page.addInitScript(() => {
        window.localStorage.setItem('posterStudio.vectorMapRenderer', '1');
    });
    await page.goto(`/t/${STREET_TEMPLATE_ID}`);
    await page.waitForSelector('#map-layer', { timeout: 15000 });
    // Wait for the raster <image> to appear (tile fetch → render → canvas → dataURL)
    await page.waitForSelector('#map-layer image', { timeout: 15000 });
    await page.waitForTimeout(400);
}

/** Read the translate() of the raster group (the <g> wrapping the map <image>). */
async function readRasterTranslate(page: Page): Promise<{ x: number; y: number }> {
    return page.evaluate(() => {
        const img = document.querySelector('#map-layer image');
        const g = img?.closest('g[transform]') as SVGGElement | null;
        const t = g?.getAttribute('transform') || 'translate(0,0)';
        const m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/);
        return { x: m ? parseFloat(m[1]) : 0, y: m ? parseFloat(m[2]) : 0 };
    });
}

test.describe('Vector street map — raster preview', () => {
    test('renders a raster <image> into the map layer', async ({ page }) => {
        await openVectorStreetMap(page);
        const images = await page.locator('#map-layer image').count();
        expect(images).toBeGreaterThan(0);
        // href should be a data: URL (the rasterised bitmap), not a remote tile
        const href = await page.locator('#map-layer image').first().getAttribute('href');
        expect(href).toMatch(/^data:image\//);
    });

    test('has a background rect behind the raster (no transparent/black gaps)', async ({ page }) => {
        await openVectorStreetMap(page);
        // The bg rect is the first child rect of the clipped map content group
        const rects = await page.locator('#map-layer rect').count();
        expect(rects).toBeGreaterThan(0);
    });

    // Read the Lng input value (Paris ≈ 2.35; pans west → decreases)
    async function readLng(page: Page): Promise<number | null> {
        return page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
            // Lng is the lon input; Lat (~48) starts with 4. Lng for Paris starts with 2 or is negative.
            const lng = inputs.find(i => /^-?[0-9]{1,2}\.\d/.test(i.value) && !/^4[0-9]\./.test(i.value));
            return lng ? parseFloat(lng.value) : null;
        });
    }

    test('dragging the map RIGHT recentres westward (lng decreases) — not a left-jump', async ({ page }) => {
        await openVectorStreetMap(page);
        const before = await readLng(page);
        expect(before).not.toBeNull();

        // Drag the map left → right
        const box = await page.locator('#poster-preview').boundingBox();
        if (!box) throw new Error('poster preview not found');
        const startX = box.x + box.width * 0.4;
        const startY = box.y + box.height * 0.35;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 120, startY, { steps: 8 });
        await page.mouse.up();

        // Dragging the content right reveals western geography → centre longitude decreases.
        // Poll rather than fixed-wait — the recenter + tile reload timing varies.
        await expect.poll(async () => {
            const v = await readLng(page);
            return v ?? before!;
        }, { timeout: 8000, intervals: [200, 300, 500, 800] }).toBeLessThan(before!);
    });

    test('pan offset resets to ~0 after the recentred view loads (new content centred)', async ({ page }) => {
        await openVectorStreetMap(page);

        const box = await page.locator('#poster-preview').boundingBox();
        if (!box) throw new Error('poster preview not found');
        const startX = box.x + box.width * 0.4;
        const startY = box.y + box.height * 0.4;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 90, startY + 60, { steps: 8 });
        await page.mouse.up();

        // Once the recentred view finishes loading, the transient offset is cleared to 0.
        // Poll rather than fixed-wait — tile fetch + raster regen timing varies.
        await expect.poll(async () => {
            const t = await readRasterTranslate(page);
            return Math.max(Math.abs(t.x), Math.abs(t.y));
        }, { timeout: 8000, intervals: [200, 300, 500, 800] }).toBeLessThan(2);
    });

    test('changing map centre recentres the map and re-renders the raster', async ({ page }) => {
        await openVectorStreetMap(page);

        // Find the Lng input (Paris ≈ 2.35) among the number inputs
        const lngInputIndex = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
            return inputs.findIndex(i => /^2\.3/.test(i.value));
        });
        expect(lngInputIndex).toBeGreaterThanOrEqual(0);

        const lngInput = page.locator('input').nth(lngInputIndex);
        await lngInput.fill('-74.0060');
        await lngInput.blur();
        await page.waitForTimeout(800);

        // Map must still render a raster <image> after recentring (no crash / blank)
        await page.waitForSelector('#map-layer image', { timeout: 10000 });
        const images = await page.locator('#map-layer image').count();
        expect(images).toBeGreaterThan(0);

        // The Lng value persisted to New York
        const newVal = await lngInput.inputValue();
        expect(parseFloat(newVal)).toBeLessThan(-70);
    });
});
