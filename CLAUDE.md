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
**Public IP:** `3.107.34.169` · Instance: `i-0dfddb55abbf931d1`
**SSH:** `ssh ubuntu@3.107.34.169`
**Domain:** `https://themappedmoment.com` (Let's Encrypt SSL, auto-renews)
**Served on:** Port 443 HTTPS + 80 → redirect, via nginx

### Deploy frontend
```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
```

⚠️ The `--exclude='designs/'` flag is CRITICAL. Never remove it. The `/designs/` directory
contains thumbnails that are NOT build artifacts — `--delete` would wipe them on every deploy.

### Deploy server
```bash
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@3.107.34.169:/home/ubuntu/poster-studio/server/
ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && \
  npm install --production && sudo systemctl restart poster-studio-api && \
  sleep 2 && sudo systemctl is-active poster-studio-api"
```

### Quick frontend redeploy
```bash
cd /home/dev/poster-studio && npm run build && rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/
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
| Change Prodigi SKUs / framed / quotes | `server/services/prodigi.js` |
| Change fee model / margin floor | `server/services/profitability.js` (+ `settings` keys) |
| Build/adjust Etsy shipping profiles | `server/scripts/build-shipping-profiles.js` (see Profitability Guard section) |
| Check Prodigi costs per country | `node server/scripts/quote-matrix.js` (read-only) |
| Change shipping method per country | `shippingMethodFor()` in `server/services/prodigi.js` |

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
scp /tmp/thumb-newdesign.png ubuntu@3.107.34.169:/var/www/poster-studio/designs/SM001/Design003/8x10.png
```

### 6. Increment thumbnail cache-bust version
In `src/components/SidebarControls.tsx` and `src/components/ListingPage.tsx`:
```tsx
src={`${API}${thumbSize.thumbnail_path}?v=3`}  // increment the number
```

### 7. Build, deploy, and sync prod DB
```bash
npm run build
rsync -avz --delete --exclude='designs/' dist/ ubuntu@3.107.34.169:/var/www/poster-studio/

# Sync DB state to production
scp scripts/sync-listing-state.cjs ubuntu@3.107.34.169:/home/ubuntu/poster-studio/scripts/
ssh ubuntu@3.107.34.169 "node /home/ubuntu/poster-studio/scripts/sync-listing-state.cjs \
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

### Vector Street Map + Raster Preview
High-detail 2-colour street maps (`mapColorPreset === 'design2'`) are rendered as **vector
SVG paths** for crisp 300 DPI export, but the **editor preview rasterises them to a JPEG
bitmap** so panning/zooming stays fast even with thousands of streets. See
`src/utils/vectorStreetMapRenderer.ts` and the raster effect in `VectorStarMap.tsx`.
- `VectorStarMap.tsx` takes a `forceVector` prop — `PosterRenderPage` passes `true` so
  exports use crisp vectors; the editor uses the raster path.
- **Gotchas (do not regress):** the raster canvas must `fillRect` the full background first
  (JPEG has no alpha → transparent becomes **black** otherwise); water/landuse fills use
  `fill-rule="nonzero"` (evenodd cancels vector-tile buffer overlaps into a **square grid**).
- **Drag-to-pan in raster mode:** the drag handler uses `svg.getScreenCTM().inverse()` for
  exact SVG-unit deltas and recentres lat/lng on pointer-up; the pan offset persists until
  the new raster loads (prevents snap-back). Tests: `tests/street-map-raster.test.ts`.

### "Updating map…" Loading Flag
`useStore` has `streetMapRendering` (+ `setStreetMapRendering`). Capture paths set it true
on start and clear it when the raster/capture lands. `MainLayout.tsx` shows a translucent
"Updating map…" overlay (`isMapUpdating = isMapMode && streetMapRendering`) for both vector
raster and colored-map captures — distinct from the opaque first-load "Loading map…".

### Coordinate Paste & Geocode Proxy
Location search/reverse-geocode is proxied through the server (`server/routes/geocode.js`:
`/api/geocode/search`, `/api/geocode/reverse`) — Google Places when `GOOGLE_MAPS_API_KEY`
is set, else Nominatim, normalised to one shape. `parseCoordinateInput()` in
`src/utils/geocode.ts` detects pasted decimal/DMS coords and Google/Apple/OSM map URLs;
`CitySearch.tsx` resolves them straight to a pin (exact coords kept) and enriches the name
in the background. This is the fix for "new builds not in geocoders" — paste a pin from any
map app. ⚠️ Google ToS risk on a non-Google base map (see `geocode.js` header comment).

### Colored Map Label Size + Pin Declutter
`mapLabelScale` (store) scales colored-map symbol text-size live via
`applyColoredMapLabelScale()` in `StreetMapCapture.tsx` (slider in `MapControlsPanel.tsx`,
colored-map only). `applyPinLabelDeclutter()` drops an invisible collision symbol at the
location pin so street labels avoid clashing with the heart pin. Export stays 300 DPI.

### Map Rotation
`mapBearing` (0–360°) rotates street/colored maps; slider in `MapControlsPanel.tsx`.

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
4. Digital: signed download link (30-day expiry). Edits/revisions allowed for 30 days
   (`digital_edit_window_days` setting / env `DIGITAL_EDIT_WINDOW_DAYS`, default 30), capped
   at 3 revised renders (`max_revisions`). Past the window, `/api/verify-order` returns
   `editWindowClosed` and points the buyer to studio@ (verify.js revision branch).
5. Print/Framed: PNG sent to Prodigi → produced → shipped

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

## Fulfillment & Print Products (platform-agnostic)

The customer's product choice (Digital / Printed / Framed + frame color) is captured
**in the app and saved into the design's `state_json`** — NOT inferred from the sales
channel. This is deliberate: the same flow works for Etsy today and Amazon Custom /
TikTok Shop later. Treat the design state as the source of truth.

### Where the choice lives
| Layer | Field |
|-------|-------|
| UI (`SidebarControls.tsx` OrderSection) | 3 product cards → `orderType: 'digital'\|'print'\|'framed'`; `frameColor` swatch picker (default `black`) when framed |
| Saved design | `saveDesign(type)` writes `orderType` + (`frameColor` if framed) into the design state |
| Server (`server/routes/verify.js`) | `getListingType(receipt, designState)` reads `designState.orderType` FIRST; Etsy listing-ID env mapping is fallback-only. `getPrintSize(receipt, designState)` prefers `designState.printSize`. |
| Fulfillment (`server/services/prodigi.js`) | `createOrder()` reads `order.listing_type` (`framed`→`getFramedSku()`, else `getSku()`) and the saved `frameColor`; framed orders add `attributes: [{ name:'color', value:<frameColor> }]` |

⚠️ Do NOT reintroduce "select the frame color on Etsy" messaging. The frame is locked
into the personalisation code; the customer never re-picks it at checkout. (Etsy listing
variants still exist for discoverability, but the saved design overrides them.)

### Prodigi SKU tables (`server/services/prodigi.js`, verified against API v4.0)
| Product | SKU prefix | Notes |
|---------|-----------|-------|
| Fine Art Print (premium) | `GLOBAL-FAP-{size}` | Enhanced Matte Art giclée. **More expensive.** Default `getSku()` tier. |
| Budget Art Paper (standard) | `ART-FAP-BAP-{size}` | ~40–50% cheaper than FAP (from ~£2.23/8×10). `BAP_SKUS`. Wire up for a "Standard Print" tier. |
| Classic Frame Premium Matte | `GLOBAL-CFPM-{size}` | Framed FAP. `getFramedSku()`. Requires `color` attribute. |
| Classic Frame Print | `GLOBAL-CFP-{size}` | Alt framed profile. |
| Budget Frame Print | `GLOBAL-BFP-CFPM-{size}` | Cheaper framing. Verify pricing in Prodigi dashboard. |

**Valid frame colors** (Prodigi API validation): `black, white, natural, light grey,
dark grey, brown, gold, silver`. The UI exposes black/white/natural/light grey/dark grey
(`FRAME_COLORS` in `SidebarControls.tsx`).

**Overrides:** any SKU can be overridden per size via admin `settings` key
`prodigi_sku_{size}` / `prodigi_framed_sku_{size}`, or env `PRODIGI_SKU_{SIZE}` /
`PRODIGI_FRAMED_SKU_{SIZE}`. cm sizes map to nearest inch SKU (FAP/CFPM are inch + A-series only).

**Two-step fulfillment:** `submitPrintOrder()` creates the order *paused* (visible in
Prodigi but not produced); `releasePrintOrder()` sends it to production once Etsy funds
clear. Requires "Pause indefinitely" in Prodigi Preferences. `fulfillPrintOrder()` is the
legacy combined helper for manual admin fulfillment.

### Adding a new sales channel (Amazon Custom / TikTok Shop)
1. Map the channel's incoming order → a design token (however that channel passes it).
2. Look up the design; read `orderType` + `frameColor` + `printSize` from `state_json`.
3. Persist `revenue_cents` (item + shipping the customer paid, ex tax) + `currency` +
   `ship_address_json` (with `country_iso`) on the order — the profitability gate needs them.
4. Call `submitPrintOrder()` / `releasePrintOrder()` — no Prodigi changes needed.
The fulfillment layer is already channel-independent; only the order-ingestion adapter is new.

---

## Profitability Guard (never pay Prodigi more than the customer paid)

**The problem it solves:** Prodigi item + shipping cost varies by destination country.
A misrouted order, a wrong Etsy shipping profile, or a customer in an expensive-to-ship
country could cost us more than they paid — silently, at our expense. The guard makes that
impossible without an explicit override.

### How it works
- **Single chokepoint:** every release path (`releasePrintOrder()` in
  `server/services/prodigi.js`) runs the gate. Paths that funnel through it: the Etsy
  ledger-settled auto-release (`etsy.js checkLedgerAndRelease`), the scheduled Prodigi
  worker (`renderQueue.js submitDuePrintOrders`), and admin "fulfill now"
  (`renderQueue.js submitOrderNow`). There is no way to reach Prodigi production around it.
- **Quote, don't guess:** `getQuote(order)` calls Prodigi's **Quotes API** (`POST /v4.0/quotes`)
  with the exact SKU + frame attributes, the buyer's **destination country**, and the order's
  **currency** → returns item + shipping cost. Stored on the order at submit time so the
  projected margin is visible in admin *before* release.
- **The math** (`server/services/profitability.js → assessProfit`), all in the order's currency:
  `revenue (item+shipping ex-tax) − EtsyFees − ProdigiTotal = margin`. PASS only if
  `margin ≥ min_margin_cents` AND `margin ≥ revenue × min_margin_pct`.
- **On fail:** order is set to `status = 'needs_review'` and **NOT charged**; the full
  breakdown is saved to `orders.profit_json` (+ `profit_status`, `margin_cents`,
  `prodigi_cost_cents`). If the quote or revenue is unknown, it also holds (`status:'unknown'`)
  — fail-safe, never fail-open.
- **Override:** admin `POST /api/admin/orders/:id/fulfill` with body `{ "force": true }`
  bypasses the gate (deliberate loss-leader / sample). `POST /api/admin/orders/:id/assess`
  re-quotes without releasing. Held orders surface in the order detail (`profit_status`).

### Tunable settings (admin `settings` table or env, no deploy needed)
| Key | Default | Meaning |
|-----|---------|---------|
| `etsy_fee_pct` | `0.115` | Transaction (6.5%) + payment processing (~4%) combined |
| `etsy_fee_flat_cents` | `50` | Per-order flat (processing flat + amortised listing fee) |
| `etsy_offsite_ads_pct` | `0` | Buffer for the 12–15% Offsite Ads fee (raise if many orders come via ads) |
| `min_margin_cents` | `0` | Absolute profit floor (must at least break even after fees) |
| `min_margin_pct` | `0` | Optional % margin floor (e.g. `0.15` = require 15%) |

Defaults intentionally **overestimate fees** so borderline orders hold rather than ship at a loss.

### Markets, products & shipping policy (confirmed config)
- **Product tier:** Budget Art Paper (BAP, `ART-FAP-BAP-*`) — 180gsm Giclée pigment archival
  (genuine fine art, lighter than the ~200gsm Enhanced Matte premium FAP). Used as the standard print.
- **Markets:** US (main), UK, Canada, Australia, EU. Everything else **excluded** (no shipping
  destination → can't check out → no surprise-loss orders).
- **Shipping presentation:** **US = FREE** (cost baked into the item price; Etsy SEO + conversion).
  **UK/CA/AU/EU = charged** (sized from a live Prodigi quote, grossed up for the Etsy fee on shipping).
- **Prodigi shipping method per destination** — set in `shippingMethodFor()` (prodigi.js) and mirrored
  in the builder REGIONS; must stay in sync:
  | Destination | Method | Why |
  |---|---|---|
  | US, CA, AU | **Budget** | Cheapest; US is tracked even on Budget; Standard to CA/AU is punishingly pricey (~$18+) |
  | GB, EU | **Standard** | Tracked + reasonable cost → Etsy Purchase Protection / Star Seller |
  Override per country via settings/env `prodigi_shipping_<ISO>` (e.g. `PRODIGI_SHIPPING_CA=Standard`).
- **Recommended US list prices** (Budget, $8 floor): 8x10 $24.50 · 11x14 $26 · 16x20 $28 · 18x24 $29 · 24x36 $43.50.
- **Customer copy** lives in **listing descriptions** + **Shop Announcement** (Etsy removed the free-text
  shipping-policy field — see [[reference_etsy_shipping_policy_ui]]).

### Shipping-profile builder (`server/scripts/build-shipping-profiles.js`)
Creates one profitable Etsy shipping profile **per BAP size** for the markets above.
- Quotes Prodigi live per region via `quoteSku()`/`bapSku()`, computes the free-US list price +
  per-region intl charges, targets the **$8 floor** (`--margin <cents>` to override).
- **Run on PROD** (keys/tokens live there). **Dry-run by default**; `--apply` writes live;
  `--only-size 8x10` validates one profile in the Etsy UI before doing all.
- Requires the Etsy token to have **`shops_w`** scope (granted; scope set in `server/routes/auth.js`:
  `transactions_r shops_r email_r shops_w listings_w`). `origin_postal_code` is required by Etsy —
  set via `ETSY_ORIGIN_ZIP` (default `10001`).
- Stores each profile id in `settings` as `shipping_profile_bap_<size>`; attach to listings next.
- EU is a normal market here (shop is **Estonia-based**, so the seller is their own EU GPSR economic
  operator — no third-party representative needed).

### Etsy compliance checklist (one-time shop setup)
- **Production partner:** add **Prodigi (Pwinty/Prodigi Ltd)** manually in Shop Manager → Settings →
  Production partners (no create API; only `getShopProductionPartners` read exists). Role: "They do
  everything for me"; design role: "I design everything myself". Attach it to every physical listing.
- **Returns policy:** custom **"No returns or exchanges"** (personalized/made-to-order exemption).
  **Cancellations:** accept within **24h** (pairs with the paused-Prodigi release window → cancel free).
- **EU GPSR:** economic-operator field = the shop's **own Estonian business details**
  (name/address/`support@themappedmoment.com`). Personalized goods are exempt from the EU 14-day right
  of withdrawal (CRD Art.16(c)) — the withdrawal form/T&C declares this; ODR-platform box ticked.
  Add product safety info to EU listings using Prodigi's GPSR technical-file template.
- **Digital** listings need none of the above (no partner, no shipping, no GPSR).

### Shop email addresses & inbound automation
| Address | Use |
|---|---|
| `studio@themappedmoment.com` | General inbound — wired to Resend inbound → `/api/webhooks/email-inbound` → forwards to `EMAIL_FORWARD_TO` |
| `returns@themappedmoment.com` | EU withdrawal-form / returns contact (in listing T&C) |
| `support@themappedmoment.com` | EU economic-operator contact email |

Resend inbound is **catch-all by default** — every address `@themappedmoment.com` (studio@, returns@,
support@, …) routes to `/api/webhooks/email-inbound` with no per-address config (confirmed live
2026-06-01). The webhook ([webhooks.js](server/routes/webhooks.js)) forwards to `EMAIL_FORWARD_TO`.
Resend delivers a **Svix-wrapped event**: fields live under `payload.data` (not top-level) —
`{ from, to, cc, bcc, subject, attachments, email_id, message_id, created_at }`. Note there's **no
inline `text`/`html` body** in the payload — to forward the body you must fetch the full message via
the Resend API using `email_id`. `attachments` ARE included, which is the hook for **auto
dispute-routing to Prodigi** (a customer who emails photos to returns@ → attachments → forward to
`support@prodigi.com`). Buyer photos sent via an *Etsy* case still sit behind an Etsy link, not email.

### Why free US / charged intl (refund reasoning)
Etsy taxes shipping inside the 6.5% fee and refunds fees proportionally on seller refunds, so
free-vs-charged is **fee-neutral on refunds**. Free US wins on SEO + conversion; charged intl recovers
the higher intl shipping and allows item-only partial refunds on higher-transit-risk orders.
**Prodigi covers its own faults** (lost in transit / damaged / misprint → free reship within the claim
window); customer change-of-mind is non-refundable under the personalized policy, so there's nothing to
recover and nothing paid out. Only mandatory exception: faulty/lost → **free replacement** (Prodigi pays).

## Modular architecture (swap providers via config, no code changes)

Built to be swapped out cleanly as the business grows:

### LLM provider — `server/services/llm.js`
One interface `extractJson(system, user)`; provider chosen by setting `llm_provider` / env
`LLM_PROVIDER`. **ACTIVE PROVIDER: `openrouter`** (prod setting, since 2026-06-02).
- **openrouter** (ACTIVE) — model **`openai/gpt-oss-120b:free`** (tested most reliable free model:
  3/3 messy-note extractions with free headroom while popular models 429'd; OpenAI open-weight → sticky).
  Fallback model `openrouter/free` (Free Models Router) if the slug ever disappears. Needs
  `OPENROUTER_API_KEY` (`sk-or-v1-…`) in the server `.env`. Settings: `openrouter_model`,
  `openrouter_api_key`. Re-test free models: `node --env-file=.env server/scripts/openrouter-model-test.js`.
  Free tier rate-limited (~20/min, ~50–1000/day) — fine for low-volume recovery.
- **bedrock** (fallback, NOT in use) — Amazon Bedrock via EC2 role `EC2BedrockRole` (IMDS, no keys).
  ⚠️ In ap-southeast-2: 3.5 Haiku doesn't exist; **Claude 3 Haiku is Legacy-blocked** for new
  accounts; current models (3.5 Sonnet, Sonnet 4) require **cross-region inference profiles**
  (`apac.anthropic.claude-3-5-sonnet-20241022-v2:0`) whose IAM needs BOTH `foundation-model/...` and
  `inference-profile/apac...` ARNs. `bedrock_model` setting is pre-set to the APAC Sonnet profile;
  to use it, flip `llm_provider=bedrock` and attach the inference-profile IAM policy (see
  docs/BROWSER_AGENT_PROMPTS.md). This is why we moved to OpenRouter.
- Add a provider: implement `async (system,user)=>string` and register in `PROVIDERS`.

### Poster line — `posterSku()` in `server/services/prodigi.js`
The standard "print" product's paper line is config-driven: `prodigi_poster_line` / env
`PRODIGI_POSTER_LINE` (default **BLP** = Budget Poster `GLOBAL-BLP-*`, 170gsm, cheapest, covers all
12 sizes incl A-series). Options: BLP, BAP (`ART-FAP-BAP-*` 180gsm giclée), FAP (`GLOBAL-FAP-*`
premium). Per-size override `prodigi_sku_<size>`. `resolveItem()` routes non-framed orders here.
(Was previously defaulting to FAP via `getSku` — an overpay; now BLP.)

### Size handling & size-confirm — `server/services/sizeAdapt.js`
Orders fulfil at the **purchased** size (Etsy variation), normalised via `normSize()`
("16x20 Inch"→"16x20", "A4 (UK)"→"A4"). ⚠️ This normalisation is required — the raw value
breaks `getSku()` (falls back to default 18x24) and the `lockedSize` editor link. If the buyer
ordered a **different size than they designed** (`needsSizeConfirm`), the order is **held**
(`status='awaiting_size_confirm'`) and they're pointed to `/d/<token>?lockedSize=<size>` to
review/confirm the design re-laid-out at the ordered size (MainLayout `LOCKED_SIZE_MAP` does the
re-layout) instead of auto-shipping an unseen layout. Gated by `enable_size_confirm` (default ON).
Wired in `verify.js` (returns `needsSizeConfirm` JSON) + `etsy.js` poll. ⚠️ `LOCKED_SIZE_MAP` lacks
A1/A2/20x28/cm — those can't be locked yet (add to MainLayout to support).

### Order Confirm Mode
When a buyer opens `/d/:designToken` and their order's `status` is `awaiting_size_confirm`,
`OrderSection` (in `SidebarControls.tsx`) hides the shopping UI and shows a confirm panel instead.
On mount it calls `GET /api/order-status/:token`; if `confirmRequired` is true it records the
`orderId`, `listingType`, and `printSize`. The panel shows the ordered product/size, lets the buyer
edit the design, then on "Confirm & send to production" it calls `POST /api/confirm-order {token, state}`.
That endpoint saves the edited `state_json`, sets `status='pending'`, clears `render_path`, and enqueues
a fresh render via `enqueueRender()` — re-entering the normal profitability-gated pipeline (no Prodigi
bypass). Both new endpoints are in `server/routes/verify.js` and use the existing `publicLimiter`.

### Framing line — `getFramedSku()` in `server/services/prodigi.js`
Config `prodigi_frame_line` / env `PRODIGI_FRAME_LINE` (default **CFP** = Classic Frame Print,
cheapest ready-to-hang black+white). Options: CFP, CFPM (premium, +$5–10). Avoid BFP (white/natural
only, self-assembly, erratic shipping). Per-size override `prodigi_framed_sku_<size>`. Frame colour
resolves: design state → **Etsy variation** (`frameColorFromVariation`, e.g. "Framed Print (White)") →
black. To move framing to Printify/Gelato later, swap `getFramedSku` + the createOrder item assembly.

### Bad-order recovery — `server/services/orderRecovery.js` (+ `personalizationParser.js`)
When a buyer types details into Etsy's Personalization box instead of using the designer (no design
code), the Etsy poll prefills the **listing's default template** (Design001 fonts/style) with the
parsed details so they get a near-finished design to approve — instead of a refund. Flow:
`extractNote` → `parsePersonalization` (**deterministic first** for the labeled format, **LLM gap-fill**
via llm.js for messy free-text) → `applyParsedToState` onto the default → normal render+email pipeline
delivers the editable link + digital file. **Gated by `enable_order_recovery` setting / env
`ENABLE_ORDER_RECOVERY` — currently ON in prod).** LLM gap-fill via OpenRouter `openai/gpt-oss-120b:free`.
**Foreign languages confirmed** (ES/DE/FR/PT messy notes → correct fields, ISO dates). Unit tests:
`personalizationParser.test.js`, `orderRecovery.test.js`. Test live: `test-recovery.js` (English),
`test-recovery-intl.js` (foreign).

### Short links — `themappedmoment.com/go/<code>` (guarded creator)
For driving Etsy buyers straight to a design's editor page. `short_links` table (db.js) +
`server/services/shortLinks.js` + `GET /go/:code` route (index.js) + an nginx `location /go/`
proxy block. **Create safely:** `node --env-file=.env server/scripts/create-short-link.js <code> /l/<slug>`
(also `--list`, `--seed`, `--force`). The creator **refuses to re-point an existing code**, **refuses
codes whose `/l/<slug>` target isn't a real listing** (wrong-product guard), and codes are unique (PK).
`/go/` prefix means codes never collide with app routes. Each listing description starts with a
"✦ DESIGN & PREVIEW YOURS FREE…→ /go/<code>" CTA (set via `scripts/update-design-links.js`, idempotent).
Live: /go/star, /go/street, /go/home, /go/heart.

### Creating Etsy listings via API — COMPLETE PLAYBOOK (don't re-learn the hard way)
Scripts: `create-listing.js` (fresh draft), `update-listing-mimic.js` (apply the winning structure),
`research-listing.js <id>` (read ANY listing's title/tags/desc/variations via API), `etsy-listings.js`
(list shop listings). All run on prod with `node --env-file=.env scripts/<x>.js`.

**Listing structure (mimics the proven competitor model — listing 1029301545 / PaperEmporiumCo):**
- ONE **physical** listing per design with two variation axes: **Product Type** (`Digital File`,
  `Printed Poster`, `Framed Print (Black)`, `Framed Print (White)`) × **Size** (12 sizes). 48 offerings.
- **Digital is a *variation*, not a separate download listing.** Etsy won't mix a true `type=download`
  with physical, so "Digital File" is a named variation on the physical listing, fulfilled MANUALLY
  (we email the file). Set it as the **cheapest price (~$4.50)** → search shows "from $4.50" = the
  traffic hook → buyers upsell to Poster/Framed. Base `price` = the digital price.
- **Variation→fulfillment routing** (CRITICAL so a $4.50 digital sale isn't sent to Prodigi as a print):
  `variationProductType()` in etsy.js + the same parse in verify.js `getListingType` read the Product
  Type variation FIRST (`/frame/`→framed, `/digital/`→digital, `/poster|print/`→print), then design
  `orderType`, then listing-ID. `sizeFromVariations()` finds the size axis (not always variations[0]).
- ⚠️ Caveat: digital buyers go through the physical checkout (enter address) and the listing's shipping
  profile applies — US digital = free (fine); intl digital is charged shipping (matches competitor; most
  digital buyers are US). Accept it for the single-listing hook, or split digital into its own listing.

**Etsy v3 gotchas (all solved):**
- Physical listings require a **`readiness_state_id`** ("processing profile"). None exist by default —
  create: `POST /shops/{id}/readiness-state-definitions` with `readiness_state=made_to_order,
  min_processing_time, max_processing_time, processing_time_unit=days` (NOT business_days). Current id
  **1491562486439** (1–3 days). EACH inventory **offering** also needs `readiness_state_id`.
- Inline personalization fields are **deprecated**. Enable via `POST /shops/{id}/listings/{id}/personalization`
  with `{ personalization_questions: [{ question_text:"Personalization", question_type:"text_input",
  required:false, max_allowed_characters:256, instructions:"…" }] }` (question_text MUST be
  "Personalization"; type MUST be "text_input" during migration).
- `createDraftListing`/`updateListing` = form-encoded; `updateListingInventory` = JSON; image upload =
  multipart (NO json content-type, use FormData). Custom variations use `property_id` 513 & 514.
- `taxonomy_id` for star-map wall art = **1029** (competitor uses it; NOT 1332).
- Reading listings needs `listings_r`; creating/updating needs `listings_w` (both granted).
- Etsy max **13 tags**, ≤20 chars each. ⚠️ Send tags (and other array fields: materials,
  production_partner_ids) as ONE **comma-separated string** (`tags=a,b,c`) — NOT repeated params
  (`tags=a&tags=b` makes Etsy keep only one). Tag ORDER doesn't affect Etsy search; reorder freely.
  SEO title = comma-separated keyword phrases.
- **Live template:** listing **4514771222** (Star Map; from $4.50, 48 variations, personalization on,
  16x20 profile, Prodigi partner 5671331). Owner adds real mockups + publishes; replicate per design.

### Helper scripts (`server/scripts/`)
| Script | Purpose | Safe? |
|---|---|---|
| `build-shipping-profiles.js` | Build per-size Etsy shipping profiles (US free + UK/CA/AU/EU charged) | dry-run default; `--apply` writes |
| `quote-matrix.js` | Read-only Prodigi quote matrix across destinations × sizes (`--method Budget\|Standard`) | read-only |
| `verify-etsy-write.js` | Verify Etsy `shops_w` by creating + immediately deleting a test profile | self-cleaning |
| `pricing-table.js` | Recommended Digital/Poster/Framed prices per size vs competitor (Prodigi quotes) | read-only |
| `frame-probe.js` | Compare Prodigi frame lines (CFP/CFPM/BFP) cost | read-only |
| `express-probe.js` | Express vs baseline shipping cost per market (size the US Express upgrade) | read-only |
| `bedrock-probe.js` | Probe which Bedrock model IDs are invocable in the region | read-only |
| `openrouter-model-test.js` | Test free OpenRouter models for extraction reliability | read-only |
| `research-listing.js <id>` | Read any Etsy listing's title/tags/desc/variations via API | read-only |
| `etsy-listings.js` | List the shop's listings (all states) | read-only |
| `create-listing.js` | Create a fresh draft physical listing (variations+price+image+profile+partner) | writes a draft |
| `update-listing-mimic.js [id]` | Apply the winning structure (digital hook + SEO title/tags + personalization) | writes |
| `test-recovery.js` / `test-recovery-intl.js` | Test bad-order recovery (English / foreign) | read-only |

---

## Server Backend

### Running the Server
```bash
cd server && node index.js   # → http://localhost:3001
```

### Deploy Server Changes
```bash
rsync -avz --exclude node_modules --exclude data --exclude .env \
  server/ ubuntu@3.107.34.169:/home/ubuntu/poster-studio/server/
ssh ubuntu@3.107.34.169 "cd /home/ubuntu/poster-studio/server && npm install --production && sudo systemctl restart poster-studio-api"
```

### Background Jobs
- **Render queue worker** — continuous, processes pending render jobs
- **Etsy order polling** — every 2 min (only if `ETSY_ACCESS_TOKEN` is set)
- **Daily seller digest** — 8 AM cron via node-cron

### Database
SQLite with WAL mode at `server/data/db.sqlite`. Schema in `server/db.js`. Key tables: `designs`, `orders`, `templates`, `render_queue`, `settings`, `listings`, `events`.

**Order money/profit columns** (added for the profitability guard, via `db.js` ALTER migrations):
`currency`, `revenue_cents` (item+shipping ex-tax), `shipping_paid_cents`, `tax_cents`,
`prodigi_cost_cents`, `prodigi_ship_cents`, `margin_cents`, `profit_status` (`ok`|`review`|`unknown`),
`profit_json` (full breakdown). **Order statuses** include `needs_review` — set when the profitability
gate holds an order (would lose money / unverifiable) instead of releasing it to Prodigi.

**Relevant `settings` keys:** `etsy_fee_pct` (0.115), `etsy_fee_flat_cents` (50), `etsy_offsite_ads_pct`
(0), `min_margin_cents` (0), `min_margin_pct` (0); `prodigi_shipping_<ISO>` (per-country method override);
`prodigi_sku_<size>` / `prodigi_framed_sku_<size>` (SKU overrides); `shipping_profile_bap_<size>`
(built profile ids).

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
