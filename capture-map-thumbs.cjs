const { chromium } = require('playwright');

const DESIGNS = [
  {
    templateId: 'cmhs001-design001-8x10',
    outFile: '/tmp/thumb-cmhs001-design001.png',
    mapMode: true,
  },
  {
    templateId: 'cmhh001-design001-8x10',
    outFile: '/tmp/thumb-cmhh001-design001.png',
    mapMode: true,
  },
  {
    templateId: 'smbw001-design001-8x10',
    outFile: '/tmp/thumb-smbw001-design001.png',
    mapMode: true,
    expectedTitle: 'YOUR CITY',
  },
];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  for (const { templateId, outFile, mapMode, expectedTitle } of DESIGNS) {
    console.log(`Rendering ${templateId}...`);
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto(`http://localhost:5173/t/${templateId}`, { waitUntil: 'domcontentloaded' });

    // Wait for MapLibre to render and the map snapshot to appear as <image> in the SVG
    console.log('  Waiting for map image...');
    try {
      await page.waitForFunction(() => {
        const svg = document.querySelector('#poster-preview svg');
        if (!svg) return false;
        return svg.querySelectorAll('image').length > 0;
      }, { timeout: 120000 });
      console.log('  Map image found!');
    } catch (e) {
      console.log('  Warning: timed out waiting for map image, capturing anyway');
    }

    // Extra settle time for tiles + fonts
    await page.waitForTimeout(6000);

    if (expectedTitle) {
      try {
        await page.waitForFunction((title) => {
          const texts = Array.from(document.querySelectorAll('#poster-preview svg text'));
          return texts.some(t => t.textContent?.toUpperCase().includes(title.split(' ')[0]));
        }, expectedTitle, { timeout: 5000 });
      } catch (e) {
        console.log('  Warning: timed out waiting for title');
      }
    }

    const preview = await page.$('#poster-preview');
    if (!preview) {
      console.error('  Error: #poster-preview not found');
      await page.close();
      continue;
    }

    const box = await preview.boundingBox();
    if (box) {
      console.log(`  Preview box: ${Math.round(box.width)}×${Math.round(box.height)}`);
    }

    await preview.screenshot({ path: outFile });
    await page.close();
    console.log(`  Saved to ${outFile}`);
  }

  await browser.close();
  console.log('Done.');
})();
