// Diagnostic capture — captures just one design and logs console output
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
    }
  });
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  console.log('Navigating...');
  await page.goto('http://localhost:5173/t/cmhs001-design001-8x10', { waitUntil: 'domcontentloaded' });
  console.log('Page loaded');

  // Wait a few seconds then check state
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const svg = document.querySelector('#poster-preview svg');
    const canvas = document.querySelector('canvas');
    const mapDiv = document.querySelector('[class*="maplibre"]') || document.querySelector('[class*="mapboxgl"]');
    const images = svg ? svg.querySelectorAll('image').length : 0;
    const circles = svg ? svg.querySelectorAll('circle').length : 0;
    const texts = svg ? Array.from(svg.querySelectorAll('text')).map(t => t.textContent?.trim()).filter(Boolean) : [];
    return {
      hasSvg: !!svg,
      hasCanvas: !!canvas,
      hasMapDiv: !!mapDiv,
      svgImages: images,
      svgCircles: circles,
      svgTexts: texts.slice(0, 5),
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      mapDivClass: mapDiv?.className?.slice(0, 100),
    };
  });

  console.log('Page state after 5s:', JSON.stringify(state, null, 2));

  // Wait more
  await page.waitForTimeout(10000);

  const state2 = await page.evaluate(() => {
    const svg = document.querySelector('#poster-preview svg');
    const canvas = document.querySelector('canvas');
    const images = svg ? svg.querySelectorAll('image').length : 0;
    return {
      svgImages: images,
      hasCanvas: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
    };
  });

  console.log('Page state after 15s:', JSON.stringify(state2, null, 2));

  await page.screenshot({ path: '/tmp/debug-capture.png', fullPage: false });
  console.log('Screenshot saved to /tmp/debug-capture.png');

  await browser.close();
})();
