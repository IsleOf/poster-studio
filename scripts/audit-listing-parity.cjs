#!/usr/bin/env node
/**
 * audit-listing-parity.cjs
 *
 * Fast API-level audit for public listing data. It compares local and
 * production listing payloads against the expected design groups and verifies
 * production thumbnail files exist.
 *
 * Usage:
 *   npm run listings:audit
 *   npm run listings:audit -- --prod-only
 *   LOCAL_URL=http://localhost:5173 npm run listings:audit
 *
 * Defaults:
 *   LOCAL_URL=http://localhost:3001
 *   PROD_URL=https://themappedmoment.com
 */

const args = new Set(process.argv.slice(2));
const prodOnly = args.has('--prod-only');
const checkLocalAssets = args.has('--check-local-assets');

const SIZES = ['5x7', '8x10', '11x14', '12x16', '16x20', '18x24', '24x36', 'A1', 'A2', 'A3', 'A4', 'A5'];
const LISTINGS = [
  {
    slug: 'star-map-night-we-met',
    groups: ['sm001-design001', 'sm001-design002', 'sm001-design003', 'sm001-design004', 'sm001-design005', 'sm001-design006'],
  },
  {
    slug: 'colored-map-home-street',
    groups: ['cmhs001-design001'],
  },
  {
    slug: 'colored-map-heart',
    groups: ['cmhh001-design001'],
  },
  {
    slug: 'street-map-monochrome',
    groups: ['smbw001-design001'],
  },
];

const environments = [
  {
    label: 'local',
    apiBase: stripTrailingSlash(process.env.LOCAL_URL || 'http://localhost:3001'),
    assetBase: stripTrailingSlash(process.env.LOCAL_ASSET_URL || 'http://localhost:5173'),
    optional: true,
    checkAssets: checkLocalAssets,
  },
  {
    label: 'production',
    apiBase: stripTrailingSlash(process.env.PROD_URL || 'https://themappedmoment.com'),
    assetBase: stripTrailingSlash(process.env.PROD_ASSET_URL || process.env.PROD_URL || 'https://themappedmoment.com'),
    optional: false,
    checkAssets: true,
  },
].filter(env => !prodOnly || env.label === 'production');

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function parseSettings(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache, no-store' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function assetExists(url) {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: { 'Cache-Control': 'no-cache, no-store' },
    signal: AbortSignal.timeout(10000),
  });
  if (response.ok) return true;

  // Some static stacks do not support HEAD consistently; retry with a tiny GET.
  const fallback = await fetch(url, {
    headers: { Range: 'bytes=0-0', 'Cache-Control': 'no-cache, no-store' },
    signal: AbortSignal.timeout(10000),
  });
  return fallback.ok;
}

function validateListingPayload(expected, payload) {
  const issues = [];
  const templates = Array.isArray(payload?.templates) ? payload.templates : [];
  const expectedCount = expected.groups.length * SIZES.length;
  const actualGroups = uniqueSorted(templates.map(t => t.design_group_id).filter(Boolean));
  const expectedGroups = uniqueSorted(expected.groups);

  if (!payload?.listing?.slug && payload?.slug !== expected.slug) {
    issues.push('payload is missing listing metadata');
  }
  if (templates.length !== expectedCount) {
    issues.push(`expected ${expectedCount} templates, got ${templates.length}`);
  }
  if (!arraysEqual(actualGroups, expectedGroups)) {
    issues.push(`expected groups ${expectedGroups.join(', ')}, got ${actualGroups.join(', ') || '(none)'}`);
  }

  for (const template of templates) {
    const settings = parseSettings(template.settings_json ?? template.settings);
    if (!template.id) {
      issues.push('template is missing id');
    }
    if (!template.design_group_id) {
      issues.push(`${template.id || '(unknown)'} is missing design_group_id`);
    }
    if (!template.thumbnail_path || !String(template.thumbnail_path).startsWith('/designs/')) {
      issues.push(`${template.id || '(unknown)'} has invalid thumbnail_path: ${template.thumbnail_path || '(empty)'}`);
    }
    if (settings.printSize && template.fulfillment_size && settings.printSize !== template.fulfillment_size) {
      issues.push(`${template.id} printSize mismatch: settings=${settings.printSize} fulfillment=${template.fulfillment_size}`);
    }
  }

  return {
    issues,
    templates,
    groups: actualGroups,
    thumbnails: uniqueSorted(templates.map(t => t.thumbnail_path).filter(Boolean)),
  };
}

async function auditEnvironment(env) {
  let envHasErrors = false;
  console.log(`\n=== ${env.label.toUpperCase()} (${env.apiBase}) ===`);

  for (const expected of LISTINGS) {
    const url = `${env.apiBase}/api/listings/${expected.slug}`;
    try {
      const payload = await fetchJson(url);
      const result = validateListingPayload(expected, payload);
      if (result.issues.length > 0) {
        envHasErrors = true;
        console.log(`FAIL ${expected.slug}`);
        for (const issue of result.issues) console.log(`  - ${issue}`);
      } else {
        console.log(`OK   ${expected.slug}: ${result.templates.length} templates, groups=${result.groups.join(', ')}`);
      }

      if (env.checkAssets) {
        for (const thumbnailPath of result.thumbnails) {
          const assetUrl = `${env.assetBase}${thumbnailPath}`;
          const ok = await assetExists(assetUrl).catch(() => false);
          if (!ok) {
            envHasErrors = true;
            console.log(`  - missing thumbnail asset: ${assetUrl}`);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const severity = env.optional ? 'WARN' : 'FAIL';
      console.log(`${severity} ${expected.slug}: ${message}`);
      if (!env.optional) envHasErrors = true;
    }
  }

  return envHasErrors;
}

(async () => {
  let hasErrors = false;
  for (const env of environments) {
    const envHasErrors = await auditEnvironment(env);
    hasErrors = hasErrors || envHasErrors;
  }

  if (hasErrors) {
    console.log('\nListing audit found issues.');
    process.exit(1);
  }

  console.log('\nListing audit passed.');
})();
