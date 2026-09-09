/**
 * sync-listing-state.cjs
 *
 * Single source of truth for listing/design/template DB state.
 * Run locally: node scripts/sync-listing-state.cjs
 * Run on prod:  ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && node ../scripts/sync-listing-state.cjs --db data/db.sqlite"
 *
 * What it enforces:
 *  1. listing_templates — which template IDs belong to which listing
 *  2. templates.thumbnail_path — which PNG file to show in design cards
 *  3. templates.settings_json.printSize — must match fulfillment_size (no corruption)
 *  4. templates.settings_json.titleAllCaps — per-design setting
 *
 * To add a new design or listing, update LISTINGS below and re-run the script.
 */

const path = require('path');
const args = process.argv.slice(2);
const dbArg = args.find(a => a.startsWith('--db='))?.slice(5) || args[args.indexOf('--db') + 1];
const DB_PATH = dbArg
  ? path.resolve(dbArg)
  : path.resolve(__dirname, '../server/data/db.sqlite');

// Try server/node_modules first (prod layout), fall back to root node_modules (dev layout)
let Database;
try {
  Database = require(path.resolve(__dirname, '../server/node_modules/better-sqlite3'));
} catch {
  Database = require('better-sqlite3');
}
const db = new Database(DB_PATH);
console.log('DB:', DB_PATH);

