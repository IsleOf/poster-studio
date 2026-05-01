const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  page.on('console', msg => {
    const t = msg.type();
    const text = msg.text();
    if (!text.includes('allowMultiple') && !text.includes('allowToggle')) {
      console.log(`[${t.toUpperCase()}] ${text.slice(0, 200)}`);
    }
  });

  await page.goto('http://localhost:5173/t/cmhs001-design001-8x10', { waitUntil: 'domcontentloaded' });
  console.log('Page loaded, waiting 90s for map capture...');

  // Poll every 5s for up to 90s
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(5000);
    const state = await page.evaluate(() => {
      const svg = document.querySelector('#poster-preview svg');
      return {
        svgImages: svg ? svg.querySelectorAll('image').length : 0,
        canvasCount: document.querySelectorAll('canvas').length,
      };
    });
    console.log(`t=${5*(i+1)}s: svgImages=${state.svgImages}, canvases=${state.canvasCount}`);
    if (state.svgImages > 0) {
      console.log('MAP IMAGE FOUND!');
      await page.$('#poster-preview').then(el => el?.screenshot({ path: '/tmp/map-captured.png' }));
      break;
    }
  }

  await browser.close();
  console.log('Done');
})();
