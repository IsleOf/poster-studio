#!/usr/bin/env node
/**
 * Seed three new listings, each with a single design that mirrors the legacy
 * hardcoded sidebar templates (Home Street, Heart Map, Monochrome Rectangle).
 *
 *   1. /l/colored-map-home-street    → house-shaped colored street map
 *   2. /l/colored-map-heart          → heart-shaped colored map
 *   3. /l/street-map-monochrome      → monochrome rectangular street map
 *
 * Idempotent — running twice does not duplicate rows.
 *
 * Usage:
 *   node scripts/seed-new-listings.cjs                    # local DB
 *   node scripts/seed-new-listings.cjs --db /path/to/prod.sqlite
 */

const path = require('path');
const Database = require('better-sqlite3');

// ── Resolve DB path ─────────────────────────────────────────────────────────

const dbArgIdx = process.argv.indexOf('--db');
const DB_PATH = dbArgIdx >= 0
    ? process.argv[dbArgIdx + 1]
    : path.join(__dirname, '..', 'server', 'data', 'db.sqlite');

console.log(`Using DB: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── Size matrix (keep in sync with sm001-design001) ─────────────────────────

const SIZES = [
    { code: '5x7',   provider: 'shortrunposters', priceCents: 2999 },
    { code: '8x10',  provider: 'shortrunposters', priceCents: 3499 },
    { code: '11x14', provider: 'shortrunposters', priceCents: 4499 },
    { code: '12x16', provider: 'shortrunposters', priceCents: 4999 },
    { code: '16x20', provider: 'shortrunposters', priceCents: 5999 },
    { code: '18x24', provider: 'shortrunposters', priceCents: 6999 },
    { code: '24x36', provider: 'scalablepress',   priceCents: 8999 },
    { code: 'A5',    provider: 'prodigi',         priceCents: 3999 },
    { code: 'A4',    provider: 'prodigi',         priceCents: 4999 },
    { code: 'A3',    provider: 'prodigi',         priceCents: 6499 },
    { code: 'A2',    provider: 'prodigi',         priceCents: 8999 },
    { code: 'A1',    provider: 'prodigi',         priceCents: 12999 },
];

// ── Shared base settings (override per listing below) ───────────────────────

const SHARED_DEFAULTS = {
    title: '',
    subtitle: '',
    starScale: 1.1,
    lineWeight: 1.5,
    gridWidth: 1,
    glowIntensity: 3,
    gridOpacity: 0.5,
    showBorder: true,
    showConstellations: false,
    showMilkyWay: false,
    showGrid: false,
    designStyle: 'standard',
    isLightMode: false,
    showFrame: true,
    frameInset: 30,
    frameWidth: 3,
    shapeOutlineWidth: 2,
    titleFontSize: 56,
    subtitleFontSize: 18,
    detailsFontSize: 14,
    dedicationFontSize: 14,
    namesFontSize: 32,
    titleOffsetX: 0,
    titleOffsetY: 0,
    subtitleOffsetY: 0,
    detailsOffsetY: 0,
    dedicationOffsetY: 0,
    namesOffsetY: 0,
    dividerOffsetY: 0,
    showDivider: true,
    dividerLength: 80,
    dividerThickness: 0.8,
    showVertSep: false,
    vertSepHeight: 16,
    vertSepThickness: 0.8,
    showNames: false,
    titleAllCaps: false,
    showInnerRing: false,
    showOuterRing: false,
    showHeartDecor: false,
    circleSize: 1,
    heartSize: 1,
    houseSize: 1,
    shapeOffsetY: -60,
    shapeOffsetX: 0,
    snapEnabled: true,
    titleKerning: 0.05,
    subtitleKerning: 0.2,
    detailsKerning: 0.1,
    dedicationKerning: 0.05,
    namesKerning: 0.15,
    showLocation: true,
    showDate: true,
    showCoords: true,
    showLocationPin: true,
    locationPinSize: 70,
    locationPinOffsetX: 0,
    locationPinOffsetY: 0,
    finelineWidth: 1.0,
    customText: { title: '', subtitle: '', dedication: '', names: '' },
};

// ── Listings to create ──────────────────────────────────────────────────────

const LISTINGS = [
    {
        id: null, // auto-assigned
        slug: 'colored-map-home-street',
        name: 'Custom Home Street Map Poster',
        etsy_title: 'Custom House Street Map Poster — Personalized Address Print',
        description: 'A house-shaped colored street map of any address, personalized with your text.',
        poster_type: 'coloredmap',
        fulfillment_type: 'digital',
        designGroupId: 'cmhs001-design001',
        designName: 'Design001',
        defaults: {
            ...SHARED_DEFAULTS,
            posterType: 'coloredmap',
            maskShape: 'house',
            borderStyle: 'simple',
            posterColor: '#ffffff',
            textColor: '#1a1a1a',
            mapInteriorColor: '#ffffff',
            mapStyleUrl: 'https://tiles.openfreemap.org/styles/bright',
            mapColorPreset: 'realistic',
            mapBgColor: '#f8f4f0',
            mapStreetColor: '#fc8',
            titleFont: 'Cinzel',
            subtitleFont: 'DM Sans',
            detailsFont: 'DM Sans',
            dedicationFont: 'DM Sans',
            namesFont: 'Cinzel',
            titleFontSize: 52,
            shapeOffsetY: -50,
            houseSize: 1,
            frameInset: 16,
            frameWidth: 3,
            shapeOutlineWidth: 3,
            showDivider: true,
        },
    },
    {
        id: null,
        slug: 'colored-map-heart',
        name: 'Custom Heart Street Map Poster',
        etsy_title: 'Custom Heart Map Print — Where We Met / Lived / Married',
        description: 'A heart-shaped colored map of a meaningful place, personalized.',
        poster_type: 'coloredmap',
        fulfillment_type: 'digital',
        designGroupId: 'cmhh001-design001',
        designName: 'Design001',
        defaults: {
            ...SHARED_DEFAULTS,
            posterType: 'coloredmap',
            maskShape: 'heart',
            borderStyle: 'simple',
            posterColor: '#ffffff',
            textColor: '#7a1f2b',
            mapInteriorColor: '#ffffff',
            mapStyleUrl: 'https://tiles.openfreemap.org/styles/bright',
            mapColorPreset: 'realistic',
            mapBgColor: '#fff5f5',
            mapStreetColor: '#c9596a',
            titleFont: 'Playfair Display',
            subtitleFont: 'Lato',
            detailsFont: 'Lato',
            dedicationFont: 'Playfair Display',
            namesFont: 'Playfair Display',
            titleFontSize: 56,
            namesFontSize: 36,
            shapeOffsetY: -50,
            heartSize: 1.05,
            frameInset: 24,
            frameWidth: 3,
            shapeOutlineWidth: 2,
            showDivider: true,
            showHeartDecor: true,
        },
    },
    {
        id: null,
        slug: 'street-map-monochrome',
        name: 'Custom Monochrome Street Map Poster',
        etsy_title: 'Minimalist Black & White Street Map Print — Custom City',
        description: 'A black-on-white rectangular street map of any city, with custom typography.',
        poster_type: 'streetmap',
        fulfillment_type: 'digital',
        designGroupId: 'smbw001-design001',
        designName: 'Design001',
        defaults: {
            ...SHARED_DEFAULTS,
            posterType: 'streetmap',
            maskShape: 'rect',
            borderStyle: 'simple',
            isLightMode: true,
            showBorder: false,
            showFrame: false,
            shapeOutlineWidth: 0,
            posterColor: '#ffffff',
            textColor: '#111111',
            mapInteriorColor: '#ffffff',
            mapStyleUrl: null,
            mapColorPreset: 'design2',
            mapBgColor: '#ffffff',
            mapStreetColor: '#111111',
            titleFont: 'Mapped2',
            subtitleFont: 'Mapped2',
            detailsFont: 'Mapped2',
            dedicationFont: 'Mapped2',
            namesFont: 'Mapped2',
            titleFontSize: 72,
            subtitleFontSize: 22,
            detailsFontSize: 18,
            dedicationFontSize: 16,
            showDivider: false,
            showLocationPin: true,
            locationPinSize: 32,
            customText: {
                title: 'YOUR CITY',
                subtitle: 'THE PLACE THAT MATTERS',
                dedication: 'AN ADVENTURE TO REMEMBER...',
                names: '',
            },
        },
    },
];

// ── Insert helpers ──────────────────────────────────────────────────────────

const now = Math.floor(Date.now() / 1000);

const upsertListing = (l) => {
    const existing = db.prepare('SELECT id FROM listings WHERE slug = ?').get(l.slug);
    if (existing) {
        console.log(`  · Listing exists: ${l.slug} (id ${existing.id})`);
        return existing.id;
    }
    const result = db.prepare(`
        INSERT INTO listings
            (slug, name, description, etsy_title, etsy_description, poster_type, fulfillment_type, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(l.slug, l.name, l.description, l.etsy_title, l.description, l.poster_type, l.fulfillment_type, now, now);
    console.log(`  ✓ Created listing: ${l.slug} (id ${result.lastInsertRowid})`);
    return result.lastInsertRowid;
};

const upsertDesignGroup = (groupId, listingId, name, defaults) => {
    const existing = db.prepare('SELECT id FROM design_groups WHERE id = ?').get(groupId);
    if (existing) {
        console.log(`  · Design group exists: ${groupId}`);
        return;
    }
    db.prepare(`
        INSERT INTO design_groups (id, listing_id, name, base_settings_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(groupId, listingId, name, JSON.stringify(defaults), now, now);
    console.log(`  ✓ Created design group: ${groupId}`);
};

const upsertTemplates = (l, listingId) => {
    const insT = db.prepare(`
        INSERT INTO templates
            (id, name, description, settings_json, fulfillment_provider, fulfillment_size, design_group_id, sell_price_cents, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    const insLT = db.prepare(`
        INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, ?)
    `);
    const created = [];
    for (const sz of SIZES) {
        const tid = `${l.designGroupId}-${sz.code.toLowerCase()}`;
        const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(tid);
        if (existing) {
            console.log(`    · Template exists: ${tid}`);
            insLT.run(listingId, tid, 0);
            continue;
        }
        // Per-size settings: copy defaults, set printSize to match fulfillment_size
        const settings = { ...l.defaults, printSize: sz.code };
        insT.run(
            tid,
            `${l.designName} — ${sz.code}`,
            null,
            JSON.stringify(settings),
            sz.provider,
            sz.code,
            l.designGroupId,
            sz.priceCents,
            now,
            now,
        );
        insLT.run(listingId, tid, 0);
        created.push(tid);
        console.log(`    ✓ Created template: ${tid}`);
    }
    return created;
};

// ── Run ─────────────────────────────────────────────────────────────────────

console.log('\n=== Seeding new listings ===\n');

const txn = db.transaction(() => {
    for (const l of LISTINGS) {
        console.log(`\n→ ${l.slug}`);
        const listingId = upsertListing(l);
        upsertDesignGroup(l.designGroupId, listingId, l.designName, l.defaults);
        upsertTemplates(l, listingId);
    }
});

txn();

console.log('\n=== Done ===\n');
console.log('Next steps:');
console.log('  1. Capture thumbnails: node capture-thumbnails.cjs (or admin UI)');
console.log('  2. Verify in browser:');
LISTINGS.forEach(l => console.log(`     http://localhost:5173/l/${l.slug}`));
console.log('  3. To deploy to production, run this script with --db pointing to the prod DB,');
console.log('     OR scp this script to prod and run there.');

db.close();