// ═══════════════════════════════════════════════════════════
// DESIGN GROUP DEFINITIONS
// Each entry = one design variant shown as a card on the listing page.
// thumbnail: path served from /var/www/poster-studio/ (nginx static)
// titleAllCaps: whether the title renders in all-caps
// sizes: all fulfillment sizes this design exists in
// ═══════════════════════════════════════════════════════════
const DESIGNS = [
  {
    groupPrefix: 'sm001-design001',
    thumbnail: '/designs/SM001/Design001/8x10.png', // always use 8x10 for consistent 4:5 ratio
    titleAllCaps: false,
    // thumbnail files per size (for per-size thumbnail_path in DB)
    thumbnailPerSize: {
      '5x7':   '/designs/SM001/Design001/5x7.png',
      '8x10':  '/designs/SM001/Design001/8x10.png',
      '11x14': '/designs/SM001/Design001/11x14.png',
      '12x16': '/designs/SM001/Design001/12x16.png',
      '16x20': '/designs/SM001/Design001/16x20.png',
      '18x24': '/designs/SM001/Design001/18x24.png',
      '24x36': '/designs/SM001/Design001/24x36.png',
      'A1':    '/designs/SM001/Design001/A1.png',
      'A2':    '/designs/SM001/Design001/A2.png',
      'A3':    '/designs/SM001/Design001/A3.png',
      'A4':    '/designs/SM001/Design001/A4.png',
      'A5':    '/designs/SM001/Design001/A5.png',
    },
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'sm001-design002',
    thumbnail: '/designs/SM001/Design002/8x10.png',
    titleAllCaps: true,
    thumbnailPerSize: null, // use single thumbnail for all sizes (only 8x10 rendered so far)
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'sm001-design003',
    thumbnail: '/designs/SM001/Design003/8x10.png',
    titleAllCaps: true,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'sm001-design004',
    thumbnail: '/designs/SM001/Design004/8x10.png',
    titleAllCaps: false,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'sm001-design005',
    thumbnail: '/designs/SM001/Design005/8x10.png',
    titleAllCaps: false,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'sm001-design006',
    thumbnail: '/designs/SM001/Design006/8x10.png',
    titleAllCaps: false,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  // ── Colored map listings ───────────────────────────────────
  {
    groupPrefix: 'cmhs001-design001',
    thumbnail: '/designs/CMHS001/Design001/8x10.png',
    titleAllCaps: false,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'cmhh001-design001',
    thumbnail: '/designs/CMHH001/Design001/8x10.png',
    titleAllCaps: false,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  // ── Monochrome street map listing ─────────────────────────
  {
    groupPrefix: 'smbw001-design001',
    thumbnail: '/designs/SMBW001/Design001/8x10.png',
    titleAllCaps: false,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  // ── Forest Night Sky Star Map (SM002) ─────────────────────
  {
    groupPrefix: 'sm002-design001',
    thumbnail: '/designs/SM002/Design001/8x10.png',
    titleAllCaps: true,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
  {
    groupPrefix: 'sm002-design002',
    thumbnail: '/designs/SM002/Design002/8x10.png',
    titleAllCaps: true,
    thumbnailPerSize: null,
    sizes: ['5x7','8x10','11x14','12x16','16x20','18x24','24x36','A1','A2','A3','A4','A5'],
  },
];

// ═══════════════════════════════════════════════════════════
// LISTING DEFINITIONS
// listing_id is resolved at runtime by slug so the script works on any DB
// (local IDs differ from production IDs since autoincrement diverges).
// ═══════════════════════════════════════════════════════════
const LISTINGS_CONFIG = [
  {
    slug: 'star-map-night-we-met',
    designs: ['sm001-design001', 'sm001-design002', 'sm001-design003', 'sm001-design004', 'sm001-design005', 'sm001-design006'],
  },
  {
    slug: 'colored-map-home-street',
    designs: ['cmhs001-design001'],
  },
  {
    slug: 'colored-map-heart',
    designs: ['cmhh001-design001'],
  },
  {
    slug: 'street-map-monochrome',
    designs: ['smbw001-design001'],
  },
  {
    slug: 'star-map-forest-night',
    designs: ['sm002-design001', 'sm002-design002'],
  },
  // "(Digital Download)" listings — currently the ones actually LIVE on Etsy (see
  // docs/HANDOVER note 2026-08-11). Reuse the same design groups as their richer,
  // currently-unpublished counterparts above; this is what keeps their listing_templates
  // membership from silently drifting back to empty/incomplete.
  {
    slug: 'star-map-digital',
    designs: ['sm001-design001', 'sm001-design002', 'sm001-design003', 'sm001-design004', 'sm001-design005', 'sm001-design006'],
  },
  {
    slug: 'home-map-digital',
    designs: ['cmhs001-design001'],
  },
  {
    slug: 'heart-map-digital',
    designs: ['cmhh001-design001'],
  },
  {
    slug: 'street-map-digital',
    designs: ['smbw001-design001'],
  },
  {
    slug: 'star-map-forest-digital',
    designs: ['sm002-design001', 'sm002-design002'],
  },
];

// Resolve IDs from DB so hardcoded values can't diverge between environments
const LISTINGS = LISTINGS_CONFIG.map(cfg => {
  const row = db.prepare('SELECT id FROM listings WHERE slug = ?').get(cfg.slug);
  if (!row) { console.log(`  SKIP: listing not found in DB: ${cfg.slug}`); return null; }
  return { ...cfg, listing_id: row.id };
}).filter(Boolean);

// ═══════════════════════════════════════════════════════════
// SIZE → template suffix mapping
// ═══════════════════════════════════════════════════════════
const SIZE_SUFFIX = {
  '5x7': '5x7', '8x10': '8x10', '11x14': '11x14', '12x16': '12x16',
  '16x20': '16x20', '18x24': '18x24', '24x36': '24x36',
  'A1': 'a1', 'A2': 'a2', 'A3': 'a3', 'A4': 'a4', 'A5': 'a5',
};

let changed = 0;

for (const design of DESIGNS) {
  for (const size of design.sizes) {
    const suffix = SIZE_SUFFIX[size] || size.toLowerCase();
    const templateId = `${design.groupPrefix}-${suffix}`;
    const template = db.prepare('SELECT id, settings_json, thumbnail_path FROM templates WHERE id = ?').get(templateId);
    if (!template) {
      console.log(`  MISSING template: ${templateId}`);
      continue;
    }

    const settings = JSON.parse(template.settings_json || '{}');
    let settingsChanged = false;

    // Enforce printSize matches fulfillment_size (the size is stored in fulfillment_size column)
    const row = db.prepare('SELECT fulfillment_size FROM templates WHERE id = ?').get(templateId);
    const expectedPrintSize = row?.fulfillment_size || size;
    if (settings.printSize !== expectedPrintSize) {
      console.log(`  Fix printSize ${templateId}: ${settings.printSize} → ${expectedPrintSize}`);
      settings.printSize = expectedPrintSize;
      settingsChanged = true;
    }

    // Enforce titleAllCaps
    if (!!settings.titleAllCaps !== design.titleAllCaps) {
      console.log(`  Fix titleAllCaps ${templateId}: ${settings.titleAllCaps} → ${design.titleAllCaps}`);
      settings.titleAllCaps = design.titleAllCaps;
      settingsChanged = true;
    }

    if (settingsChanged) {
      db.prepare('UPDATE templates SET settings_json = ? WHERE id = ?').run(JSON.stringify(settings), templateId);
      changed++;
    }

    // Enforce thumbnail_path
    const expectedThumb = design.thumbnailPerSize?.[size] ?? design.thumbnail;
    if (template.thumbnail_path !== expectedThumb) {
      console.log(`  Fix thumbnail ${templateId}: ${template.thumbnail_path} → ${expectedThumb}`);
      db.prepare('UPDATE templates SET thumbnail_path = ? WHERE id = ?').run(expectedThumb, templateId);
      changed++;
    }
  }
}

// Enforce listing_templates membership
const insStmt = db.prepare('INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, ?)');
let position = 0;
for (const listing of LISTINGS) {
  // Reset position counter per listing
  position = 0;
  for (const groupPrefix of listing.designs) {
    const design = DESIGNS.find(d => d.groupPrefix === groupPrefix);
    if (!design) { console.log('Unknown design group:', groupPrefix); continue; }
    for (const size of design.sizes) {
      const suffix = SIZE_SUFFIX[size] || size.toLowerCase();
      const templateId = `${groupPrefix}-${suffix}`;
      const r = insStmt.run(listing.listing_id, templateId, position++);
      if (r.changes) {
        console.log(`  Added listing_template: listing=${listing.listing_id} template=${templateId}`);
        changed++;
      }
    }
  }
}

if (changed === 0) {
  console.log('✓ All state is consistent — no changes needed.');
} else {
  console.log(`\n✓ Applied ${changed} fix(es).`);
}

// Final verification
console.log('\n=== Current State ===');
for (const listing of LISTINGS) {
  const rows = db.prepare(`
    SELECT t.id, t.thumbnail_path, t.fulfillment_size,
           json_extract(t.settings_json, '$.printSize') as printSize,
           json_extract(t.settings_json, '$.titleAllCaps') as titleAllCaps
    FROM templates t
    JOIN listing_templates lt ON lt.template_id = t.id
    WHERE lt.listing_id = ?
    ORDER BY lt.position
  `).all(listing.listing_id);

  let issues = 0;
  for (const r of rows) {
    const printSizeOk = r.printSize === r.fulfillment_size;
    const thumbOk = !!r.thumbnail_path;
    if (!printSizeOk || !thumbOk) {
      console.log(`  ✗ ${r.id}: printSize=${r.printSize}/${r.fulfillment_size} thumb=${r.thumbnail_path}`);
      issues++;
    }
  }
  if (issues === 0) {
    console.log(`  ✓ Listing ${listing.listing_id} (${listing.slug}): ${rows.length} templates, all consistent`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ORPHAN SCAN
//
// Everything above only walks the hardcoded DESIGNS / LISTINGS_CONFIG arrays, so a design
// this file has never heard of is invisible to it — the script would print "all state is
// consistent" while a brand-new design group sat detached from every listing. That is
// exactly how five live listings ended up with 1 of 72 templates linked for six weeks, and
// the listing factory reproduces the same shape automatically unless something checks for
// it. This pass queries the whole DB instead of the config, so new work fails loudly.
console.log('\n=== Orphan Scan (whole DB, not just configured listings) ===');
let orphanIssues = 0;

const ungroupedDesigns = db.prepare(`
  SELECT id, name FROM design_groups WHERE listing_id IS NULL
`).all();
for (const g of ungroupedDesigns) {
  console.log(`  ✗ design_group "${g.id}" (${g.name}) has listing_id = NULL — attached to no listing`);
  orphanIssues++;
}

// Only templates that BELONG to a design group are expected to appear on a listing. The
// original standalone presets (classic-dark, modern-white, …, created 2026-03 before the
// listing system existed) legitimately have design_group_id = NULL and no listing_templates
// row — flagging those would make this scan noisy, and a noisy gate is one people learn to
// ignore.
const unlinkedTemplates = db.prepare(`
  SELECT t.id, t.design_group_id
  FROM templates t
  LEFT JOIN listing_templates lt ON lt.template_id = t.id
  WHERE lt.template_id IS NULL AND t.is_active = 1 AND t.design_group_id IS NOT NULL
`).all();
for (const t of unlinkedTemplates) {
  console.log(`  ✗ template "${t.id}" (group ${t.design_group_id}) has no listing_templates row — invisible on every listing page`);
  orphanIssues++;
}

const danglingGroup = db.prepare(`
  SELECT t.id, t.design_group_id
  FROM templates t
  WHERE t.design_group_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM design_groups g WHERE g.id = t.design_group_id)
`).all();
for (const t of danglingGroup) {
  console.log(`  ✗ template "${t.id}" points at missing design_group "${t.design_group_id}"`);
  orphanIssues++;
}

if (orphanIssues === 0) {
  console.log('  ✓ No orphaned design groups or templates.');
} else {
  console.log(`\n✗ ${orphanIssues} orphan issue(s) found — these will NOT show up for customers.`);
  console.log('  Fix by attaching the design group to a listing and inserting listing_templates rows.');
  process.exitCode = 1;
}
