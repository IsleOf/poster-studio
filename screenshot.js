const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/dev/.playwright/chromium-1208/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/poster_18x24.png' });

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '8x10"')?.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/poster_8x10.png' });

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '11x14"')?.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/poster_11x14.png' });

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '24x36"')?.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/poster_24x36.png' });

  await browser.close();
  console.log('done');
})();
