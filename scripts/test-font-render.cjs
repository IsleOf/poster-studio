/**
 * test-font-render.cjs
 *
 * Verifies that custom fonts are correctly embedded in PNG downloads.
 * Loads the designer, renders a poster to PNG via renderPosterToBlob(),
 * and saves the result for visual inspection.
 *
 * Usage:
 *   node scripts/test-font-render.cjs [templateId]
 *
 * Default templateId: sm001-design001-8x10
 *
 * Output:
 *   /tmp/font-test-render.png   — the rendered PNG (inspect visually)
 *   /tmp/font-test-preview.png  — screenshot of the browser preview (for comparison)
 *
 * A render is healthy if:
 *   - File size > 300KB (fonts add ~200KB; without fonts it's ~150KB)
 *   - The title/text fonts in the PNG match the browser preview
 */

const { chromium } = require(require('path').resolve(__dirname, '../node_modules/playwright'));
const fs = require('fs');

const templateId = process.argv[2] || 'sm001-design001-8x10';
const DPI = 150; // Use 150 for speed; use 300 for production quality check

(async () => {
    const browser = await chromium.launch({
        executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.on('console', m => {
        if (['warn', 'error'].includes(m.type())) console.log(`[PAGE ${m.type()}]`, m.text().slice(0, 120));
    });
    await page.setViewportSize({ width: 1400, height: 900 });

    console.log(`Loading template: ${templateId}`);
    await page.goto(`http://localhost:5173/t/${templateId}`, { waitUntil: 'domcontentloaded' });

    // Wait for D3 stars
    try {
        await page.waitForFunction(() => {
            const svg = document.querySelector('#poster-preview svg');
            return svg && svg.querySelectorAll('circle').length > 100;
        }, { timeout: 20000 });
        console.log('Stars rendered');
    } catch (e) {
        console.log('Warning: stars timed out, continuing anyway');
    }

    await page.waitForTimeout(3000); // allow fonts to load

    // Check font-family attributes in the SVG
    const fontInfo = await page.evaluate(() => {
        const svgEl = document.querySelector('#poster-preview svg');
        if (!svgEl) return { error: 'no SVG found' };
        const raw = new Set();
        const parsed = new Set();
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

    if (fontInfo.error) {
        console.error('✗', fontInfo.error);
        await browser.close();
        process.exit(1);
    }

    console.log('Raw font-family values:', fontInfo.raw.join(' | '));
    console.log('Parsed families:', fontInfo.parsed.join(', '));

    // Render PNG via renderPosterToBlob
    const renderResult = await page.evaluate(async (dpi) => {
        try {
            const svgEl = document.querySelector('#poster-preview svg');
            if (!svgEl) return { error: 'no SVG' };
            const { renderPosterToBlob } = await import('/src/utils/renderPoster.ts');
            const blob = await renderPosterToBlob(svgEl, 8, 10, dpi, true);
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve({ size: blob.size, data: reader.result });
                reader.onerror = () => resolve({ error: 'FileReader failed' });
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return { error: e.message };
        }
    }, DPI);

    if (renderResult.error) {
        console.error('✗ Render failed:', renderResult.error);
        await browser.close();
        process.exit(1);
    }

    // Save PNG
    const base64 = renderResult.data.replace(/^data:image\/png;base64,/, '');
    const outPath = '/tmp/font-test-render.png';
    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));

    // Save browser preview for comparison
    const preview = await page.$('#poster-preview');
    if (preview) await preview.screenshot({ path: '/tmp/font-test-preview.png' });

    // Health check
    const hasEmbeddedFonts = renderResult.size > 300000;
    const icon = hasEmbeddedFonts ? '✓' : '✗';
    console.log(`\n${icon} Render size: ${Math.round(renderResult.size / 1024)}KB`);
    if (!hasEmbeddedFonts) {
        console.log('  WARNING: File is small — fonts may not be embedded. Expected >300KB with embedded fonts.');
        console.log('  Check that all fonts in fontInfo.parsed are registered in src/utils/fontRegistry.ts');
    } else {
        console.log('  Font embedding looks healthy (large file size indicates embedded fonts)');
    }

    console.log('\nOutput files:');
    console.log('  /tmp/font-test-render.png  — rendered PNG (check fonts visually)');
    console.log('  /tmp/font-test-preview.png — browser preview (for comparison)');

    await browser.close();
    process.exit(hasEmbeddedFonts ? 0 : 1);
})();
