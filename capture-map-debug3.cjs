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
    const text = msg.text();
    if (!text.includes('allowMultiple') && !text.includes('allowToggle') && (msg.type() === 'error' || text.includes('WebGL') || text.includes('GPU'))) {
      console.log(`[${msg.type().toUpperCase()}] ${text.slice(0, 150)}`);
    }
  });

  await page.goto('http://localhost:5173/t/cmhs001-design001-8x10', { waitUntil: 'domcontentloaded' });
  console.log('Loaded, watching for map image (max 60s)...');

  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const imgs = await page.evaluate(() => {
      const svg = document.querySelector('#poster-preview svg');
      return svg ? svg.querySelectorAll('image').length : 0;
    });
    console.log(`t=${5*(i+1)}s: svgImages=${imgs}`);
    if (imgs > 0) {
      console.log('SUCCESS - map image found!');
      const el = await page.$('#poster-preview');
      await el?.screenshot({ path: '/tmp/map-captured-quick.png' });
      console.log('Saved to /tmp/map-captured-quick.png');
      break;
    }
  }

  await browser.close();
})();
