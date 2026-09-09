// Scaffold the SM002 "Forest Night Sky" star-map listing: 1 listing + 2 design groups
// (Circle, Heart) × 12 sizes, mirroring SM001's per-size typography but with the forest
// background + dark/light theme. Idempotent (INSERT OR REPLACE / OR IGNORE).
// Run on prod: node scripts/create-sm002-listing.cjs
const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, '..', 'data', 'db.sqlite'));

const SLUG = 'star-map-forest-night';
const NAME = 'Custom Forest Night Sky Star Map Poster';
const BG = '/backgrounds/sm002/bg-teal-2000.webp'; // teal default (WebP renders in SVG; AVIF is preview-only)

// 1. Listing
let L = db.prepare('SELECT id FROM listings WHERE slug=?').get(SLUG);
if (!L) {
  const r = db.prepare("INSERT INTO listings (slug, name, fulfillment_type, is_active) VALUES (?, ?, 'digital', 1)").run(SLUG, NAME);
  L = { id: r.lastInsertRowid };
}
const listingId = L.id;

// SM001 design001 per-size templates as the typographic base
const baseRows = db.prepare("SELECT id, fulfillment_size, settings_json FROM templates WHERE design_group_id='sm001-design001'").all();
if (!baseRows.length) { console.error('No SM001 base templates found'); process.exit(1); }

const GROUPS = [
  { n: 1, shape: 'circle', name: 'Forest Circle' },
  { n: 2, shape: 'heart',  name: 'Forest Heart' },
];

const insTpl = db.prepare('INSERT OR REPLACE INTO templates (id, name, design_group_id, fulfillment_size, settings_json, is_active) VALUES (?, ?, ?, ?, ?, 1)');
const insLT  = db.prepare('INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, ?)');
const insDG  = db.prepare('INSERT OR REPLACE INTO design_groups (id, listing_id, name, base_settings_json) VALUES (?, ?, ?, ?)');

let made = 0;
const updDG = db.prepare('UPDATE design_groups SET base_settings_json=? WHERE id=?');
GROUPS.forEach((g, gi) => {
  const gid = 'sm002-design00' + g.n;
  insDG.run(gid, listingId, g.name, '{}'); // create group FIRST (templates FK to it)
  let base8x10 = '{}';
  for (const row of baseRows) {
    const sz = row.fulfillment_size;
    const suffix = row.id.replace('sm001-design001-', '');
    const s = JSON.parse(row.settings_json);
    // Forest look overrides (keep SM001's per-size fonts/offsets/circleSize):
    s.posterType = 'starmap';
    s.maskShape = g.shape;
    s.backgroundImageUrl = BG;
    s.posterColor = '#0a0e14';
    s.textColor = '#eaf6f6';
    s.starColor = '#ffffff';
    s.showBorder = false;
    s.showFrame = false;
    s.showInnerRing = true;
    s.showOuterRing = false;
    // Nudge the chart up into the sky so text sits in the lower sky band, above the trees:
    s.shapeOffsetY = (typeof s.shapeOffsetY === 'number' ? s.shapeOffsetY : 0) - 90;
    if (g.shape === 'heart') s.heartSize = s.heartSize || s.circleSize || 0.78;

    // ---- Reference text layout (matches the wedding star-map reference exactly) ----
    // Title (serif, ALL CAPS, 2 lines) → couple names (script) → date → location.
    s.title = 'THE SKY ON OUR\nWEDDING NIGHT';
    s.titleAllCaps = true;
    // Couple names go in the SUBTITLE slot so they render directly under the title.
    // Script fonts keep their casing (handled in VectorStarMap).
    s.subtitle = 'Laura & Steve';
    s.subtitleFont = 'Great Vibes';
    s.subtitleKerning = 0;
    s.subtitleFontSize = Math.round((s.titleFontSize || 55) * 0.7);
    // Names element is now folded into the subtitle — turn the separate one off.
    s.showNames = false;
    s.names = '';
    // No dedication line in the reference (SM001 base ships one — clear it).
    s.dedication = '';
    s.showDedication = false;
    // No divider line in the reference.
    s.showDivider = false;
    // Date above location, each on its own line (no coords).
    s.detailsDateFirst = true;
    s.showLocation = true;
    s.showDate = true;
    s.showCoords = false;
    s.locationAllCaps = true;
    s.location = 'New York, NY';
    s.date = '2022-07-28T12:00:00.000Z';
    // Details in the same serif as the title, slightly smaller for the delicate look.
    s.detailsFont = s.titleFont || 'Title001';
    s.detailsFontSize = Math.max(12, Math.round((s.detailsFontSize || 20) * 0.85));
    const tid = gid + '-' + suffix;
    insTpl.run(tid, `SM002 ${g.name} ${sz}`, gid, sz, JSON.stringify(s));
    insLT.run(listingId, tid, gi); // position = group rank (0 circle, 1 heart)
    if (sz === '8x10') base8x10 = JSON.stringify(s);
    made++;
  }
  updDG.run(base8x10, gid);
});

// Clean up any stray standalone test templates with no design group (from the render-loop)
db.prepare("DELETE FROM templates WHERE id IN ('sm002-design001-8x10','sm002-design002-8x10') AND design_group_id IS NULL").run();

const cnt = db.prepare('SELECT COUNT(*) c FROM templates WHERE design_group_id LIKE ?').get('sm002-%').c;
const lt = db.prepare('SELECT COUNT(*) c FROM listing_templates WHERE listing_id=?').get(listingId).c;
console.log(`SM002 scaffolded → listing id=${listingId} slug=${SLUG}; templates=${cnt}; listing_templates=${lt}; (made ${made})`);
