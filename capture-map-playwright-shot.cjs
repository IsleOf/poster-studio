// Use Playwright's screenshot (compositor-based, no WebGL ReadPixels) on the MapLibre canvas.
// Then composites it into the poster shape using sharp.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const DESIGNS = [
    { templateId: 'cmhs001-design001-8x10', out: '/tmp/thumb-cmhs001-design001.png' },
    { templateId: 'cmhh001-design001-8x10', out: '/tmp/thumb-cmhh001-design001.png' },
    { templateId: 'smbw001-design001-8x10', out: '/tmp/thumb-smbw001-design001.png' },
  ];

  for (const { templateId, out } of DESIGNS) {
    console.log(`Rendering ${templateId}...`);
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto(`http://localhost:5173/t/${templateId}`, { waitUntil: 'domcontentloaded' });

    // Wait for map style to load (map element appears)
    await page.waitForSelector('.maplibregl-map', { timeout: 20000 });
    console.log('  Map element found');

    // Wait for tiles to render - watch canvas size stabilize
    await page.waitForTimeout(8000);

    // Bring the maplibre container into the viewport for the screenshot
    await page.evaluate(() => {
      const container = document.querySelector('.maplibregl-map')?.parentElement;
      if (container) {
        (container as HTMLElement).style.position = 'fixed';
        (container as HTMLElement).style.top = '0';
        (container as HTMLElement).style.left = '0';
        (container as HTMLElement).style.zIndex = '9999';
      }
    });

    await page.waitForTimeout(500);

    // Screenshot the maplibre canvas using Playwright's compositor-based screenshot
    const mapCanvas = page.locator('.maplibregl-canvas').first();
    let mapShot: Buffer | null = null;
    try {
      mapShot = await mapCanvas.screenshot({ type: 'png' });
      console.log(`  Map canvas screenshot: ${mapShot.length} bytes`);
    } catch (e) {
      console.log('  Map canvas screenshot failed:', e.message);
    }

    // Also try screenshotting the full poster preview
    await page.evaluate(() => {
      const container = document.querySelector('.maplibregl-map')?.parentElement;
      if (container) {
        (container as HTMLElement).style.position = 'fixed';
        (container as HTMLElement).style.top = '-9999px';
        (container as HTMLElement).style.left = '-9999px';
        (container as HTMLElement).style.zIndex = '';
      }
    });

    if (mapShot && mapShot.length > 10000) {
      require('fs').writeFileSync(out, mapShot);
      console.log(`  Saved map screenshot to ${out}`);
    } else {
      // Fallback: screenshot the full poster preview element
      const preview = await page.$('#poster-preview');
      if (preview) {
        await preview.screenshot({ path: out });
        console.log(`  Saved poster preview to ${out}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log('Done.');
})();
