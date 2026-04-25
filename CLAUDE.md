# Poster Studio — Claude Code Instructions

## What This Is

A print-quality poster designer combining:
- **Star Map** mode: SVG star charts from real astronomical data (D3 + d3-celestial dataset)
- **Street Map** mode: Custom city street maps via MapLibre GL JS + OpenFreeMap tiles

Design is from the `sm2/final-print-starmap` project (Chakra UI, dark sidebar, split-pane layout).
Street map capability is from `map-poster-platform` (MapLibre, color presets, city geocoding).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 7 |
| UI | Chakra UI v2 + Tailwind CSS 4 |
| State | Zustand v5 |
| Star maps | D3 (d3-geo, d3-selection, d3-scale) + d3-celestial data |
| Street maps | MapLibre GL JS v5 + OpenFreeMap vector tiles |
| Geocoding | Nominatim (free, no API key) |
| Fonts | Fontsource (bundled, offline-capable) |
| Export | SVG serialization → Canvas → PNG (300 DPI) |

## Project Structure

```
poster-studio/
├── src/
│   ├── App.tsx                    # Root — just renders MainLayout
│   ├── main.tsx                   # React entry, ChakraProvider wrapper
│   ├── index.css                  # Tailwind + global theme
│   ├── components/
│   │   ├── MainLayout.tsx         # Split-pane layout, zoom/pan, poster preview
│   │   ├── VectorStarMap.tsx      # SVG poster renderer (star OR street map)
│   │   ├── SidebarControls.tsx    # All controls (1700+ lines, accordion-based)
│   │   ├── StreetMapCapture.tsx   # Offscreen MapLibre renderer → canvas capture
│   │   ├── GlyphPicker.tsx        # Visual glyph browser for Mapped Moment Script font
│   │   ├── CitySearch.tsx         # Nominatim city autocomplete
│   │   └── DownloadButton.tsx     # SVG → 300 DPI PNG export
│   ├── store/
│   │   └── useStore.ts            # Zustand store (all state + setters)
│   ├── utils/
│   │   ├── astronomy.ts           # Projection rotation from lat/lng/date/time
│   │   └── geocode.ts             # Nominatim API wrapper
│   └── hooks/
│       └── useDebounce.ts         # Debounce hook for heavy renders
├── public/
│   └── fonts/                     # Bundled fonts for offline use
└── dist/                          # Build output (gitignored)
```

## How The Three Modes Work

### Star Map Mode
`posterType === 'starmap'` in the store.
- `VectorStarMap.tsx` fetches star/constellation JSON from d3-celestial CDN
- Renders SVG layers: background → clip shape → stars → constellations → text
- `mapBackgroundImage` is `null` → renders stars

### Street Map Mode
`posterType === 'streetmap'` in the store. 2-color monochrome presets only. `mapStyleUrl = null`.
- `MainLayout.tsx` renders `<StreetMapCapture>` offscreen (fixed, top:-9999px)
- MapLibre GL JS renders the street map to a WebGL canvas using custom 2-color style
- On `idle`/`moveend`, `StreetMapCapture.onCapture(dataUrl)` is called
- `MainLayout` calls `setMapBackgroundImage(dataUrl)` to store the snapshot
- `VectorStarMap.tsx` detects `mapBackgroundImage !== null` and renders it as an `<image>` inside the poster template
- All poster text, titles, borders, fonts still apply on top

### Colored Map Mode
`posterType === 'coloredmap'` in the store. Sets `mapStyleUrl = 'https://tiles.openfreemap.org/styles/bright'` automatically via `setPosterType`. Same StreetMapCapture flow but uses the realistic full-colour prebuilt style. `applyHeritagePOIFilter()` strips business POIs after style loads.

### Adding a Color Preset
Edit `src/components/StreetMapCapture.tsx`, `MAP_COLOR_PRESETS` array:
```ts
{ id: 'my-theme', name: 'My Theme', bgColor: '#hex', streetColor: '#hex' }
```

### Adding a Font
Edit `src/components/SidebarControls.tsx`, the `TITLE_FONTS` / `SUBTITLE_FONTS` arrays.

## Listing URLs

Customer-facing listing pages support two URL patterns:

| Pattern | Behavior |
|---------|----------|
| `/l/:slug` | Loads listing, shows first design group as the primary (Design001) |
| `/l/:slug/:designSlug` | Loads listing, shows the specified design group as the primary |

