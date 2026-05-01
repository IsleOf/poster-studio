#!/usr/bin/env node
/**
 * verify-listing.cjs
 *
 * Browser-level visual smoke for public listing pages. It opens local and
 * production listing URLs, verifies design thumbnails render, and saves
 * screenshots under /tmp.
 *
 * Usage:
 *   npm run listings:verify
 *   npm run listings:verify -- --prod-only
 *   npm run listings:verify -- star-map-night-we-met
 *
 * Defaults:
 *   LOCAL_URL=http://localhost:5173
 *   PROD_URL=https://themappedmoment.com
 */

const { chromium } = require(require('path').resolve(__dirname, '../node_modules/playwright'));

const ALL_SLUGS = [
  'star-map-night-we-met',
  'colored-map-home-street',
  'colored-map-heart',
  'street-map-monochrome',
];

const args = process.argv.slice(2);
const prodOnly = args.includes('--prod-only');
const requestedSlugs = args.filter(arg => !arg.startsWith('--'));
const slugs = requestedSlugs.length > 0 ? requestedSlugs : ALL_SLUGS;

const environments = [
  { label: 'local', baseUrl: stripTrailingSlash(process.env.LOCAL_URL || 'http://localhost:5173'), optional: true },
  { label: 'prod', baseUrl: stripTrailingSlash(process.env.PROD_URL || 'https://themappedmoment.com'), optional: false },
].filter(env => !prodOnly || env.label === 'prod');

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function safeFilePart(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

async function inspectListing(page) {
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const thumbnails = imgs
      .filter(img => img.src.includes('/designs/'))
      .map(img => ({
        src: img.src.replace(/^https?:\/\/[^/]+/, ''),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
      }));

    const preview = document.querySelector('#poster-preview');
    return {
      title: document.title,
      hasPreview: !!preview,
      previewOpacity: preview ? getComputedStyle(preview).opacity : null,
      loadingVisible: Array.from(document.body.querySelectorAll('*')).some(el => {
        return (el.textContent || '').trim() === 'Loading design...' && getComputedStyle(el).display !== 'none';
      }),
      thumbnails,
    };
  });
}

async function loadDesignThumbnails(page) {
  const thumbs = await page.locator('img[src*="/designs/"]').all();
  for (const thumb of thumbs) {
    await thumb.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(150);
  }

  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.src.includes('/designs/'));
    return imgs.length > 0 && imgs.every(img => {
      if (!img.complete || img.naturalWidth <= 0) return false;
      return true;
    });
  }, null, { timeout: 10000 }).catch(() => {});
}

async function waitForPreviewReady(page) {
  await page.waitForFunction(() => {
    const preview = document.querySelector('#poster-preview');
    const loadingVisible = Array.from(document.body.querySelectorAll('*')).some(el => {
      return (el.textContent || '').trim() === 'Loading design...' && getComputedStyle(el).display !== 'none';
    });

    return !!preview && getComputedStyle(preview).opacity === '1' && !loadingVisible;
  }, null, { timeout: 20000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let hasErrors = false;

  for (const env of environments) {
    for (const slug of slugs) {
      const url = `${env.baseUrl}/l/${slug}`;
      console.log(`\n=== ${env.label.toUpperCase()}: ${url} ===`);

      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache, no-store' });

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForSelector('#poster-preview', { timeout: 15000 });
        await waitForPreviewReady(page);
        await loadDesignThumbnails(page);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const severity = env.optional ? 'WARN' : 'FAIL';
        console.log(`  ${severity}: failed to load page: ${message}`);
        if (!env.optional) hasErrors = true;
        await page.close();
        continue;
      }

      const state = await inspectListing(page);
      const issues = [];
      if (!state.hasPreview) issues.push('poster preview missing');
      if (state.previewOpacity !== '1') issues.push(`poster preview opacity is ${state.previewOpacity}`);
      if (state.loadingVisible) issues.push('Loading design overlay is still visible');
      if (state.thumbnails.length === 0) issues.push('no /designs/ thumbnails found');

      for (const thumbnail of state.thumbnails) {
        const ratio = thumbnail.naturalHeight > 0 ? thumbnail.naturalWidth / thumbnail.naturalHeight : 0;
        const ratioOk = Math.abs(ratio - 0.8) < 0.05;
        if (!thumbnail.complete || thumbnail.naturalWidth <= 0 || !ratioOk) {
          issues.push(`${thumbnail.src} broken or wrong ratio (${thumbnail.naturalWidth}x${thumbnail.naturalHeight})`);
        }
      }

      const screenshotPath = `/tmp/verify-${env.label}-${safeFilePart(slug)}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      if (issues.length > 0) {
        hasErrors = true;
        console.log(`  FAIL: ${issues.length} issue(s)`);
        for (const issue of issues) console.log(`  - ${issue}`);
      } else {
        console.log(`  OK: ${state.thumbnails.length} thumbnails, preview ready`);
      }
      console.log(`  Screenshot: ${screenshotPath}`);

      await page.close();
    }
  }

  await browser.close();

  if (hasErrors) {
    console.log('\nVisual listing verification found issues.');
    process.exit(1);
  }

  console.log('\nVisual listing verification passed.');
})();
