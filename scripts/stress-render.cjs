#!/usr/bin/env node
/*
 * Stress-test the poster render page with saved design tokens.
 *
 * This intentionally targets /render?token=... because that is the browser-side
 * workload used by server/local Puppeteer rendering. It does not enqueue paid
 * orders or mutate order state.
 *
 * Examples:
 *   node scripts/stress-render.cjs --base-url http://localhost:5173 --api-url http://localhost:3001 --size 24x36 --concurrency 2 --runs 4 --vector
 *   node scripts/stress-render.cjs --base-url https://themappedmoment.com --api-url https://themappedmoment.com --size A1 --concurrency 1 --runs 2 --vector
 */

const { chromium } = require('playwright');

const SIZE_PRESETS = {
  '5x7': { label: '5x7"', width: 5, height: 7, ratio: '5/7' },
  '8x10': { label: '8x10"', width: 8, height: 10, ratio: '4/5' },
  '11x14': { label: '11x14"', width: 11, height: 14, ratio: '11/14' },
  '12x16': { label: '12x16"', width: 12, height: 16, ratio: '3/4' },
  '16x20': { label: '16x20"', width: 16, height: 20, ratio: '4/5' },
  '18x24': { label: '18x24"', width: 18, height: 24, ratio: '3/4' },
  '24x36': { label: '24x36"', width: 24, height: 36, ratio: '2/3' },
  A5: { label: 'A5', width: 5.83, height: 8.27, ratio: '0.7071/1' },
  A4: { label: 'A4', width: 8.27, height: 11.69, ratio: '0.7071/1' },
  A3: { label: 'A3', width: 11.69, height: 16.54, ratio: '0.7071/1' },
  A2: { label: 'A2', width: 16.54, height: 23.39, ratio: '0.7071/1' },
  A1: { label: 'A1', width: 23.39, height: 33.11, ratio: '0.7071/1' },
};

function parseArgs(argv) {
  const args = {
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3001',
    listingPrefix: 'smbw001-design001',
    size: '24x36',
    runs: 2,
    concurrency: 1,
    vector: false,
    timeoutMs: 180000,
    headless: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--base-url') { args.baseUrl = next; i++; }
    else if (arg === '--api-url') { args.apiUrl = next; i++; }
    else if (arg === '--listing-prefix') { args.listingPrefix = next; i++; }
    else if (arg === '--size') { args.size = next; i++; }
    else if (arg === '--runs') { args.runs = Number(next); i++; }
    else if (arg === '--concurrency') { args.concurrency = Number(next); i++; }
    else if (arg === '--timeout-ms') { args.timeoutMs = Number(next); i++; }
    else if (arg === '--vector') args.vector = true;
    else if (arg === '--headed') args.headless = false;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/stress-render.cjs [options]\n\nOptions:\n  --base-url URL          Frontend URL, default http://localhost:5173\n  --api-url URL           API URL, default http://localhost:3001\n  --listing-prefix ID     Template prefix, default smbw001-design001\n  --size SIZE             24x36, A1, 8x10, etc. default 24x36\n  --runs N                Total render jobs, default 2\n  --concurrency N         Concurrent browser pages, default 1\n  --vector                Enable posterStudio.vectorMapRenderer localStorage flag\n  --timeout-ms N          Per-render timeout, default 180000\n  --headed                Run visible browser\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!SIZE_PRESETS[args.size]) throw new Error(`Unknown size: ${args.size}`);
  if (!Number.isInteger(args.runs) || args.runs < 1) throw new Error('--runs must be >= 1');
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1) throw new Error('--concurrency must be >= 1');
  return args;
}

function templateIdFor(prefix, size) {
  return `${prefix}-${size.toLowerCase()}`;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw text */ }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  return json;
}

async function createToken(args, index) {
  const templateId = templateIdFor(args.listingPrefix, args.size);
  const template = await fetchJson(`${args.apiUrl}/api/templates/${encodeURIComponent(templateId)}`);
  const state = JSON.parse(template.settings_json);
  const size = SIZE_PRESETS[args.size];

  Object.assign(state, {
    printSize: size,
    posterType: 'streetmap',
    mapColorPreset: 'design2',
    mapCenterLat: Number.isFinite(state.mapCenterLat) ? state.mapCenterLat : 48.85734384230377,
    mapCenterLng: Number.isFinite(state.mapCenterLng) ? state.mapCenterLng : 2.340140773888491,
    mapZoom: Number.isFinite(state.mapZoom) ? state.mapZoom : 11.3,
    mapBearing: Number.isFinite(state.mapBearing) ? state.mapBearing : 0,
    title: state.title || `Stress Render ${index + 1}`,
  });

  const saved = await fetchJson(`${args.apiUrl}/api/save-design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });

  if (!saved?.token) throw new Error(`save-design returned no token: ${JSON.stringify(saved)}`);
  return saved.token;
}

async function renderToken(browser, args, token, index) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 2400 },
    deviceScaleFactor: 1,
  });
  const url = `${args.baseUrl}/render?token=${encodeURIComponent(token)}`;
  const started = Date.now();
  const errors = [];

  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    if (args.vector) {
      await page.addInitScript(() => localStorage.setItem('posterStudio.vectorMapRenderer', '1'));
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: args.timeoutMs });
    await page.waitForFunction(
      () => document.body.getAttribute('data-render-ready') === 'true' || document.body.hasAttribute('data-render-error'),
      undefined,
      { timeout: args.timeoutMs },
    );

    const metrics = await page.evaluate(() => {
      const map = document.querySelector('#poster-render #map-layer');
      const paths = Array.from(map?.querySelectorAll('path') || []);
      const error = document.body.getAttribute('data-render-error');
      const pngLength = window.__posterPng?.length || 0;
      return {
        ready: document.body.getAttribute('data-render-ready') === 'true',
        error,
        pngBytesApprox: Math.round(pngLength * 0.75),
        mapImages: map?.querySelectorAll('image').length ?? -1,
        mapPaths: paths.length,
        pathChars: paths.reduce((total, path) => total + (path.getAttribute('d')?.length || 0), 0),
      };
    });

    return {
      index,
      token,
      ok: metrics.ready && !metrics.error,
      ms: Date.now() - started,
      ...metrics,
      errors,
    };
  } catch (error) {
    return {
      index,
      token,
      ok: false,
      ms: Date.now() - started,
      error: error.message,
      errors,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

function summarize(results) {
  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const times = ok.map(r => r.ms).sort((a, b) => a - b);
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  return {
    total: results.length,
    ok: ok.length,
    failed: failed.length,
    minMs: times[0] || 0,
    avgMs: avg,
    maxMs: times[times.length - 1] || 0,
  };
}

(async () => {
  const args = parseArgs(process.argv);
  console.log('[stress-render] config', JSON.stringify(args));

  const tokens = [];
  for (let i = 0; i < args.runs; i++) {
    tokens.push(await createToken(args, i));
  }
  console.log(`[stress-render] created ${tokens.length} design tokens`);

  const browser = await chromium.launch({ headless: args.headless });
  try {
    const results = await runPool(tokens, args.concurrency, (token, index) => renderToken(browser, args, token, index));
    for (const result of results) {
      console.log('[stress-render] result', JSON.stringify(result));
    }
    const summary = summarize(results);
    console.log('[stress-render] summary', JSON.stringify(summary));
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('[stress-render] fatal', error);
  process.exit(1);
});