`designSlug` matches a design group via (in order): exact `design_group_id`, the trailing `designNNN` segment of the id, or kebab-cased group name. Example URLs for the `star-map-night-we-met` listing:

- `https://themappedmoment.com/l/star-map-night-we-met` — Design001 (default)
- `https://themappedmoment.com/l/star-map-night-we-met/design002` — Design002 primary
- `https://themappedmoment.com/l/star-map-night-we-met/design005` — Design005 primary

Use this for **A/B testing** — link different Etsy listings (or paid ads) to different `designSlug` URLs and compare conversion via the `design_view` analytics event. The bare `/l/:slug` continues to work as a stable fallback. When the user clicks a different design card, the URL updates via `replace` (no history entry created).

## Development

```bash
# From /home/dev/poster-studio/
npm run dev        # Dev server on http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build

# Run backend
cd server && node index.js   # → http://localhost:3001
```

## Deployment (AWS EC2 VPS)

**Server:** AWS EC2 t3.micro, Ubuntu 24.04, Sydney (`ap-southeast-2`)
**Public IP:** `13.210.227.152` · Instance: `i-0dfddb55abbf931d1`
**SSH:** `ssh ubuntu@13.210.227.152`
**Domain:** `https://themappedmoment.com` (Let's Encrypt SSL, auto-renews)
**Served on:** Port 443 HTTPS + 80 → redirect, via nginx

### Deploy frontend
```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@13.210.227.152:/var/www/poster-studio/
```

⚠️ The `--exclude='designs/'` flag is CRITICAL. Never remove it. The `/designs/` directory
contains thumbnails that are NOT build artifacts — `--delete` would wipe them on every deploy.

### Deploy server
```bash
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@13.210.227.152:/home/ubuntu/poster-studio/server/
ssh ubuntu@13.210.227.152 "cd /home/ubuntu/poster-studio/server && \
  npm install --production && sudo systemctl restart poster-studio-api && \
  sleep 2 && sudo systemctl is-active poster-studio-api"
```

### Quick frontend redeploy
```bash
cd /home/dev/poster-studio && npm run build && rsync -avz --delete --exclude='designs/' dist/ ubuntu@13.210.227.152:/var/www/poster-studio/
```

## Key Files for Common Tasks

| Task | File |
|------|------|
| Change layout/split pane | `MainLayout.tsx` |
| Add poster template preset | `SidebarControls.tsx` → Templates section |
| Add map color preset | `StreetMapCapture.tsx` → `MAP_COLOR_PRESETS` |
| Change SVG poster rendering | `VectorStarMap.tsx` → 3 useEffect blocks (background, stars/map, text) |
| Add new store state | `useStore.ts` → add interface field + default + setter |
| Change geocoding | `utils/geocode.ts` |
| Change city search UI | `CitySearch.tsx` |
| Add a new custom font | See "Adding a Custom Font" section below |
| Create a new design/listing | See "Design & Listing Creation Workflow" section below |
| Fix DB inconsistencies | `node scripts/sync-listing-state.cjs` |
| Verify thumbnails look correct | `node scripts/verify-listing.cjs` |
| Test font rendering in downloads | `node scripts/test-font-render.cjs` |

## Adding a Custom Font

To add a new font so it works in both the browser preview AND PNG downloads:

1. Copy `.woff2` file to `src/assets/fonts/`
2. Add `@font-face` declaration to `src/assets/fonts/fonts.css`
3. Add Vite `?url` import + registry entry to `src/utils/fontRegistry.ts`:
   ```ts
   import MyFont400 from '../assets/fonts/MyFont-400-normal.woff2?url';
   // In FONT_REGISTRY:
   'My Font': [{ weight: '400', url: MyFont400 }],
   ```
4. Add font name to the relevant array in `SidebarControls.tsx` (`TITLE_FONTS`, `SUBTITLE_FONTS`, or `DETAILS_FONTS`)

**Step 3 is mandatory for downloads.** Without it, the font shows in the browser but renders as a system fallback in PNG exports. The reason: blob-URL SVGs cannot resolve relative @font-face URLs, so fonts must be embedded as base64 data URIs — `fontRegistry.ts` provides the Vite-resolved URLs that make this possible.

---

## Design & Listing Creation Workflow

When creating a new design variant and making it available on a listing page, follow ALL steps — skipping any step causes the inconsistencies that have caused repeated issues.

### 1. Create templates in admin OR via script

**Via admin UI** (`/admin/templates`): creates `templates` + `listing_templates` rows automatically.

**Via script** (used for bulk creation): you MUST insert into BOTH tables or save/sync will silently fail:
```js
// 1. design_groups row (with listing_id)
db.prepare('INSERT INTO design_groups (id, listing_id, name, ...) VALUES (...)').run(...);

// 2. templates rows (one per size)
db.prepare('INSERT INTO templates (id, design_group_id, ...) VALUES (...)').run(...);

// 3. listing_templates rows — REQUIRED, commonly missed
//    Without these the listing page won't show the design and sync-to-siblings fails silently.
const ins = db.prepare('INSERT OR IGNORE INTO listing_templates (listing_id, template_id, position) VALUES (?, ?, 0)');
for (const templateId of templateIds) { ins.run(listingId, templateId); }
```

Use ID convention: `{collection}-{design}-{size}` (e.g. `sm001-design003-8x10`)  
`fulfillment_size` must exactly match the size suffix in the ID.

**Set `listing_templates.position` to control design card order.** When inserting via script, `position = 0` for all rows means order falls back to `created_at`, which won't match the logical Design001→002→003 sequence if templates were created out of order. Always set position to match the intended display order:
```js
// Design001 = position 0, Design002 = position 1, etc.
const GROUP_ORDER = ['sm001-design001', 'sm001-design002', 'sm001-design003', 'sm001-design004', 'sm001-design005'];
// After inserting listing_templates, update positions:
const update = db.prepare('UPDATE listing_templates SET position = ? WHERE template_id = ?');
for (const t of templates) {
    const pos = GROUP_ORDER.indexOf(t.design_group_id);
    if (pos !== -1) update.run(pos, t.id);
}
```
Run this on BOTH local and production after any new design is added.

### 2. Add design to sync script
Edit `scripts/sync-listing-state.cjs` — add the new design to the `DESIGNS` array and its prefix to the relevant `LISTINGS` entry.

### 3. Run sync script locally
```bash
node scripts/sync-listing-state.cjs
# Must output: "✓ All state is consistent"
```

### 4. Capture thumbnail
```bash
# Add new entry to capture-thumbnails.cjs DESIGNS array, then:
node capture-thumbnails.cjs
```
Visually verify the output image: real stars visible, correct title text, 4:5 aspect ratio.

### 5. Place thumbnail in both locations
```bash
cp /tmp/thumb-newdesign.png public/designs/SM001/Design003/8x10.png
scp /tmp/thumb-newdesign.png ubuntu@13.210.227.152:/var/www/poster-studio/designs/SM001/Design003/8x10.png
```

### 6. Increment thumbnail cache-bust version
In `src/components/SidebarControls.tsx` and `src/components/ListingPage.tsx`:
```tsx
src={`${API}${thumbSize.thumbnail_path}?v=3`}  // increment the number
```

### 7. Build, deploy, and sync prod DB
```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@13.210.227.152:/var/www/poster-studio/

# Sync DB state to production
scp scripts/sync-listing-state.cjs ubuntu@13.210.227.152:/home/ubuntu/poster-studio/scripts/
ssh ubuntu@13.210.227.152 "node /home/ubuntu/poster-studio/scripts/sync-listing-state.cjs \
  --db /home/ubuntu/poster-studio/server/data/db.sqlite"
```

### 8. Visual verification (mandatory)
```bash
node scripts/verify-listing.cjs
# Check /tmp/verify-local.png and /tmp/verify-prod.png — both must show stars
```

---

## Troubleshooting

### Thumbnails show gray circle (no stars)
D3-celestial data loads async. Screenshot taken before stars rendered. Use `capture-thumbnails.cjs` which waits for >100 SVG circles. Never screenshot immediately after page navigation.

### Downloaded PNG has wrong fonts
The `font-family` attribute in SVG is a stack like `"Title001, serif"`. If any code does a lookup using the whole string, it won't find anything in `FONT_REGISTRY`. Always split on comma first. See `collectUsedFontFamilies()` in `src/utils/renderPoster.ts`.

To verify font embedding is working, file size of a 150dpi 8x10 render should be >300KB (fonts add ~200KB). Without embedded fonts it's ~150KB.

### Thumbnails disappear after deploy
`rsync --delete` wiped the `/designs/` directory. Always use `--exclude='designs/'`. It's in all deploy commands in this file — don't remove it.

### Design card shows wrong aspect ratio
The thumbnail card must use `aspectRatio: '4/5'` (hardcoded) and always look up the 8x10 size for the thumbnail image. See `SidebarControls.tsx` design card rendering.

### Design cards appear in wrong order in the listing sidebar
`listing_templates.position` controls sort order. All-zero positions fall back to `created_at`, which may not match logical design order if templates were inserted out of sequence. Fix: set `position` to the design group's intended rank (0=Design001, 1=Design002, …) on both local and production DBs. See the position-fix pattern in the "Create templates" section above.

### Listing API deduplication broke the size picker
**Never deduplicate templates in the `/api/listings/:slug` server response.** `MainLayout.tsx` fetches all templates and groups them by `design_group_id` client-side to build the Design+Size pickers. If the server returns only one template per group (e.g. the 8x10 representative), the Size picker shows only one option. The server must return all templates; deduplication for display happens in `MainLayout.tsx` using `t.design_group_id` directly.

### Poster type toggle (Star Map / Street Map / Colored Map) shown in customer view
The toggle is hidden automatically when `designGroups.length > 0` (listing/customer mode). Do not remove this condition — customers on a star-map listing should not be able to switch to street map mode. If you add new listing types that need type switching, pass an explicit prop instead of relying on the designGroups check.

### Demo download offered PDF (full quality for free)
The "Download Preview" modal must only offer PNG. PDF export preserves full vector quality with no degradation, making it a free substitute for the paid product. The PDF button is intentionally removed from the customer-facing download modal (`DownloadButton.tsx`). Do not re-add it to the `!isTemplateMode` branch.

### DB state inconsistent between local and production
Run `scripts/sync-listing-state.cjs` on both environments. It will report and fix: wrong `printSize`, wrong `titleAllCaps`, null `thumbnail_path`, missing `listing_templates` rows.

### Street map shows blank
- The offscreen MapLibre div needs `canvasContextAttributes: { preserveDrawingBuffer: true }` (already set)
- Wait for the `idle` event before calling `toDataURL()`
- Check browser console for tile loading errors

### Star data not loading
- D3-celestial data is fetched from `raw.githubusercontent.com/ofrohn/d3-celestial`
- Check network connectivity; data loads once and is cached in component state

### Build fails
```bash
# Clean rebuild
rm -rf node_modules dist && npm install && npm run build
```

---

## Test Suite

### Running Tests

```bash
# From /home/dev/poster-studio/
# Run all tests (requires production build first)
npm run build && npx playwright test

# Run a specific test file
npx playwright test tests/poster-modes.test.ts

# Run with headed browser (visible)
npx playwright test --headed

# Run tests matching a title pattern
npx playwright test --grep "revenue panel"

# Update visual snapshot baselines
npx playwright test --update-snapshots

# View HTML test report
npx playwright show-report tests/report
```

### Test File Descriptions

| File | Count | What It Tests |
|------|-------|---------------|
| `tests/admin.test.ts` | ~55 | Admin auth, dashboard, orders, templates, Etsy, settings, assets |
| `tests/designer.test.ts` | ~20 | Designer page load, template URLs, SVG structure, inline editing, share |
| `tests/features.test.ts` | ~30 | Revenue panel, retry orders, bulk actions, order notes, CSV export, font roles, share URL, verify polling |
| `tests/visual.test.ts` | ~30 | Visual snapshots of all major pages and interactive states |
| `tests/poster-modes.test.ts` | ~50 | Star/Street/Colored map modes, shape switching, location search, date/time, zoom slider, colors |
| `tests/designer-controls.test.ts` | ~60 | All sidebar accordion sections, template buttons, font selectors, text inputs, color pickers, border controls |
| `tests/user-journeys.test.ts` | ~40 | End-to-end: customer design flow, template URLs, share links, verify order, admin workflows, bulk actions, CSV |
| `tests/error-states.test.ts` | ~35 | Invalid params, 404 templates, Nominatim failures, auth errors, API errors, network failures |
| `tests/visual-extended.test.ts` | ~45 | Extended visual snapshots: modes, templates, sidebar states, admin pages, verify states |
| `tests/admin-advanced.test.ts` | ~45 | Revenue panel values, status badge links, order notes CRUD, retry fulfillment, bulk select, CSV export, font roles |

### Fixtures

All tests use `setupMockApi(page)` from `tests/fixtures/mockApi.ts` which:
- Intercepts all `/api/**` routes with realistic canned responses
- Provides `MOCK_ORDERS`, `MOCK_TEMPLATES`, `MOCK_STATS`, `MOCK_SETTINGS`, `MOCK_JWT`
- Accepts `{ loggedIn: true }` option to pre-seed admin JWT in localStorage

### Adding New Tests

1. Import `setupMockApi` and call it in `beforeEach` or at the top of each test
2. Use `page.waitForSelector('svg', { timeout: 10000 })` for designer tests (not `networkidle`)
3. For map mode tests, set `test.setTimeout(30000)` — tile loading is slow
4. Visual tests use `await expect(page).toHaveScreenshot(name, { maxDiffPixelRatio: 0.05 })`
5. Never use `page.waitForLoadState('networkidle')` for MapLibre tests — tiles never settle

---

## Recent Features

### Rectangle Template
The "Rectangle" template preset in the sidebar applies `maskShape: 'rect'` which renders the star/map
without a circular clip — the entire poster rectangle is the map area. Text and decorations still render
below. Good for full-bleed street map prints.

### Mapped2 Font
`Mapped2` is a bundled custom sans-serif font available in the Title, Subtitle, and Details font pickers.
Located in `public/fonts/`. It is listed in `TITLE_FONTS`, `SUBTITLE_FONTS`, and `DETAILS_FONTS` arrays
in `SidebarControls.tsx`.

### Service Worker Tile Cache (`tile-sw.js`)
A service worker in `public/tile-sw.js` intercepts MapLibre tile requests and caches them in
`CacheStorage` under the key `maptile-cache-v1`. This allows previously visited map areas to render
offline. Registration happens in `main.tsx` via `navigator.serviceWorker.register('/tile-sw.js')`.

### Predictive Prefetch
When the user drags the map or changes zoom, `StreetMapCapture.tsx` prefetches adjacent tile
coordinates into the service worker cache to improve perceived performance on subsequent pan/zoom.

### Map Loading Optimizations
- MapLibre is initialized once and reused (not destroyed on re-render)
- `preserveDrawingBuffer: true` is set on the WebGL canvas context to allow `toDataURL()` capture
- The `idle` event (not `load`) triggers the canvas capture — fires after all tiles are rendered
- Debounce of 300ms on `moveend` prevents excessive captures during drag

---

## Map Style Architecture

### createDesign2Style() — 4-Tier Road Color System

In `StreetMapCapture.tsx`, the `createDesign2Style(bgColor, streetColor)` function generates a
MapLibre GL style object with a 4-tier road hierarchy:

| Tier | Layer filter | Color |
|------|-------------|-------|
| 1 — Motorways | `class = motorway` | `streetColor` at full opacity |
| 2 — Primary/Trunk | `class = primary/trunk` | `streetColor` at 90% opacity |
| 3 — Secondary/Tertiary | `class = secondary/tertiary` | `streetColor` at 75% opacity |
| 4 — Residential/Service | `class = residential/service` | `streetColor` at 55% opacity |

Background fill and water bodies use `bgColor`. All labels, POIs, and park areas are hidden in the
2-color style. The `applyHeritagePOIFilter()` function additionally strips business POI layers from
the realistic (OpenFreeMap bright) style used in `coloredmap` mode.

---

## Performance

### captureStitched vs captureQuick

`StreetMapCapture.tsx` exposes two capture strategies:
- **captureQuick** — calls `map.getCanvas().toDataURL('image/jpeg', 0.92)` immediately on `idle`.
  Fast but may miss tiles that are still loading. Used for interactive drag updates.
- **captureStitched** — waits for an additional `idle` debounce after `moveend`, then captures.
  More reliable for final poster quality. Used on initial city load and after zoom change.

### Service Worker (`public/tile-sw.js`)
Caches vector tile `.pbf` responses and style JSON. Cache strategy is `cache-first` for tiles,
`network-first` for style JSON (which changes less frequently than tiles but should stay current).
The cache key includes the full tile URL including zoom/x/y, so different zoom levels are cached
independently.

### Debouncing Strategy
- **Location search** (Nominatim): 500ms debounce via `useEffect` + `setTimeout` in `SidebarControls.tsx`
- **Map capture** (tile idle → poster update): 300ms debounce via `useDebounce` hook in `StreetMapCapture.tsx`
- **SVG re-render** (store state changes → D3 re-render): batched via React 19 concurrent features
- **Preview zoom/pan**: immediate (no debounce) for snappy feel

---

## Related Documentation

- **[PLAN.md](PLAN.md)** — Master roadmap: phases 0-4, A/B testing strategy, pricing, metrics, risk register
- **[HANDOVER.md](HANDOVER.md)** — Full handover for AI agents: architecture, file guide, database schema, deployment, credentials, gotchas

---

## Etsy Integration

### Shop Details
- **Shop:** TheMappedMoment (Shop ID: 12648302)
- **Status:** Connected via OAuth PKCE, tokens auto-refresh on 401
- **Scopes:** `transactions_r shops_r email_r`

### Order Flow
1. Etsy poll (every 2 min) detects new paid receipt
2. Design token extracted from buyer's personalization note
3. Render job enqueued → Puppeteer generates 300 DPI PNG
4. Digital: signed download link (7-day expiry, 3 revisions)
5. Print: PNG uploaded to fulfillment provider → shipped

### Key Files
| Task | File |
|------|------|
| Etsy OAuth flow | `server/routes/auth.js` |
| Order verification | `server/routes/verify.js` |
| Etsy API client | `server/services/etsy.js` |
| Admin Etsy page | `src/admin/EtsyPage.tsx` |
| Verify order UI | `src/components/VerifyOrder.tsx` |

### Gotcha: x-api-key Format
Etsy API v3 requires `x-api-key: keystring:shared_secret` (colon-separated). OAuth `client_id` uses keystring only. See `etsyHeaders()` in `server/services/etsy.js`.

---

## Server Backend

### Running the Server
```bash
cd server && node index.js   # → http://localhost:3001
```

### Deploy Server Changes
```bash
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@13.210.227.152:/home/ubuntu/poster-studio/server/
ssh ubuntu@13.210.227.152 "cd /home/ubuntu/poster-studio/server && npm install --production && sudo systemctl restart poster-studio-api"
```

### Background Jobs
- **Render queue worker** — continuous, processes pending render jobs
- **Etsy order polling** — every 2 min (only if `ETSY_ACCESS_TOKEN` is set)
- **Daily seller digest** — 8 AM cron via node-cron

### Database
SQLite with WAL mode at `server/data/db.sqlite`. Schema in `server/db.js`. Key tables: `designs`, `orders`, `templates`, `render_queue`, `settings`, `listings`, `events`.

---

## New Text Element Checklist

When adding a new text element (like "names" was added), **all** of the following must be completed to ensure the field survives the full lifecycle: edit → save → load → sync → render.

### 1. Store (`src/store/useStore.ts`)
- [ ] Add to `StoreState` interface: `{el}Font`, `{el}FontSize`, `{el}OffsetY`, `{el}Kerning`, `show{El}`
- [ ] Add all 5 fields to `DESIGN_FIELDS` array
- [ ] Add to `customText` interface + default (if element has user-editable text)
- [ ] Add defaults for all new fields
- [ ] Add setters: `set{El}Font`, `set{El}FontSize`, `set{El}OffsetY`, `set{El}Kerning`, `setShow{El}`
- [ ] Add `'{el}'` to `activeTypoField` union type
- [ ] Add all 5 fields to `saveTemplateSettings` snapshot object
- [ ] Add all 5 fields to `saveTemplateDefaults` snapshot object
- [ ] Add `{el}FontSize` scaling in `setPrintSize()` return object

### 2. Template System (`src/utils/applyTemplate.ts`)
- [ ] Add all 5 fields to `TEMPLATE_FIELDS` array
- [ ] Add to `CUSTOM_TEXT_KEYS` array (if element has customText)
- [ ] Add to `captureCurrentSettings()` explicit captures (e.g. `if (ct?.{el}) out.{el} = ct.{el}`)

### 3. Renderer (`src/components/VectorStarMap.tsx`)
- [ ] Destructure all new fields + setters from store
- [ ] Add `const debounced{El}Kerning = useDebounce({el}Kerning, 200)` hook
- [ ] Add rendering group in correct text flow position (naturalY accumulator)
- [ ] Add all fields to the text-rendering `useEffect` dependency array
- [ ] Add `'{el}'` to `inlineEdit.field` type union

### 4. Sidebar (`src/components/SidebarControls.tsx`)
- [ ] Destructure all new fields + setters from store
- [ ] Add toggle in Visibility section (`show{El}`)
- [ ] Add text input in Content section (conditional on `show{El}`)
- [ ] Add typography tab + controls: Font Family, Font Size, Kerning, Vertical Offset

### 5. Server Sync (`server/routes/templates.js`)
- [ ] Add **style** fields to `STYLE_SYNC_FIELDS`: `{el}Font`, `{el}Kerning`, `show{El}`
- [ ] Do **NOT** add position/layout fields: `{el}OffsetY`, `{el}FontSize` — these stay independent per aspect ratio
