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

## Development

```bash
# From /home/dev/poster-studio/
npm run dev        # Dev server on http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
```

## Deployment (AWS EC2 VPS)

**Server:** AWS EC2 t3.micro, Ubuntu 24.04, Sydney (`ap-southeast-2`)
**Public IP:** `13.210.227.152` · Instance: `i-0dfddb55abbf931d1`
**SSH:** `ssh ubuntu@13.210.227.152`
**Domain:** `https://themappedmoment.com` (Let's Encrypt SSL, auto-renews)
**Served on:** Port 443 HTTPS + 80 → redirect, via nginx

### Deploy Steps
```bash
# 1. Build locally
npm run build

# 2. Copy to VPS
rsync -avz --delete dist/ ubuntu@13.210.227.152:/var/www/poster-studio/
```

### Quick redeploy after changes
```bash
cd /home/dev/poster-studio && npm run build && rsync -avz --delete dist/ ubuntu@13.210.227.152:/var/www/poster-studio/
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

## Troubleshooting

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
