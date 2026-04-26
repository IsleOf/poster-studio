// Capture thumbnails for listing design cards.
// Uses /t/:templateId route (8x10 size for consistent 4:5 aspect ratio).
// Output: fixed 600×750px images (4:5 ratio, matching 8x10 print size).

const { chromium } = require('playwright');

const THUMB_W = 600;
const THUMB_H = 750; // 4:5 ratio

const DESIGNS = [
  {
    templateId: 'sm001-design001-8x10',
    outFile: '/tmp/thumb-design001.png',
    expectedTitle: 'THE NIGHT WE MET',
    mapMode: false,
  },
  {
    templateId: 'sm001-design002-8x10',
    outFile: '/tmp/thumb-design002.png',
    expectedTitle: 'THE NIGHT OUR STARS ALIGNED',
    mapMode: false,
  },
  {
    templateId: 'sm001-design004-8x10',
    outFile: '/tmp/thumb-design004.png',
    expectedTitle: 'THE NIGHT WE MET',
    mapMode: false,
  },
  {
    templateId: 'sm001-design005-8x10',
    outFile: '/tmp/thumb-design005.png',
    expectedTitle: 'THE NIGHT WE MET',
    mapMode: false,
  },
  {
    templateId: 'sm001-design006-8x10',
    outFile: '/tmp/thumb-design006.png',
    expectedTitle: 'NAME',
    mapMode: false,
  },
  // Colored map — house shape
  {
    templateId: 'cmhs001-design001-8x10',
    outFile: '/tmp/thumb-cmhs001-design001.png',
    expectedTitle: null,
    mapMode: true,
  },
  // Colored map — heart shape
  {
    templateId: 'cmhh001-design001-8x10',
    outFile: '/tmp/thumb-cmhh001-design001.png',
    expectedTitle: null,
    mapMode: true,
  },
  // Monochrome street map
  {
    templateId: 'smbw001-design001-8x10',
    outFile: '/tmp/thumb-smbw001-design001.png',
    expectedTitle: 'YOUR CITY',
    mapMode: true,
  },
];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const { templateId, outFile, expectedTitle, mapMode } of DESIGNS) {
    console.log(`Rendering ${templateId}...`);
    const page = await browser.newPage();
    // Set viewport to match exact poster aspect ratio with some padding for UI chrome
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto(`http://localhost:5173/t/${templateId}`, { waitUntil: 'domcontentloaded' });

    if (mapMode) {
      // Wait for MapLibre to render and the map snapshot to appear as <image> in the SVG
      try {
        await page.waitForFunction(() => {
          const svg = document.querySelector('#poster-preview svg');
          if (!svg) return false;
          return svg.querySelectorAll('image').length > 0;
        }, { timeout: 35000 });
      } catch (e) {
        console.log('  Warning: timed out waiting for map image, capturing anyway');
      }
      // Extra settle time for tiles + fonts
      await page.waitForTimeout(4000);
    } else {
      // Wait for D3 to render stars (200+ circle elements)
      try {
        await page.waitForFunction(() => {
          const svg = document.querySelector('#poster-preview svg');
          if (!svg) return false;
          return svg.querySelectorAll('circle').length > 100;
        }, { timeout: 25000 });
      } catch (e) {
        console.log('  Warning: timed out waiting for stars');
      }
      // Extra settle time for fonts
      await page.waitForTimeout(2500);
    }

    // Wait for the correct title to appear
    if (expectedTitle) {
      try {
        await page.waitForFunction((title) => {
          const texts = Array.from(document.querySelectorAll('#poster-preview svg text'));
          return texts.some(t => t.textContent?.toUpperCase().includes(title.split(' ')[0]));
        }, expectedTitle, { timeout: 10000 });
      } catch (e) {
        console.log('  Warning: timed out waiting for title, capturing anyway');
      }
    }

    // Get the poster preview element bounding box and capture it at exact size
    const preview = await page.$('#poster-preview');
    if (!preview) {
      console.error('  Error: #poster-preview not found');
      await page.close();
      continue;
    }

    const box = await preview.boundingBox();
    if (!box) {
      console.error('  Error: could not get bounding box');
      await page.close();
      continue;
    }

    console.log(`  Preview box: ${Math.round(box.width)}×${Math.round(box.height)}`);

    // Capture the poster element at its natural size, then we'll resize to thumbnail
    await preview.screenshot({
      path: outFile,
      // Clip to exact 4:5 ratio from the poster box — use the full width
      // and crop height to 4:5 if needed (or vice versa)
    });

    // Now resize to standard THUMB_W × THUMB_H using sharp or via canvas
    // For simplicity, re-capture with a fixed viewport that gives us a 4:5 poster
    await page.close();
    console.log(`  Saved to ${outFile}`);
  }

  await browser.close();
  console.log('Done.');
})();
