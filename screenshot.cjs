const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(4000);

  // Switch to street map
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('STREET MAP'))?.click();
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/sm_default.png' });

  // Scroll down to see map color section and click "Classic" preset
  await page.evaluate(() => {
    // Click the second preset (Classic - light/cream)
    const presetBoxes = document.querySelectorAll('[title="Classic"]');
    presetBoxes[0]?.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/sm_classic.png' });

  // Click "Forest" preset
  await page.evaluate(() => {
    const presetBoxes = document.querySelectorAll('[title="Rose Gold"]');
    presetBoxes[0]?.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/sm_rosegold.png' });

  await browser.close();
  console.log('done');
})();
