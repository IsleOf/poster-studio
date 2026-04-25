/**
 * verify-listing.cjs
 *
 * Visual verification script — takes a screenshot of the listing page on both
 * local dev server and production, and checks that all design thumbnails are
 * loading correctly (not 404, not broken, correct dimensions).
 *
 * Usage:
 *   node scripts/verify-listing.cjs
 *
 * Output:
 *   /tmp/verify-local.png  — screenshot of local listing page
 *   /tmp/verify-prod.png   — screenshot of production listing page
 *   Console output shows img src, dimensions, and load status for each thumbnail
 *
 * A thumbnail is healthy if:
 *   - complete === true
 *   - naturalWidth > 0 (not broken/404)
 *   - naturalWidth / naturalHeight ≈ 0.8 (4:5 ratio, i.e. 592×740)
 */

const { chromium } = require(require('path').resolve(__dirname, '../node_modules/playwright'));
const fs = require('fs');

const SLUG = 'star-map-night-we-met';
const URLS = [
    { label: 'LOCAL', url: `http://localhost:5173/l/${SLUG}` },
    { label: 'PROD',  url: `https://themappedmoment.com/l/${SLUG}` },
];

(async () => {
    const browser = await chromium.launch({
        executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    let hasErrors = false;

    for (const { label, url } of URLS) {
        console.log(`\n=== ${label}: ${url} ===`);
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache, no-store' });

        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        } catch (e) {
            console.log(`  ✗ Failed to load: ${e.message}`);
            hasErrors = true;
            await page.close();
            continue;
        }

        await page.waitForTimeout(2000); // wait for any lazy-loaded images

        // Check all /designs/ thumbnails
        const thumbInfo = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs
                .filter(img => img.src.includes('/designs/'))
                .map(img => ({
                    src: img.src.replace(/^https?:\/\/[^/]+/, ''),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    complete: img.complete,
                }));
        });

        if (thumbInfo.length === 0) {
            console.log('  ✗ No /designs/ thumbnails found on page');
            hasErrors = true;
        }

        for (const t of thumbInfo) {
            const ratio = t.naturalHeight > 0 ? (t.naturalWidth / t.naturalHeight).toFixed(2) : '?';
            const ratioOk = t.naturalHeight > 0 && Math.abs(t.naturalWidth / t.naturalHeight - 0.8) < 0.05;
            const ok = t.complete && t.naturalWidth > 0 && ratioOk;
            const icon = ok ? '✓' : '✗';
            console.log(`  ${icon} ${t.src}`);
            console.log(`      ${t.naturalWidth}×${t.naturalHeight} (ratio ${ratio}) complete=${t.complete}`);
            if (!ok) {
                hasErrors = true;
                if (!t.complete || t.naturalWidth === 0) console.log('      → Image failed to load (404 or network error)');
                if (!ratioOk) console.log(`      → Wrong aspect ratio (expected ~0.80 for 4:5)`);
            }
        }

        // Screenshot
        const outPath = `/tmp/verify-${label.toLowerCase()}.png`;
        await page.screenshot({ path: outPath });
        console.log(`  Screenshot saved: ${outPath}`);

        await page.close();
    }

    await browser.close();

    console.log('\n' + (hasErrors ? '✗ Issues found — check output above' : '✓ All thumbnails healthy'));
    process.exit(hasErrors ? 1 : 0);
})();
